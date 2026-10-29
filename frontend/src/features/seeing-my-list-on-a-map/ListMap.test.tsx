import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { aRestaurant } from "@/features/managing-my-list/testing";
import { forgetSession, rememberSession } from "@/session/store";
import { requestAt, respond, stubFetch } from "@/test/http";
import { renderApp } from "@/test/router";

import { BACARI, theConfiguration } from "./testing";
import { OPENING_ZOOM } from "./view";

import type { Mock } from "vitest";

// Derived from seeing-my-list-on-a-map.scenarios.md and the wireframe beside
// it. Background: I am signed in as the owner of my list, and Bacari is on my
// list at 3626 Sunset Blvd, Los Angeles, CA 90026.
//
// The Maps JS API is stood in for suite-wide — see src/test/google-maps.tsx.
// Nothing below proves Google drew a map; what it proves is which restaurants
// Shortlist asked it to draw, and what it told the map it may not do.
describe("my list on a map", () => {
  let fetchMock: Mock;

  function serve(restaurants: unknown[]) {
    fetchMock.mockImplementation((path: string) =>
      Promise.resolve(
        path.endsWith("/configuration")
          ? respond(200, theConfiguration())
          : respond(200, restaurants),
      ),
    );
  }

  beforeEach(() => {
    fetchMock = stubFetch();
    window.localStorage.clear();
    forgetSession();
    rememberSession({ access_token: "access-one", refresh_token: "refresh-one", expires_in: 900 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Scenario: See restaurants from my list
  it("shows a map, a pin for Bacari, and Bacari in the list", async () => {
    serve([aRestaurant(BACARI)]);

    renderApp("/");

    expect(await screen.findByRole("application", { name: "My list on a map" })).toBeInTheDocument();

    const pin = await screen.findByTestId("pin");
    expect(pin).toHaveAttribute("data-title", "Bacari");
    expect(pin).toHaveAttribute(
      "data-position",
      JSON.stringify({ lat: BACARI.latitude, lng: BACARI.longitude }),
    );

    expect(screen.getByRole("heading", { name: "Bacari" })).toBeInTheDocument();
  });

  // "Markers should be standard google pins", per the wireframe's own note.
  it("draws the pin as a standard Google pin", async () => {
    serve([aRestaurant(BACARI)]);

    renderApp("/");

    expect(await screen.findByTestId("standard-google-pin")).toBeInTheDocument();
  });

  // "And the map is at zoom level 10. And the map is centered around the first
  // restaurant on my list" — Bacari is first, and Lilia being a continent away
  // does not widen the view. Both still get a pin.
  it("opens centred on the first restaurant on the list, at zoom 10", async () => {
    serve([
      aRestaurant({ ...BACARI, id: 1 }),
      aRestaurant({ id: 2, name: "Lilia", latitude: 40.7128, longitude: -73.9542 }),
    ]);

    renderApp("/");

    const map = await screen.findByTestId("map");
    expect(map).toHaveAttribute(
      "data-center",
      JSON.stringify({ lat: BACARI.latitude, lng: BACARI.longitude }),
    );
    expect(map).toHaveAttribute("data-zoom", String(OPENING_ZOOM));
    expect(screen.getAllByTestId("pin")).toHaveLength(2);
  });

  it("centres on the one restaurant there is", async () => {
    serve([aRestaurant(BACARI)]);

    renderApp("/");

    const map = await screen.findByTestId("map");
    expect(map).toHaveAttribute(
      "data-center",
      JSON.stringify({ lat: BACARI.latitude, lng: BACARI.longitude }),
    );
    expect(map).toHaveAttribute("data-zoom", String(OPENING_ZOOM));
  });

  // A restaurant Google had no location for is on the list and not on the map
  // — see ASSUMPTIONS.md, "Coordinates for restaurants already on a list".
  it("gives a restaurant with no coordinates no pin, but keeps it on the list", async () => {
    serve([aRestaurant(BACARI), aRestaurant({ id: 2, name: "Lilia" })]);

    renderApp("/");

    expect(await screen.findByRole("heading", { name: "Lilia" })).toBeInTheDocument();

    const pins = screen.getAllByTestId("pin");
    expect(pins).toHaveLength(1);
    expect(pins[0]).toHaveAttribute("data-title", "Bacari");
  });

  // The wireframe draws the map as page furniture rather than as something the
  // list produces, so an empty list still has one.
  it("still shows a map when nothing is on the list", async () => {
    serve([]);

    renderApp("/");

    expect(await screen.findByText("Nothing on your list yet.")).toBeInTheDocument();

    const map = screen.getByTestId("map");
    expect(map).toHaveAttribute("data-zoom", String(OPENING_ZOOM));
    expect(screen.queryAllByTestId("pin")).toEqual([]);
  });

  // Out of scope: manually panning or zooming the map. The Maps API ships both
  // switched on, so leaving them alone would build the out-of-scope thing by
  // accident.
  it("gives the owner no way to move the map themselves", async () => {
    serve([aRestaurant(BACARI)]);

    renderApp("/");

    const map = await screen.findByTestId("map");
    expect(map).toHaveAttribute("data-gesture-handling", "none");
    expect(map).toHaveAttribute("data-zoom-control", "false");
    expect(map).toHaveAttribute("data-scrollwheel", "false");
    expect(map).toHaveAttribute("data-default-ui-disabled", "true");
    expect(map).toHaveAttribute("data-double-click-zoom-disabled", "true");
    expect(map).toHaveAttribute("data-keyboard-shortcuts", "false");
  });

  // shortlist.principles.md: the bundle carries no configuration, so the key
  // and the Map ID arrive from the API.
  it("draws the map with the key and the Map ID the API served", async () => {
    serve([aRestaurant(BACARI)]);

    renderApp("/");

    expect(await screen.findByTestId("maps-api")).toHaveAttribute("data-api-key", "a-maps-key");
    expect(screen.getByTestId("map")).toHaveAttribute("data-map-id", "a-map-id");
  });

  it("asks for that configuration without a token, because it is served without one", async () => {
    serve([aRestaurant(BACARI)]);

    renderApp("/");

    await screen.findByTestId("map");

    const index = fetchMock.mock.calls.findIndex(([path]) =>
      String(path).endsWith("/configuration"),
    );
    expect(index).toBeGreaterThanOrEqual(0);

    expect(requestAt(fetchMock, index).headers.get("Authorization")).toBeNull();
  });

  // Not in any artifact — see ASSUMPTIONS.md, "What stands in for the map
  // before it can be drawn".
  it("says the map is unavailable when the configuration cannot be had", async () => {
    fetchMock.mockImplementation((path: string) =>
      Promise.resolve(
        path.endsWith("/configuration")
          ? respond(502, { error: "nope" })
          : respond(200, [aRestaurant(BACARI)]),
      ),
    );

    renderApp("/");

    // The query client retries once before it gives up, which is why this one
    // waits longer than the rest.
    expect(
      await screen.findByText("The map is unavailable just now.", {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("map")).not.toBeInTheDocument();
  });
});

// Scenario: Scrolling the list — "the map stays pinned to the top of the screen
// so it's always visible". jsdom has no layout and no scrolling, so what can be
// checked here is that the map is placed to stick and the list is not. Whether
// it actually stays put is the End-to-end tests row shortlist.stack.md leaves
// TBD.
describe("scrolling the list", () => {
  let fetchMock: Mock;

  beforeEach(() => {
    fetchMock = stubFetch();
    window.localStorage.clear();
    forgetSession();
    rememberSession({ access_token: "access-one", refresh_token: "refresh-one", expires_in: 900 });
    fetchMock.mockImplementation((path: string) =>
      Promise.resolve(
        path.endsWith("/configuration")
          ? respond(200, theConfiguration())
          : respond(200, [aRestaurant(BACARI)]),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the map pinned to the top while the cards travel under it", async () => {
    renderApp("/");

    const map = await screen.findByTestId("map");
    const pinned = map.closest("div.sticky");

    expect(pinned).not.toBeNull();
    expect(pinned).toHaveClass("sticky", "top-0");

    // The cards are outside what is pinned, which is what lets them scroll past.
    const card = screen.getByRole("heading", { name: "Bacari" });
    expect(pinned?.contains(card)).toBe(false);
  });
});
