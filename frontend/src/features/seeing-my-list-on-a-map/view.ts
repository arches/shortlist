import type { Restaurant } from "@/api/types";

// seeing-my-list-on-a-map.scenarios.md: "I see a map centered around my
// location at zoom level 10", falling back to "the first restaurant in the
// list" when the owner shares nothing. Which point that comes to is arithmetic
// over the list and one shared point — the half of the map that can be tested
// without Google.

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

// "at zoom level 10" — one number, wherever the map opens and however far
// apart the list is. The owner moves the map from there themselves.
export const OPENING_ZOOM = 10;

// An owner who shared nothing and has an empty list has no point to be centred
// around at all, and no artifact says where the map opens instead — see
// ASSUMPTIONS.md, "Where the map opens when the list is empty".
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

// The view the map opens at. The centre has two sources and the owner's own
// location wins: "I shared my location in Silverlake ... Then I see a map
// centered around my location at zoom level 10", against "I declined to share
// my location ... Then the map is centered on the first restaurant in the
// list".
//
// "The first restaurant on my list" is the order the list holds them in, which
// is the order the API serves them — but a restaurant with no coordinates has
// no point to centre on, so what it comes to is the first one that can be
// drawn. See ASSUMPTIONS.md, "Which restaurant the map opens on".
//
// `shared` absent covers both halves of the fallback: the owner who declined,
// and the answer that has not arrived yet.
export function viewOf(restaurants: Restaurant[] | undefined, shared?: Point | null): MapView {
  const [first] = located(restaurants);

  return {
    centre: shared ?? (first === undefined ? EMPTY_LIST_CENTRE : pointOf(first)),
    zoom: OPENING_ZOOM,
  };
}
