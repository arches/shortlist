import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { forgetSession, rememberSession } from "@/session/store";
import { invalid, requestAt, respond, stubFetch } from "@/test/http";
import { renderApp } from "@/test/router";

import { aRestaurant, openDialog, pressInDialog, typeInto } from "./testing";

import type { Mock } from "vitest";

// Derived from managing-my-list.scenarios.md and the Add dialog in
// managing-my-list.wireframe.drawio.svg.
async function openTheDialog() {
  renderApp("/");
  await screen.findByRole("heading", { name: "My list" });
  await openDialog("Add", "Add a restaurant");
}

const type = typeInto;
const submit = () => pressInDialog("Add");

describe("adding a restaurant", () => {
  let fetchMock: Mock;

  beforeEach(() => {
    fetchMock = stubFetch();
    window.localStorage.clear();
    forgetSession();
    rememberSession({ access_token: "access-one", refresh_token: "refresh-one", expires_in: 900 });
    fetchMock.mockResolvedValue(respond(200, []));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Scenario: Adding a restaurant I have only heard the name of
  it("puts a restaurant on the list with a name and a city", async () => {
    await openTheDialog();
    await type("Name *", "Tacos El Bronco");
    await type("City", "Los Angeles");

    fetchMock.mockResolvedValueOnce(
      respond(201, aRestaurant({ name: "Tacos El Bronco", city: "Los Angeles" })),
    );
    await submit();

    await waitFor(() => {
      expect(requestAt(fetchMock, 1).path).toBe("/api/restaurants");
    });
    expect(requestAt(fetchMock, 1).body).toMatchObject({
      restaurant: { name: "Tacos El Bronco", city: "Los Angeles" },
    });
  });

  // managing-my-list.wireframe.drawio.svg draws the Add dialog with Name * and
  // City and nothing else. Everything else is filled in later, through Edit.
  it("offers a name and a city, and nothing else", async () => {
    await openTheDialog();

    expect(screen.getByLabelText("Name *")).toBeInTheDocument();
    expect(screen.getByLabelText("City")).toBeInTheDocument();

    for (const label of [
      "Cuisine",
      "Specialty",
      "Website",
      "Google Maps",
      "Yelp",
      "Address line 1",
      "Address line 2",
      "State",
      "Postal code",
      "Country",
      "Notes",
    ]) {
      expect(screen.queryByLabelText(label)).not.toBeInTheDocument();
    }
  });

  // shortlist.data.md, optionality: city is optional, and the name is the only
  // thing a Restaurant cannot be created without.
  it("sends no city when the owner gives none", async () => {
    await openTheDialog();
    await type("Name *", "Lilia");

    fetchMock.mockResolvedValueOnce(respond(201, aRestaurant({ name: "Lilia" })));
    await submit();

    await waitFor(() => {
      const sent = requestAt(fetchMock, 1).body as { restaurant: Record<string, unknown> };
      expect(sent.restaurant).toEqual({ name: "Lilia", city: null });
    });
  });

  // Scenario: Adding a restaurant that is already on my list — "Then it is
  // rejected as already on my list".
  it("reports a name already on the list, and says nothing about the one there", async () => {
    await openTheDialog();
    await type("Name *", "Joe's Pizza");

    fetchMock.mockResolvedValueOnce(invalid({ name: ["Name is already on your list"] }));
    await submit();

    expect(await screen.findByRole("alert")).toHaveTextContent("Name is already on your list");
    expect(screen.getByRole("heading", { name: "Add a restaurant" })).toBeInTheDocument();
  });

  // Scenario: Adding a restaurant with no name
  it("reports a name that is only whitespace", async () => {
    await openTheDialog();
    await type("Name *", "   ");

    fetchMock.mockResolvedValueOnce(invalid({ name: ["Name can't be blank"] }));
    await submit();

    expect(await screen.findByRole("alert")).toHaveTextContent("Name can't be blank");
  });

  it("closes once the restaurant is on the list", async () => {
    await openTheDialog();
    await type("Name *", "Lilia");

    fetchMock.mockResolvedValueOnce(respond(201, aRestaurant({ name: "Lilia" })));
    await submit();

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Add a restaurant" })).not.toBeInTheDocument();
    });
  });

  it("adds nothing when cancelled", async () => {
    await openTheDialog();
    await type("Name *", "Lilia");

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Add a restaurant" })).not.toBeInTheDocument();
    });
    expect(fetchMock.mock.calls).toHaveLength(1);
  });
});
