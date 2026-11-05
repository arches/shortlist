import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { aRestaurant } from "@/features/managing-my-list/testing";
import {
  cardFor,
  PIN_COLOURS,
  pinColourFor,
  restAt,
  theConfiguration,
  whereTheSheetRests,
} from "@/features/seeing-my-list-on-a-map/testing";
import { forgetSession, rememberSession } from "@/session/store";
import { respond, stubFetch } from "@/test/http";
import { renderApp } from "@/test/router";

import type { Mock } from "vitest";

// Derived from finding-a-restaurant-on-my-list.scenarios.md. Its Background is
// the list below, and the field is the one
// seeing-my-list-on-a-map.drawio draws in the floating row.
//
// The three carry coordinates because the scenarios are about the map as well
// as the list: "<match> is all that is pinned on the map".
const BACARI = aRestaurant({
  id: 1,
  name: "Bacari",
  note: "Go before 7pm",
  visited: true,
  experience_count: 1,
  latitude: 34.0901,
  longitude: -118.2765,
});

const SOBAN = aRestaurant({
  id: 2,
  name: "Soban",
  note: "Famous for their bibimbap",
  latitude: 34.0617,
  longitude: -118.3,
});

const TACOS = aRestaurant({
  id: 3,
  name: "Tacos El Bronco",
  visited: true,
  experience_count: 2,
  latitude: 34.0,
  longitude: -118.2,
});

