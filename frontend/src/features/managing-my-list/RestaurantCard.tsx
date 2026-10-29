import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import type { Restaurant } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface RestaurantCardProps {
  restaurant: Restaurant;
  selected: boolean;
  onSelect: (id: number) => void;
  onTakeOff: (restaurant: Restaurant) => void;
}

// seeing-my-list-on-a-map.drawio fills the chosen card pale yellow, and its own
// note says the highlight is colour-based. The text colour is set in the same
// breath as the fill: the page has a dark mode, and a fill without a text
// colour is how light text ends up on a light background.
const HIGHLIGHT = "bg-yellow-100 text-yellow-950 ring-2 ring-yellow-400";
const HIGHLIGHT_DETAIL = "text-yellow-900";

// managing-my-list.wireframe.drawio: each card shows the name, then two lines
// under it — "Italian - 12 Main St, New York NY" and "Visited 1 time".
//
// The first is what the restaurant is and where: the cuisine, then the street
// and the town. Both halves are Google's and either can be absent, so the
// separator only appears when there is something on each side of it.
export function detailsOf(restaurant: Restaurant): string {
  const town = [restaurant.city, restaurant.state].filter(Boolean).join(" ");
  const place = [restaurant.address_line_1, town].filter(Boolean).join(", ");

  return [restaurant.cuisine, place].filter(Boolean).join(" - ");
}

// shortlist.glossary.md: Visited is having an Experience. The count is mine —
// another owner's never show here — and there is no rating of a Restaurant, so
// nothing averages anything.
//
// The wireframe draws only visited cards, so what an unvisited one reads is an
// assumption — see ASSUMPTIONS.md, "What an unvisited card reads".
export function visitsOf(restaurant: Restaurant): string {
  if (!restaurant.visited) return "Not visited";

  return restaurant.experience_count === 1
    ? "Visited 1 time"
    : `Visited ${restaurant.experience_count} times`;
}

export function RestaurantCard({
  restaurant,
  selected,
  onSelect,
  onTakeOff,
}: RestaurantCardProps) {
  const card = useRef<HTMLDivElement>(null);

  // Scenario: Selecting a restaurant on the map — "the list scrolls so Bacari is
  // in view". "nearest" is what makes this the same code for both scenarios: a
  // card chosen from the list is already in view, so nothing moves.
  useEffect(() => {
    if (selected) card.current?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const detail = selected ? HIGHLIGHT_DETAIL : "text-muted-foreground";

  // Scenario: Selecting a restaurant on the list — "When I click on Bacari in
  // the list". The card is what is clicked; the name inside it is still the way
  // into the restaurant's own screen. See ASSUMPTIONS.md, "What clicking a card
  // does".
  return (
    <Card
      ref={card}
      onClick={() => onSelect(restaurant.id)}
      aria-current={selected ? "true" : undefined}
      className={`flex cursor-pointer flex-row items-center justify-between gap-4 p-4 ${
        selected ? HIGHLIGHT : ""
      }`}
    >
      <div className="min-w-0">
        {/*
          managing-experiences.wireframe.drawio.svg draws the restaurant's own
          screen with a "‹ My list" back link, but this wireframe draws no way
          into it — the card has only Remove. The name is the link,
          because it is the one thing on the card that identifies the restaurant
          and "When I open 'Joe's Pizza'" reads as opening the thing named.
        */}
        <h2 className="truncate font-medium">
          <Link
            to="/restaurants/$restaurantId"
            params={{ restaurantId: String(restaurant.id) }}
            className="hover:underline"
          >
            {restaurant.name}
          </Link>
        </h2>
        <p className={`${detail} truncate text-sm`}>{detailsOf(restaurant)}</p>
        <p className={`${detail} text-sm`}>{visitsOf(restaurant)}</p>
      </div>

      <div className="flex shrink-0 gap-2">
        <Button variant="outline" size="sm" onClick={() => onTakeOff(restaurant)}>
          Remove
        </Button>
      </div>
    </Card>
  );
}
