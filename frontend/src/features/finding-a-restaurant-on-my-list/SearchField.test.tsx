import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { aRestaurant } from "@/features/managing-my-list/testing";
import { theConfiguration } from "@/features/seeing-my-list-on-a-map/testing";
import { OPENING_ZOOM } from "@/features/seeing-my-list-on-a-map/view";
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

  // "And the map moves to fit it." One match has no box to fit, so it is the
  // opening view centred on it — see ASSUMPTIONS.md, "What fitting the matches
  // comes to".
  it("moves the map to the one restaurant that matched", async () => {
    renderApp("/");
    await search("soban");

    expect(screen.getByTestId("map")).toHaveAttribute(
      "data-moved-to",
      JSON.stringify({ center: { lat: SOBAN.latitude, lng: SOBAN.longitude }, zoom: OPENING_ZOOM }),
    );
  });

  // Several matches have a box, which is what fitting means. "ba" is the
  // search in Scenario: Searching within a filter, and it matches Bacari by
  // name and Soban by its note.
  it("fits the map around several matches", async () => {
    renderApp("/");
    await search("ba");

    expect(listed()).toEqual(["Bacari", "Soban"]);
    expect(screen.getByTestId("map")).toHaveAttribute(
      "data-fitted-to",
      JSON.stringify({
        south: SOBAN.latitude,
        west: SOBAN.longitude,
        north: BACARI.latitude,
        east: BACARI.longitude,
      }),
    );
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
      expect(map.dataset.fittedTo).toBeUndefined();
      expect(map.dataset.movedTo).toBeUndefined();
    });

    // "And clearing the search brings all three back."
    it("brings all three back when the search is cleared", async () => {
      renderApp("/");
      await search("sushi");
      await userEvent.clear(screen.getByRole("searchbox", { name: "Search my list" }));

      expect(listed()).toEqual(["Bacari", "Soban", "Tacos El Bronco"]);
      expect(screen.getAllByTestId("pin")).toHaveLength(3);
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
    expect(screen.getByTestId("map").dataset.fittedTo).toBeUndefined();
  });
});

function listed(): string[] {
  return screen.queryAllByRole("heading", { level: 2 }).map((name) => name.textContent ?? "");
}

// One act of searching, the way the scenarios put it: "When I search for
// 'sushi'". Typing it letter by letter is several narrowings, and the
// intermediate ones legitimately move the map — "sus" matching nothing is not
// what Scenario: Nothing matches is about.
async function search(text: string): Promise<void> {
  await screen.findByTestId("map");

  await userEvent.click(screen.getByRole("searchbox", { name: "Search my list" }));
  await userEvent.paste(text);
}
