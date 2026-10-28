// shortlist.data.md, Enumerations: exactly one of nine values. Nine, no zero,
// and can be empty — "no rating" is the absence of one, not a score of nought.
//
// managing-experiences.wireframe.drawio.svg draws the control that reaches them
// as five stars with a half each: "Nine values: 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5,
// 5 — plus no rating, which is not nought."
export const RATINGS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] as const;

export type Rating = (typeof RATINGS)[number];

export const STAR_POSITIONS = [1, 2, 3, 4, 5] as const;

export type StarFill = "full" | "half" | "empty";

// Which way one of the five stars is drawn for a given rating. A half lands on
// the star the rating reaches halfway into, so 3.5 is three full, one half and
// one empty — the wireframe's "left half of the star" read back out.
export function fillOf(rating: number | null, position: number): StarFill {
  if (rating === null) return "empty";
  if (rating >= position) return "full";
  if (rating >= position - 0.5) return "half";

  return "empty";
}

// What the rating reads as beside the stars. The wireframe writes the number
// itself — "4", "3.5" — and labels the absent case "No rating".
export function ratingReads(rating: number | null): string {
  return rating === null ? "No rating" : String(rating);
}
