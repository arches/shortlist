import { screen } from "@testing-library/react";

import type { Configuration, Restaurant } from "@/api/types";
import { aRestaurant } from "@/features/managing-my-list/testing";

import type { LocatedRestaurant } from "./view";

// A restaurant Google gave a point for. The pair is absent by default on
// aRestaurant, because most of what the list does has nothing to do with where
// a restaurant is.
export function aLocatedRestaurant(
  attributes: Partial<Restaurant> & { latitude: number; longitude: number },
): LocatedRestaurant {
  return { ...aRestaurant(attributes), ...attributes };
}

// What GET /api/configuration answers with.
export function theConfiguration(attributes: Partial<Configuration> = {}): Configuration {
  return {
    google_maps_api_key: "a-maps-key",
    google_maps_map_id: "a-map-id",
    ...attributes,
  };
}

// Bacari, at 3626 Sunset Blvd, is the restaurant the feature's own Background
// puts on the list.
export const BACARI = {
  name: "Bacari",
  address_line_1: "3626 Sunset Blvd",
  city: "Los Angeles",
  state: "CA",
  postal_code: "90026",
  latitude: 34.0901,
  longitude: -118.2765,
} as const;

// Where the owner is standing in Scenario: See restaurants from my list — "I
// shared my location in Silverlake". Silverlake is the neighbourhood Bacari's
// own address is in, so the two points sit close together, which is what makes
// a test that confuses them worth writing.
export const SILVERLAKE = { lat: 34.0869, lng: -118.2702 } as const;

// The two halves of the page, picked out the way an owner points at them: a
// card by the restaurant it names, a pin by the same.
export function cardFor(name: string): HTMLElement {
  const card = screen.getByRole("heading", { name }).closest("[data-slot='card']");
  if (card === null) throw new Error(`no card for ${name}`);

  return card as HTMLElement;
}

export function pinFor(name: string): HTMLElement {
  return screen.getByRole("button", { name });
}
