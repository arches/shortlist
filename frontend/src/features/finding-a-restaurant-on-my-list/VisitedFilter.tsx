import {
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";

import { POSITIONS } from "./narrowing";
import type { VisitedFilter as Position } from "./narrowing";

interface VisitedFilterProps {
  filter: Position;
  onFilter: (filter: Position) => void;
}

// seeing-my-list-on-a-map.drawio draws this inside the hamburger menu: a "Show"
// label over three rings — All, Visited, Not visited — with one of them filled,
// and its own note on what that means: "Filled ring = the position the filter
// is in. Exactly one is always filled, so it cannot show nothing."
//
// So it is a radio group and not a set of checkboxes: three positions, exactly
// one held, and no way to ask for neither. A menu's own radio items are what
// carry that to anybody who cannot see the ring — see ASSUMPTIONS.md, "How the
// filter's position is drawn".
//
// shortlist.glossary.md is where Visited comes from: a restaurant the owner has
// an Experience at. shortlist.data.md derives it per owner, so this filters my
// list by my own experiences and never by anybody else's.
export function VisitedFilter({ filter, onFilter }: VisitedFilterProps) {
  return (
    <DropdownMenuRadioGroup
      value={filter}
      onValueChange={(value) => onFilter(value as Position)}
    >
      {/*
        The wireframe writes "Show" above the rings, and what it labels is the
        group of them, so it goes inside the group rather than above it.
      */}
      <DropdownMenuLabel>Show</DropdownMenuLabel>

      {/*
        list-screen.states.md, Change the filter: "Menu: Close". Choosing a
        position is done with, so the menu gets out of the way of the list it
        just narrowed — a radio item keeps it open by default, which left the
        owner looking at a menu instead of at the answer.

        The page is what closes it, along with every other row of that column,
        so nothing has to be asked for here.
      */}
      {POSITIONS.map(({ filter: position, label }) => (
        <DropdownMenuRadioItem key={position} value={position}>
          {label}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );
}
