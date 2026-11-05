import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { forgetSession, rememberSession } from "@/session/store";
import {
  invalid,
  lastRequestWith,
  pathsRequested,
  requestsWith,
  respond,
  stubFetch,
} from "@/test/http";
import { renderApp } from "@/test/router";

import {
  cardFor,
  openTheMenu,
  PIN_COLOURS,
  pinColourFor,
  restAt,
  theConfiguration,
  whereTheSheetRests,
} from "@/features/seeing-my-list-on-a-map/testing";

import { aRestaurant, openDialog, typeInto } from "./testing";

import type { Mock } from "vitest";

// Derived from managing-my-list.scenarios.md — the owner types, sees
// suggestions from the Google Places API, and picks one — and from the Add
// dialog in managing-my-list.wireframe.drawio.
async function openTheDialog() {
  renderApp("/");
  await screen.findByRole("region", { name: "My list" });
  await openDialog("Add a restaurant", "Add a restaurant");
}

const suggestion = {
  google_place_id: "ChIJTacos",
  description: "Tacos El Bronco, 4324 4th Ave, Brooklyn, NY",
};

async function pick(description: string) {
  await userEvent.click(await screen.findByRole("button", { name: description }));
}

// Picking is no longer the add. managing-my-list.wireframe.drawio draws "Add to
// list" at the foot of the dialog, so the add is the button.
async function addToList() {
  await userEvent.click(screen.getByRole("button", { name: "Add to list" }));
}

async function type(text: string) {
  await typeInto("Name *", text);
  await vi.advanceTimersByTimeAsync(300);
}

// Typing, then waiting for the suggestions to land. Queueing the POST's
// response before they have is what makes the still-pending suggestions fetch
// eat it.
async function typeAndSeeSuggestions(text: string) {
  await type(text);
  await screen.findByRole("button", { name: suggestion.description });
}

