import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Restaurant } from "@/api/types";
import { forgetSession, rememberSession } from "@/session/store";
import { noContent, notFound, requestAt, respond, stubFetch } from "@/test/http";
import { renderApp } from "@/test/router";

import { aRestaurant, openDialog, pressInDialog } from "./testing";

import type { Mock } from "vitest";

// Derived from "Taking a restaurant off my list that I have visited" in
// managing-my-list.scenarios.md, and the confirmation in
// managing-my-list.wireframe.drawio.svg, whose words are reproduced exactly.
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

  async function openConfirmationFor(restaurant: Restaurant) {
    fetchMock.mockResolvedValue(respond(200, [restaurant]));
    renderApp("/");
    await screen.findByRole("heading", { name: restaurant.name });
    await openDialog("Remove", `Take “${restaurant.name}” off my list?`);
  }

  const joes = aRestaurant({
    id: 4,
    name: "Joe's Pizza",
    visited: true,
    experience_count: 2,
  });

  // The wireframe's exact words. Removed buys retention, not recovery.
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

  // Scenario: Taking a restaurant off my list that I have visited
  it("takes it off once confirmed", async () => {
    await openConfirmationFor(joes);

    fetchMock.mockResolvedValueOnce(noContent());
    await pressInDialog("Take it off");

    await waitFor(() => {
      const { path } = requestAt(fetchMock, 1);
      expect(path).toBe("/api/list/restaurants/4");
    });
  });

  it("asks the API to remove it, never to delete the experiences", async () => {
    await openConfirmationFor(joes);

    fetchMock.mockResolvedValueOnce(noContent());
    await pressInDialog("Take it off");

    await waitFor(() => {
      expect(fetchMock.mock.calls.at(1)?.at(1)).toMatchObject({ method: "DELETE" });
    });
    // Only the restaurant is addressed. Nothing reaches an experiences endpoint.
    expect(
      fetchMock.mock.calls.filter((call) => String(call.at(0)).includes("experience")),
    ).toHaveLength(0);
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
    expect(fetchMock.mock.calls).toHaveLength(1);
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
