import { screen, waitFor } from "@testing-library/react";
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

import { aRestaurant, openDialog, typeInto } from "./testing";

import type { Mock } from "vitest";

// Derived from managing-my-list.scenarios.md — the owner types, sees
// suggestions from the Google Places API, and picks one — and from the Add
// dialog in managing-my-list.wireframe.drawio.
async function openTheDialog() {
  renderApp("/");
  await screen.findByRole("heading", { name: "My list" });
  await openDialog("Add", "Add a restaurant");
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
        body: { restaurant: { google_place_id: "ChIJTacos" } },
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
