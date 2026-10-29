import type { Restaurant } from "@/api/types";

// seeing-my-list-on-a-map.scenarios.md: "the map is at zoom level 10. And the
// map is centered around the first restaurant on my list". Which restaurant
// that is, and where it sits, is arithmetic over the list — the half of the map
// that can be tested without Google.

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

// "And the map is at zoom level 10" — one number, whatever is on the list and
// however far apart it is. The owner moves the map from there themselves.
export const OPENING_ZOOM = 10;

// An empty list has no first restaurant to be centred around, and no artifact
// says where the map opens instead — see ASSUMPTIONS.md, "Where the map opens
// when the list is empty".
export const EMPTY_LIST_CENTRE: Point = { lat: 0, lng: 0 };

export interface MapView {
  centre: Point;
  zoom: number;
}

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

// The view the map opens at. "The first restaurant on my list" is the order the
// list holds them in, which is the order the API serves them — but a restaurant
// with no coordinates has no point to centre on, so what it comes to is the
// first one that can be drawn. See ASSUMPTIONS.md, "Which restaurant the map
// opens on".
export function viewOf(restaurants: Restaurant[] | undefined): MapView {
  const [first] = located(restaurants);

  return {
    centre: first === undefined ? EMPTY_LIST_CENTRE : pointOf(first),
    zoom: OPENING_ZOOM,
  };
}
