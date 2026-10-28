import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { createAppRouter } from "./app/router";
import { createQueryClient } from "./app/queryClient";

import "./index.css";

const root = document.getElementById("root");

if (root) {
  const router = createAppRouter();
  const queryClient = createQueryClient();

  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
}