describe("adding a restaurant", () => {
  let fetchMock: Mock;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fetchMock = stubFetch();
    window.localStorage.clear();
    forgetSession();
    rememberSession({ access_token: "access-one", refresh_token: "refresh-one", expires_in: 900 });
    fetchMock.mockResolvedValue(respond(200, []));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // Scenario: Adding new restaurant
  it("shows the suggestions Google returned for what I typed", async () => {
    await openTheDialog();
    fetchMock.mockResolvedValue(respond(200, [suggestion]));

    await type("Tacos El Bronco");

    expect(await screen.findByRole("button", { name: suggestion.description })).toBeVisible();
    expect(pathsRequested(fetchMock)).toContain(
      "/api/places/suggestions?q=Tacos%20El%20Bronco",
    );
  });

  it("sends the place id of the suggestion I picked", async () => {
    await openTheDialog();
    fetchMock.mockResolvedValue(respond(200, [suggestion]));
    await typeAndSeeSuggestions("Tacos El Bronco");
    await pick(suggestion.description);

    fetchMock.mockResolvedValueOnce(
      respond(201, aRestaurant({ name: "Tacos El Bronco", google_place_id: "ChIJTacos" })),
    );
    await addToList();

    await waitFor(() => {
      expect(lastRequestWith(fetchMock, "POST")).toMatchObject({
        path: "/api/list/restaurants",
        body: { restaurant: { google_place_id: "ChIJTacos", note: null } },
      });
    });
  });

  // The button is what adds, so there is nothing to add before a suggestion is
  // picked: the Place ID is the whole of what Shortlist is told.
  it("cannot add before I have picked a suggestion", async () => {
    await openTheDialog();
    fetchMock.mockResolvedValue(respond(200, [suggestion]));
    await typeAndSeeSuggestions("Tacos El Bronco");

    expect(screen.getByRole("button", { name: "Add to list" })).toBeDisabled();
  });

  it("adds nothing on picking a suggestion alone", async () => {
    await openTheDialog();
    fetchMock.mockResolvedValue(respond(200, [suggestion]));
    await typeAndSeeSuggestions("Tacos El Bronco");

    await pick(suggestion.description);

    expect(screen.getByRole("heading", { name: "Add a restaurant" })).toBeVisible();
    expect(requestsWith(fetchMock, "POST")).toEqual([]);
  });

  // One field, holding what was picked. Typing again is searching again, so
  // there is nothing chosen to add until the owner picks once more — which is
  // the way back from a wrong pick.
  it("unpicks when I type over what I picked", async () => {
    await openTheDialog();
    fetchMock.mockResolvedValue(respond(200, [suggestion]));
    await typeAndSeeSuggestions("Tacos El Bronco");
    await pick(suggestion.description);

    expect(screen.getByLabelText("Name *")).toHaveValue(suggestion.description);

    await typeInto("Name *", "J");

    expect(screen.getByRole("button", { name: "Add to list" })).toBeDisabled();
  });

  // Scenario Outline: Adding a restaurant — "And I add it to my list with the
  // note \"Famous for their bibimbap\"".
  it("sends the note I wrote with the add", async () => {
    await openTheDialog();
    fetchMock.mockResolvedValue(respond(200, [suggestion]));
    await typeAndSeeSuggestions("Tacos El Bronco");
    await pick(suggestion.description);

    await typeInto("Note", "Famous for their bibimbap");

    fetchMock.mockResolvedValueOnce(respond(201, aRestaurant({ name: "Tacos El Bronco" })));
    await addToList();

    await waitFor(() => {
      expect(lastRequestWith(fetchMock, "POST")).toMatchObject({
        body: { restaurant: { google_place_id: "ChIJTacos", note: "Famous for their bibimbap" } },
      });
    });
  });

  // "A note of nothing but whitespace arrives as no note at all." The API
  // settles it too; saying it here keeps the request honest about what the
  // owner wrote.
  it("sends no note when I typed nothing but spaces", async () => {
    await openTheDialog();
    fetchMock.mockResolvedValue(respond(200, [suggestion]));
    await typeAndSeeSuggestions("Tacos El Bronco");
    await pick(suggestion.description);

    await typeInto("Note", "   ");

    fetchMock.mockResolvedValueOnce(respond(201, aRestaurant({ name: "Tacos El Bronco" })));
    await addToList();

    await waitFor(() => {
      expect(lastRequestWith(fetchMock, "POST")).toMatchObject({
        body: { restaurant: { note: null } },
      });
    });
  });

  // The note is optional, so an empty one never stands between the owner and
  // the restaurant they came to add.
  it("adds with no note written", async () => {
    await openTheDialog();
    fetchMock.mockResolvedValue(respond(200, [suggestion]));
    await typeAndSeeSuggestions("Tacos El Bronco");
    await pick(suggestion.description);

    expect(screen.getByRole("button", { name: "Add to list" })).toBeEnabled();
  });

  // The owner is part-way through typing, so a short query asks for nothing.
  it("asks Google nothing until two characters are typed", async () => {
    await openTheDialog();

    await type("T");

    expect(pathsRequested(fetchMock).filter((p) => p.startsWith("/api/places"))).toEqual([]);
  });

  // Scenario: Adding a restaurant that is already on my list
  it("reports one already on my list, and says nothing about the one there", async () => {
    await openTheDialog();
    fetchMock.mockResolvedValue(respond(200, [suggestion]));
    await typeAndSeeSuggestions("Tacos El Bronco");

    await pick(suggestion.description);

    fetchMock.mockResolvedValueOnce(
      invalid({ restaurant_id: ["Restaurant is already on your list"] }),
    );
    await addToList();

    expect(await screen.findByRole("alert")).toHaveTextContent("already on your list");
    expect(screen.getByRole("heading", { name: "Add a restaurant" })).toBeVisible();
  });

  // The API discards the note a rejected add carried, and the dialog keeps
  // showing it so the owner can read the refusal without losing what they
  // wrote — see ASSUMPTIONS.md, "What a refused add keeps".
  it("keeps the note I typed when the add is refused", async () => {
    await openTheDialog();
    fetchMock.mockResolvedValue(respond(200, [suggestion]));
    await typeAndSeeSuggestions("Tacos El Bronco");
    await pick(suggestion.description);
    await typeInto("Note", "Ask for it well done");

    fetchMock.mockResolvedValueOnce(
      invalid({ restaurant_id: ["Restaurant is already on your list"] }),
    );
    await addToList();

    expect(await screen.findByRole("alert")).toBeVisible();
    expect(screen.getByLabelText("Note")).toHaveValue("Ask for it well done");
  });

  it("closes once the restaurant is on the list", async () => {
    await openTheDialog();
    fetchMock.mockResolvedValue(respond(200, [suggestion]));
    await typeAndSeeSuggestions("Tacos El Bronco");

    await pick(suggestion.description);

    fetchMock.mockResolvedValueOnce(respond(201, aRestaurant({ name: "Tacos El Bronco" })));
    await addToList();

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Add a restaurant" })).toBeNull();
    });
  });

  it("adds nothing when cancelled", async () => {
    await openTheDialog();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Add a restaurant" })).toBeNull();
    });
    expect(fetchMock.mock.calls.filter((call) => (call[1] as { method?: string })?.method === "POST"))
      .toEqual([]);
  });
});

