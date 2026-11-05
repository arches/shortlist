import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { aRestaurant } from "@/features/managing-my-list/testing";
import { forgetSession, rememberSession } from "@/session/store";
import { respond, stubFetch } from "@/test/http";
import { renderApp } from "@/test/router";

import {
  BACARI,
  cardFor,
  PIN_COLOURS,
  pinColourFor,
  pinColours,
  pinFor,
  restAt,
  theConfiguration,
  whereTheSheetRests,
} from "./testing";
import { OPENING_ZOOM } from "./view";

import type { Mock } from "vitest";

// Derived from the two selection scenarios in
// seeing-my-list-on-a-map.scenarios.md. Both move the other half of the page,
// which is why selection lives on the screen that holds map and list together.
//
// Background: Bacari is on my list at 3626 Sunset Blvd, Los Angeles, CA 90026.
// Lilia is the second restaurant, so there is something for a highlight to be
// distinguished from.
const LILIA = { id: 2, name: "Lilia", latitude: 40.7128, longitude: -73.9542 };

// list-screen.states.md: "Center on selection, zoom 13". Both halves together,
// which is what makes this a camera move rather than a pan.
function centredOn({ latitude, longitude }: { latitude: number; longitude: number }): string {
  return JSON.stringify({ center: { lat: latitude, lng: longitude }, zoom: OPENING_ZOOM });
}

describe("choosing a restaurant", () => {
  let fetchMock: Mock;

  beforeEach(() => {
    fetchMock = stubFetch();
    window.localStorage.clear();
    forgetSession();
    rememberSession({ access_token: "access-one", refresh_token: "refresh-one", expires_in: 900 });
    vi.mocked(Element.prototype.scrollIntoView).mockClear();

    fetchMock.mockImplementation((path: string) =>
      Promise.resolve(
        String(path).endsWith("/configuration")
          ? respond(200, theConfiguration())
          : respond(200, [aRestaurant({ ...BACARI, id: 1 }), aRestaurant(LILIA)]),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Scenario: Selecting a restaurant on the list, which opens at full — the
  // sheet dropping is half of what the scenario is about.
  describe("on the list", () => {
    it("centres the map on it, and highlights its pin", async () => {
      renderApp("/");

      await screen.findByTestId("map");
      await restAt("full");
      await userEvent.click(cardFor("Bacari"));

      expect(screen.getByTestId("map")).toHaveAttribute("data-moved-to", centredOn(BACARI));

      expect(pinColourFor("Bacari")).toBe(PIN_COLOURS.highlighted);
    });

    // The zoom travels with the centre rather than being left where the owner
    // left it: list-screen.states.md names both, "Center on selection, zoom
    // 13", the same way it names the opening view and Locate-me.
    it("sets the zoom to 13 as it centres", async () => {
      renderApp("/");

      await screen.findByTestId("map");
      await userEvent.click(cardFor("Bacari"));

      const camera = screen.getByTestId("map").dataset.movedTo;
      expect(camera).toBeDefined();
      expect(JSON.parse(camera ?? "{}")).toMatchObject({ zoom: OPENING_ZOOM });
    });

    it("leaves every other pin standard", async () => {
      renderApp("/");

      await screen.findByTestId("map");
      await userEvent.click(cardFor("Bacari"));

      expect(pinColourFor("Lilia")).toBeUndefined();
    });

    it("highlights the card it was chosen from", async () => {
      renderApp("/");

      await screen.findByTestId("map");
      await userEvent.click(cardFor("Bacari"));

      expect(cardFor("Bacari")).toHaveAttribute("aria-current", "true");
      expect(cardFor("Lilia")).not.toHaveAttribute("aria-current");
    });

    // "Then the sheet drops to peek" — so the map it just panned is uncovered.
    it("drops the sheet to peek", async () => {
      renderApp("/");

      await screen.findByTestId("map");
      await restAt("full");
      await userEvent.click(cardFor("Bacari"));

      expect(await whereTheSheetRests()).toBe("peek");
    });

    // "And Bacari is the restaurant showing in the sheet". At peek there is
    // room for one, so the chosen card goes to the top of what the sheet shows
    // rather than merely into view.
    it("shows the chosen restaurant in the sheet", async () => {
      renderApp("/");

      await screen.findByTestId("map");
      await restAt("full");
      await userEvent.click(cardFor("Bacari"));

      expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: "start" });
    });

    it("moves the choice when a second restaurant is chosen", async () => {
      renderApp("/");

      await screen.findByTestId("map");
      await restAt("full");
      await userEvent.click(cardFor("Bacari"));
      await userEvent.click(cardFor("Lilia"));

      expect(cardFor("Lilia")).toHaveAttribute("aria-current", "true");
      expect(cardFor("Bacari")).not.toHaveAttribute("aria-current");
      expect(screen.getByTestId("map")).toHaveAttribute("data-moved-to", centredOn(LILIA));
    });
  });

  // Scenario: Selecting a restaurant on the map, which opens at half — where
  // the sheet stays, because the owner is already looking at the map.
  describe("on the map", () => {
    it("shows it in the sheet, and highlights it there", async () => {
      renderApp("/");

      await screen.findByTestId("map");
      await userEvent.click(pinFor("Bacari"));

      expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: "start" });
      expect(cardFor("Bacari")).toHaveAttribute("aria-current", "true");
    });

    // "And the sheet stays at half" — the one thing that tells the two
    // selection scenarios apart.
    it("leaves the sheet at half", async () => {
      renderApp("/");

      await screen.findByTestId("map");
      await userEvent.click(pinFor("Bacari"));

      expect(await whereTheSheetRests()).toBe("half");
    });

    it("highlights the pin that was clicked", async () => {
      renderApp("/");

      await screen.findByTestId("map");
      await userEvent.click(pinFor("Bacari"));

      expect(pinColourFor("Bacari")).toBe(PIN_COLOURS.highlighted);
    });

    it("centres the map on what was clicked", async () => {
      renderApp("/");

      await screen.findByTestId("map");
      await userEvent.click(pinFor("Lilia"));

      expect(screen.getByTestId("map")).toHaveAttribute("data-moved-to", centredOn(LILIA));
    });
  });

  // Nothing is chosen until the owner chooses something, so the map keeps the
  // view it opened at and no card is marked.
  describe("before anything is chosen", () => {
    it("centres nowhere and highlights nothing", async () => {
      renderApp("/");

      const map = await screen.findByTestId("map");

      expect(map).not.toHaveAttribute("data-moved-to");
      expect(pinColours()).toEqual([undefined, undefined]);
      expect(cardFor("Bacari")).not.toHaveAttribute("aria-current");
      expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    });
  });
});