describe("searching my list", () => {
  let fetchMock: Mock;

  beforeEach(() => {
    fetchMock = stubFetch();
    window.localStorage.clear();
    forgetSession();
    rememberSession({ access_token: "access-one", refresh_token: "refresh-one", expires_in: 900 });
    fetchMock.mockImplementation((path: string) =>
      Promise.resolve(
        String(path).endsWith("/configuration")
          ? respond(200, theConfiguration())
          : respond(200, [BACARI, SOBAN, TACOS]),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Scenario Outline: Narrowing my list — "I search for soban", narrowed by
  // the name. "Then I see only Soban in the list."
  it("leaves only what the name matches", async () => {
    renderApp("/");
    await search("soban");

    expect(listed()).toEqual(["Soban"]);
  });

  // The same outline — "I search for 7pm", narrowed by my note.
  it("leaves only what my note matches", async () => {
    renderApp("/");
    await search("7pm");

    expect(listed()).toEqual(["Bacari"]);
  });

  // "And <match> is all that is pinned on the map."
  it("pins nothing but the match", async () => {
    renderApp("/");
    await search("soban");

    expect(screen.getAllByTestId("pin").map((pin) => pin.dataset.title)).toEqual(["Soban"]);
  });

  // list-screen.states.md, Type in search: "Map: Unchanged". Narrowing the list
  // takes pins off the map and moves the camera nowhere — the owner is reading
  // the map they had, and a camera that jumped to the match would take the
  // surroundings they were comparing against with it.
  //
  // "And the map moves to fit it" was in
  // finding-a-restaurant-on-my-list.scenarios.md and is not any more.
  it("leaves the map where it was when one restaurant matches", async () => {
    renderApp("/");
    await search("soban");

    const map = screen.getByTestId("map");
    expect(map.dataset.movedTo).toBeUndefined();
  });

  // "ba" is the search in Scenario: Searching within a filter, and it matches
  // Bacari by name and Soban by its note. Several matches used to be a box the
  // camera was fitted around; now they are two pins and a camera nobody moved.
  it("leaves the map where it was when several match", async () => {
    renderApp("/");
    await search("ba");

    expect(listed()).toEqual(["Bacari", "Soban"]);

    const map = screen.getByTestId("map");
    expect(map.dataset.movedTo).toBeUndefined();
  });

  // Scenario: Nothing matches — "Then I see that nothing on my list matches
  // 'sushi'. And I see no pins on the map. And the map stays where it was."
  describe("when nothing matches", () => {
    it("says so, naming what I searched for", async () => {
      renderApp("/");
      await search("sushi");

      expect(listed()).toEqual([]);
      expect(screen.getByText("Nothing on your list matches “sushi”.")).toBeInTheDocument();
    });

    it("pins nothing and leaves the map where it was", async () => {
      renderApp("/");
      await search("sushi");

      const map = screen.getByTestId("map");
      expect(screen.queryAllByTestId("pin")).toEqual([]);
      expect(map.dataset.movedTo).toBeUndefined();
    });

    // "And clearing the search brings all three back."
    it("brings all three back when the search is cleared", async () => {
      renderApp("/");
      await search("sushi");
      await userEvent.clear(screen.getByRole("searchbox", { name: "Search my list" }));

      expect(listed()).toEqual(["Bacari", "Soban", "Tacos El Bronco"]);
      expect(screen.getAllByTestId("pin")).toHaveLength(3);

      const map = screen.getByTestId("map");
      expect(map.dataset.movedTo).toBeUndefined();
    });
  });

  // list-screen.states.md, Type in search: "Sheet: → Half" and "Selection:
  // None". The owner is looking for something else now, so the list they are
  // narrowing has to be visible, and the restaurant they had chosen is no
  // longer the answer.
  describe("what typing does to the rest of the screen", () => {
    it("raises the sheet to half from peek", async () => {
      renderApp("/");
      await screen.findByTestId("map");
      await restAt("peek");

      await search("soban");

      expect(await whereTheSheetRests()).toBe("half");
    });

    it("lowers the sheet to half from full", async () => {
      renderApp("/");
      await screen.findByTestId("map");
      await restAt("full");

      await search("soban");

      expect(await whereTheSheetRests()).toBe("half");
    });

    it("leaves the sheet at half when it is already there", async () => {
      renderApp("/");
      await search("soban");

      expect(await whereTheSheetRests()).toBe("half");
    });

    // "ba" matches Bacari, so the restaurant that was chosen is still listed —
    // which is what makes the choice being dropped visible rather than merely
    // narrowed away.
    it("drops the choice, even of a restaurant the search keeps", async () => {
      renderApp("/");
      await screen.findByTestId("map");
      await userEvent.click(cardFor("Bacari"));
      expect(cardFor("Bacari")).toHaveAttribute("aria-current", "true");

      await search("ba");

      expect(listed()).toEqual(["Bacari", "Soban"]);
      expect(cardFor("Bacari")).not.toHaveAttribute("aria-current");
      expect(pinColourFor("Bacari")).not.toBe(PIN_COLOURS.highlighted);
    });

    // list-screen.states.md, Clear the search: "Sheet: Unchanged" and
    // "Selection: Unchanged". The two rows differ in exactly this, so emptying
    // the field is not another narrowing — it is the end of one.
    it("leaves the sheet where it was when the search is cleared", async () => {
      renderApp("/");
      await search("soban");
      await restAt("full");

      await userEvent.clear(screen.getByRole("searchbox", { name: "Search my list" }));

      expect(await whereTheSheetRests()).toBe("full");
    });

    it("keeps the choice when the search is cleared", async () => {
      renderApp("/");
      await screen.findByTestId("map");
      await userEvent.click(cardFor("Bacari"));

      await userEvent.clear(screen.getByRole("searchbox", { name: "Search my list" }));

      expect(cardFor("Bacari")).toHaveAttribute("aria-current", "true");
    });
  });

  // The field is in the floating row, which is over the map rather than in the
  // sheet: "Search stays in the row, and still floats above the sheet at full".
  it("sits in the row over the map, not in the sheet", async () => {
    renderApp("/");

    await screen.findByTestId("map");

    const field = screen.getByRole("searchbox", { name: "Search my list" });
    const sheet = screen.getByRole("region", { name: "My list" });

    expect(sheet.contains(field)).toBe(false);
    expect(field.closest("div.absolute")).toHaveClass("top-0");
  });

  // A restaurant the owner has not eaten at is not what a search excludes, so
  // the whole list is reachable — the field reads names and notes and takes no
  // notice of anything else.
  it("opens with nothing narrowed", async () => {
    renderApp("/");

    await screen.findByTestId("map");

    expect(listed()).toEqual(["Bacari", "Soban", "Tacos El Bronco"]);
    expect(screen.getByRole("searchbox", { name: "Search my list" })).toHaveValue("");
  });
});

function listed(): string[] {
  return screen.queryAllByRole("heading", { level: 2 }).map((name) => name.textContent ?? "");
}

// One act of searching, the way the scenarios put it: "When I search for
// 'sushi'". Pasting rather than typing letter by letter, so the field goes from
// empty to the whole word in one go: "sus" matching nothing is a narrowing of
// its own, and not the one any of these scenarios is about.
async function search(text: string): Promise<void> {
  await screen.findByTestId("map");

  await userEvent.click(screen.getByRole("searchbox", { name: "Search my list" }));
  await userEvent.paste(text);
}
