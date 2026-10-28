import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Restaurant } from "@/api/types";
import { forgetSession, rememberSession } from "@/session/store";
import { invalid, requestAt, respond, stubFetch } from "@/test/http";
import { renderApp } from "@/test/router";

import {
  aRestaurant,
  clearField,
  openDialog,
  pressInDialog,
  typeInto,
} from "./testing";

import type { Mock } from "vitest";

// Derived from managing-my-list.scenarios.md and the Edit dialog in
// managing-my-list.wireframe.drawio.svg.
function sentDraft(fetchMock: Mock): Record<string, unknown> {
  const { body } = requestAt(fetchMock, 1);
  return (body as { restaurant: Record<string, unknown> }).restaurant;
}

describe("changing a restaurant", () => {
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

  async function openEditorFor(restaurant: Restaurant) {
    fetchMock.mockResolvedValue(respond(200, [restaurant]));
    renderApp("/");
    // The heading renders before the list arrives, so wait for the card.
    await screen.findByRole("heading", { name: restaurant.name });
    await openDialog("Edit", `Edit · ${restaurant.name}`);
  }

  // Scenario: Filling in a detail later. Changing one detail leaves the others
  // alone — this is the path that rules out restating a whole restaurant.
  describe("filling in a detail later", () => {
    it("sets the one detail", async () => {
      await openEditorFor(aRestaurant({ name: "Lilia", cuisine: null, city: null }));
      await typeInto("Cuisine", "Italian");

      fetchMock.mockResolvedValueOnce(respond(200, aRestaurant({ cuisine: "Italian" })));
      await pressInDialog("Save");

      await waitFor(() => {
        expect(sentDraft(fetchMock).cuisine).toBe("Italian");
      });
    });

    it("leaves the others alone", async () => {
      await openEditorFor(
        aRestaurant({ name: "Lilia", cuisine: null, city: null, notes: "Book a month ahead" }),
      );
      await typeInto("Cuisine", "Italian");

      fetchMock.mockResolvedValueOnce(respond(200, aRestaurant({ cuisine: "Italian" })));
      await pressInDialog("Save");

      await waitFor(() => {
        const draft = sentDraft(fetchMock);
        expect(draft.name).toBe("Lilia");
        expect(draft.notes).toBe("Book a month ahead");
        expect(draft.city).toBeNull();
      });
    });

    it("opens showing what the restaurant already has", async () => {
      await openEditorFor(aRestaurant({ name: "Lilia", cuisine: "Italian" }));

      expect(screen.getByLabelText("Name *")).toHaveValue("Lilia");
      expect(screen.getByLabelText("Cuisine")).toHaveValue("Italian");
    });
  });

  // Scenario: Clearing a detail. Clearing is a distinct act from leaving a field
  // alone, and both have to be sayable — otherwise a note written by mistake can
  // never be taken back.
  describe("clearing a detail", () => {
    it("clears the note", async () => {
      await openEditorFor(aRestaurant({ name: "Lilia", notes: "Book a month ahead" }));
      await clearField("Notes");

      fetchMock.mockResolvedValueOnce(respond(200, aRestaurant({ notes: null })));
      await pressInDialog("Save");

      await waitFor(() => {
        expect(sentDraft(fetchMock).notes).toBeNull();
      });
    });

    it("clears a field through the clear control the wireframe draws", async () => {
      await openEditorFor(aRestaurant({ name: "Lilia", cuisine: "Italian" }));

      await userEvent.click(screen.getByRole("button", { name: "Clear cuisine" }));

      expect(screen.getByLabelText("Cuisine")).toHaveValue("");
    });

    it("offers no clear control on a field that is already empty", async () => {
      await openEditorFor(aRestaurant({ name: "Lilia", cuisine: null }));

      expect(screen.queryByRole("button", { name: "Clear cuisine" })).not.toBeInTheDocument();
    });

    it("tells clearing apart from leaving a field alone", async () => {
      await openEditorFor(
        aRestaurant({ name: "Lilia", cuisine: "Italian", notes: "Book a month ahead" }),
      );
      await clearField("Notes");

      fetchMock.mockResolvedValueOnce(respond(200, aRestaurant({})));
      await pressInDialog("Save");

      await waitFor(() => {
        const draft = sentDraft(fetchMock);
        expect(draft.notes).toBeNull();
        expect(draft.cuisine).toBe("Italian");
      });
    });
  });

  // Scenario: Correcting a restaurant's name. A rename moves the restaurant and
  // its history together; it does not create a second entry.
  describe("correcting a name", () => {
    it("sends the new name", async () => {
      await openEditorFor(aRestaurant({ name: "Bar Primi" }));
      await clearField("Name *");
      await typeInto("Name *", "Bar Primi Soho");

      fetchMock.mockResolvedValueOnce(respond(200, aRestaurant({ name: "Bar Primi Soho" })));
      await pressInDialog("Save");

      await waitFor(() => {
        expect(sentDraft(fetchMock).name).toBe("Bar Primi Soho");
      });
    });

    it("changes the one it was opened for, not a second entry", async () => {
      await openEditorFor(aRestaurant({ id: 7, name: "Bar Primi" }));
      await clearField("Name *");
      await typeInto("Name *", "Bar Primi Soho");

      fetchMock.mockResolvedValueOnce(respond(200, aRestaurant({ id: 7 })));
      await pressInDialog("Save");

      await waitFor(() => {
        const { path, headers } = requestAt(fetchMock, 1);
        expect(path).toBe("/api/restaurants/7");
        expect(headers.get("Authorization")).toBe("Bearer access-one");
      });
    });
  });

  // Scenario: Renaming a restaurant to one already on my list
  it("reports a rename onto a name already on the list, and stays open", async () => {
    await openEditorFor(aRestaurant({ name: "Bar Primi" }));
    await clearField("Name *");
    await typeInto("Name *", "Joe's Pizza");

    fetchMock.mockResolvedValueOnce(invalid({ name: ["Name is already on your list"] }));
    await pressInDialog("Save");

    expect(await screen.findByRole("alert")).toHaveTextContent("Name is already on your list");
    expect(screen.getByRole("heading", { name: "Edit · Bar Primi" })).toBeInTheDocument();
  });

  // Scenario Outline: Giving a restaurant a link that is not a web address. The
  // outline runs against editing: adding takes a name and a city, so the
  // Website field only ever appears here.
  it.each([
    ["javascript:alert(1)"],
    ["data:text/html,<h1>hi</h1>"],
    ["mailto:hi@lilianewyork.com"],
  ])("reports %s as not a web address, and changes nothing", async (link) => {
    await openEditorFor(aRestaurant({ name: "Lilia", url: null }));
    await typeInto("Website", link);

    fetchMock.mockResolvedValueOnce(
      invalid({ url: ["Url must be a web address beginning http:// or https://"] }),
    );
    await pressInDialog("Save");

    expect(await screen.findByRole("alert")).toHaveTextContent("must be a web address");
    expect(screen.getByRole("heading", { name: "Edit · Lilia" })).toBeInTheDocument();
  });

  it("closes once the change is saved", async () => {
    await openEditorFor(aRestaurant({ name: "Lilia" }));
    await typeInto("Cuisine", "Italian");

    fetchMock.mockResolvedValueOnce(respond(200, aRestaurant({ cuisine: "Italian" })));
    await pressInDialog("Save");

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Edit · Lilia" })).not.toBeInTheDocument();
    });
  });

  it("changes nothing when cancelled", async () => {
    await openEditorFor(aRestaurant({ name: "Lilia" }));
    await typeInto("Cuisine", "Italian");

    await pressInDialog("Cancel");

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Edit · Lilia" })).not.toBeInTheDocument();
    });
    expect(fetchMock.mock.calls).toHaveLength(1);
  });
});
