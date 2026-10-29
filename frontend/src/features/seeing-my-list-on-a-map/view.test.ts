import { describe, expect, it } from "vitest";

import { aRestaurant } from "@/features/managing-my-list/testing";

import { EMPTY_LIST_CENTRE, located, OPENING_ZOOM, viewOf } from "./view";
import { aLocatedRestaurant } from "./testing";

// Derived from seeing-my-list-on-a-map.scenarios.md: "the map is at zoom level
// 10. And the map is centered around the first restaurant on my list". This is
// the half of the map that can be checked without Google.
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

describe("the view the map opens at", () => {
  it("centres on the first restaurant on the list", () => {
    const view = viewOf([
      aLocatedRestaurant({ name: "Bacari", latitude: 34.09, longitude: -118.27 }),
      aLocatedRestaurant({ name: "Lilia", latitude: 40.72, longitude: -73.99 }),
    ]);

    expect(view).toEqual({ centre: { lat: 34.09, lng: -118.27 }, zoom: OPENING_ZOOM });
  });

  // Zoom 10 whatever is on the list: the second restaurant being a continent
  // away does not widen it. The owner pans there themselves.
  it("opens at zoom 10 however far apart the restaurants are", () => {
    const near = viewOf([aLocatedRestaurant({ latitude: 34.09, longitude: -118.27 })]);
    const far = viewOf([
      aLocatedRestaurant({ latitude: 34.09, longitude: -118.27 }),
      aLocatedRestaurant({ latitude: 40.72, longitude: -73.99 }),
    ]);

    expect(near.zoom).toBe(10);
    expect(far.zoom).toBe(10);
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
