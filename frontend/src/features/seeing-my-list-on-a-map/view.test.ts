import { describe, expect, it } from "vitest";

import { aRestaurant } from "@/features/managing-my-list/testing";

import {
  boundsOf,
  EMPTY_LIST_CENTRE,
  EMPTY_LIST_ZOOM,
  located,
  ONE_RESTAURANT_ZOOM,
  viewOf,
} from "./view";
import { aLocatedRestaurant } from "./testing";

// Derived from seeing-my-list-on-a-map.scenarios.md: "Then I see a map
// encompassing my restaurants". What encompassing comes to is arithmetic over
// the list, and this is the half of the map that can be checked without Google.
describe("the restaurants that can be drawn", () => {
  it("keeps the ones Google gave a point for" , () => {
    const bacari = aLocatedRestaurant({ name: "Bacari", latitude: 34.09, longitude: -118.27 });

    expect(located([bacari]).map((r) => r.name)).toEqual(["Bacari"]);
  });

  // A Place Google had no location for, and every row added before the map
  // existed — see ASSUMPTIONS.md, "Coordinates for restaurants already on a
  // list". It is on the list, and not on the map.
  it("leaves out a restaurant with no coordinates" , () => {
    const lilia = aRestaurant({ name: "Lilia" });

    expect(located([lilia])).toEqual([]);
  });

  it("leaves out a restaurant with only one of the pair" , () => {
    const half = aRestaurant({ name: "Half", latitude: 34.09, longitude: null });

    expect(located([half])).toEqual([]);
  });

  it("has nothing to draw before the list has loaded" , () => {
    expect(located(undefined)).toEqual([]);
  });
});

describe("the bounds that encompass them", () => {
  it("reaches the furthest restaurant on every side", () => {
    const bounds = boundsOf([
      aLocatedRestaurant({ latitude: 34.09, longitude: -118.27 }),
      aLocatedRestaurant({ latitude: 40.72, longitude: -73.99 }),
      aLocatedRestaurant({ latitude: 25.76, longitude: -80.19 }),
    ]);

    expect(bounds).toEqual({ north: 40.72, south: 25.76, east: -73.99, west: -118.27 });
  });

  it("collapses onto the one restaurant there is", () => {
    const bounds = boundsOf([aLocatedRestaurant({ latitude: 34.09, longitude: -118.27 })]);

    expect(bounds).toEqual({ north: 34.09, south: 34.09, east: -118.27, west: -118.27 });
  });

  it("has none at all for no restaurants", () => {
    expect(boundsOf([])).toBeUndefined();
  });
});

describe("the view the map opens at", () => {
  it("fits the bounds when there is an extent to fit", () => {
    const view = viewOf([
      aLocatedRestaurant({ latitude: 34.09, longitude: -118.27 }),
      aLocatedRestaurant({ latitude: 40.72, longitude: -73.99 }),
    ]);

    expect(view).toEqual({
      fit: "bounds",
      bounds: { north: 40.72, south: 34.09, east: -73.99, west: -118.27 },
    });
  });

  // One restaurant has no extent, so bounds would zoom as far as the map goes.
  // See ASSUMPTIONS.md, "What the map shows when there is nothing to encompass".
  it("centres on the one restaurant there is", () => {
    const view = viewOf([aLocatedRestaurant({ latitude: 34.09, longitude: -118.27 })]);

    expect(view).toEqual({
      fit: "point",
      centre: { lat: 34.09, lng: -118.27 },
      zoom: ONE_RESTAURANT_ZOOM,
    });
  });

  it("centres on two restaurants that are in the same spot", () => {
    const view = viewOf([
      aLocatedRestaurant({ latitude: 34.09, longitude: -118.27 }),
      aLocatedRestaurant({ latitude: 34.09, longitude: -118.27 }),
    ]);

    expect(view).toEqual({
      fit: "point",
      centre: { lat: 34.09, lng: -118.27 },
      zoom: ONE_RESTAURANT_ZOOM,
    });
  });

  it("opens wide when there is nothing to encompass", () => {
    expect(viewOf([])).toEqual({
      fit: "point",
      centre: EMPTY_LIST_CENTRE,
      zoom: EMPTY_LIST_ZOOM,
    });
  });

  it("ignores the restaurants it cannot draw", () => {
    const view = viewOf([
      aRestaurant({ name: "Lilia" }),
      aLocatedRestaurant({ latitude: 34.09, longitude: -118.27 }),
    ]);

    expect(view).toEqual({
      fit: "point",
      centre: { lat: 34.09, lng: -118.27 },
      zoom: ONE_RESTAURANT_ZOOM,
    });
  });
});
