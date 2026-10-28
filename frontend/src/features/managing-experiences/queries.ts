import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";

import type { Experience, ExperienceDraft } from "@/api/types";
import { restaurantsKey } from "@/features/managing-my-list/queries";
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

// Recording an experience is what makes a restaurant read as visited, and
// visited is derived from the experience count rather than stored — so the list
// is stale the moment one is recorded, and both have to be invalidated.
function useExperienceMutation<Variables>(
  restaurantId: number,
  mutationFn: (variables: Variables) => Promise<unknown>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: experiencesKey(restaurantId) }),
        queryClient.invalidateQueries({ queryKey: restaurantsKey }),
      ]);
    },
  });
}

export function useRecordExperience(restaurantId: number) {
  return useExperienceMutation(restaurantId, (draft: ExperienceDraft) =>
    authenticated<Experience>(`/restaurants/${restaurantId}/experiences`, {
      method: "POST",
      body: { experience: draft },
    }),
  );
}

export function useChangeExperience(restaurantId: number) {
  return useExperienceMutation(
    restaurantId,
    ({ id, draft }: { id: number; draft: ExperienceDraft }) =>
      authenticated<Experience>(`/restaurants/${restaurantId}/experiences/${id}`, {
        method: "PATCH",
        body: { experience: draft },
      }),
  );
}
