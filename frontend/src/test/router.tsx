import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { render } from "@testing-library/react";

import { createQueryClient } from "@/app/queryClient";
import { createAppRouter } from "@/app/router";

// Mounts the real router at a real path, so route guards are exercised rather
// than described. Every screen test goes through here.
export function renderApp(at = "/") {
  window.history.replaceState({}, "", at);

  const router = createAppRouter();

  return render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}
