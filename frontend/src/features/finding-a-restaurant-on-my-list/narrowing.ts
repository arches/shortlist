import type { Restaurant } from "@/api/types";

// finding-a-restaurant-on-my-list.scenarios.md: "I want to narrow my list to
// the restaurants I am actually choosing between". Two things narrow it — a
// search and a filter — and they narrow it together: "Searching within a
// filter" keeps both.
//
// It happens here rather than in a request. The list is already in the browser,
// nothing in the artifacts names an endpoint or a query parameter for it, and
// the field never reaches Google — "Typing a name here never reaches Google
// Places; that is how a restaurant is added, not how one is found". See
// ASSUMPTIONS.md, "Where narrowing happens".

// The three positions seeing-my-list-on-a-map.drawio draws under "Show", and
// its own note on them: "Exactly one is always filled, so it cannot show
// nothing."
export type VisitedFilter = "all" | "visited" | "not-visited";

export interface Narrowing {
  search: string;
  filter: VisitedFilter;
}

// The three, in the order seeing-my-list-on-a-map.drawio draws them, with the
// words it writes beside each ring.
export const POSITIONS: { filter: VisitedFilter; label: string }[] = [
  { filter: "all", label: "All" },
  { filter: "visited", label: "Visited" },
  { filter: "not-visited", label: "Not visited" },
];

// A list nothing is narrowing: the whole of it, which is what the page opens
// at and what "clearing the search brings all three back" returns to.
export const NOTHING_NARROWED: Narrowing = { search: "", filter: "all" };

// Whitespace is not a search. "clearing the search brings all three back", and
// a field holding nothing but spaces has been cleared.
export function searching({ search }: Narrowing): boolean {
  return search.trim().length > 0;
}

export function filtering({ filter }: Narrowing): boolean {
  return filter !== "all";
}

export function narrowing(by: Narrowing): boolean {
  return searching(by) || filtering(by);
}

// What the search reads: the name and the note, and nothing else. "Searching by
// address" is out of scope in so many words, and so is everything else the card
// shows — the cuisine is Google's, and the note is the owner's own words about
// why the restaurant is on the list.
//
// "search for 7pm" matching the note "Go before 7pm" and "search for ba"
// matching "Bacari" are both the middle of a word, so this is a substring
// rather than a prefix, and "soban" matching "Soban" makes it case-blind.
function matches(restaurant: Restaurant, search: string): boolean {
  const against = [restaurant.name, restaurant.note ?? ""].join("\n").toLowerCase();

  return against.includes(search.trim().toLowerCase());
}

// shortlist.glossary.md: Visited is a restaurant the owner has an Experience
// at. shortlist.data.md derives it per owner, so this is mine rather than the
// restaurant's.
function passes(restaurant: Restaurant, filter: VisitedFilter): boolean {
  if (filter === "visited") return restaurant.visited;
  if (filter === "not-visited") return !restaurant.visited;

  return true;
}

// The list narrowed by both, in the order it arrived in. Nothing reorders
// anything: sorting the list is out of scope in
// finding-a-restaurant-on-my-list.scenarios.md.
//
// A list that has not arrived is not an empty one, and stays undefined: an
// empty list reads "Nothing on your list yet", which is not what a list still
// opening has to say.
export function narrowed(
  restaurants: Restaurant[] | undefined,
  by: Narrowing,
): Restaurant[] | undefined {
  if (restaurants === undefined) return undefined;

  return restaurants.filter(
    (restaurant) =>
      passes(restaurant, by.filter) && (!searching(by) || matches(restaurant, by.search)),
  );
}

// Scenario: Nothing matches — "Then I see that nothing on my list matches
// 'sushi'". It names what was searched for, because that is the thing to
// correct.
export function nothingMatches(by: Narrowing): string {
  if (searching(by)) return `Nothing on your list matches “${by.search.trim()}”.`;

  // Not a scenario, because no Background has a list the filter can empty. It
  // is reachable all the same: three visited restaurants and the filter at not
  // visited.
  return `Nothing on your list is ${labelOf(by.filter).toLowerCase()}.`;
}

export function labelOf(filter: VisitedFilter): string {
  return POSITIONS.find((position) => position.filter === filter)?.label ?? "All";
}

// Scenario: Searching within a filter — "And I see that both a search and a
// filter are narrowing my list". Both have to be named, because either one
// alone would explain a shorter list and the owner would go looking for the
// wrong thing to clear.
//
// This is also what reports the filter when the menu is shut: the dot on the
// hamburger says a filter is on, and a dot says nothing to a screen reader.
export function whatIsNarrowing(by: Narrowing): string | undefined {
  const both = [
    searching(by) ? `the search “${by.search.trim()}”` : undefined,
    filtering(by) ? `the ${labelOf(by.filter)} filter` : undefined,
  ].filter((half) => half !== undefined);

  if (both.length === 0) return undefined;

  return `Narrowed by ${both.join(" and ")}.`;
}
