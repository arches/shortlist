import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";

import type { PlaceSuggestion, Restaurant } from "@/api/types";
import { authenticated } from "@/session/session";

// There is exactly one List per owner, so nothing identifies it in the key.
export const restaurantsKey = ["restaurants"] as const;

// The owner is part-way through typing, so a short query asks for nothing —
// see ASSUMPTIONS.md, "When autocomplete asks Google".
const MINIMUM_QUERY_LENGTH = 2;

export function usePlaceSuggestions(query: string) {
  const trimmed = query.trim();

  return useQuery({
    queryKey: ["place-suggestions", trimmed] as const,
    queryFn: () =>
      authenticated<PlaceSuggestion[]>(
        `/places/suggestions?q=${encodeURIComponent(trimmed)}`,
      ),
    enabled: trimmed.length >= MINIMUM_QUERY_LENGTH,
    staleTime: 60_000,
  });
}

export function useRestaurants(): UseQueryResult<Restaurant[]> {
  return useQuery({
    queryKey: restaurantsKey,
    queryFn: () => authenticated<Restaurant[]>("/list/restaurants"),
  });
}

// A restaurant arrives as a Google Place, and the note arrives with it. The
// Place ID and the note are all Shortlist is sent; every other detail is
// Google's and the API caches it.
//
// managing-my-list.adding-a-restaurant.sequence.d2:
// POST /list/restaurants { google_place_id, note }.
export function useAddRestaurant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ googlePlaceId, note }: { googlePlaceId: string; note: string | null }) =>
      authenticated<Restaurant>("/list/restaurants", {
        method: "POST",
        body: { restaurant: { google_place_id: googlePlaceId, note: note } },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: restaurantsKey }),
  });
}

export function useTakeRestaurantOffTheList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      authenticated<null>(`/list/restaurants/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: restaurantsKey }),
  });
}
