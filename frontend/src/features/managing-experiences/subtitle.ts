import type { Restaurant } from "@/api/types";

// managing-experiences.wireframe.drawio.svg heads the restaurant's own screen
// with "Pizza · visited · 3 experiences". That wireframe did not change when
// the list's did, so the two screens read differently on purpose: the card on
// the list is an address and a visit count, and this is what the restaurant is
// and how much of it I have had.
//
// It used to be one function shared with the card. Two artifacts now say two
// things, so it is two functions, and this one lives beside the artifact that
// owns it.
export function subtitleOf(restaurant: Restaurant): string {
  const parts: string[] = [];

  if (restaurant.cuisine) parts.push(restaurant.cuisine);

  // shortlist.glossary.md: Visited is having an Experience. The count is mine;
  // another owner's at the same Place never show. There is no rating of a
  // Restaurant, so nothing here averages anything.
  parts.push(restaurant.visited ? "visited" : "not visited");

  if (restaurant.experience_count > 0) {
    parts.push(
      restaurant.experience_count === 1
        ? "1 experience"
        : `${restaurant.experience_count} experiences`,
    );
  }

  return parts.join(" · ");
}
