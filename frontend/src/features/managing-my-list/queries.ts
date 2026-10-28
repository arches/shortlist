import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import type { Restaurant } from "@/api/types";
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
