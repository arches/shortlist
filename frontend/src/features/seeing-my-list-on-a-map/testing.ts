import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

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

// How many times Shortlist has told the camera where to look. Choosing the same
// restaurant twice sends it to the same place twice, which is a fact about the
// instruction rather than about where the map ended up.
export function cameraMoves(): number {
  return Number(screen.getByTestId("map").dataset.cameraMoves ?? "0");
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

// Whether the menu is open, which is the Menu region of list-screen.states.md.
export function theMenuIsOpen(): boolean {
  return screen.queryByRole("menu") !== null;
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

// What scrolls inside the sheet. The cards are clipped at its edge and scroll
// in here; the sheet itself does not move, except where
// list-screen.states.md says this gesture moves it.
async function theScrollRegion(): Promise<HTMLElement> {
  const region = (await theSheet()).querySelector("div.overflow-y-auto");
  if (region === null) throw new Error("the sheet has nothing that scrolls");

  return region as HTMLElement;
}

// One scroll of the list, the way list-screen.states.md names it. "Up" is the
// gesture: the owner swipes up, the cards travel up, and the offset grows.
export async function scrollTheList(direction: DragDirection): Promise<void> {
  const region = await theScrollRegion();
  const was = region.scrollTop;

  region.scrollTop = direction === "up" ? was + A_SCROLL : Math.max(was - A_SCROLL, 0);
  fireEvent.scroll(region);
}

// Where the list is already scrolled to, set without the sheet being told —
// for arranging a Given rather than performing a When. Scrolling down from the
// top is otherwise unreachable, there being nothing above it.
export async function listAlreadyScrolled(): Promise<void> {
  (await theScrollRegion()).scrollTop = A_SCROLL;
}

// Far enough to be a scroll. No artifact gives a number, and none has to: the
// sheet answers the direction rather than the distance.
const A_SCROLL = 80;

// Which restaurants the sheet scrolled to, by name, in the order it scrolled to
// them — "scrolled to show selection", named the way the owner would name it.
//
// src/test/setup.ts stubs scrollIntoView on the prototype, so what each call
// was made on is the card. The name rather than the element, because a card is
// a new element every render and the restaurant is what the cell is about.
export function cardsScrolledTo(): string[] {
  const cards = vi.mocked(Element.prototype.scrollIntoView).mock.contexts;

  return cards.map((card) => (card as HTMLElement).querySelector("h2")?.textContent ?? "nothing");
}

// scrollIntoView as a browser does it, for the one thing the stub in
// src/test/setup.ts cannot show: the sheet's answer to a choice moves the
// region the cards scroll in, and the browser then reports that movement as a
// scroll event. jsdom has no layout, so it neither moves nor reports.
//
// list-screen.states.md has Scroll the list up as an event of its own, read off
// that same region, so what this is for is proving that the sheet's own
// scrolling is not read back as that event.
export function theListScrollsWhenShown(): void {
  vi.mocked(Element.prototype.scrollIntoView).mockImplementation(function (this: Element) {
    const region = this.closest("div.overflow-y-auto");
    if (region === null) return;

    (region as HTMLElement).scrollTop = A_SCROLL;
  });
}

// Back to the stub that moves nothing, which is what every other suite expects.
export function theListDoesNotScrollWhenShown(): void {
  vi.mocked(Element.prototype.scrollIntoView).mockImplementation(() => undefined);
}

// The scroll event the browser reports after a region has moved. It fires a
// frame or more after the movement rather than during it, which is why nothing
// in the sheet may depend on when it arrives.
export async function theBrowserReportsTheScroll(): Promise<void> {
  fireEvent.scroll(await theScrollRegion());
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
