import type { Restaurant } from "@/api/types";

import { RestaurantCard } from "./RestaurantCard";

interface RestaurantListProps {
  restaurants: Restaurant[] | undefined;
  isPending: boolean;
  error?: string | undefined;

  // What to read when there is nothing to show. A list with nothing on it and
  // a list narrowed to nothing are different things to say, and only the page
  // holding both the list and the narrowing can tell them apart.
  empty: string;
  selected: number | undefined;
  onSelect: (id: number) => void;
}

// managing-my-list.wireframe.drawio: one card per restaurant, and the three
// things the list can read instead — opening, refused, or empty.
//
// Lifted out of ListScreen unchanged. The screen owns the session and the
// dialogs; what the list itself says is here, which is where the map in
// seeing-my-list-on-a-map.drawio needs it to be, since the two sit in one page
// and only one of them scrolls.
//
// Presentational: a refusal arrives already reduced to a message, so nothing
// here has to know what ended a session.
export function RestaurantList({
  restaurants,
  isPending,
  error,
  empty,
  selected,
  onSelect,
}: RestaurantListProps) {
  return (
    <>
      {isPending && <p className="text-muted-foreground text-sm">Opening your list…</p>}

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      {restaurants && restaurants.length === 0 && (
        <p className="text-muted-foreground text-sm">{empty}</p>
      )}

      {restaurants && restaurants.length > 0 && (
        <ul className="flex flex-col gap-3">
          {restaurants.map((restaurant) => (
            <li key={restaurant.id}>
              <RestaurantCard
                restaurant={restaurant}
                selected={restaurant.id === selected}
                onSelect={onSelect}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
