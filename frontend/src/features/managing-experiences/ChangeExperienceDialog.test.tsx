import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { forgetSession, rememberSession } from "@/session/store";
import { invalid, lastRequestWith, requestsWith, respond, stubFetch } from "@/test/http";
import { renderApp } from "@/test/router";

import { anExperience, joesPizza, screenShows } from "./testing";

import type { Experience } from "@/api/types";
import type { Mock } from "vitest";

function inTheDialog() {
  return within(screen.getByRole("dialog"));
}

// Derived from "Correcting a rating I regret", "Clearing a date I was never
// sure of" and "Clearing the last thing an experience says" in
// managing-experiences.scenarios.md, and from the row's Edit control in
// managing-experiences.wireframe.drawio.svg.
describe("changing an experience", () => {
  let fetchMock: Mock;

  // The experience from the main-path scenario: rated 4.5, with the note.
  const mafaldini = anExperience({
    id: 11,
    rating: 4.5,
    occurred_on: "2026-10-18",
    notes: "The mafaldini is the whole reason to come",
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

  async function openEditFor(experience: Experience) {
    screenShows(fetchMock, { restaurants: [joesPizza()], experiences: [experience] });
    renderApp("/restaurants/4");

    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
    await screen.findByRole("heading", { name: "Edit an experience" });
  }

  async function save(sent: Experience) {
    fetchMock.mockResolvedValueOnce(respond(200, sent));

    await userEvent.click(inTheDialog().getByRole("button", { name: "Save" }));
  }

  // The form opens on the experience's own values — which is what says which
  // experience is being changed, an experience having no name.
  it("opens on the experience's own values", async () => {
    await openEditFor(mafaldini);

    expect((inTheDialog().getByRole("radio", { name: "4.5 stars" }) as HTMLInputElement).checked)
      .toBe(true);
    expect(inTheDialog().getByLabelText(/When/)).toHaveValue("2026-10-18");
    expect(inTheDialog().getByLabelText(/Notes/))
      .toHaveValue("The mafaldini is the whole reason to come");
  });

  // Scenario: Correcting a rating I regret — "Then that experience shows a
  // rating of 5, and its note is unchanged."
  it("sends the new rating and leaves the note alone", async () => {
    await openEditFor(mafaldini);

    await userEvent.click(inTheDialog().getByRole("radio", { name: "5 stars" }));
    await save({ ...mafaldini, rating: 5 });

    await waitFor(() => {
      expect(lastRequestWith(fetchMock, "PATCH").body).toEqual({
        experience: {
          rating: 5,
          occurred_on: "2026-10-18",
          notes: "The mafaldini is the whole reason to come",
        },
      });
    });
  });

  it("changes the experience it was opened for", async () => {
    await openEditFor(mafaldini);

    await userEvent.click(inTheDialog().getByRole("radio", { name: "5 stars" }));
    await save({ ...mafaldini, rating: 5 });

    await waitFor(() => {
      expect(lastRequestWith(fetchMock, "PATCH").path)
        .toBe("/api/restaurants/4/experiences/11");
    });
  });

  // Scenario: Clearing a date I was never sure of — "Then that experience shows
  // no date, and it still shows a rating of 4.5."
  it("clears a date and keeps the rating", async () => {
    const dated = anExperience({ id: 12, rating: 4.5, occurred_on: "2026-10-18", notes: null });
    await openEditFor(dated);

    await userEvent.clear(inTheDialog().getByLabelText(/When/));
    await save({ ...dated, occurred_on: null });

    await waitFor(() => {
      expect(lastRequestWith(fetchMock, "PATCH").body).toEqual({
        experience: { rating: 4.5, occurred_on: null, notes: null },
      });
    });
  });

  // Scenario: Clearing the last thing an experience says. The form will not
  // offer a save that empties one, which is the rule reached before the API
  // has to say anything.
  describe("clearing the last thing it says", () => {
    it("takes Save away rather than offering an empty change", async () => {
      await openEditFor(anExperience({ id: 13, rating: 4.5, occurred_on: null, notes: null }));

      expect(inTheDialog().getByRole("button", { name: "Save" })).toBeEnabled();

      await userEvent.click(inTheDialog().getByRole("button", { name: "Clear rating" }));

      expect(inTheDialog().getByRole("button", { name: "Save" })).toBeDisabled();
    });

    it("sends nothing while it is empty", async () => {
      await openEditFor(anExperience({ id: 13, rating: 4.5, occurred_on: null, notes: null }));

      await userEvent.click(inTheDialog().getByRole("button", { name: "Clear rating" }));

      expect(requestsWith(fetchMock, "PATCH")).toHaveLength(0);
    });

    // The emptiness rule is the API's as well. An experience can be emptied in
    // ways the form cannot see, so its refusal has to be shown.
    it("shows the API's refusal when it gets there anyway", async () => {
      await openEditFor(mafaldini);

      await userEvent.click(inTheDialog().getByRole("radio", { name: "5 stars" }));

      fetchMock.mockResolvedValueOnce(invalid({ base: ["needs a rating, a note or a date"] }));
      await userEvent.click(inTheDialog().getByRole("button", { name: "Save" }));

      expect(await screen.findByText("needs a rating, a note or a date")).toBeInTheDocument();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  // No earlier version of it is shown anywhere, because nothing keeps one.
  it("closes once the change is saved", async () => {
    await openEditFor(mafaldini);

    await userEvent.click(inTheDialog().getByRole("radio", { name: "5 stars" }));
    await save({ ...mafaldini, rating: 5 });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("changes nothing when cancelled", async () => {
    await openEditFor(mafaldini);

    await userEvent.click(inTheDialog().getByRole("radio", { name: "5 stars" }));
    await userEvent.click(inTheDialog().getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(requestsWith(fetchMock, "PATCH")).toHaveLength(0);
  });
});
