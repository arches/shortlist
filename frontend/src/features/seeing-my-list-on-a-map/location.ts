import { useQuery } from "@tanstack/react-query";

import type { Point } from "./view";

// seeing-my-list-on-a-map.scenarios.md puts the ask in the feature's own
// Background — "I have been asked to share my browser location" — and names two
// answers: "I shared my location in Silverlake", and "I declined to share my
// location". This is where the asking happens.
//
// shortlist.context.d2 draws the location as one flow, user to Shortlist, and
// draws no arrow carrying it onward. So it stays in the browser: nothing sends
// it to the API, and shortlist.data.md has no attribute to store it in. See
// ASSUMPTIONS.md, "Where the owner's location goes".

export const ownerLocationKey = ["owner-location"] as const;

// A point when the owner shared one, and null when they did not. Null covers
// every cause rather than only the decline the scenario names — a browser with
// no Geolocation API, a position that cannot be fixed, a read that timed out —
// because the map does the same thing with all of them. See ASSUMPTIONS.md,
// "Anything other than a decline".
//
// This never rejects, which is why it is not an error state further up: the
// fallback is the specified behaviour rather than a failure to report.
export function readOwnerLocation(): Promise<Point | null> {
  const geolocation: Geolocation | undefined = navigator.geolocation;

  if (geolocation === undefined) return Promise.resolve(null);

  return new Promise((resolve) => {
    geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
      () => resolve(null),
    );
  });
}

// Read once and kept for the life of the page: nothing in the set asks the map
// to follow an owner who is moving, and leaving the list screen and coming back
// should not ask the browser again. See ASSUMPTIONS.md, "How the owner's
// location is read".
//
// `data` is the whole of the state. A point is a location shared, null is one
// that will not be had, and undefined is a prompt still open.
export function useOwnerLocation() {
  return useQuery({
    queryKey: ownerLocationKey,
    queryFn: readOwnerLocation,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
