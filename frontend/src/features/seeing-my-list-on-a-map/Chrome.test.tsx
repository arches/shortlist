import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { aRestaurant } from "@/features/managing-my-list/testing";
import { forgetSession, rememberSession } from "@/session/store";
import { respond, stubFetch } from "@/test/http";
import { renderApp } from "@/test/router";

import { BACARI, openTheMenu, theConfiguration } from "./testing";

import type { Mock } from "vitest";

// Derived from seeing-my-list-on-a-map.drawio, which draws the chrome and
// annotates it: "Chrome floats over the map. No header, no page title", and
// "Sign out lives behind hamburger". The "+" is what
// managing-my-list.wireframe.drawio no longer draws, moved into this row.
describe("the chrome over the map", () => {
  let fetchMock: Mock;

  beforeEach(() => {
    fetchMock = stubFetch();
    window.localStorage.clear();
    forgetSession();
    rememberSession({ access_token: "access-one", refresh_token: "refresh-one", expires_in: 900 });
    fetchMock.mockImplementation((path: string) =>
      Promise.resolve(
        path.endsWith("/configuration")
          ? respond(200, theConfiguration())
          : respond(200, [aRestaurant(BACARI)]),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // "No header, no page title."
  it("gives the page no title of its own", async () => {
    renderApp("/");

    await screen.findByTestId("map");

    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(screen.queryByText("My list")).toBeNull();
  });

  // The row is drawn inside the map's rectangle rather than above it, so it is
  // over the map rather than a band the map was shortened to make room for.
  it("floats over the map rather than sitting above it", async () => {
    renderApp("/");

    const map = await screen.findByTestId("map");
    const row = screen.getByRole("button", { name: "Menu" }).closest("div.absolute");

    expect(row).not.toBeNull();
    expect(row).toHaveClass("absolute", "top-0");

    // The map is the page behind it, not a sibling band in a column.
    expect(map.className).toContain("h-full");
    expect(row?.contains(map)).toBe(false);
  });

  it("opens the add dialog from the +", async () => {
    renderApp("/");

    await screen.findByTestId("map");
    await userEvent.click(screen.getByRole("button", { name: "Add a restaurant" }));

    expect(
      await screen.findByRole("heading", { name: "Add a restaurant" }),
    ).toBeInTheDocument();
  });

  // "Sign out lives behind hamburger" — so it is not in the row itself.
  it("keeps sign out behind the hamburger", async () => {
    renderApp("/");

    await screen.findByTestId("map");

    expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();

    const menu = await openTheMenu();

    expect(within(menu).getByRole("menuitem", { name: "Sign out" })).toBeInTheDocument();
  });
});
