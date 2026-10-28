import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { couldBeSignedIn, forgetSession, rememberSession } from "@/session/store";
import { noContent, respond, stubFetch } from "@/test/http";
import { renderApp } from "@/test/router";

import type { Mock } from "vitest";

// Derived from managing-my-list.scenarios.md ("Managing my list while signed
// out") and signing-in.scenarios.md ("Signing out when I am done").
function signedIn() {
  rememberSession({ access_token: "access-one", refresh_token: "refresh-one", expires_in: 900 });
}

describe("where the owner lands", () => {
  let fetchMock: Mock;

  beforeEach(() => {
    fetchMock = stubFetch();
    window.localStorage.clear();
    forgetSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Scenario: Managing my list while signed out — "Then I am asked to sign in"
  it("asks a signed-out owner to sign in, rather than firing a doomed request", async () => {
    renderApp("/");

    expect(await screen.findByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("opens the list for an owner whose session could still be continued", async () => {
    signedIn();
    fetchMock.mockResolvedValue(respond(200, []));

    renderApp("/");

    expect(await screen.findByRole("heading", { name: "My list" })).toBeInTheDocument();
  });

  // An owner whose access token has run out but whose refresh token has not is
  // still signed in: the renewal is what makes that invisible.
  it("opens the list with only a stored refresh token to go on", async () => {
    window.localStorage.setItem("shortlist.refresh_token", "refresh-from-yesterday");
    fetchMock.mockResolvedValue(respond(200, []));

    renderApp("/");

    expect(await screen.findByRole("heading", { name: "My list" })).toBeInTheDocument();
  });

  it("sends a signed-in owner away from the sign-in screen", async () => {
    signedIn();
    fetchMock.mockResolvedValue(respond(200, []));

    renderApp("/sign-in");

    expect(await screen.findByRole("heading", { name: "My list" })).toBeInTheDocument();
  });

  // Scenario: Signing out when I am done — "Then I am asked to sign in"
  describe("signing out", () => {
    it("asks me to sign in", async () => {
      signedIn();
      fetchMock.mockResolvedValue(respond(200, []));
      renderApp("/");
      await screen.findByRole("heading", { name: "My list" });

      fetchMock.mockResolvedValueOnce(noContent());
      await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

      expect(await screen.findByRole("button", { name: "Sign in" })).toBeInTheDocument();
    });

    it("leaves nothing behind that could renew", async () => {
      signedIn();
      fetchMock.mockResolvedValue(respond(200, []));
      renderApp("/");
      await screen.findByRole("heading", { name: "My list" });

      fetchMock.mockResolvedValueOnce(noContent());
      await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

      await waitFor(() => {
        expect(couldBeSignedIn()).toBe(false);
      });
    });
  });
});
