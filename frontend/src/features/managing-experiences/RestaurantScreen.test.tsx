import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { aRestaurant } from "@/features/managing-my-list/testing";
import { forgetSession, rememberSession } from "@/session/store";
import { refused, respond, stubFetch } from "@/test/http";
import { renderApp } from "@/test/router";

import type { Mock } from "vitest";

// Derived from managing-experiences.wireframe.drawio.svg, which settles that a
// restaurant's experiences live on its own screen, and from "When I open
// 'Joe's Pizza'" in managing-experiences.scenarios.md.
describe("a restaurant's own screen", () => {
  let fetchMock: Mock;

  const joes = aRestaurant({
    id: 4,
    name: "Joe's Pizza",
    cuisine: "Pizza",
    visited: true,
    experience_count: 3,
  });

  beforeEach(() => {
    fetchMock = stubFetch();
    window.localStorage.clear();
    forgetSession();
    rememberSession({ access_token: "access-one", refresh_token: "refresh-one", expires_in: 900 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // The client resolves against /api, which is what a relative path means under
  // shortlist.principles.md: the API's address is inferred from where the
  // frontend runs rather than injected into the bundle.
  function listIs(restaurants: ReturnType<typeof aRestaurant>[]) {
    fetchMock.mockImplementation((path: string) =>
      Promise.resolve(path === "/api/restaurants" ? respond(200, restaurants) : respond(200, [])),
    );
  }

  // The list wireframe draws no way into this screen, so the name on the card
  // is the link. That is an assumption, and this is the test that pins it.
  it("opens from the restaurant's name on the list", async () => {
    listIs([joes]);
    renderApp("/");

    // "My list" is static chrome, so waiting on it would not mean the list had
    // arrived. The card is what has to be there before it can be clicked.
    await userEvent.click(await screen.findByRole("link", { name: "Joe's Pizza" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Joe's Pizza" })).toBeInTheDocument();
  });

  // The wireframe's header: the name, then the same subtitle the card carries.
  it("is headed by the name and the card's own subtitle", async () => {
    listIs([joes]);

    renderApp("/restaurants/4");

    expect(await screen.findByRole("heading", { level: 1, name: "Joe's Pizza" })).toBeInTheDocument();
    expect(screen.getByText("Pizza · visited · 3 experiences")).toBeInTheDocument();
  });

  it("reads as not visited for a restaurant with no experiences", async () => {
    listIs([aRestaurant({ id: 7, name: "Lilia", cuisine: "Italian" })]);

    renderApp("/restaurants/7");

    expect(await screen.findByText("Italian · not visited")).toBeInTheDocument();
  });

  // The wireframe's "‹ My list".
  it("goes back to the list", async () => {
    listIs([joes]);
    renderApp("/restaurants/4");
    await screen.findByRole("heading", { level: 1, name: "Joe's Pizza" });

    await userEvent.click(screen.getByRole("link", { name: "‹ My list" }));

    expect(await screen.findByRole("heading", { name: "My list" })).toBeInTheDocument();
  });

  // Reaching the experiences of a restaurant that is off my list is out of
  // scope, and a restaurant that was never mine is not reachable either. There
  // is nothing to show, so the owner goes back to the list.
  it("sends me back to the list for a restaurant that is not on it", async () => {
    listIs([joes]);

    renderApp("/restaurants/999");

    expect(await screen.findByRole("heading", { name: "My list" })).toBeInTheDocument();
  });

  // Scenario: Managing experiences while signed out — "Then I am asked to sign
  // in". Reaching the screen without a session that could still be continued
  // never fires a request that is certain to be refused.
  it("asks a signed-out owner to sign in rather than firing a doomed request", async () => {
    forgetSession();
    window.localStorage.clear();

    renderApp("/restaurants/4");

    expect(await screen.findByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Scenario: My session ends in the middle of what I am doing. Two refusals,
  // not one: the request is refused, the renewal is attempted, and only when
  // that is refused too has the session actually ended.
  it("asks me to sign in when the session has actually ended", async () => {
    fetchMock.mockResolvedValue(refused());

    renderApp("/restaurants/4");

    await waitFor(async () => {
      expect(await screen.findByRole("button", { name: "Sign in" })).toBeInTheDocument();
    });
  });
});
