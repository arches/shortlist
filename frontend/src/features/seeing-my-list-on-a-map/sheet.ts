// seeing-my-list-on-a-map.scenarios.md gives the sheet three resting positions
// and one way between them: "Given the sheet rests at <before>, When I drag the
// sheet <direction>, Then the sheet rests at <after>". The wireframe's own
// annotation says the rest of it — "Sheet drags between peek, half and full. It
// cannot be dismissed."
//
// So there is no fourth position and no closed state, which is what makes this
// a list of three rather than a height the owner sets.

export type SheetPosition = "peek" | "half" | "full";

export type DragDirection = "up" | "down";

// Low to high, which is the order a drag moves through them.
const POSITIONS: SheetPosition[] = ["peek", "half", "full"];

// "And the sheet rests at half" — where it is when the page opens, in Scenario:
// See restaurants from my list.
export const OPENS_AT: SheetPosition = "half";

// How much of the page each position leaves the sheet.
//
// Half is drawn: the sheet's top edge sits at y=473 in a frame running 104 to
// 842, which is halfway down. Peek and full are not drawn, and what they come
// to is an assumption — see ASSUMPTIONS.md, "What peek and full come to".
export const HEIGHTS: Record<SheetPosition, string> = {
  // The handle and one card, which is what "Bacari is the restaurant showing
  // in the sheet" needs there to be room for at peek.
  peek: "h-40",
  half: "h-1/2",

  // Short of the top by the floating row's own height: "Search stays in the
  // row, and still floats above the sheet at full", so the sheet never covers
  // the chrome.
  full: "h-[calc(100%-5rem)]",
};

// How far a drag has to travel before it counts as one, in pixels. Nothing in
// the artifacts gives a number — see ASSUMPTIONS.md, "What makes a drag count".
export const DRAG_TRAVEL = 24;

// One position per drag, in the direction dragged, and nothing past the ends.
// That is the whole of the Examples table, the last row included: "peek, down,
// peek" is the clamp rather than a special case, and the same clamp is what
// "It cannot be dismissed" comes to at the bottom.
export function dragged(from: SheetPosition, direction: DragDirection): SheetPosition {
  const next = POSITIONS.indexOf(from) + (direction === "up" ? 1 : -1);
  const clamped = Math.min(Math.max(next, 0), POSITIONS.length - 1);

  return POSITIONS[clamped] as SheetPosition;
}

// Which way a gesture went, or nothing when it did not go far enough to be a
// drag at all. Travel is in screen pixels, where down is positive.
export function directionOf(travel: number): DragDirection | undefined {
  if (Math.abs(travel) < DRAG_TRAVEL) return undefined;

  return travel < 0 ? "up" : "down";
}
