import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { Configuration, Restaurant } from "@/api/types";
import { aRestaurant } from "@/features/managing-my-list/testing";

import { DRAG_TRAVEL } from "./sheet";
import type { DragDirection, SheetPosition } from "./sheet";
import type { LocatedRestaurant } from "./view";

// A restaurant Google gave a point for. The pair is absent by default on
// aRestaurant, because most of what the list does has nothing to do with where
// a restaurant is.
export function aLocatedRestaurant(
  attributes: Partial<Restaurant> & { latitude: number; longitude: number },
): LocatedRestaurant {
  return { ...aRestaurant(attributes), ...attributes };
}

// A restaurant the owner has eaten at. shortlist.data.md derives Visited from
// the owner's experience count being above zero and the API sends both, so a
// fixture sets both — one experience is all it takes.
export function aVisitedRestaurant(attributes: Partial<Restaurant> = {}): Restaurant {
  return aRestaurant({ ...attributes, visited: true, experience_count: 1 });
}

// What GET /api/configuration answers with.
export function theConfiguration(attributes: Partial<Configuration> = {}): Configuration {
  return {
    google_maps_api_key: "a-maps-key",
    google_maps_map_id: "a-map-id",
    ...attributes,
  };
}

// Bacari, at 3626 Sunset Blvd, is the restaurant the feature's own Background
// puts on the list.
export const BACARI = {
  name: "Bacari",
  address_line_1: "3626 Sunset Blvd",
  city: "Los Angeles",
  state: "CA",
  postal_code: "90026",
  latitude: 34.0901,
  longitude: -118.2765,
} as const;

// Where the owner is standing in Scenario: See restaurants from my list — "I
// shared my location in Silverlake". Silverlake is the neighbourhood Bacari's
// own address is in, so the two points sit close together, which is what makes
// a test that confuses them worth writing.
export const SILVERLAKE = { lat: 34.0869, lng: -118.2702 } as const;

// The two halves of the page, picked out the way an owner points at them: a
// card by the restaurant it names, a pin by the same.
export function cardFor(name: string): HTMLElement {
  const card = screen.getByRole("heading", { name }).closest("[data-slot='card']");
  if (card === null) throw new Error(`no card for ${name}`);

  return card as HTMLElement;
}

export function pinFor(name: string): HTMLElement {
  return screen.getByRole("button", { name });
}

// The colours seeing-my-list-on-a-map.drawio draws a marker in, each one taken
// off the wireframe rather than read back off ListMap: a test that agrees with
// the component proves only that the component agrees with itself.
//
// The standard Google pin has no entry. "Markers should be standard google
// pins" is Google's own colour and nothing overriding it, so what a standard
// pin reads as here is the absence of a colour.
export const PIN_COLOURS = {
  // "Highlight is color-based", drawn #FFFF33 on the chosen marker.
  highlighted: "#ffff33",

  // "Visited locations should have green markers", drawn #99FF99.
  visited: "#99ff99",
} as const;

// What colour one restaurant's pin was drawn in, or undefined for the standard
// Google pin.
export function pinColourFor(name: string): string | undefined {
  return within(pinFor(name)).getByTestId("google-pin").dataset.background;
}

// Every pin on the map, by its colour, in the order the map drew them. For
// asking what the whole map looks like rather than one restaurant.
export function pinColours(): (string | undefined)[] {
  return screen.getAllByTestId("google-pin").map((pin) => pin.dataset.background);
}

// The hamburger, and what is behind it. seeing-my-list-on-a-map.drawio draws
// the menu rather than the controls themselves, so a test reaches Sign out and
// the filter the way an owner does: open the menu, then choose in it.
export async function openTheMenu(): Promise<HTMLElement> {
  await userEvent.click(screen.getByRole("button", { name: "Menu" }));

  return screen.findByRole("menu");
}

export async function chooseInTheMenu(name: string): Promise<void> {
  const menu = await openTheMenu();

  await userEvent.click(within(menu).getByRole("menuitem", { name }));
}

// The sheet, and the only way an owner moves it. Several scenarios open with
// "Given the sheet rests at <position>", which is reached by dragging there.
export function theSheet(): Promise<HTMLElement> {
  return screen.findByRole("region", { name: "My list" });
}

export async function dragTheSheet(
  direction: DragDirection,
  travel = DRAG_TRAVEL * 3,
): Promise<void> {
  const handle = (await theSheet()).querySelector("div.cursor-grab");
  if (handle === null) throw new Error("the sheet has no handle to drag");

  const start = 400;
  const end = direction === "up" ? start - travel : start + travel;

  fireEvent.pointerDown(handle, { clientY: start });
  fireEvent.pointerMove(handle, { clientY: end });
  fireEvent.pointerUp(handle, { clientY: end });
}

export async function restAt(position: SheetPosition): Promise<void> {
  if (position === "peek") await dragTheSheet("down");
  if (position === "full") await dragTheSheet("up");

  const sheet = await theSheet();
  if (sheet.dataset.position !== position) {
    throw new Error(`the sheet rests at ${String(sheet.dataset.position)}, not ${position}`);
  }
}

// Where the sheet rests, as the scenarios name it.
export async function whereTheSheetRests(): Promise<string | undefined> {
  return (await theSheet()).dataset.position;
}
