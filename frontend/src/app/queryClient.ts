import { QueryClient } from "@tanstack/react-query";

import { SessionEnded } from "@/session/session";

// A session that has ended is not a transient failure, so retrying it would
// only delay asking the owner to sign in. Everything else gets one retry.
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => !(error instanceof SessionEnded) && failureCount < 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
