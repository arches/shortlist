import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";

import type { PlaceSuggestion, Restaurant, RestaurantDraft } from "@/api/types";
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
    queryFn: () => authenticated<Restaurant[]>("/restaurants"),
  });
}

// A restaurant arrives as a Google Place. The Place ID is all Shortlist is
// sent; every other detail is Google's and the API caches it.
export function useAddRestaurant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (googlePlaceId: string) =>
      authenticated<Restaurant>("/restaurants", {
        method: "POST",
        body: { restaurant: { google_place_id: googlePlaceId } },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: restaurantsKey }),
  });
}

export function useChangeRestaurant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, draft }: { id: number; draft: RestaurantDraft }) =>
      authenticated<Restaurant>(`/restaurants/${id}`, {
        method: "PATCH",
        body: { restaurant: draft },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: restaurantsKey }),
  });
}

export function useTakeRestaurantOffTheList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      authenticated<null>(`/restaurants/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: restaurantsKey }),
  });
}
