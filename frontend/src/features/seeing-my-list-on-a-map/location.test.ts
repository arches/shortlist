import { afterEach, describe, expect, it } from "vitest";

import {
  declinesLocation,
  forgetGeolocation,
  locationPromptUnanswered,
  locationRefused,
  POSITION_UNAVAILABLE,
  sharesLocation,
  TIMED_OUT,
} from "@/test/geolocation";

import { readOwnerLocation } from "./location";
import { SILVERLAKE } from "./testing";

// Derived from seeing-my-list-on-a-map.scenarios.md, which names two answers to
// the ask in its Background: shared, and declined. What the map then does with
// each is ListMap.test.tsx; this is only the reading of it.
describe("asking the browser where the owner is", () => {
  afterEach(() => {
    forgetGeolocation();
  });

  // "Given I shared my location in Silverlake"
  it("answers with the point when the owner shared it", async () => {
    sharesLocation(SILVERLAKE);

    await expect(readOwnerLocation()).resolves.toEqual(SILVERLAKE);
  });

  // "Given I declined to share my location"
  it("answers with nothing when the owner declined", async () => {
    declinesLocation();

    await expect(readOwnerLocation()).resolves.toBeNull();
  });

  // The three below are one assumption, not three — see ASSUMPTIONS.md,
  // "Anything other than a decline". A refusal nobody chose gets the same
  // answer as the one somebody did.
  it("answers with nothing when the position cannot be fixed", async () => {
    locationRefused(POSITION_UNAVAILABLE);

    await expect(readOwnerLocation()).resolves.toBeNull();
  });

  it("answers with nothing when the read times out", async () => {
    locationRefused(TIMED_OUT);

    await expect(readOwnerLocation()).resolves.toBeNull();
  });

  // jsdom's own state, and a real browser that has no Geolocation API or has it
  // switched off. Nothing is asked, because there is nothing to ask.
  it("answers with nothing when the browser has no geolocation at all", async () => {
    await expect(readOwnerLocation()).resolves.toBeNull();
  });

  it("asks the browser once, rather than watching the owner move", () => {
    const asked = sharesLocation(SILVERLAKE);

    void readOwnerLocation();

    expect(asked).toHaveBeenCalledTimes(1);
  });

  // The prompt is open and the owner has answered neither way. Nothing resolves,
  // which is what leaves the map waiting — see ASSUMPTIONS.md, "When the map
  // waits for the owner's location".
  it("has no answer at all while the prompt is still open", async () => {
    locationPromptUnanswered();

    const settled = await Promise.race([
      readOwnerLocation().then(() => "answered"),
      Promise.resolve("still waiting"),
    ]);

    expect(settled).toBe("still waiting");
  });
});
