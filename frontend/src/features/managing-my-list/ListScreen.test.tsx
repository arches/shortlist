import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { forgetSession, rememberSession } from "@/session/store";
import { refused, respond, stubFetch } from "@/test/http";
import { renderApp } from "@/test/router";

import { aRestaurant } from "./testing";

import type { Mock } from "vitest";

// Derived from managing-my-list.scenarios.md and the list screen in
// managing-my-list.wireframe.drawio.svg, whose cards read "Italian · not
// "Italian - 12 Main St, New York NY" over "Visited 1 time".
describe("my list", () => {
  let fetchMock: Mock;

  beforeEach(() => {
    fetchMock = stubFetch();
    window.localStorage.clear();
    forgetSession();
    rememberSession({ access_token: "access-one", refresh_token: "refresh-one", expires_in: 900 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Scenario: Adding a restaurant I have only heard the name of — "it does not
  // read as visited. And it has no experiences."
  it("shows a restaurant only heard the name of as not visited", async () => {
    fetchMock.mockResolvedValue(
      respond(200, [
        aRestaurant({
          name: "Lilia",
          cuisine: "Italian",
          address_line_1: "12 Main St",
          city: "New York",
          state: "NY",
        }),
      ]),
    );

    renderApp("/");

    expect(await screen.findByRole("heading", { name: "Lilia" })).toBeInTheDocument();
    expect(screen.getByText("Italian - 12 Main St, New York NY")).toBeInTheDocument();
    expect(screen.getByText("Not visited")).toBeInTheDocument();
  });

  it("shows a visited restaurant with how many experiences it has", async () => {
    fetchMock.mockResolvedValue(
      respond(200, [
        aRestaurant({
          name: "Tacos El Bronco",
          cuisine: "Mexican",
          address_line_1: "381 Sycamore St",
          city: "Los Angeles",
          state: "CA",
          visited: true,
          experience_count: 2,
        }),
      ]),
    );

    renderApp("/");

    expect(await screen.findByText("Visited 2 times")).toBeInTheDocument();
    expect(screen.getByText("Mexican - 381 Sycamore St, Los Angeles CA")).toBeInTheDocument();
  });

  it("says one experience in the singular", async () => {
    fetchMock.mockResolvedValue(
      respond(200, [
        aRestaurant({ name: "Joe's Pizza", visited: true, experience_count: 1 }),
      ]),
    );

    renderApp("/");

    expect(await screen.findByText("Visited 1 time")).toBeInTheDocument();
  });

  // Both halves of the details line are Google's, and either can be absent.
  it("joins what Google sent and leaves out what it did not", async () => {
    fetchMock.mockResolvedValue(
      respond(200, [
        aRestaurant({ name: "Joe's Pizza", cuisine: "Pizza" }),
        aRestaurant({ id: 2, name: "Lilia", city: "New York", state: "NY" }),
      ]),
    );

    renderApp("/");

    expect(await screen.findByText("Pizza")).toBeInTheDocument();
    expect(screen.getByText("New York NY")).toBeInTheDocument();
  });

  it("shows every restaurant on the list", async () => {
    fetchMock.mockResolvedValue(
      respond(200, [
        aRestaurant({ id: 1, name: "Lilia" }),
        aRestaurant({ id: 2, name: "Tacos El Bronco" }),
        aRestaurant({ id: 3, name: "Joe's Pizza" }),
      ]),
    );

    renderApp("/");

    expect(await screen.findByRole("heading", { name: "Lilia" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tacos El Bronco" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Joe's Pizza" })).toBeInTheDocument();
  });

  it("says so when nothing is on the list yet", async () => {
    fetchMock.mockResolvedValue(respond(200, []));

    renderApp("/");

    expect(await screen.findByText("Nothing on your list yet.")).toBeInTheDocument();
  });

  // There is nothing on a Restaurant an owner set, so there is nothing to
  // correct: the card offers a Remove and no Edit.
  it("offers a Remove for each restaurant, and no Edit", async () => {
    fetchMock.mockResolvedValue(respond(200, [aRestaurant({ name: "Lilia" })]));

    renderApp("/");

    expect(await screen.findByRole("button", { name: "Remove" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
  });

  // Scenario: My session ends in the middle of what I am doing — reached only
  // after a refusal and a refused renewal.
  it("asks me to sign in when the session has ended", async () => {
    fetchMock.mockResolvedValue(refused());

    renderApp("/");

    expect(await screen.findByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("shows nothing it cannot explain when the list could not be opened", async () => {
    fetchMock.mockResolvedValue(respond(500, { error: "Something went wrong." }));

    renderApp("/");

    expect(await screen.findByRole("alert", {}, { timeout: 5000 })).toHaveTextContent(
      "Something went wrong.",
    );
  });
});
