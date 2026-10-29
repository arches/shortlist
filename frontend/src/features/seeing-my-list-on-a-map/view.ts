import type { Restaurant } from "@/api/types";

// seeing-my-list-on-a-map.scenarios.md: "Then I see a map encompassing my
// restaurants". Working out what "encompassing" comes to is pure arithmetic over
// the list, which is the half of the map that can be tested without Google.

// A restaurant Google gave a point for. The pair is optional on a Restaurant —
// absent for a Place with no location, and for every row added before the map
// existed — and a restaurant without one is not on the map at all.
export interface LocatedRestaurant extends Restaurant {
  latitude: number;
  longitude: number;
}

export interface Point {
  lat: number;
  lng: number;
}

export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

// One restaurant has no extent to fit, so it gets a centre and a zoom close
// enough to read the streets around it. An empty list has neither, so it gets
// the whole world rather than a map of nowhere in particular. Neither number is
// in an artifact — see ASSUMPTIONS.md, "What the map shows when there is
// nothing to encompass".
export const ONE_RESTAURANT_ZOOM = 15;
export const EMPTY_LIST_ZOOM = 2;
export const EMPTY_LIST_CENTRE: Point = { lat: 0, lng: 0 };

export type MapView =
  | { fit: "bounds"; bounds: Bounds }
  | { fit: "point"; centre: Point; zoom: number };

export function isLocated(restaurant: Restaurant): restaurant is LocatedRestaurant {
  return restaurant.latitude !== null && restaurant.longitude !== null;
}

// The restaurants that can be drawn, in the order the list holds them.
export function located(restaurants: Restaurant[] | undefined): LocatedRestaurant[] {
  return (restaurants ?? []).filter(isLocated);
}

export function pointOf(restaurant: LocatedRestaurant): Point {
  return { lat: restaurant.latitude, lng: restaurant.longitude };
}

export function boundsOf(restaurants: LocatedRestaurant[]): Bounds | undefined {
  if (restaurants.length === 0) return undefined;

  const latitudes = restaurants.map((restaurant) => restaurant.latitude);
  const longitudes = restaurants.map((restaurant) => restaurant.longitude);

  return {
    north: Math.max(...latitudes),
    south: Math.min(...latitudes),
    east: Math.max(...longitudes),
    west: Math.min(...longitudes),
  };
}

// The view the map opens at. Two restaurants in the same spot have no extent
// either, so the test is whether the bounds have a size rather than how many
// restaurants produced them.
export function viewOf(restaurants: Restaurant[] | undefined): MapView {
  const drawable = located(restaurants);
  const bounds = boundsOf(drawable);

  if (bounds === undefined) {
    return { fit: "point", centre: EMPTY_LIST_CENTRE, zoom: EMPTY_LIST_ZOOM };
  }

  if (bounds.north === bounds.south && bounds.east === bounds.west) {
    return {
      fit: "point",
      centre: { lat: bounds.north, lng: bounds.east },
      zoom: ONE_RESTAURANT_ZOOM,
    };
  }

  return { fit: "bounds", bounds };
}
