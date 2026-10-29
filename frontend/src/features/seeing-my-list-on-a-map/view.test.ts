import { describe, expect, it } from "vitest";

import { aRestaurant } from "@/features/managing-my-list/testing";

import { EMPTY_LIST_CENTRE, located, OPENING_ZOOM, viewOf } from "./view";
import { aLocatedRestaurant, SILVERLAKE } from "./testing";

// Bacari, as the feature's Background places it, and the same point in the
// shape a centre takes.
const BACARI_POINT = { latitude: 34.0901, longitude: -118.2765 } as const;
const BACARI_POINT_AS_CENTRE = { lat: BACARI_POINT.latitude, lng: BACARI_POINT.longitude };

// Derived from seeing-my-list-on-a-map.scenarios.md: "I see a map centered
// around my location at zoom level 13", and the failure path that falls back to
// "the first restaurant in the list". This is the half of the map that can be
// checked without Google.
describe("the restaurants that can be drawn", () => {
  it("keeps the ones Google gave a point for", () => {
    const bacari = aLocatedRestaurant({ name: "Bacari", latitude: 34.09, longitude: -118.27 });

    expect(located([bacari]).map((r) => r.name)).toEqual(["Bacari"]);
  });

  // A Place Google had no location for, and every row added before the map
  // existed — see ASSUMPTIONS.md, "Coordinates for restaurants already on a
  // list". It is on the list, and not on the map.
  it("leaves out a restaurant with no coordinates", () => {
    const lilia = aRestaurant({ name: "Lilia" });

    expect(located([lilia])).toEqual([]);
  });

  it("leaves out a restaurant with only one of the pair", () => {
    const half = aRestaurant({ name: "Half", latitude: 34.09, longitude: null });

    expect(located([half])).toEqual([]);
  });

  it("has nothing to draw before the list has loaded", () => {
    expect(located(undefined)).toEqual([]);
  });
});

// Scenario: Location not shared — "the map is centered on the first restaurant
// in the list". Nothing shared is what every case in here passes.
describe("the view the map opens at, when the owner shared nothing", () => {
  it("centres on the first restaurant on the list", () => {
    const view = viewOf([
      aLocatedRestaurant({ name: "Bacari", latitude: 34.09, longitude: -118.27 }),
      aLocatedRestaurant({ name: "Lilia", latitude: 40.72, longitude: -73.99 }),
    ]);

    expect(view).toEqual({ centre: { lat: 34.09, lng: -118.27 }, zoom: OPENING_ZOOM });
  });

  // Zoom 13 whatever is on the list: the second restaurant being a continent
  // away does not widen it. The owner pans there themselves.
  it("opens at zoom 13 however far apart the restaurants are", () => {
    const near = viewOf([aLocatedRestaurant({ latitude: 34.09, longitude: -118.27 })]);
    const far = viewOf([
      aLocatedRestaurant({ latitude: 34.09, longitude: -118.27 }),
      aLocatedRestaurant({ latitude: 40.72, longitude: -73.99 }),
    ]);

    expect(near.zoom).toBe(13);
    expect(far.zoom).toBe(13);
  });

  it("centres on the one restaurant there is", () => {
    const view = viewOf([aLocatedRestaurant({ latitude: 34.09, longitude: -118.27 })]);

    expect(view).toEqual({ centre: { lat: 34.09, lng: -118.27 }, zoom: OPENING_ZOOM });
  });

  // The first restaurant on the list is not necessarily one the map can draw —
  // see ASSUMPTIONS.md, "Which restaurant the map opens on".
  it("centres on the first one it can draw when the first has no coordinates", () => {
    const view = viewOf([
      aRestaurant({ name: "Lilia" }),
      aLocatedRestaurant({ name: "Bacari", latitude: 34.09, longitude: -118.27 }),
    ]);

    expect(view).toEqual({ centre: { lat: 34.09, lng: -118.27 }, zoom: OPENING_ZOOM });
  });

  // See ASSUMPTIONS.md, "Where the map opens when the list is empty".
  it("has no restaurant to centre on when the list is empty", () => {
    expect(viewOf([])).toEqual({ centre: EMPTY_LIST_CENTRE, zoom: OPENING_ZOOM });
  });

  it("has none either before the list has loaded", () => {
    expect(viewOf(undefined)).toEqual({ centre: EMPTY_LIST_CENTRE, zoom: OPENING_ZOOM });
  });
});

// Scenario: See restaurants from my list — "Given I shared my location in
// Silverlake ... Then I see a map centered around my location at zoom level
// 10". The owner's own location is the centre, and the list only supplies pins.
describe("the view the map opens at, when the owner shared their location", () => {
  it("centres on where the owner is rather than on the first restaurant", () => {
    const view = viewOf([aLocatedRestaurant({ name: "Bacari", ...BACARI_POINT })], SILVERLAKE);

    expect(view).toEqual({ centre: SILVERLAKE, zoom: OPENING_ZOOM });
  });

  it("opens at zoom 13 there too", () => {
    expect(viewOf([aLocatedRestaurant(BACARI_POINT)], SILVERLAKE).zoom).toBe(13);
  });

  // The list has no say in the centre once the owner has shared a point, so an
  // empty one changes nothing.
  it("centres there with nothing on the list at all", () => {
    expect(viewOf([], SILVERLAKE)).toEqual({ centre: SILVERLAKE, zoom: OPENING_ZOOM });
  });

  // Declining and not having answered yet are the same absence here — see
  // ASSUMPTIONS.md, "When the map waits for the owner's location" for who does
  // the waiting.
  it("falls back to the list when the owner shared nothing", () => {
    const declined = viewOf([aLocatedRestaurant({ name: "Bacari", ...BACARI_POINT })], null);

    expect(declined).toEqual({ centre: BACARI_POINT_AS_CENTRE, zoom: OPENING_ZOOM });
  });
});
