import type { Experience } from "@/api/types";
import type { Restaurant } from "@/api/types";
import { aRestaurant } from "@/features/managing-my-list/testing";
import { respond } from "@/test/http";

import type { Mock } from "vitest";

// An Experience as the API sends one, with every optional attribute at its
// absent value so a test states only what it is about. recorded_at is always
// there — an experience has a day it was written down even when it carries no
// day it happened on.
export function anExperience(attributes: Partial<Experience> = {}): Experience {
  return {
    id: 1,
    restaurant_id: 4,
    user_id: 1,
    rating: null,
    notes: null,
    occurred_on: null,
    recorded_at: "2026-10-20T18:00:00.000Z",
    updated_at: "2026-10-20T18:00:00.000Z",
    ...attributes,
  };
}

// The two requests a restaurant's own screen makes: the list it finds the
// restaurant in, and that restaurant's experiences. The client resolves against
// /api, which is what a relative path means under shortlist.principles.md — the
// API's address is inferred from where the frontend runs, never injected.
export function screenShows(
  fetchMock: Mock,
  { restaurants, experiences }: { restaurants: Restaurant[]; experiences: Experience[] },
) {
  fetchMock.mockImplementation((path: string) => {
    if (path === "/api/list/restaurants") return Promise.resolve(respond(200, restaurants));
    if (path.endsWith("/experiences")) return Promise.resolve(respond(200, experiences));

    return Promise.resolve(respond(200, null));
  });
}

// The restaurant the wireframe draws this screen for.
export function joesPizza(attributes: Partial<Restaurant> = {}): Restaurant {
  return aRestaurant({
    id: 4,
    name: "Joe's Pizza",
    cuisine: "Pizza",
    visited: true,
    experience_count: 3,
    ...attributes,
  });
}
