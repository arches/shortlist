import { useQuery } from "@tanstack/react-query";

import type { Configuration } from "@/api/types";
import { request } from "@/api/client";

// shortlist.principles.md: the API serves this unauthenticated, because the
// frontend needs it before anybody has signed in — so it goes through the
// client directly rather than the session wrapper, and carries no token.
export const configurationKey = ["configuration"] as const;

// Configuration does not change while the page is open, so it is fetched once
// and never refetched.
export function useConfiguration() {
  return useQuery({
    queryKey: configurationKey,
    queryFn: () => request<Configuration>("/configuration"),
    staleTime: Infinity,
  });
}
