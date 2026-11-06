import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { aRestaurant } from "@/features/managing-my-list/testing";
import { forgetSession, rememberSession } from "@/session/store";
import { respond, stubFetch } from "@/test/http";
import { renderApp } from "@/test/router";

import {
  BACARI,
  cameraMoves,
  cardFor,
  cardsScrolledTo,
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

  // Choosing in the sheet, which opens at full — the sheet dropping is half of
  // what list-screen.states.md's Tap a row says happens.
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

    // "→ Peek, scrolled to show selection". At peek there is room for one
    // card, so the chosen one goes to the top of what the sheet shows rather
    // than merely into view.
    it("shows the chosen restaurant in the sheet", async () => {
      renderApp("/");

      await screen.findByTestId("map");
      await restAt("full");
      await userEvent.click(cardFor("Bacari"));

      expect(cardsScrolledTo()).toEqual(["Bacari"]);
      expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: "start" });
    });

    // The Sheet cell names an act, the same as the Map cell beside it. An owner
    // who scrolled away from the row they chose and tapped it again is asking
    // to be brought back to it, so the sheet answers every time it arrives.
    it("scrolls to it again when the row already chosen is tapped", async () => {
      renderApp("/");

      await screen.findByTestId("map");
      await userEvent.click(cardFor("Bacari"));
      await userEvent.click(cardFor("Bacari"));

      expect(cardsScrolledTo()).toEqual(["Bacari", "Bacari"]);
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

    // list-screen.states.md answers Tap a row with "Center on selection, zoom
    // 13" every time it arrives, and says nothing about the restaurant having
    // to be a different one. An owner who panned away from the restaurant they
    // chose and tapped its row again is asking to be taken back.
    it("centres again when the row already chosen is tapped", async () => {
      renderApp("/");

      await screen.findByTestId("map");
      await userEvent.click(cardFor("Bacari"));

      const told = cameraMoves();

      await userEvent.click(cardFor("Bacari"));

      expect(cameraMoves()).toBe(told + 1);
      expect(screen.getByTestId("map")).toHaveAttribute("data-moved-to", centredOn(BACARI));
    });
  });

  // Choosing on the map. list-screen.states.md gives Tap a pin every cell Tap a
  // row has, so what used to be the one difference between the two — the sheet
  // — is now the thing they agree about.
  describe("on the map", () => {
    it("shows it in the sheet, and highlights it there", async () => {
      renderApp("/");

      await screen.findByTestId("map");
      await userEvent.click(pinFor("Bacari"));

      expect(cardsScrolledTo()).toEqual(["Bacari"]);
      expect(cardFor("Bacari")).toHaveAttribute("aria-current", "true");
    });

    // list-screen.states.md, Tap a pin: "Sheet: → Peek", the same as Tap a
    // row. The sheet used to stay at half here, on the reading that an owner
    // clicking a pin is already looking at the map; the table drops it out of
    // the way of the map it just centred instead.
    it("drops the sheet to peek", async () => {
      renderApp("/");

      await screen.findByTestId("map");
      await userEvent.click(pinFor("Bacari"));

      expect(await whereTheSheetRests()).toBe("peek");
    });

    // Already at peek, so there is nothing for the tap to move. Peek is where
    // the row above leaves it, which makes a second choice the reachable case.
    it("leaves the sheet at peek when it is already there", async () => {
      renderApp("/");

      await screen.findByTestId("map");
      await restAt("peek");
      await userEvent.click(pinFor("Bacari"));

      expect(await whereTheSheetRests()).toBe("peek");
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

    // The same again from the map's side. Tap a pin carries the same cell.
    it("centres again when the pin already chosen is clicked", async () => {
      renderApp("/");

      await screen.findByTestId("map");
      await userEvent.click(pinFor("Lilia"));

      const told = cameraMoves();

      await userEvent.click(pinFor("Lilia"));

      expect(cameraMoves()).toBe(told + 1);
      expect(screen.getByTestId("map")).toHaveAttribute("data-moved-to", centredOn(LILIA));
    });
  });

  // The four rows leaving "Selection: None" have no selection to show, and the
  // Sheet cell on each of them reads Unchanged or moves without scrolling. So
  // dropping the choice scrolls nothing, and the scroll cannot outlive the
  // selection it was an answer to.
  describe("when the choice is dropped", () => {
    it("scrolls nothing", async () => {
      renderApp("/");

      await screen.findByTestId("map");
      await userEvent.click(cardFor("Bacari"));
      vi.mocked(Element.prototype.scrollIntoView).mockClear();

      await userEvent.type(screen.getByRole("searchbox", { name: "Search my list" }), "ba");

      expect(cardsScrolledTo()).toEqual([]);
    });
  });

  // Nothing is chosen until the owner chooses something, so the map keeps the
  // view it opened at and no card is marked.
  describe("before anything is chosen", () => {
    it("centres nowhere and highlights nothing", async () => {
      renderApp("/");

      const map = await screen.findByTestId("map");

      expect(map).not.toHaveAttribute("data-moved-to");
      expect(cameraMoves()).toBe(0);
      expect(pinColours()).toEqual([undefined, undefined]);
      expect(cardFor("Bacari")).not.toHaveAttribute("aria-current");
      expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    });
  });
});
