// list-screen.states.md has one region for which restaurant the owner is
// looking at. Three events set it — Tap a row, Tap a pin and Add a restaurant —
// and four clear it, and both halves of the page answer to it: the chosen card
// is highlighted and scrolled into view, the chosen pin is highlighted, and the
// map centres on it.
//
// Nothing is chosen until the owner chooses something, so the region's initial
// state is the absence of a Selection rather than a Selection standing for
// nothing.

export interface Selection {
  id: number;

  // Which act of choosing this was, counted up from the first.
  //
  // The table answers Tap a row with "Center on selection, zoom 13" however
  // many times it arrives, so tapping the row already chosen centres the map
  // again — the owner who panned away and tapped the same row is asking to be
  // taken back. The restaurant's coordinates cannot carry that, being the same
  // point twice, which is what this counts instead.
  at: number;
}

// The selection after one act of choosing, given the one before it. The count
// is never read for its value, only for having changed, so it only ever goes up.
export function chose(id: number, previous: Selection | undefined): Selection {
  return { id, at: (previous?.at ?? 0) + 1 };
}
