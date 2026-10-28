import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import type { Experience } from "@/api/types";
import { authenticated } from "@/session/session";

// Experiences nest under the restaurant they happened at, as the API has them:
// an Experience has no name and cannot be picked out by one, so the only handle
// on the set is the Restaurant.
export function experiencesKey(restaurantId: number) {
  return ["restaurants", restaurantId, "experiences"] as const;
}

// The order comes from the API — most recent first by the day it happened,
// undated last — so nothing here sorts anything. One order, settled in one
// place.
export function useExperiences(restaurantId: number): UseQueryResult<Experience[]> {
  return useQuery({
    queryKey: experiencesKey(restaurantId),
    queryFn: () => authenticated<Experience[]>(`/restaurants/${restaurantId}/experiences`),
  });
}
