import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ControlPosition } from "@vis.gl/react-google-maps";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { aRestaurant } from "@/features/managing-my-list/testing";
import { forgetSession, rememberSession } from "@/session/store";
import { declinesLocation, forgetGeolocation, sharesLocation } from "@/test/geolocation";
import { respond, stubFetch } from "@/test/http";
import { renderApp } from "@/test/router";

import { BACARI, cardFor, PIN_COLOURS, pinColourFor, SILVERLAKE, theConfiguration, whereTheSheetRests } from "./testing";
import { OPENING_ZOOM } from "./view";

import type { Mock } from "vitest";

// Derived from Scenario: Recentering on the user location in
// seeing-my-list-on-a-map.scenarios.md, and from the control the wireframe
// beside it draws above the zoom buttons.
//
// Background: I am signed in as the owner of my list, I have been asked to
// share my browser location, and Bacari is on my list at 3626 Sunset Blvd.
// Lilia is the second restaurant, so there is somewhere for the map to be moved
// away to.
//
// What a real browser does with Google's own chrome layer is the End-to-end
// tests row shortlist.stack.md leaves TBD. What is checked here is which corner
// Shortlist asked for, and where it told the map to look.
const LILIA = { id: 2, name: "Lilia", latitude: 40.7128, longitude: -73.9542 };

// "I see a map centered around my location at zoom level 13" — centre and zoom
// together, which is the whole of what the button does.
const MY_LOCATION_AT_OPENING_ZOOM = JSON.stringify({
  center: SILVERLAKE,
  zoom: OPENING_ZOOM,
});

describe("locating me", () => {
  let fetchMock: Mock;

  beforeEach(() => {
    fetchMock = stubFetch();
    window.localStorage.clear();
    forgetSession();
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
    forgetGeolocation();
    vi.unstubAllGlobals();
  });

  // Scenario: Recentering on the user location
  it("recentres on the owner's location at zoom 13", async () => {
    sharesLocation(SILVERLAKE);

    renderApp("/");

    const map = await screen.findByTestId("map");

    // The map opened there and nothing has moved it since, so the move is the
    // button's and not the opening view's.
    expect(map).not.toHaveAttribute("data-moved-to");

    await userEvent.click(screen.getByRole("button", { name: "Locate me" }));

    expect(screen.getByTestId("map")).toHaveAttribute(
      "data-moved-to",
      MY_LOCATION_AT_OPENING_ZOOM,
    );
  });

  // Which is the reason the button exists: the owner has moved the map away,
  // here by choosing a restaurant a continent from where they are standing, and
  // this is how they get back. The zoom comes back with the centre, where
  // Scenario: Selecting a restaurant on the list deliberately leaves it alone.
  it("recentres after the map has been moved away", async () => {
    sharesLocation(SILVERLAKE);

    renderApp("/");

    await screen.findByTestId("map");
    await userEvent.click(cardFor("Lilia"));

    expect(screen.getByTestId("map")).toHaveAttribute(
      "data-moved-to",
      JSON.stringify({ center: { lat: LILIA.latitude, lng: LILIA.longitude }, zoom: OPENING_ZOOM }),
    );

    await userEvent.click(screen.getByRole("button", { name: "Locate me" }));

    expect(screen.getByTestId("map")).toHaveAttribute(
      "data-moved-to",
      MY_LOCATION_AT_OPENING_ZOOM,
    );
  });

  // list-screen.states.md, Locate-me: "Selection: None". Going back to where the
  // owner is standing is leaving behind the restaurant they went to look at, so
  // the highlight goes with it — on the card and on the pin both.
  it("drops the choice", async () => {
    sharesLocation(SILVERLAKE);

    renderApp("/");

    await screen.findByTestId("map");
    await userEvent.click(cardFor("Lilia"));
    expect(cardFor("Lilia")).toHaveAttribute("aria-current", "true");

    await userEvent.click(screen.getByRole("button", { name: "Locate me" }));

    expect(cardFor("Lilia")).not.toHaveAttribute("aria-current");
    expect(pinColourFor("Lilia")).not.toBe(PIN_COLOURS.highlighted);
  });

  // "Sheet: Unchanged" on the same row. Choosing Lilia dropped the sheet to
  // peek, and going back to the owner's location does not undo that: the sheet
  // is where they left it, not where it was before they chose.
  it("leaves the sheet where it was", async () => {
    sharesLocation(SILVERLAKE);

    renderApp("/");

    await screen.findByTestId("map");
    await userEvent.click(cardFor("Lilia"));

    await userEvent.click(screen.getByRole("button", { name: "Locate me" }));

    expect(await whereTheSheetRests()).toBe("peek");
  });

  // Nothing to go back to, so nothing is offered — see ASSUMPTIONS.md, "The
  // locate-me button when there is no location to go to". The same silence
  // Scenario: Location not shared gives the blue dot, which is not drawn here
  // either.
  it("offers nothing to locate with when the owner shared nothing", async () => {
    declinesLocation();

    renderApp("/");

    await screen.findByTestId("map");

    expect(screen.queryByRole("button", { name: "Locate me" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("my-location-dot")).not.toBeInTheDocument();
  });

  // The wireframe draws it inside the map, in the column the zoom buttons are
  // in, so it goes into Google's own control layer at that corner rather than
  // being placed over the map by the page — see ASSUMPTIONS.md, "What the
  // locate-me button is drawn as".
  //
  // The corner is the right edge at the middle of the map now, which is where
  // the wireframe draws both controls: immediately above the line the sheet
  // rests at. The bottom of the map is behind the sheet.
  it("sits in the map's own controls, in the column the zoom buttons are in", async () => {
    sharesLocation(SILVERLAKE);

    renderApp("/");

    const map = await screen.findByTestId("map");
    const control = screen.getByRole("button", { name: "Locate me" }).closest("[data-position]");

    expect(control).toHaveAttribute("data-position", String(ControlPosition.RIGHT_CENTER));
    expect(map.contains(control)).toBe(true);
  });

  // Google draws its own zoom buttons, so the only thing Shortlist can say
  // about them is where they go. Left where they were they would be behind the
  // sheet at peek, half and full alike.
  it("stacks with zoom buttons the sheet does not cover", async () => {
    sharesLocation(SILVERLAKE);

    renderApp("/");

    const map = await screen.findByTestId("map");

    expect(map.dataset.zoomControl).toBe("true");
    expect(map.dataset.zoomControlPosition).toBe(String(ControlPosition.RIGHT_CENTER));
  });
});
