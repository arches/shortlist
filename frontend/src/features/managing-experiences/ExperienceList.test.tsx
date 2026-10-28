import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { forgetSession, rememberSession } from "@/session/store";
import { stubFetch } from "@/test/http";
import { renderApp } from "@/test/router";

import { anExperience, joesPizza, screenShows } from "./testing";

import type { Experience } from "@/api/types";
import type { Mock } from "vitest";

// One row per experience, in the order they are drawn.
function rows() {
  return screen.getAllByRole("listitem");
}

// Derived from the read-back scenarios in managing-experiences.scenarios.md and
// the rows drawn in managing-experiences.wireframe.drawio.svg.
describe("reading a restaurant's experiences back", () => {
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

  async function open(experiences: Experience[]) {
    screenShows(fetchMock, { restaurants: [joesPizza()], experiences });
    renderApp("/restaurants/4");
    await screen.findByRole("heading", { level: 1, name: "Joe's Pizza" });
  }

  // The wireframe's first row: "★★★★☆ 4", "24 Oct 2026", "Corner slice, still
  // the best one".
  it("draws the rating, the day it happened and the note", async () => {
    await open([
      anExperience({
        id: 11,
        rating: 4,
        occurred_on: "2026-10-24",
        notes: "Corner slice, still the best one",
      }),
    ]);

    const row = within(await screen.findByRole("listitem"));

    expect(row.getByText("4")).toBeInTheDocument();
    expect(row.getByText("24 Oct 2026")).toBeInTheDocument();
    expect(row.getByText("Corner slice, still the best one")).toBeInTheDocument();
  });

  // The wireframe writes a day with no leading zero and the month abbreviated.
  it("writes the day without a leading zero", async () => {
    await open([anExperience({ id: 12, rating: 3, occurred_on: "2026-05-02" })]);

    expect(await screen.findByText("2 May 2026")).toBeInTheDocument();
  });

  // Scenario: Recording a rating and nothing else — "And that experience shows
  // no date and no note". The wireframe's own markers for both.
  it("says so when an experience carries no note", async () => {
    await open([anExperience({ id: 13, rating: 3, occurred_on: "2026-05-02" })]);

    expect(await screen.findByText("No notes")).toBeInTheDocument();
  });

  // The wireframe's third row: "No date" with "recorded 20 Oct 2026" beneath.
  it("says there is no date, and offers the day it was written down instead", async () => {
    await open([
      anExperience({
        id: 14,
        rating: 3.5,
        occurred_on: null,
        recorded_at: "2026-10-20T18:00:00.000Z",
        notes: "Queue out the door",
      }),
    ]);

    expect(await screen.findByText("No date")).toBeInTheDocument();
    expect(screen.getByText("recorded 20 Oct 2026")).toBeInTheDocument();
  });

  // Scenario: Recording something worth remembering without scoring it — "And
  // that experience shows no rating".
  it("says so when an experience carries no rating", async () => {
    await open([anExperience({ id: 15, rating: null, notes: "Suadero sold out by 8pm" })]);

    expect(await screen.findByText("No rating")).toBeInTheDocument();
    expect(screen.getByText("Suadero sold out by 8pm")).toBeInTheDocument();
  });

  // Scenario: Reading a restaurant's experiences back. The API settles the
  // order and nothing here re-sorts it, so what is asserted is that the served
  // order is the order drawn.
  it("draws them in the order they are served", async () => {
    await open([
      anExperience({ id: 21, rating: 4, occurred_on: "2026-10-20" }),
      anExperience({ id: 22, rating: 3, occurred_on: "2026-05-02" }),
      anExperience({ id: 23, rating: 2, occurred_on: "2019-06-14" }),
    ]);

    await screen.findByText("20 Oct 2026");

    expect(rows().map((row) => row.textContent)).toEqual([
      expect.stringContaining("20 Oct 2026"),
      expect.stringContaining("2 May 2026"),
      expect.stringContaining("14 Jun 2019"),
    ]);
  });

  // Scenario: Going back — "Then 'Joe's Pizza' shows two experiences, and they
  // are not merged into one."
  it("keeps two experiences apart rather than merging them", async () => {
    await open([
      anExperience({ id: 31, rating: 4, occurred_on: "2026-10-20" }),
      anExperience({ id: 32, rating: 3, occurred_on: "2026-05-02" }),
    ]);

    await screen.findByText("20 Oct 2026");

    expect(rows()).toHaveLength(2);
  });

  // Scenario: Two experiences on the same day. Lunch and dinner are two
  // experiences, and a shared date does not collapse them.
  it("keeps two experiences on one day apart", async () => {
    await open([
      anExperience({ id: 41, rating: 2.5, occurred_on: "2026-10-20" }),
      anExperience({ id: 42, rating: 4, occurred_on: "2026-10-20" }),
    ]);

    await screen.findByText("2.5");

    expect(rows()).toHaveLength(2);
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  // Scenario: Adding a restaurant I have only heard the name of — "And it has
  // no experiences". The wireframe draws no empty state, so these words are an
  // assumption.
  it("says there is nothing here yet for a restaurant with no experiences", async () => {
    screenShows(fetchMock, {
      restaurants: [joesPizza({ visited: false, experience_count: 0 })],
      experiences: [],
    });
    renderApp("/restaurants/4");

    expect(await screen.findByText("No experiences here yet.")).toBeInTheDocument();
  });

  it("is headed Experiences", async () => {
    await open([anExperience({ id: 51, rating: 4 })]);

    expect(await screen.findByRole("heading", { level: 2, name: "Experiences" })).toBeInTheDocument();
  });
});
