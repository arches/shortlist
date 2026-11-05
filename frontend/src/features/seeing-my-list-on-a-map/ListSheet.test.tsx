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
  dragTheSheet,
  listAlreadyScrolled,
  restAt,
  scrollTheList,
  theConfiguration,
  theSheet,
  whereTheSheetRests,
} from "./testing";
import { DRAG_TRAVEL } from "./sheet";
import type { DragDirection, SheetPosition } from "./sheet";

import type { Mock } from "vitest";

// Derived from list-screen.states.md — its Sheet column, and the detail table
// that gives the five results of moving the drag handle — and from Scenario:
// Scrolling the list in seeing-my-list-on-a-map.scenarios.md. The sheet in
// seeing-my-list-on-a-map.drawio is the third source: its own annotations say
// it cannot be dismissed and that the cards are clipped at its edge.
describe("the sheet", () => {
  let fetchMock: Mock;

  beforeEach(() => {
    fetchMock = stubFetch();
    window.localStorage.clear();
    forgetSession();
    rememberSession({ access_token: "access-one", refresh_token: "refresh-one", expires_in: 900 });
    fetchMock.mockImplementation((path: string) =>
      Promise.resolve(
        path.endsWith("/configuration")
          ? respond(200, theConfiguration())
          : respond(200, [aRestaurant(BACARI)]),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // "And the sheet rests at half"
  it("opens at half", async () => {
    renderApp("/");

    expect(await theSheet()).toHaveAttribute("data-position", "half");
  });

  // Scenario Outline: Changing how much map I can see, one case per row of the
  // Examples table. The last of them is the clamp: a sheet already at peek has
  // nowhere lower to go, which is the wireframe's "It cannot be dismissed".
  const cases: { before: SheetPosition; direction: DragDirection; after: SheetPosition }[] = [
    { before: "half", direction: "down", after: "peek" },
    { before: "half", direction: "up", after: "full" },
    { before: "peek", direction: "up", after: "half" },
    { before: "full", direction: "down", after: "half" },
    { before: "peek", direction: "down", after: "peek" },
  ];

  cases.forEach(({ before, direction, after }) => {
    it(`rests at ${after} when dragged ${direction} from ${before}`, async () => {
      renderApp("/");
      await restAt(before);

      await dragTheSheet(direction);

      expect(await theSheet()).toHaveAttribute("data-position", after);
    });
  });

  // list-screen.states.md, Drag the sheet: "Map: Unchanged" — the sheet moves
  // over the map rather than moving it.
  it("leaves the map where it was", async () => {
    renderApp("/");
    await restAt("half");

    await dragTheSheet("up");

    const map = screen.getByTestId("map");
    expect(map.dataset.movedTo).toBeUndefined();
    expect(map.dataset.zoom).toBe("13");
  });

  // A tap on the handle is not a drag that went nowhere.
  it("stays where it is when the gesture was too short to be a drag", async () => {
    renderApp("/");
    await restAt("half");

    await dragTheSheet("up", DRAG_TRAVEL - 1);

    expect(await theSheet()).toHaveAttribute("data-position", "half");
  });

  // Nothing in the artifacts reaches the sheet without a pointer — see
  // ASSUMPTIONS.md, "What makes a drag count".
  it("moves on the arrow keys too", async () => {
    renderApp("/");
    await restAt("half");

    screen.getByRole("button", { name: "Resize the list" }).focus();
    await userEvent.keyboard("{ArrowDown}");

    expect(await theSheet()).toHaveAttribute("data-position", "peek");
  });

  // Scenario: Scrolling the list — "the restaurants move within the sheet",
  // "no restaurant appears outside the sheet", "the page itself does not
  // scroll".
  // list-screen.states.md, Scroll the list up: "Peek → Half, otherwise
  // Unchanged". The gesture that reveals more of the list opens the sheet far
  // enough to show it.
  describe("scrolling the list", () => {
    it("raises the sheet to half from peek", async () => {
      renderApp("/");
      await restAt("peek");

      await scrollTheList("up");

      expect(await whereTheSheetRests()).toBe("half");
    });

    it("leaves the sheet at half when it is already there", async () => {
      renderApp("/");
      await restAt("half");

      await scrollTheList("up");

      expect(await whereTheSheetRests()).toBe("half");
    });

    it("leaves the sheet at full", async () => {
      renderApp("/");
      await restAt("full");

      await scrollTheList("up");

      expect(await whereTheSheetRests()).toBe("full");
    });

    // Scroll the list down has its own row and leaves the sheet alone
    // everywhere. The sheet is closed by its handle, not by scrolling back to
    // the top of the list.
    it("leaves the sheet at peek when the list is scrolled down", async () => {
      renderApp("/");
      await restAt("peek");
      await listAlreadyScrolled();

      await scrollTheList("down");

      expect(await whereTheSheetRests()).toBe("peek");
    });

    it("leaves the sheet at full when the list is scrolled down", async () => {
      renderApp("/");
      await restAt("full");
      await listAlreadyScrolled();

      await scrollTheList("down");

      expect(await whereTheSheetRests()).toBe("full");
    });

    // list-screen.states.md, Scroll the list up: "Map: Unchanged".
    it("leaves the map where it was", async () => {
      renderApp("/");
      await restAt("peek");

      await scrollTheList("up");

      expect(screen.getByTestId("map").dataset.movedTo).toBeUndefined();
    });
  });

  it("scrolls the cards inside itself, clipped at its own edge", async () => {
    renderApp("/");
    await restAt("full");

    const sheet = await theSheet();
    const scrolls = cardFor("Bacari").closest("div.overflow-y-auto");

    expect(scrolls).not.toBeNull();
    expect(sheet.contains(scrolls)).toBe(true);

    // Bounded by the sheet rather than growing it, which is what clips a card
    // at the edge instead of letting it out.
    expect(scrolls).toHaveClass("min-h-0", "flex-1");
    expect(screen.getByRole("main")).toHaveClass("overflow-hidden");
  });
});
