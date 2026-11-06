import { Link, useNavigate } from "@tanstack/react-router";

import type { Restaurant } from "@/api/types";
import { Card } from "@/components/ui/card";

interface RestaurantCardProps {
  restaurant: Restaurant;
  selected: boolean;
  onSelect: (id: number) => void;
}

// seeing-my-list-on-a-map.drawio fills the chosen card pale yellow, and its own
// note says the highlight is colour-based. The text colour is set in the same
// breath as the fill: the page has a dark mode, and a fill without a text
// colour is how light text ends up on a light background.
const HIGHLIGHT = "bg-yellow-100 text-yellow-950 ring-2 ring-yellow-400";
const HIGHLIGHT_DETAIL = "text-yellow-900";

// managing-my-list.wireframe.drawio: each card shows the name, then two lines
// under it — "Italian - 12 Main St, New York NY" and "Visited 1 time" — and the
// note under those.
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

export function RestaurantCard({ restaurant, selected, onSelect }: RestaurantCardProps) {
  const navigate = useNavigate();
  const detail = selected ? HIGHLIGHT_DETAIL : "text-muted-foreground";

  // list-screen.states.md has two rows for a tap on a card, and what tells them
  // apart is whether the card is already the selection.
  //
  // Tap an unselected row chooses it: the sheet drops to peek, the map centres
  // on it, its pin is highlighted. Tap a selected row opens the restaurant's
  // own screen — the owner who taps what they are already looking at is asking
  // for the whole of it — and that row reads n/a in every region, because the
  // screen is left behind rather than moved.
  function tapped() {
    if (!selected) {
      onSelect(restaurant.id);
      return;
    }

    void navigate({
      to: "/restaurants/$restaurantId",
      params: { restaurantId: String(restaurant.id) },
    });
  }

  // aria-current is what the card is chosen by and what ListSheet scrolls to.
  // "→ Peek, scrolled to show selection" is the sheet's cell rather than the
  // card's, so the card says which one is chosen and the sheet, which owns the
  // region the cards scroll in, does the scrolling.
  return (
    <Card
      onClick={tapped}
      aria-current={selected ? "true" : undefined}
      className={`cursor-pointer p-4 ${selected ? HIGHLIGHT : ""}`}
    >
      <div className="min-w-0">
        {/*
          seeing-my-list-on-a-map.drawio: "The name opens the restaurant's own
          screen." The card carries nothing else to press — the Remove it used
          to offer is on that screen now.

          list-screen.states.md gives the name its own row, reading n/a in every
          region, so the tap it takes is not also the card's: a name tapped on
          an unselected row opens the screen without choosing the restaurant on
          the way out.
        */}
        <h2 className="truncate font-medium">
          <Link
            to="/restaurants/$restaurantId"
            params={{ restaurantId: String(restaurant.id) }}
            className="hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {restaurant.name}
          </Link>
        </h2>
        <p className={`${detail} truncate text-sm`}>{detailsOf(restaurant)}</p>
        <p className={`${detail} text-sm`}>{visitsOf(restaurant)}</p>

        {/*
          The wireframe draws the note italic, and darker and a shade larger
          than the two lines above it: it is the owner's own words rather than
          Google's, so it does not read as detail. No colour of its own, which
          is deliberate — it inherits the card's, so the highlight carries it
          with everything else and there is no second place for a fill and a
          text colour to come apart.

          Absent when the owner wrote none, which is the line simply not being
          there rather than an empty one holding space.

          Truncated like the details line above it. A note has no length limit,
          and the card is one line per thing.
        */}
        {restaurant.note !== null && (
          <p className="truncate text-sm italic">{restaurant.note}</p>
        )}
      </div>
    </Card>
  );
}
