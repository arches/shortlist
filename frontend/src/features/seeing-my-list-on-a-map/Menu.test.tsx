import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { aRestaurant } from "@/features/managing-my-list/testing";
import { forgetSession, rememberSession } from "@/session/store";
import { forgetGeolocation, sharesLocation } from "@/test/geolocation";
import { respond, stubFetch } from "@/test/http";
import { renderApp } from "@/test/router";

import {
  BACARI,
  cardFor,
  dragTheSheet,
  openTheMenu,
  pinFor,
  SILVERLAKE,
  theConfiguration,
  theMenuIsOpen,
  theSheet,
  whereTheSheetRests,
} from "./testing";

import type { Mock } from "vitest";

// Derived from the Menu column of list-screen.states.md. Fourteen of its
// fifteen rows read Close and only Tap the hamburger reads Open, so this is one
// test per event that can reach an open menu.
//
// Every row that closes the menu also does something else, and the pair is the
// point: the gesture shuts the menu and lands on what is under it, rather than
// being swallowed as a dismissal. See ASSUMPTIONS.md, "Whether one gesture both
// acts and closes the menu".
const LILIA = { id: 2, name: "Lilia", latitude: 40.7128, longitude: -73.9542 };

describe("the menu", () => {
  let fetchMock: Mock;

  beforeEach(() => {
    fetchMock = stubFetch();
    window.localStorage.clear();
    forgetSession();
    forgetGeolocation();
    rememberSession({ access_token: "access-one", refresh_token: "refresh-one", expires_in: 900 });
    fetchMock.mockImplementation((path: string) =>
      Promise.resolve(
        String(path).endsWith("/configuration")
          ? respond(200, theConfiguration())
          : respond(200, [aRestaurant({ ...BACARI, id: 1 }), aRestaurant(LILIA)]),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // "Menu: Closed" in the initial state, and Tap the hamburger is the one row
  // that opens it.
  it("starts closed, and the hamburger opens it", async () => {
    renderApp("/");

    await screen.findByTestId("map");
    expect(theMenuIsOpen()).toBe(false);

    await openTheMenu();

    expect(theMenuIsOpen()).toBe(true);
  });

  it("closes when the sheet is dragged, and the sheet still moves", async () => {
    renderApp("/");

    await screen.findByTestId("map");
    await openTheMenu();

    await dragTheSheet("up");

    expect(theMenuIsOpen()).toBe(false);
    expect(await whereTheSheetRests()).toBe("full");
  });

  it("closes when a row is tapped, and the row is still chosen", async () => {
    renderApp("/");

    await screen.findByTestId("map");
    await openTheMenu();

    await userEvent.click(cardFor("Lilia"));

    expect(theMenuIsOpen()).toBe(false);
    expect(cardFor("Lilia")).toHaveAttribute("aria-current", "true");
  });

  it("closes when a pin is tapped, and the pin is still chosen", async () => {
    renderApp("/");

    await screen.findByTestId("map");
    await openTheMenu();

    await userEvent.click(pinFor("Lilia"));

    expect(theMenuIsOpen()).toBe(false);
    expect(cardFor("Lilia")).toHaveAttribute("aria-current", "true");
  });

  it("closes when the search is typed in, and the search still narrows", async () => {
    renderApp("/");

    await screen.findByTestId("map");
    await openTheMenu();

    await userEvent.click(screen.getByRole("searchbox", { name: "Search my list" }));
    await userEvent.paste("lilia");

    expect(theMenuIsOpen()).toBe(false);
    expect(screen.queryByRole("heading", { name: "Bacari" })).toBeNull();
  });

  it("closes when the search is cleared", async () => {
    renderApp("/");

    await screen.findByTestId("map");
    await userEvent.click(screen.getByRole("searchbox", { name: "Search my list" }));
    await userEvent.paste("lilia");

    await openTheMenu();
    await userEvent.clear(screen.getByRole("searchbox", { name: "Search my list" }));

    expect(theMenuIsOpen()).toBe(false);
    expect(await screen.findByRole("heading", { name: "Bacari" })).toBeInTheDocument();
  });

  // A radio item keeps the menu open by default, which left the owner looking
  // at a menu instead of at the list it had just narrowed.
  it("closes when the filter is changed, and the filter still narrows", async () => {
    renderApp("/");

    await screen.findByTestId("map");
    const menu = await openTheMenu();
    await userEvent.click(within(menu).getByRole("menuitemradio", { name: "Visited" }));

    expect(theMenuIsOpen()).toBe(false);
    expect(screen.queryByRole("heading", { name: "Bacari" })).toBeNull();
  });

  // Pan/Zoom the map, and Scroll the list, by the one gesture that presses
  // nothing. A non-modal menu closes on an outside pointer interaction, and a
  // wheel is not one.
  it("closes on a wheel over the map", async () => {
    renderApp("/");

    const map = await screen.findByTestId("map");
    await openTheMenu();

    fireEvent.wheel(map, { deltaY: -120 });

    expect(theMenuIsOpen()).toBe(false);
  });

  it("closes on a wheel over the list", async () => {
    renderApp("/");

    await screen.findByTestId("map");
    await openTheMenu();

    fireEvent.wheel(await theSheet(), { deltaY: 120 });

    expect(theMenuIsOpen()).toBe(false);
  });

  it("closes when the add dialog is opened, and the dialog opens", async () => {
    renderApp("/");

    await screen.findByTestId("map");
    await openTheMenu();

    await userEvent.click(screen.getByRole("button", { name: "Add a restaurant" }));

    expect(await screen.findByRole("heading", { name: "Add a restaurant" })).toBeInTheDocument();
    expect(theMenuIsOpen()).toBe(false);
  });

  // Close the "Add" dialog and Add a restaurant both read Close too, and both
  // are reached through the row above: opening the dialog has already closed
  // the menu, so there is nothing left for either to close.
  it("closes when locate-me is pressed, and the map still recentres", async () => {
    sharesLocation(SILVERLAKE);

    renderApp("/");

    await screen.findByTestId("map");
    await openTheMenu();

    await userEvent.click(screen.getByRole("button", { name: "Locate me" }));

    expect(theMenuIsOpen()).toBe(false);
    expect(screen.getByTestId("map").dataset.movedTo).toBe(
      JSON.stringify({ center: SILVERLAKE, zoom: 13 }),
    );
  });
});
