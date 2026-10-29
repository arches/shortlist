import { Link } from "@tanstack/react-router";

import type { Restaurant } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface RestaurantCardProps {
  restaurant: Restaurant;
  onTakeOff: (restaurant: Restaurant) => void;
}

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

export function RestaurantCard({ restaurant, onTakeOff }: RestaurantCardProps) {
  return (
    <Card className="flex flex-row items-center justify-between gap-4 p-4">
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
        <p className="text-muted-foreground truncate text-sm">{detailsOf(restaurant)}</p>
        <p className="text-muted-foreground text-sm">{visitsOf(restaurant)}</p>
      </div>

      <div className="flex shrink-0 gap-2">
        <Button variant="outline" size="sm" onClick={() => onTakeOff(restaurant)}>
          Remove
        </Button>
      </div>
    </Card>
  );
}
