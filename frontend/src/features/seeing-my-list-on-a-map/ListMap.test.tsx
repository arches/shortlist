import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { aRestaurant } from "@/features/managing-my-list/testing";
import { forgetSession, rememberSession } from "@/session/store";
import {
  declinesLocation,
  forgetGeolocation,
  locationPromptUnanswered,
  locationRefused,
  POSITION_UNAVAILABLE,
  sharesLocation,
} from "@/test/geolocation";
import { requestAt, respond, stubFetch } from "@/test/http";
import { renderApp } from "@/test/router";

import { BACARI, SILVERLAKE, theConfiguration } from "./testing";
import { OPENING_ZOOM } from "./view";

import type { Mock } from "vitest";

// Derived from seeing-my-list-on-a-map.scenarios.md and the wireframe beside
// it. Background: I am signed in as the owner of my list, and Bacari is on my
// list at 3626 Sunset Blvd, Los Angeles, CA 90026.
//
// The Maps JS API is stood in for suite-wide — see src/test/google-maps.tsx.
// Nothing below proves Google drew a map; what it proves is which restaurants
// Shortlist asked it to draw, and what it told the map it may not do.
//
// jsdom implements no Geolocation API, so every test in this block runs as an
// owner who shares nothing, and the map falls back to the first restaurant the
// way Scenario: Location not shared requires. Where the owner's own location
// goes is the block at the foot of this file.
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

  // Scenario: Location not shared — "the map is centered on the first
  // restaurant in the list", at the zoom level the scenario above it names.
  // Bacari is first, and Lilia being a continent away does not widen the view.
  // Both still get a pin.
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

  // Manually panning and zooming is no longer out of scope, so the map is the
  // owner's to move — see ASSUMPTIONS.md, "What moving the map themselves comes
  // to". Whether a drag really pans is Google's to answer, and the End-to-end
  // tests row shortlist.stack.md leaves TBD is where that would be asked.
  it("lets the owner move the map themselves", async () => {
    serve([aRestaurant(BACARI)]);

    renderApp("/");

    const map = await screen.findByTestId("map");
    expect(map).toHaveAttribute("data-gesture-handling", "cooperative");
    expect(map).toHaveAttribute("data-zoom-control", "true");

    // Nothing suppresses the wheel, double-click zoom or the keyboard any more.
    expect(map).not.toHaveAttribute("data-scrollwheel");
    expect(map).not.toHaveAttribute("data-double-click-zoom-disabled");
    expect(map).not.toHaveAttribute("data-keyboard-shortcuts");
  });

  // Scenario: Scrolling the list depends on this one. A plain scroll has to
  // keep scrolling the page, or the cards cannot travel under a map stuck to
  // the top of it, which is what "cooperative" buys over "greedy".
  it("leaves the page's own scrolling alone", async () => {
    serve([aRestaurant(BACARI)]);

    renderApp("/");

    expect(await screen.findByTestId("map")).not.toHaveAttribute(
      "data-gesture-handling",
      "greedy",
    );
  });

  // The zoom buttons are the only chrome: the wireframe draws a bare map, and
  // street view, map type and fullscreen are not what came into scope.
  it("brings no other map chrome with them", async () => {
    serve([aRestaurant(BACARI)]);

    renderApp("/");

    expect(await screen.findByTestId("map")).toHaveAttribute("data-default-ui-disabled", "true");
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

// Scenario: See restaurants from my list, and Scenario: Location not shared.
// The feature's Background has the owner already asked — "I have been asked to
// share my browser location" — so what varies between these is only the answer.
//
// What a real browser does with a permission prompt is the End-to-end tests row
// shortlist.stack.md leaves TBD. What is checked here is where Shortlist opens
// the map once it has an answer.
describe("where the map opens", () => {
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
    forgetGeolocation();
    vi.unstubAllGlobals();
  });

  // "Given I shared my location in Silverlake ... Then I see a map centered
  // around my location at zoom level 10. And I see a pin for Bacari on the map.
  // And I see Bacari in the list"
  it("centres on the owner's location, with Bacari pinned and listed", async () => {
    sharesLocation(SILVERLAKE);
    serve([aRestaurant(BACARI)]);

    renderApp("/");

    const map = await screen.findByTestId("map");
    expect(map).toHaveAttribute("data-center", JSON.stringify(SILVERLAKE));
    expect(map).toHaveAttribute("data-zoom", String(OPENING_ZOOM));

    expect(screen.getByTestId("pin")).toHaveAttribute("data-title", "Bacari");
    expect(screen.getByRole("heading", { name: "Bacari" })).toBeInTheDocument();

    // "And I see a blue dot showing my location"
    expect(screen.getByTestId("my-location-dot")).toBeInTheDocument();
  });

  // The dot is blue, which is the whole of what the scenario says about how it
  // looks — the rest of it is ASSUMPTIONS.md, "What the blue dot is drawn as".
  // It sits where the owner is standing, which is close enough to Bacari's own
  // address to be worth checking apart from it.
  it("draws the dot blue, where the owner is standing", async () => {
    sharesLocation(SILVERLAKE);
    serve([aRestaurant(BACARI)]);

    renderApp("/");

    expect(await screen.findByTestId("my-location-dot")).toHaveClass("bg-blue-600");

    const me = screen.getByTestId("marker");
    expect(me).toHaveAttribute("data-position", JSON.stringify(SILVERLAKE));
    expect(me).toHaveAttribute("data-title", "My location");
  });

  // The owner is not a restaurant, so the dot is neither a pin nor something to
  // click. Bacari is still the only pin on the map.
  it("draws the owner as a dot rather than as a pin", async () => {
    sharesLocation(SILVERLAKE);
    serve([aRestaurant(BACARI)]);

    renderApp("/");

    await screen.findByTestId("my-location-dot");

    const pins = screen.getAllByTestId("pin");
    expect(pins).toHaveLength(1);
    expect(pins[0]).toHaveAttribute("data-title", "Bacari");
  });

  // Nothing on the list to fall back to, and the owner's location is the centre
  // regardless.
  it("centres there even with nothing on the list", async () => {
    sharesLocation(SILVERLAKE);
    serve([]);

    renderApp("/");

    expect(await screen.findByTestId("map")).toHaveAttribute(
      "data-center",
      JSON.stringify(SILVERLAKE),
    );
  });

  // "Given I declined to share my location ... Then the map is centered on the
  // first restaurant in the list"
  it("centres on the first restaurant when the owner declined", async () => {
    declinesLocation();
    serve([
      aRestaurant(BACARI),
      aRestaurant({ id: 2, name: "Lilia", latitude: 40.7128, longitude: -73.9542 }),
    ]);

    renderApp("/");

    const map = await screen.findByTestId("map");
    expect(map).toHaveAttribute(
      "data-center",
      JSON.stringify({ lat: BACARI.latitude, lng: BACARI.longitude }),
    );
    expect(map).toHaveAttribute("data-zoom", String(OPENING_ZOOM));

    // "And there is no blue dot showing my location"
    expect(screen.queryByTestId("my-location-dot")).not.toBeInTheDocument();
  });

  // One fallback for every cause — see ASSUMPTIONS.md, "Anything other than a
  // decline". A browser that could not fix the position is not a browser the
  // owner refused with, and the map does the same thing with both, dot
  // included: there is no location to show either way.
  it("centres on the first restaurant when the position cannot be fixed", async () => {
    locationRefused(POSITION_UNAVAILABLE);
    serve([aRestaurant(BACARI)]);

    renderApp("/");

    expect(await screen.findByTestId("map")).toHaveAttribute(
      "data-center",
      JSON.stringify({ lat: BACARI.latitude, lng: BACARI.longitude }),
    );
    expect(screen.queryByTestId("my-location-dot")).not.toBeInTheDocument();
  });

  // The third of the same fallback: a browser with no Geolocation API at all
  // was never asked, so it has nothing to show either.
  it("shows no dot in a browser that cannot locate anybody", async () => {
    forgetGeolocation();
    serve([aRestaurant(BACARI)]);

    renderApp("/");

    await screen.findByTestId("map");

    expect(screen.queryByTestId("my-location-dot")).not.toBeInTheDocument();
  });

  // The prompt is open and the owner has answered neither way. The map opens
  // once and cannot take its centre back, so it waits — see ASSUMPTIONS.md,
  // "When the map waits for the owner's location". The list is not waiting with
  // it.
  it("waits while the prompt is still open, and lists the restaurants anyway", async () => {
    locationPromptUnanswered();
    serve([aRestaurant(BACARI)]);

    renderApp("/");

    expect(await screen.findByRole("heading", { name: "Bacari" })).toBeInTheDocument();
    expect(screen.getByText("Opening the map…")).toBeInTheDocument();
    expect(screen.queryByTestId("map")).not.toBeInTheDocument();
  });

  // shortlist.context.d2 draws the location as one flow, user to Shortlist, and
  // nothing carrying it onward — see ASSUMPTIONS.md, "Where the owner's
  // location goes". No request mentions it.
  it("sends the owner's location nowhere", async () => {
    sharesLocation(SILVERLAKE);
    serve([aRestaurant(BACARI)]);

    renderApp("/");

    await screen.findByTestId("map");

    const sent = fetchMock.mock.calls.map((call) => JSON.stringify(call)).join(" ");
    expect(sent).not.toContain(String(SILVERLAKE.lat));
    expect(sent).not.toContain(String(SILVERLAKE.lng));
  });
});
