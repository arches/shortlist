import "@testing-library/jest-dom/vitest";

import { vi } from "vitest";

// The Maps JS API needs a real browser, so it is stood in for everywhere rather
// than in the one suite that is about it — every screen test renders the list
// screen, and the list screen now holds a map. See src/test/google-maps.tsx.
vi.mock("@vis.gl/react-google-maps", () => import("./google-maps"));

// jsdom has no layout, so it does not implement this. The list scrolling a card
// into view is a named scenario, and this is what lets a test see it happen —
// see Selection.test.tsx.
//
// Guarded, because two suites run in the node environment, where there is no
// DOM at all: injected-config.test.ts reads the source files, and client.test.ts
// is about fetch.
if (typeof Element !== "undefined") {
  Element.prototype.scrollIntoView = vi.fn();
}
