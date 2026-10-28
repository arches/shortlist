import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Restaurant } from "@/api/types";
import { forgetSession, rememberSession } from "@/session/store";
import { refused, respond, stubFetch } from "@/test/http";
import { renderApp } from "@/test/router";

import type { Mock } from "vitest";

// Derived from managing-my-list.scenarios.md and the list screen in
// managing-my-list.wireframe.drawio.svg, whose cards read "Italian · not
// visited" and "Mexican · visited · 2 experiences".
export function aRestaurant(attributes: Partial<Restaurant> = {}): Restaurant {
  return {
    id: 1,
    user_id: 1,
    name: "Lilia",
    url: null,
    google_maps_url: null,
    yelp_url: null,
    address_line_1: null,
    address_line_2: null,
    city: null,
    state: null,
    postal_code: null,
    country: null,
    cuisine: null,
    specialty: null,
    notes: null,
    added_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
    visited: false,
    experience_count: 0,
    last_experienced_on: null,
    ...attributes,
  };
}

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
      respond(200, [aRestaurant({ name: "Lilia", cuisine: "Italian" })]),
    );

    renderApp("/");

    expect(await screen.findByRole("heading", { name: "Lilia" })).toBeInTheDocument();
    expect(screen.getByText("Italian · not visited")).toBeInTheDocument();
  });

  it("shows a visited restaurant with how many experiences it has", async () => {
    fetchMock.mockResolvedValue(
      respond(200, [
        aRestaurant({
          name: "Tacos El Bronco",
          cuisine: "Mexican",
          visited: true,
          experience_count: 2,
        }),
      ]),
    );

    renderApp("/");

    expect(await screen.findByText("Mexican · visited · 2 experiences")).toBeInTheDocument();
  });

  it("says one experience in the singular", async () => {
    fetchMock.mockResolvedValue(
      respond(200, [
        aRestaurant({ name: "Joe's Pizza", visited: true, experience_count: 1 }),
      ]),
    );

    renderApp("/");

    expect(await screen.findByText("visited · 1 experience")).toBeInTheDocument();
  });

  it("leaves the cuisine out when there is none, and the count when it is zero", async () => {
    fetchMock.mockResolvedValue(respond(200, [aRestaurant({ name: "Joe's Pizza" })]));

    renderApp("/");

    expect(await screen.findByText("not visited")).toBeInTheDocument();
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

  it("offers an Edit and a Remove for each restaurant", async () => {
    fetchMock.mockResolvedValue(respond(200, [aRestaurant({ name: "Lilia" })]));

    renderApp("/");

    expect(await screen.findByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
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
