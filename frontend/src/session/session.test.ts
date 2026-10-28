import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { authenticated, SessionEnded, signIn, signOut } from "./session";
import { couldBeSignedIn, currentAccessToken, forgetSession, storedRefreshToken } from "./store";

// Derived from signing-in.scenarios.md: the main path, "Signing out when I am
// done", "Staying on my list longer than an access token lasts", "Coming back
// after my refresh token has expired", and "My session ends in the middle of
// what I am doing".
function respond(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body === null ? "" : JSON.stringify(body)),
  };
}

function issuedPair(suffix: string) {
  return respond(201, {
    access_token: `access-${suffix}`,
    refresh_token: `refresh-${suffix}`,
    expires_in: 900,
  });
}

const refused = () => respond(401, { error: "Sign in to continue." });

describe("a session", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    window.localStorage.clear();
    forgetSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function pathsRequested(): string[] {
    return fetchMock.mock.calls.map((call) => String(call.at(0)));
  }

  // Scenario: Signing in to reach my list
  describe("signing in", () => {
    it("keeps the pair it was issued", async () => {
      fetchMock.mockResolvedValueOnce(issuedPair("one"));

      await signIn("sam.reed@fastmail.com", "correct-horse-battery-staple");

      expect(currentAccessToken()).toBe("access-one");
      expect(storedRefreshToken()).toBe("refresh-one");
      expect(couldBeSignedIn()).toBe(true);
    });

    it("keeps nothing when the credentials do not match", async () => {
      fetchMock.mockResolvedValueOnce(
        respond(401, { error: "The email or password is wrong." }),
      );

      await expect(signIn("sam.reed@fastmail.com", "hunter2")).rejects.toThrow(
        "The email or password is wrong.",
      );

      expect(couldBeSignedIn()).toBe(false);
    });
  });

  // Scenario: Signing out when I am done
  describe("signing out", () => {
    it("forgets the pair", async () => {
      fetchMock.mockResolvedValueOnce(issuedPair("one"));
      await signIn("sam.reed@fastmail.com", "correct-horse-battery-staple");

      fetchMock.mockResolvedValueOnce(respond(204, null));
      await signOut();

      expect(currentAccessToken()).toBeUndefined();
      expect(storedRefreshToken()).toBeUndefined();
      expect(couldBeSignedIn()).toBe(false);
    });

    it("forgets the pair even if the API could not be reached", async () => {
      fetchMock.mockResolvedValueOnce(issuedPair("one"));
      await signIn("sam.reed@fastmail.com", "correct-horse-battery-staple");

      fetchMock.mockRejectedValueOnce(new Error("network down"));
      await expect(signOut()).rejects.toThrow("network down");

      expect(couldBeSignedIn()).toBe(false);
    });
  });

  // Scenario: Staying on my list longer than an access token lasts. Twenty
  // minutes pass with the list open, the owner adds a restaurant, and is not
  // asked to sign in. From in here that is: refused, renewed, retried.
  describe("a request after the access token has run out", () => {
    beforeEach(async () => {
      fetchMock.mockResolvedValueOnce(issuedPair("one"));
      await signIn("sam.reed@fastmail.com", "correct-horse-battery-staple");
      fetchMock.mockReset();
    });

    it("renews and retries, and the owner notices nothing", async () => {
      fetchMock
        .mockResolvedValueOnce(refused())
        .mockResolvedValueOnce(issuedPair("two"))
        .mockResolvedValueOnce(respond(201, { id: 2, name: "Bar Primi" }));

      const added = await authenticated<{ name: string }>("/restaurants", {
        method: "POST",
        body: { restaurant: { name: "Bar Primi" } },
      });

      expect(added.name).toBe("Bar Primi");
      expect(pathsRequested()).toEqual([
        "/api/restaurants",
        "/api/session/renewal",
        "/api/restaurants",
      ]);
    });

    it("retries with the token the renewal issued, not the stale one", async () => {
      fetchMock
        .mockResolvedValueOnce(refused())
        .mockResolvedValueOnce(issuedPair("two"))
        .mockResolvedValueOnce(respond(200, []));

      await authenticated("/restaurants");

      const retry = fetchMock.mock.calls.at(2)?.at(1) as { headers: Headers };
      expect(retry.headers.get("Authorization")).toBe("Bearer access-two");
    });

    it("keeps the rotated refresh token", async () => {
      fetchMock
        .mockResolvedValueOnce(refused())
        .mockResolvedValueOnce(issuedPair("two"))
        .mockResolvedValueOnce(respond(200, []));

      await authenticated("/restaurants");

      expect(storedRefreshToken()).toBe("refresh-two");
    });

    it("renews once, not once per refusal", async () => {
      fetchMock
        .mockResolvedValueOnce(refused())
        .mockResolvedValueOnce(issuedPair("two"))
        .mockResolvedValueOnce(refused());

      await expect(authenticated("/restaurants")).rejects.toThrow("Sign in to continue.");

      expect(pathsRequested().filter((path) => path.endsWith("/renewal"))).toHaveLength(1);
    });
  });

  // Scenario: My session ends in the middle of what I am doing. Both halves have
  // to agree that nothing changes.
  describe("when the renewal is refused too", () => {
    beforeEach(async () => {
      fetchMock.mockResolvedValueOnce(issuedPair("one"));
      await signIn("sam.reed@fastmail.com", "correct-horse-battery-staple");
      fetchMock.mockReset();
    });

    it("reports the session as ended, and only then", async () => {
      fetchMock.mockResolvedValueOnce(refused()).mockResolvedValueOnce(refused());

      await expect(authenticated("/restaurants")).rejects.toThrow(SessionEnded);
    });

    it("forgets the pair, so nothing tries again", async () => {
      fetchMock.mockResolvedValueOnce(refused()).mockResolvedValueOnce(refused());

      await authenticated("/restaurants").catch(() => undefined);

      expect(couldBeSignedIn()).toBe(false);
    });
  });

  // Scenario: Coming back after my refresh token has expired. Nothing was kept
  // in memory, so the first request has only the stored token to go on.
  describe("coming back with nothing in memory", () => {
    it("renews from the stored refresh token", async () => {
      window.localStorage.setItem("shortlist.refresh_token", "refresh-from-last-week");

      fetchMock
        .mockResolvedValueOnce(refused())
        .mockResolvedValueOnce(issuedPair("two"))
        .mockResolvedValueOnce(respond(200, [{ id: 1, name: "Lilia" }]));

      const list = await authenticated<unknown[]>("/restaurants");

      expect(list).toHaveLength(1);
    });

    it("reports the session as ended when the stored token is thirty-one days old", async () => {
      window.localStorage.setItem("shortlist.refresh_token", "refresh-from-last-month");

      fetchMock
        .mockResolvedValueOnce(refused())
        .mockResolvedValueOnce(respond(401, { error: "That session cannot be renewed." }));

      await expect(authenticated("/restaurants")).rejects.toThrow(SessionEnded);
      expect(couldBeSignedIn()).toBe(false);
    });

    it("reports the session as ended when there is nothing stored at all", async () => {
      fetchMock.mockResolvedValueOnce(refused());

      await expect(authenticated("/restaurants")).rejects.toThrow(SessionEnded);
      expect(pathsRequested()).toEqual(["/api/restaurants"]);
    });
  });

  // A refusal is the only thing that triggers a renewal. Anything else is the
  // caller's problem, and retrying it would hide a real failure.
  describe("a failure that is not a refusal", () => {
    it("is not retried", async () => {
      fetchMock.mockResolvedValueOnce(
        respond(404, { error: "No such restaurant is on your list." }),
      );

      await expect(authenticated("/restaurants/1", { method: "DELETE" })).rejects.toThrow(
        "No such restaurant is on your list.",
      );

      expect(pathsRequested()).toHaveLength(1);
    });
  });
});