// Derived from the Add a restaurant row of list-screen.states.md, which moves
// five of the screen's six regions: the restaurant just added becomes the
// selection, the search goes Empty, the filter goes back to All, the menu
// closes, and the map centres on the selection at zoom 13. Only the sheet reads
// Unchanged.
describe("what adding a restaurant does to the screen", () => {
  let fetchMock: Mock;

  // Bacari is visited and on the list already, so the filter has somewhere to
  // be moved away from. Tacos El Bronco is what the add puts there, and both
  // carry coordinates because the row moves the map.
  const BACARI_ROW = aRestaurant({
    id: 1,
    name: "Bacari",
    visited: true,
    experience_count: 1,
    latitude: 34.0901,
    longitude: -118.2765,
  });

  const TACOS = aRestaurant({
    id: 2,
    name: "Tacos El Bronco",
    google_place_id: suggestion.google_place_id,
    latitude: 40.6478,
    longitude: -74.0106,
  });

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fetchMock = stubFetch();
    window.localStorage.clear();
    forgetSession();
    rememberSession({ access_token: "access-one", refresh_token: "refresh-one", expires_in: 900 });

    // The list answers differently once the add has landed, which is what the
    // mutation's own invalidation goes back for.
    let onTheList = false;

    fetchMock.mockImplementation((path: string, options?: { method?: string }) => {
      const url = String(path);

      if (url.endsWith("/configuration")) return Promise.resolve(respond(200, theConfiguration()));
      if (url.includes("/places/suggestions")) return Promise.resolve(respond(200, [suggestion]));

      if (options?.method === "POST") {
        onTheList = true;
        return Promise.resolve(respond(201, TACOS));
      }

      return Promise.resolve(respond(200, onTheList ? [BACARI_ROW, TACOS] : [BACARI_ROW]));
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  async function add() {
    await openTheDialog();
    await typeAndSeeSuggestions("Tacos El Bronco");
    await pick(suggestion.description);
    await addToList();

    await screen.findByRole("heading", { name: "Tacos El Bronco" });
  }

  it("chooses the restaurant it added", async () => {
    await add();

    expect(cardFor("Tacos El Bronco")).toHaveAttribute("aria-current", "true");
    expect(cardFor("Bacari")).not.toHaveAttribute("aria-current");
    expect(pinColourFor("Tacos El Bronco")).toBe(PIN_COLOURS.highlighted);
  });

  it("centres the map on it at zoom 13", async () => {
    await add();

    await waitFor(() => {
      expect(screen.getByTestId("map").dataset.movedTo).toBe(
        JSON.stringify({ center: { lat: TACOS.latitude, lng: TACOS.longitude }, zoom: 13 }),
      );
    });
  });

  // "Search: → Empty". A restaurant added while a search was narrowing the list
  // would otherwise be chosen and then hidden by the narrowing already there.
  it("empties the search", async () => {
    renderApp("/");
    await screen.findByRole("region", { name: "My list" });

    await userEvent.click(screen.getByRole("searchbox", { name: "Search my list" }));
    await userEvent.paste("bacari");
    expect(screen.queryByRole("heading", { name: "Tacos El Bronco" })).toBeNull();

    await openDialog("Add a restaurant", "Add a restaurant");
    await typeAndSeeSuggestions("Tacos El Bronco");
    await pick(suggestion.description);
    await addToList();

    expect(await screen.findByRole("heading", { name: "Tacos El Bronco" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search my list" })).toHaveValue("");
  });

  // "Filter: All". Tacos El Bronco is not visited, so a filter left at Visited
  // would have hidden the restaurant the add just chose.
  it("returns the filter to All", async () => {
    renderApp("/");
    await screen.findByRole("region", { name: "My list" });

    const menu = await openTheMenu();
    await userEvent.click(within(menu).getByRole("menuitemradio", { name: "Visited" }));
    expect(screen.getByTestId("filter-dot")).toBeInTheDocument();

    await openDialog("Add a restaurant", "Add a restaurant");
    await typeAndSeeSuggestions("Tacos El Bronco");
    await pick(suggestion.description);
    await addToList();

    expect(await screen.findByRole("heading", { name: "Tacos El Bronco" })).toBeInTheDocument();
    expect(screen.queryByTestId("filter-dot")).toBeNull();
  });

  // "Sheet: Unchanged", which is what tells this row from Tap a row. The owner
  // was in a dialog rather than reading the list, so there is nothing to
  // uncover and nowhere they had got to.
  it("leaves the sheet where it was", async () => {
    renderApp("/");
    await screen.findByRole("region", { name: "My list" });
    await restAt("full");

    await openDialog("Add a restaurant", "Add a restaurant");
    await typeAndSeeSuggestions("Tacos El Bronco");
    await pick(suggestion.description);
    await addToList();

    await screen.findByRole("heading", { name: "Tacos El Bronco" });

    expect(await whereTheSheetRests()).toBe("full");
  });
});
