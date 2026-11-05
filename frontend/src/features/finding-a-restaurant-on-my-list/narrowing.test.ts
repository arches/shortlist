import { describe, expect, it } from "vitest";

import { aRestaurant } from "@/features/managing-my-list/testing";

import { narrowed, narrowing, NOTHING_NARROWED } from "./narrowing";
import type { Narrowing } from "./narrowing";

// Derived from finding-a-restaurant-on-my-list.scenarios.md. Its Background is
// the list these cases narrow:
//
//   | Restaurant      | Note                      | Visited |
//   | Bacari          | Go before 7pm             | yes     |
//   | Soban           | Famous for their bibimbap | no      |
//   | Tacos El Bronco |                           | yes     |
const BACARI = aRestaurant({
  id: 1,
  name: "Bacari",
  note: "Go before 7pm",
  visited: true,
  experience_count: 1,
});

const SOBAN = aRestaurant({
  id: 2,
  name: "Soban",
  note: "Famous for their bibimbap",
  visited: false,
});

const TACOS = aRestaurant({
  id: 3,
  name: "Tacos El Bronco",
  note: null,
  visited: true,
  experience_count: 2,
  cuisine: "Mexican",
  address_line_1: "381 Sycamore St",
  city: "Los Angeles",
});

const MY_LIST = [BACARI, SOBAN, TACOS];

function names(by: Partial<Narrowing>): string[] {
  return (narrowed(MY_LIST, { ...NOTHING_NARROWED, ...by }) ?? []).map(({ name }) => name);
}

describe("narrowing my list", () => {
  // A list still opening is not an empty one. "Nothing on your list yet" is
  // not what a list that has not arrived has to say.
  it("leaves a list that has not arrived alone", () => {
    expect(narrowed(undefined, NOTHING_NARROWED)).toBeUndefined();
    expect(narrowed(undefined, { search: "soban", filter: "visited" })).toBeUndefined();
  });

  it("leaves the whole list when nothing is narrowing it", () => {
    expect(names({})).toEqual(["Bacari", "Soban", "Tacos El Bronco"]);
    expect(narrowing(NOTHING_NARROWED)).toBe(false);
  });

  // Scenario Outline: Narrowing my list — "search for soban", narrowed by the
  // name.
  it("matches the name, whatever case it was typed in", () => {
    expect(names({ search: "soban" })).toEqual(["Soban"]);
  });

  // The same outline — "search for 7pm", narrowed by my note.
  it("matches my note", () => {
    expect(names({ search: "7pm" })).toEqual(["Bacari"]);
  });

  // "I search for ba. Then I see only Bacari" — the middle of a word, so a
  // substring rather than a prefix.
  it("matches part of a word", () => {
    expect(names({ search: "acar" })).toEqual(["Bacari"]);
  });

  // "clearing the search brings all three back", and a field holding spaces
  // has been cleared.
  it("treats a search of nothing but spaces as no search", () => {
    expect(names({ search: "   " })).toEqual(["Bacari", "Soban", "Tacos El Bronco"]);
  });

  it("ignores space around what was typed", () => {
    expect(names({ search: "  soban " })).toEqual(["Soban"]);
  });

  // Out of scope: "Searching by address. The field reads names and notes, and
  // nothing else."
  it("reads neither the address nor the cuisine", () => {
    expect(names({ search: "Sycamore" })).toEqual([]);
    expect(names({ search: "Mexican" })).toEqual([]);
  });

  it("leaves a restaurant with no note out of a search its name does not match", () => {
    expect(names({ search: "bibimbap" })).toEqual(["Soban"]);
  });

  // Scenario: Nothing matches — "I search for sushi".
  it("matches nothing when nothing matches", () => {
    expect(names({ search: "sushi" })).toEqual([]);
  });

  // The same outline — "filter to not visited", narrowed by the filter.
  it("filters to the restaurants I have not eaten at", () => {
    expect(names({ filter: "not-visited" })).toEqual(["Soban"]);
  });

  it("filters to the ones I have", () => {
    expect(names({ filter: "visited" })).toEqual(["Bacari", "Tacos El Bronco"]);
  });

  // Scenario: Searching within a filter — "Then I see only Bacari. And Soban
  // is gone, though its name matches too."
  it("narrows by both at once", () => {
    expect(names({ filter: "visited", search: "ba" })).toEqual(["Bacari"]);
  });

  it("knows when something is narrowing the list", () => {
    expect(narrowing({ search: "ba", filter: "all" })).toBe(true);
    expect(narrowing({ search: "", filter: "visited" })).toBe(true);
    expect(narrowing({ search: "  ", filter: "all" })).toBe(false);
  });
});
