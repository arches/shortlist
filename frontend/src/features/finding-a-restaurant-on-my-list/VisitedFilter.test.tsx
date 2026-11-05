import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { aRestaurant } from "@/features/managing-my-list/testing";
import { openTheMenu, theConfiguration } from "@/features/seeing-my-list-on-a-map/testing";
import { OPENING_ZOOM } from "@/features/seeing-my-list-on-a-map/view";
import { forgetSession, rememberSession } from "@/session/store";
import { respond, stubFetch } from "@/test/http";
import { renderApp } from "@/test/router";

import type { Mock } from "vitest";

// Derived from finding-a-restaurant-on-my-list.scenarios.md, whose Background
// is the list below, and from the menu in seeing-my-list-on-a-map.drawio: a
// "Show" label over three rings, one of them filled, and a dot on the hamburger
// whenever the filter is away from All.
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

describe("filtering my list", () => {
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

  // Scenario Outline: Narrowing my list — "I filter to not visited. Then I see
  // only Soban in the list. And Soban is all that is pinned on the map. And the
  // map moves to fit it."
  it("leaves only the restaurants I have not eaten at", async () => {
    renderApp("/");
    await filterTo("Not visited");

    expect(listed()).toEqual(["Soban"]);
    expect(screen.getAllByTestId("pin").map((pin) => pin.dataset.title)).toEqual(["Soban"]);
    expect(screen.getByTestId("map")).toHaveAttribute(
      "data-moved-to",
      JSON.stringify({ center: { lat: SOBAN.latitude, lng: SOBAN.longitude }, zoom: OPENING_ZOOM }),
    );
  });

  it("leaves only the ones I have", async () => {
    renderApp("/");
    await filterTo("Visited");

    expect(listed()).toEqual(["Bacari", "Tacos El Bronco"]);
  });

  // "Exactly one is always filled, so it cannot show nothing." All is where it
  // starts, and choosing it again is how the whole list comes back.
  it("starts at All", async () => {
    renderApp("/");

    expect(await positions()).toEqual({
      All: "true",
      Visited: "false",
      "Not visited": "false",
    });
  });

  it("goes back to the whole list when All is chosen again", async () => {
    renderApp("/");

    await filterTo("Visited");
    expect(listed()).toEqual(["Bacari", "Tacos El Bronco"]);

    await filterTo("All");
    expect(listed()).toEqual(["Bacari", "Soban", "Tacos El Bronco"]);
  });

  it("holds exactly one position, whichever it is", async () => {
    renderApp("/");
    await filterTo("Visited");

    expect(await positions()).toEqual({
      All: "false",
      Visited: "true",
      "Not visited": "false",
    });
  });

  // "The hamburger carries the dot whenever the filter is away from All, so a
  // hidden filter never narrows the map silently."
  describe("the dot on the hamburger", () => {
    it("is not there while the filter shows everything", async () => {
      renderApp("/");

      await screen.findByTestId("map");

      expect(screen.queryByTestId("filter-dot")).toBeNull();
    });

    it("is there once the filter is away from All", async () => {
      renderApp("/");
      await filterTo("Not visited");

      expect(screen.getByTestId("filter-dot")).toBeInTheDocument();
    });

    it("goes away again when the filter comes back to All", async () => {
      renderApp("/");
      await filterTo("Not visited");
      await filterTo("All");

      expect(screen.queryByTestId("filter-dot")).toBeNull();
    });
  });

  // Scenario: Searching within a filter — "Given I filtered to visited, When I
  // search for 'ba', Then I see only Bacari. And Soban is gone, though its name
  // matches too."
  describe("searching within a filter", () => {
    it("keeps both, so a match the filter excludes stays gone", async () => {
      renderApp("/");
      await filterTo("Visited");
      await search("ba");

      expect(listed()).toEqual(["Bacari"]);
      expect(screen.getAllByTestId("pin").map((pin) => pin.dataset.title)).toEqual(["Bacari"]);
    });

    // "And I see that both a search and a filter are narrowing my list."
    it("says that both are narrowing the list", async () => {
      renderApp("/");
      await filterTo("Visited");
      await search("ba");

      expect(screen.getByRole("status")).toHaveTextContent(
        "Narrowed by the search “ba” and the Visited filter.",
      );
    });

    it("says so of a search on its own", async () => {
      renderApp("/");
      await search("ba");

      expect(screen.getByRole("status")).toHaveTextContent("Narrowed by the search “ba”.");
    });

    it("says so of a filter on its own, which the dot alone cannot", async () => {
      renderApp("/");
      await filterTo("Not visited");

      expect(screen.getByRole("status")).toHaveTextContent(
        "Narrowed by the Not visited filter.",
      );
    });

    it("says nothing while nothing is narrowing the list", async () => {
      renderApp("/");

      await screen.findByTestId("map");

      expect(screen.queryByRole("status")).toBeNull();
    });

    // The cards scroll and this does not: it is about the list rather than one
    // restaurant, so it stays put at the top of the sheet.
    it("stays out of what scrolls", async () => {
      renderApp("/");
      await search("ba");

      const notice = screen.getByRole("status");

      expect(notice.closest("div.overflow-y-auto")).toBeNull();
      expect(screen.getByRole("region", { name: "My list" }).contains(notice)).toBe(true);
    });
  });

  // Not a scenario — no Background has a list a filter can empty — but
  // reachable: nothing on this list is unvisited once Soban is gone.
  it("says so when the filter leaves nothing", async () => {
    fetchMock.mockImplementation((path: string) =>
      Promise.resolve(
        String(path).endsWith("/configuration")
          ? respond(200, theConfiguration())
          : respond(200, [BACARI, TACOS]),
      ),
    );

    renderApp("/");
    await filterTo("Not visited");

    expect(listed()).toEqual([]);
    expect(screen.getByText("Nothing on your list is not visited.")).toBeInTheDocument();
  });
});

function listed(): string[] {
  return screen.queryAllByRole("heading", { level: 2 }).map((name) => name.textContent ?? "");
}

// The filter is behind the hamburger, so the owner opens the menu and chooses
// in it. seeing-my-list-on-a-map.drawio draws it nowhere else.
async function filterTo(label: string): Promise<void> {
  await screen.findByTestId("map");

  const menu = await openTheMenu();
  await userEvent.click(within(menu).getByRole("menuitemradio", { name: label }));
}

// One act of searching, as in the search suite beside this one.
async function search(text: string): Promise<void> {
  await screen.findByTestId("map");

  await userEvent.click(screen.getByRole("searchbox", { name: "Search my list" }));
  await userEvent.paste(text);
}

// Which ring is filled, as the menu reports it to anybody who cannot see the
// rings: aria-checked on each of the three, read in one opening.
async function positions(): Promise<Record<string, string | null>> {
  await screen.findByTestId("map");

  const menu = await openTheMenu();

  return Object.fromEntries(
    within(menu)
      .getAllByRole("menuitemradio")
      .map((item) => [item.textContent, item.getAttribute("aria-checked")]),
  );
}
