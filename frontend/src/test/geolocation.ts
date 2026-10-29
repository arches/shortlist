import { vi, type Mock } from "vitest";

// jsdom implements no Geolocation API at all, so `navigator.geolocation` is
// absent until a test puts one there. That absence is the default every suite
// runs under, and it is the same fallback a decline gets — see ASSUMPTIONS.md,
// "Anything other than a decline" — which is why every existing map test still
// opens on the first restaurant without saying so.
//
// shortlist.stack.md leaves End-to-end tests TBD, and this is the hole that
// leaves: nothing here proves a real browser ever shows a permission prompt.
// What it proves is what Shortlist does with each answer.

type Success = (position: { coords: { latitude: number; longitude: number } }) => void;
type Failure = (error: { code: number }) => void;

// The codes the Geolocation API refuses with. A decline is the only one the
// scenarios name; the other two are the assumed fallback.
export const PERMISSION_DENIED = 1;
export const POSITION_UNAVAILABLE = 2;
export const TIMED_OUT = 3;

// Each helper returns the mock standing in for getCurrentPosition, so a test
// can count how many times Shortlist asked.
function geolocation(getCurrentPosition: Mock): Mock {
  Object.defineProperty(window.navigator, "geolocation", {
    value: { getCurrentPosition },
    configurable: true,
  });

  return getCurrentPosition;
}

// "Given I shared my location in Silverlake".
export function sharesLocation(point: { lat: number; lng: number }): Mock {
  return geolocation(
    vi.fn((success: Success) =>
      success({ coords: { latitude: point.lat, longitude: point.lng } }),
    ),
  );
}

// "Given I declined to share my location".
export function declinesLocation(): Mock {
  return locationRefused(PERMISSION_DENIED);
}

// Not a decline: the browser was willing and could not answer.
export function locationRefused(code: number): Mock {
  return geolocation(vi.fn((_success: Success, failure?: Failure) => failure?.({ code })));
}

// The prompt is open and the owner has answered neither way, so neither
// callback is ever called. See ASSUMPTIONS.md, "When the map waits for the
// owner's location".
export function locationPromptUnanswered(): Mock {
  return geolocation(vi.fn(() => undefined));
}

// Back to jsdom's own state, which is a browser with no Geolocation API.
export function forgetGeolocation(): void {
  Reflect.deleteProperty(window.navigator, "geolocation");
}
