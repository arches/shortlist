import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { forgetSession, rememberSession } from "@/session/store";
import { lastRequestWith, noContent, requestsWith, respond, stubFetch } from "@/test/http";
import { renderApp } from "@/test/router";

import { namesOf } from "./RemoveExperienceDialog";
import { anExperience, joesPizza, screenShows } from "./testing";

import type { Experience } from "@/api/types";
import type { Mock } from "vitest";

function inTheDialog() {
  return within(screen.getByRole("alertdialog"));
}

// Derived from "Removing an experience I recorded against the wrong restaurant"
// and "Removing one experience of several" in
// managing-experiences.scenarios.md, and from the confirmation drawn in
// managing-experiences.wireframe.drawio.svg, whose words are reproduced.
describe("removing an experience", () => {
  let fetchMock: Mock;

  // The experience the wireframe draws this confirmation for.
  const queue = anExperience({
    id: 14,
    rating: 3.5,
    occurred_on: null,
    notes: "Queue out the door",
  });

  beforeEach(() => {
    fetchMock = stubFetch();
    window.localStorage.clear();
    forgetSession();
    rememberSession({ access_token: "access-one", refresh_token: "refresh-one", expires_in: 900 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function openRemoveFor(experiences: Experience[], which = 0) {
    screenShows(fetchMock, { restaurants: [joesPizza()], experiences });
    renderApp("/restaurants/4");

    const buttons = await screen.findAllByRole("button", { name: "Remove" });
    await userEvent.click(buttons[which]!);
    await screen.findByRole("heading", { name: "Remove this experience?" });
  }

  // The wireframe's own naming line, reproduced exactly.
  describe("naming the experience", () => {
    it("names it by its note and its date", () => {
      expect(namesOf(queue)).toBe("Queue out the door · no date");
    });

    it("names a dated one by the day it happened", () => {
      expect(namesOf(anExperience({ notes: "Corner slice, still the best one", occurred_on: "2026-10-24" })))
        .toBe("Corner slice, still the best one · 24 Oct 2026");
    });

    it("names one with no note at all", () => {
      expect(namesOf(anExperience({ notes: null, occurred_on: "2026-05-02" })))
        .toBe("no notes · 2 May 2026");
    });

    // It is the only way to tell apart several recorded at the same restaurant,
    // so the rating is part of it — and the number beside the stars is the part
    // a reader hears.
    it("shows the rating alongside", async () => {
      await openRemoveFor([queue]);

      expect(inTheDialog().getByText("Queue out the door · no date")).toBeInTheDocument();
      expect(inTheDialog().getByText("3.5")).toBeInTheDocument();
    });
  });

  // "Confirmed because it cannot be undone. Taking a restaurant off the list is
  // confirmed too, but that keeps its experiences — this destroys the note
  // outright."
  it("says it cannot be undone", async () => {
    await openRemoveFor([queue]);

    expect(inTheDialog().getByText("This cannot be undone.")).toBeInTheDocument();
  });

  // Scenario: Removing an experience I recorded against the wrong restaurant —
  // "When I remove that experience, and I acknowledge a confirmation dialog".
  describe("acknowledging the confirmation", () => {
    it("removes the experience it was opened for", async () => {
      await openRemoveFor([queue]);

      fetchMock.mockResolvedValueOnce(noContent());
      await userEvent.click(inTheDialog().getByRole("button", { name: "Remove" }));

      await waitFor(() => {
        expect(lastRequestWith(fetchMock, "DELETE").path)
          .toBe("/api/restaurants/4/experiences/14");
      });
    });

    // Scenario: Removing one experience of several — "When I remove the one on
    // 2026-05-02". Which row's control was pressed is what picks the one.
    it("removes the one whose row it was opened from", async () => {
      const older = anExperience({ id: 21, rating: 3, occurred_on: "2026-05-02" });
      const newer = anExperience({ id: 22, rating: 4, occurred_on: "2026-10-20" });

      await openRemoveFor([newer, older], 1);

      expect(inTheDialog().getByText("no notes · 2 May 2026")).toBeInTheDocument();

      fetchMock.mockResolvedValueOnce(noContent());
      await userEvent.click(inTheDialog().getByRole("button", { name: "Remove" }));

      await waitFor(() => {
        expect(lastRequestWith(fetchMock, "DELETE").path)
          .toBe("/api/restaurants/4/experiences/21");
      });
    });

    it("closes once the experience is gone", async () => {
      await openRemoveFor([queue]);

      fetchMock.mockResolvedValueOnce(noContent());
      await userEvent.click(inTheDialog().getByRole("button", { name: "Remove" }));

      await waitFor(() => {
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      });
    });

    // "And it no longer reads as visited." visited is derived from the
    // experience count rather than stored, so the list is stale the moment one
    // is removed and has to be read again.
    it("reads the list and the experiences again once one is removed", async () => {
      await openRemoveFor([queue]);

      fetchMock.mockResolvedValueOnce(noContent());
      await userEvent.click(inTheDialog().getByRole("button", { name: "Remove" }));

      await waitFor(() => {
        const paths = fetchMock.mock.calls.map((call) => String(call.at(0)));

        expect(paths.filter((path) => path === "/api/restaurants").length).toBeGreaterThan(1);
        expect(paths.filter((path) => path === "/api/restaurants/4/experiences").length)
          .toBeGreaterThan(1);
      });
    });
  });

  it("removes nothing when cancelled", async () => {
    await openRemoveFor([queue]);

    await userEvent.click(inTheDialog().getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
    expect(requestsWith(fetchMock, "DELETE")).toHaveLength(0);
  });

  // The refusal for an experience that is not reachable, shown rather than
  // swallowed. The dialog stays open so the owner sees what happened.
  it("shows the API's refusal and stays open", async () => {
    await openRemoveFor([queue]);

    fetchMock.mockResolvedValueOnce(
      respond(404, { error: "No such experience is at that restaurant." }),
    );
    await userEvent.click(inTheDialog().getByRole("button", { name: "Remove" }));

    expect(await screen.findByText("No such experience is at that restaurant."))
      .toBeInTheDocument();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });
});
