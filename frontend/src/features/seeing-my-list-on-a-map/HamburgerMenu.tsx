import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VisitedFilter } from "@/features/finding-a-restaurant-on-my-list/VisitedFilter";
import { filtering } from "@/features/finding-a-restaurant-on-my-list/narrowing";
import type { Narrowing, VisitedFilter as Position } from "@/features/finding-a-restaurant-on-my-list/narrowing";

interface HamburgerMenuProps {
  by: Narrowing;
  onFilter: (filter: Position) => void;
  onSignOut: () => void;
}

// seeing-my-list-on-a-map.drawio draws the hamburger at the left of the
// floating row and draws what is behind it: a menu, with "Sign out" at the
// foot. Its own annotation says so — "Sign out lives behind hamburger".
//
// signing-in.scenarios.md is why one has to exist at all: "Signing out when I
// am done" is a named scenario. The wireframe that used to draw no sign-out
// control now says where it lives, so it comes out of the header and in here.
export function HamburgerMenu({ by, onFilter, onSignOut }: HamburgerMenuProps) {
  return (
    <DropdownMenu>
      {/*
        The glyph is drawn rather than written, so the control is named for
        anybody who cannot see it. "Menu" is what it opens.

        The dot is the wireframe's: "The hamburger carries the dot whenever the
        filter is away from All, so a hidden filter never narrows the map
        silently." It is decoration over the glyph, and what it stands for is
        read out by the sheet rather than by the trigger.
      */}
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label="Menu" className="relative" />}
      >
        <Menu className="size-5" />

        {filtering(by) && (
          <span
            aria-hidden="true"
            data-testid="filter-dot"
            className="bg-primary absolute top-1 right-1 size-2 rounded-full"
          />
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-48">
        <VisitedFilter filter={by.filter} onFilter={onFilter} />

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={onSignOut}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
