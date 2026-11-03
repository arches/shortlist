import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { aRestaurant } from "@/features/managing-my-list/testing";
import { forgetSession, rememberSession } from "@/session/store";
import { lastRequestWith, pathsRequested, requestsWith, respond, stubFetch } from "@/test/http";
import { renderApp } from "@/test/router";

import type { Mock } from "vitest";

// Derived from the LIST NOTE block in managing-experiences.wireframe.drawio —
// "From my list, not an experience note", "Reads Add a note when empty" — and
// from "Changing the note on a restaurant on my list" in
// managing-my-list.scenarios.md, whose four examples are the four cases below.
function soban(note: string | null) {
  return aRestaurant({ id: 7, name: "Soban", cuisine: "Korean", note: note });
}

async function press(name: string) {
  await userEvent.click(screen.getByRole("button", { name: name }));
}

// Edit, replace what the field holds, Save. Clearing first is what makes
// "nothing" and "nothing but spaces" sayable on a note that already says
// something.
async function setTheNoteTo(typed: string) {
  await press("Edit list note");

  const field = screen.getByLabelText("List note");
  await userEvent.clear(field);
  if (typed.length > 0) await userEvent.type(field, typed);

  await press("Save");
}

describe("the list note on a restaurant's own screen", () => {
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

  function listIs(restaurants: ReturnType<typeof aRestaurant>[]) {
    fetchMock.mockImplementation((path: string) =>
      Promise.resolve(
        path === "/api/list/restaurants" ? respond(200, restaurants) : respond(200, []),
      ),
    );
  }

  async function openSoban(note: string | null) {
    listIs([soban(note)]);
    renderApp("/restaurants/7");
    await screen.findByRole("heading", { level: 1, name: "Soban" });
  }

  it("reads the note I wrote", async () => {
    await openSoban("Famous for their bibimbap");

    expect(screen.getByText("Famous for their bibimbap")).toBeInTheDocument();
  });

  // "Reads Add a note when empty."
  it("reads Add a note when I wrote none", async () => {
    await openSoban(null);

    expect(screen.getByText("Add a note")).toBeInTheDocument();
  });

  // The four examples of the outline. Each one is what is sent, because what
  // comes back is the list's to report.
  describe("the four ways a note changes", () => {
    it("writes a note onto a restaurant carrying none", async () => {
      await openSoban(null);

      await setTheNoteTo("Famous for their bibimbap");

      await waitFor(() => {
        expect(lastRequestWith(fetchMock, "PATCH")).toMatchObject({
          path: "/api/list/restaurants/7",
          body: { restaurant: { note: "Famous for their bibimbap" } },
        });
      });
    });

    it("replaces a note with a different one", async () => {
      await openSoban("Famous for their bibimbap");

      await setTheNoteTo("Go before 7pm");

      await waitFor(() => {
        expect(lastRequestWith(fetchMock, "PATCH")).toMatchObject({
          body: { restaurant: { note: "Go before 7pm" } },
        });
      });
    });

    // "Clearing a note is emptying it; there is no separate act of deleting
    // one" — so Save is live on an empty field rather than disabled.
    it("clears a note set to nothing", async () => {
      await openSoban("Famous for their bibimbap");

      await setTheNoteTo("");

      await waitFor(() => {
        expect(lastRequestWith(fetchMock, "PATCH")).toMatchObject({
          body: { restaurant: { note: null } },
        });
      });
    });

    it("clears a note set to nothing but spaces", async () => {
      await openSoban("Famous for their bibimbap");

      await setTheNoteTo("   ");

      await waitFor(() => {
        expect(lastRequestWith(fetchMock, "PATCH")).toMatchObject({
          body: { restaurant: { note: null } },
        });
      });
    });
  });

  // Edit replaces the note in place — see ASSUMPTIONS.md, "What the restaurant
  // screen's Edit opens for a note".
  it("opens the note for editing with what it already says", async () => {
    await openSoban("Famous for their bibimbap");

    await press("Edit list note");

    expect(screen.getByLabelText("List note")).toHaveValue("Famous for their bibimbap");
  });

  it("opens an empty field when there is no note yet", async () => {
    await openSoban(null);

    await press("Edit list note");

    expect(screen.getByLabelText("List note")).toHaveValue("");
  });

  it("changes nothing when cancelled", async () => {
    await openSoban("Famous for their bibimbap");

    await press("Edit list note");
    await userEvent.type(screen.getByLabelText("List note"), " and the galbi");
    await press("Cancel");

    expect(requestsWith(fetchMock, "PATCH")).toEqual([]);
    expect(screen.getByText("Famous for their bibimbap")).toBeInTheDocument();
  });

  it("closes the field once the note is written", async () => {
    await openSoban(null);

    await setTheNoteTo("Famous for their bibimbap");

    await waitFor(() => {
      expect(screen.queryByLabelText("List note")).toBeNull();
    });
  });

  // The note is read out of the list response, so writing one has to send the
  // list for reading again — otherwise the card and this screen disagree.
  it("reads the list again once the note is written", async () => {
    await openSoban(null);

    await setTheNoteTo("Famous for their bibimbap");

    await waitFor(() => {
      const listReads = pathsRequested(fetchMock).filter(
        (path) => path === "/api/list/restaurants",
      );

      expect(listReads.length).toBeGreaterThan(1);
    });
  });
});
