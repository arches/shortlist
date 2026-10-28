import { Link } from "@tanstack/react-router";

import type { Restaurant } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface RestaurantCardProps {
  restaurant: Restaurant;
  onEdit: (restaurant: Restaurant) => void;
  onTakeOff: (restaurant: Restaurant) => void;
}

// managing-my-list.wireframe.drawio.svg: each card shows the name, then a
// subtitle of cuisine, visited-ness and experience count — "Italian · not
// visited", "Mexican · visited · 2 experiences", "visited · 1 experience" when
// there is no cuisine — and an Edit and a Remove beside it.
export function subtitleOf(restaurant: Restaurant): string {
  const parts: string[] = [];

  if (restaurant.cuisine) parts.push(restaurant.cuisine);

  // shortlist.glossary.md: Visited is having an Experience. There is no rating
  // of a Restaurant, so nothing here averages anything.
  parts.push(restaurant.visited ? "visited" : "not visited");

  if (restaurant.experience_count > 0) {
    parts.push(
      restaurant.experience_count === 1 ? "1 experience" : `${restaurant.experience_count} experiences`,
    );
  }

  return parts.join(" · ");
}

export function RestaurantCard({ restaurant, onEdit, onTakeOff }: RestaurantCardProps) {
  return (
    <Card className="flex flex-row items-center justify-between gap-4 p-4">
      <div className="min-w-0">
        {/*
          managing-experiences.wireframe.drawio.svg draws the restaurant's own
          screen with a "‹ My list" back link, but this wireframe draws no way
          into it — the card has only Edit and Remove. The name is the link,
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
        <p className="text-muted-foreground text-sm">{subtitleOf(restaurant)}</p>
      </div>

      <div className="flex shrink-0 gap-2">
        <Button variant="outline" size="sm" onClick={() => onEdit(restaurant)}>
          Edit
        </Button>
        <Button variant="outline" size="sm" onClick={() => onTakeOff(restaurant)}>
          Remove
        </Button>
      </div>
    </Card>
  );
}
