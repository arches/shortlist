// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { requestAt, respond } from "@/test/http";

import { ApiError, request } from "./client";

// The client is the one place the frontend decides where the API is. Per
// shortlist.principles.md that decision is "wherever the frontend is running",
// which is what a relative path means.
describe("the API client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function respondWith(status: number, body: unknown) {
    fetchMock.mockResolvedValue(respond(status, body));
  }

  it("asks the origin it is served from, by relative path", async () => {
    respondWith(200, []);

    await request("/restaurants");

    expect(requestAt(fetchMock, 0).path).toBe("/api/restaurants");
  });

  it("carries the access token in the Authorization header, not a cookie", async () => {
    respondWith(200, []);

    await request("/restaurants", { accessToken: "a-token" });

    const { headers } = requestAt(fetchMock, 0);
    expect(headers.get("Authorization")).toBe("Bearer a-token");
    expect(headers.has("Cookie")).toBe(false);
  });

  it("sends no Authorization header when there is no token", async () => {
    respondWith(200, []);

    await request("/restaurants");

    const { headers } = requestAt(fetchMock, 0);
    expect(headers.has("Authorization")).toBe(false);
  });

  it("sends a JSON body", async () => {
    respondWith(201, { id: 1 });

    await request("/restaurants", { method: "POST", body: { restaurant: { name: "Lilia" } } });

    const { body: sent, headers } = requestAt(fetchMock, 0);
    expect(sent).toEqual({ restaurant: { name: "Lilia" } });
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("returns null for a response that carries nothing", async () => {
    respondWith(204, null);

    await expect(request("/session", { method: "DELETE" })).resolves.toBeNull();
  });

  // A refusal must surface rather than be swallowed: it is what triggers the
  // renewal attempt in signing-in.scenarios.md.
  describe("a refusal", () => {
    it("is thrown, carrying its status", async () => {
      respondWith(401, { error: "Sign in to continue." });

      const error = await request("/restaurants").catch((thrown: unknown) => thrown);

      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(401);
      expect((error as ApiError).isRefusal).toBe(true);
      expect((error as ApiError).message).toBe("Sign in to continue.");
    });

    it("is distinguishable from a not-found", async () => {
      respondWith(404, { error: "No such restaurant is on your list." });

      const error = (await request("/restaurants/1", { method: "DELETE" }).catch(
        (thrown: unknown) => thrown,
      )) as ApiError;

      expect(error.isRefusal).toBe(false);
      expect(error.isNotFound).toBe(true);
    });
  });

  describe("a refusal with something to say per attribute", () => {
    it("keeps the attribute errors reachable", async () => {
      respondWith(422, { errors: { name: ["Name is already on your list"] } });

      const error = (await request("/restaurants", { method: "POST" }).catch(
        (thrown: unknown) => thrown,
      )) as ApiError;

      expect(error.attributeErrors).toEqual({ name: ["Name is already on your list"] });
      expect(error.message).toBe("Name is already on your list");
    });

    it("has no attribute errors when the body carries none", async () => {
      respondWith(500, {});

      const error = (await request("/restaurants").catch((thrown: unknown) => thrown)) as ApiError;

      expect(error.attributeErrors).toEqual({});
      expect(error.message).toBe("The request failed (500).");
    });
  });
});
