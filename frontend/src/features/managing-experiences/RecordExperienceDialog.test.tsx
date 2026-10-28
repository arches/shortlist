import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { forgetSession, rememberSession } from "@/session/store";
import { invalid, lastRequestWith, requestsWith, respond, stubFetch } from "@/test/http";
import { renderApp } from "@/test/router";

import { anExperience, joesPizza, screenShows } from "./testing";

import type { Mock } from "vitest";

// The dialog is the thing under test, so every query is narrowed to it.
function inTheDialog() {
  return within(screen.getByRole("dialog"));
}

// Derived from the recording scenarios in managing-experiences.scenarios.md and
// the dialog drawn in managing-experiences.wireframe.drawio.svg.
describe("recording an experience", () => {
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

  async function openTheDialog() {
    screenShows(fetchMock, { restaurants: [joesPizza()], experiences: [] });
    renderApp("/restaurants/4");

    await userEvent.click(await screen.findByRole("button", { name: "Record an experience" }));
    await screen.findByRole("heading", { name: "Record an experience" });
  }

  async function save() {
    fetchMock.mockResolvedValueOnce(respond(201, anExperience({ id: 99 })));

    await userEvent.click(inTheDialog().getByRole("button", { name: "Save" }));
  }

  // The wireframe names the restaurant beneath the title, because an experience
  // has no name of its own to be headed by.
  it("says which restaurant it is being recorded against", async () => {
    await openTheDialog();

    expect(inTheDialog().getByText("Joe's Pizza")).toBeInTheDocument();
  });

  // Scenario: Writing down what I thought of a meal
  it("sends the rating, the date and the note", async () => {
    await openTheDialog();

    await userEvent.click(inTheDialog().getByRole("radio", { name: "4.5 stars" }));
    await userEvent.type(inTheDialog().getByLabelText(/When/), "2026-10-18");
    await userEvent.type(
      inTheDialog().getByLabelText(/Notes/),
      "The mafaldini is the whole reason to come",
    );
    await save();

    await waitFor(() => {
      expect(lastRequestWith(fetchMock, "POST").body).toEqual({
        experience: {
          rating: 4.5,
          occurred_on: "2026-10-18",
          notes: "The mafaldini is the whole reason to come",
        },
      });
    });
  });

  it("records it against the restaurant whose screen it was opened from", async () => {
    await openTheDialog();

    await userEvent.click(inTheDialog().getByRole("radio", { name: "3 stars" }));
    await save();

    await waitFor(() => {
      expect(lastRequestWith(fetchMock, "POST").path).toBe("/api/restaurants/4/experiences");
    });
  });

  // Scenario: Recording a rating and nothing else
  it("sends a rating with no date and no note", async () => {
    await openTheDialog();

    await userEvent.click(inTheDialog().getByRole("radio", { name: "3 stars" }));
    await save();

    await waitFor(() => {
      expect(lastRequestWith(fetchMock, "POST").body).toEqual({
        experience: { rating: 3, occurred_on: null, notes: null },
      });
    });
  });

  // Scenario: Recording something worth remembering without scoring it
  it("sends a note with no rating", async () => {
    await openTheDialog();

    await userEvent.type(inTheDialog().getByLabelText(/Notes/), "Suadero sold out by 8pm");
    await save();

    await waitFor(() => {
      expect(lastRequestWith(fetchMock, "POST").body).toEqual({
        experience: { rating: null, occurred_on: null, notes: "Suadero sold out by 8pm" },
      });
    });
  });

  // "At least one of the three. Save stays disabled while all three are empty."
  describe("an experience with nothing in it", () => {
    it("cannot be saved", async () => {
      await openTheDialog();

      expect(inTheDialog().getByRole("button", { name: "Save" })).toBeDisabled();
    });

    it("can be saved once any one of the three is given", async () => {
      await openTheDialog();

      await userEvent.type(inTheDialog().getByLabelText(/Notes/), "Queue out the door");

      expect(inTheDialog().getByRole("button", { name: "Save" })).toBeEnabled();
    });

    // Clearing the rating with nothing else given takes Save away again, which
    // is the same rule reached from the other direction.
    it("cannot be saved once the only thing given is cleared", async () => {
      await openTheDialog();

      await userEvent.click(inTheDialog().getByRole("radio", { name: "3 stars" }));
      expect(inTheDialog().getByRole("button", { name: "Save" })).toBeEnabled();

      await userEvent.click(inTheDialog().getByRole("button", { name: "Clear rating" }));

      expect(inTheDialog().getByRole("button", { name: "Save" })).toBeDisabled();
    });

    // Whitespace is not something worth remembering.
    it("cannot be saved with a note of nothing but spaces", async () => {
      await openTheDialog();

      await userEvent.type(inTheDialog().getByLabelText(/Notes/), "   ");

      expect(inTheDialog().getByRole("button", { name: "Save" })).toBeDisabled();
    });
  });

  // Scenario: Recording an experience dated in the future. The browser's date
  // input cannot stop a typo, so what the API says has to be shown.
  it("shows the API's refusal of a date in the future", async () => {
    await openTheDialog();

    await userEvent.click(inTheDialog().getByRole("radio", { name: "4 stars" }));
    await userEvent.type(inTheDialog().getByLabelText(/When/), "2026-10-28");

    fetchMock.mockResolvedValueOnce(
      invalid({ occurred_on: ["Occurred on cannot be later than the day it is recorded"] }),
    );
    await userEvent.click(inTheDialog().getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("Occurred on cannot be later than the day it is recorded"),
    ).toBeInTheDocument();
  });

  it("stays open when the API refuses, so the owner can correct it", async () => {
    await openTheDialog();

    await userEvent.click(inTheDialog().getByRole("radio", { name: "4 stars" }));

    fetchMock.mockResolvedValueOnce(invalid({ base: ["needs a rating, a note or a date"] }));
    await userEvent.click(inTheDialog().getByRole("button", { name: "Save" }));

    expect(await screen.findByText("needs a rating, a note or a date")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes once the experience is recorded", async () => {
    await openTheDialog();

    await userEvent.click(inTheDialog().getByRole("radio", { name: "4 stars" }));
    await save();

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  // Recording an experience is what makes a restaurant read as visited, and
  // visited is derived from the count rather than stored — so the list is stale
  // the moment one is recorded.
  it("reads the list and the experiences again once one is recorded", async () => {
    await openTheDialog();

    await userEvent.click(inTheDialog().getByRole("radio", { name: "4 stars" }));
    await save();

    await waitFor(() => {
      const paths = fetchMock.mock.calls.map((call) => String(call.at(0)));

      expect(paths.filter((path) => path === "/api/restaurants").length).toBeGreaterThan(1);
      expect(paths.filter((path) => path === "/api/restaurants/4/experiences").length)
        .toBeGreaterThan(1);
    });
  });

  it("records nothing when cancelled", async () => {
    await openTheDialog();

    await userEvent.click(inTheDialog().getByRole("radio", { name: "4 stars" }));
    await userEvent.click(inTheDialog().getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(requestsWith(fetchMock, "POST")).toHaveLength(0);
  });
});
