import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";

import type { Restaurant, RestaurantDraft } from "@/api/types";
import { authenticated } from "@/session/session";

// There is exactly one List per owner and nothing stores it, so the key names
// the restaurants rather than a list.
export const restaurantsKey = ["restaurants"] as const;

export function useRestaurants(): UseQueryResult<Restaurant[]> {
  return useQuery({
    queryKey: restaurantsKey,
    queryFn: () => authenticated<Restaurant[]>("/restaurants"),
  });
}

export function useAddRestaurant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (draft: RestaurantDraft) =>
      authenticated<Restaurant>("/restaurants", {
        method: "POST",
        body: { restaurant: draft },
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
