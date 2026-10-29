import "@testing-library/jest-dom/vitest";

import { vi } from "vitest";

// The Maps JS API needs a real browser, so it is stood in for everywhere rather
// than in the one suite that is about it — every screen test renders the list
// screen, and the list screen now holds a map. See src/test/google-maps.tsx.
vi.mock("@vis.gl/react-google-maps", () => import("./google-maps"));
