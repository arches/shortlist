import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { aRestaurant } from "@/features/managing-my-list/testing";
import { forgetSession, rememberSession } from "@/session/store";
import { respond, stubFetch } from "@/test/http";
import { renderApp } from "@/test/router";

import { BACARI, cardFor, pinFor, theConfiguration } from "./testing";

import type { Mock } from "vitest";

// Derived from the two selection scenarios in
// seeing-my-list-on-a-map.scenarios.md. Both move the other half of the page,
// which is why selection lives on the screen that holds map and list together.
//
// Background: Bacari is on my list at 3626 Sunset Blvd, Los Angeles, CA 90026.
// Lilia is the second restaurant, so there is something for a highlight to be
// distinguished from.
const LILIA = { id: 2, name: "Lilia", latitude: 40.7128, longitude: -73.9542 };

describe("choosing a restaurant", () => {
  let fetchMock: Mock;

  beforeEach(() => {
    fetchMock = stubFetch();
    window.localStorage.clear();
    forgetSession();
    rememberSession({ access_token: "access-one", refresh_token: "refresh-one", expires_in: 900 });
    vi.mocked(Element.prototype.scrollIntoView).mockClear();

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

  // Scenario: Selecting a restaurant on the list
  describe("on the list", () => {
    it("pans the map to centre it, and highlights its pin", async () => {
      renderApp("/");

      await screen.findByTestId("map");
      await userEvent.click(cardFor("Bacari"));

      expect(screen.getByTestId("map")).toHaveAttribute(
        "data-panned-to",
        JSON.stringify({ lat: BACARI.latitude, lng: BACARI.longitude }),
      );

      expect(within(pinFor("Bacari")).getByTestId("highlighted-google-pin")).toBeInTheDocument();
    });

    it("leaves every other pin standard", async () => {
      renderApp("/");

      await screen.findByTestId("map");
      await userEvent.click(cardFor("Bacari"));

      expect(within(pinFor("Lilia")).getByTestId("standard-google-pin")).toBeInTheDocument();
    });

    it("highlights the card it was chosen from", async () => {
      renderApp("/");

      await screen.findByTestId("map");
      await userEvent.click(cardFor("Bacari"));

      expect(cardFor("Bacari")).toHaveAttribute("aria-current", "true");
      expect(cardFor("Lilia")).not.toHaveAttribute("aria-current");
    });

    it("moves the choice when a second restaurant is chosen", async () => {
      renderApp("/");

      await screen.findByTestId("map");
      await userEvent.click(cardFor("Bacari"));
      await userEvent.click(cardFor("Lilia"));

      expect(cardFor("Lilia")).toHaveAttribute("aria-current", "true");
      expect(cardFor("Bacari")).not.toHaveAttribute("aria-current");
      expect(screen.getByTestId("map")).toHaveAttribute(
        "data-panned-to",
        JSON.stringify({ lat: LILIA.latitude, lng: LILIA.longitude }),
      );
    });
  });

  // Scenario: Selecting a restaurant on the map
  describe("on the map", () => {
    it("scrolls the list so it is in view, and highlights it there", async () => {
      renderApp("/");

      await screen.findByTestId("map");
      await userEvent.click(pinFor("Bacari"));

      expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
      expect(cardFor("Bacari")).toHaveAttribute("aria-current", "true");
    });

    it("highlights the pin that was clicked", async () => {
      renderApp("/");

      await screen.findByTestId("map");
      await userEvent.click(pinFor("Bacari"));

      expect(within(pinFor("Bacari")).getByTestId("highlighted-google-pin")).toBeInTheDocument();
    });

    it("pans the map to centre what was clicked" , async () => {
      renderApp("/");

      await screen.findByTestId("map");
      await userEvent.click(pinFor("Lilia"));

      expect(screen.getByTestId("map")).toHaveAttribute(
        "data-panned-to",
        JSON.stringify({ lat: LILIA.latitude, lng: LILIA.longitude }),
      );
    });
  });

  // Nothing is chosen until the owner chooses something, so the map keeps the
  // view it opened at and no card is marked.
  describe("before anything is chosen", () => {
    it("pans nowhere and highlights nothing", async () => {
      renderApp("/");

      const map = await screen.findByTestId("map");

      expect(map).not.toHaveAttribute("data-panned-to");
      expect(screen.queryAllByTestId("highlighted-google-pin")).toEqual([]);
      expect(cardFor("Bacari")).not.toHaveAttribute("aria-current");
      expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    });
  });
});
