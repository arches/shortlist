import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Restaurant } from "@/api/types";
import { screenShows } from "@/features/managing-experiences/testing";
import { forgetSession, rememberSession } from "@/session/store";
import { lastRequestWith, noContent, notFound, requestsWith, stubFetch } from "@/test/http";
import { renderApp } from "@/test/router";

import { aRestaurant, openDialog, pressInDialog } from "./testing";

import type { Mock } from "vitest";

// Derived from "Taking a restaurant off my list" in
// managing-my-list.scenarios.md — "When I take 'Joe's Pizza' off my list. And I
// acknowledge a confirmation dialog."
//
// Reached from the restaurant's own screen, because
// managing-experiences.wireframe.drawio draws Remove Restaurant there and calls
// that screen "also where the restaurant comes off the list". No wireframe
// draws this confirmation any more — what it reads is an assumption, recorded
// in ASSUMPTIONS.md under "What the take-off confirmation reads".
describe("taking a restaurant off my list", () => {
  let fetchMock: Mock;

  beforeEach(() => {
    fetchMock = stubFetch();
    window.localStorage.clear();
    forgetSession();
    rememberSession({ access_token: "access-one", refresh_token: "refresh-one", expires_in: 900 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // The restaurant's own screen reads the restaurant out of the list response
  // and its experiences out of their own, so both are stubbed to open it.
  async function openConfirmationFor(restaurant: Restaurant) {
    screenShows(fetchMock, { restaurants: [restaurant], experiences: [] });
    renderApp(`/restaurants/${restaurant.id}`);
    await screen.findByRole("heading", { level: 1, name: restaurant.name });
    await openDialog("Remove Restaurant", `Take “${restaurant.name}” off my list?`);
  }

  const joes = aRestaurant({
    id: 4,
    name: "Joe's Pizza",
    visited: true,
    experience_count: 2,
  });

  // shortlist.data.md: the owner's Experiences stand, and go out of reach until
  // the restaurant goes back on the list. Removed buys retention, not recovery.
  it("says the experiences are kept but will be out of reach", async () => {
    await openConfirmationFor(joes);

    expect(
      screen.getByText("Your 2 experiences are kept, but you will not be able to reach them again."),
    ).toBeInTheDocument();
  });

  it("says it in the singular for one experience", async () => {
    await openConfirmationFor(aRestaurant({ name: "Lilia", visited: true, experience_count: 1 }));

    expect(
      screen.getByText("Your 1 experience is kept, but you will not be able to reach them again."),
    ).toBeInTheDocument();
  });

  // Nothing to warn about when there is nothing to lose.
  it("warns about nothing for a restaurant with no experiences", async () => {
    await openConfirmationFor(aRestaurant({ name: "Lilia" }));

    expect(screen.queryByText(/are kept/)).not.toBeInTheDocument();
    expect(screen.queryByText(/is kept/)).not.toBeInTheDocument();
  });

  // "When I take 'Joe's Pizza' off my list ... Then 'Joe's Pizza' is off my
  // list". One List item destroyed, which is the whole of what the DELETE is.
  it("takes it off once confirmed", async () => {
    await openConfirmationFor(joes);

    fetchMock.mockResolvedValueOnce(noContent());
    await pressInDialog("Take it off");

    await waitFor(() => {
      const { path } = lastRequestWith(fetchMock, "DELETE");
      expect(path).toBe("/api/list/restaurants/4");
    });
  });

  // shortlist.data.md: removing a List item "destroys that row and nothing
  // else", and the owner's Experiences stand. So exactly one thing is deleted,
  // and the screen's own read of the experiences is the only way it touches
  // them.
  it("asks the API to remove it, never to delete the experiences", async () => {
    await openConfirmationFor(joes);

    fetchMock.mockResolvedValueOnce(noContent());
    await pressInDialog("Take it off");

    await waitFor(() => {
      expect(requestsWith(fetchMock, "DELETE")).toHaveLength(1);
    });
    expect(lastRequestWith(fetchMock, "DELETE").path).toBe("/api/list/restaurants/4");
  });

  // "And the restaurant itself stays in the system": the List item is what goes,
  // so the screen for a restaurant no longer on the list has nothing to show and
  // the owner is returned to the list rather than left on a dead screen.
  it("goes back to my list once it is off", async () => {
    await openConfirmationFor(joes);

    // The list comes back without it, which is what makes it off the list.
    screenShows(fetchMock, { restaurants: [], experiences: [] });
    fetchMock.mockResolvedValueOnce(noContent());
    await pressInDialog("Take it off");

    expect(await screen.findByRole("button", { name: "Add a restaurant" })).toBeInTheDocument();
  });

  it("closes once it is off the list", async () => {
    await openConfirmationFor(joes);

    fetchMock.mockResolvedValueOnce(noContent());
    await pressInDialog("Take it off");

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Take “Joe's Pizza” off my list?" }),
      ).not.toBeInTheDocument();
    });
  });

  it("takes nothing off when cancelled", async () => {
    await openConfirmationFor(joes);

    await pressInDialog("Cancel");

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Take “Joe's Pizza” off my list?" }),
      ).not.toBeInTheDocument();
    });
    expect(requestsWith(fetchMock, "DELETE")).toEqual([]);
  });

  // Scenario Outline: Changing a restaurant I cannot reach — "When I try to
  // change or remove it. Then it is reported as not found."
  it("reports one it cannot reach as not found", async () => {
    await openConfirmationFor(joes);

    fetchMock.mockResolvedValueOnce(notFound());
    await pressInDialog("Take it off");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No such restaurant is on your list.",
    );
  });
});
