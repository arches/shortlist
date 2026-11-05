import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HamburgerMenuProps {
  onSignOut: () => void;
}

// seeing-my-list-on-a-map.drawio draws the hamburger at the left of the
// floating row and draws what is behind it: a menu, with "Sign out" at the
// foot. Its own annotation says so — "Sign out lives behind hamburger".
//
// signing-in.scenarios.md is why one has to exist at all: "Signing out when I
// am done" is a named scenario. The wireframe that used to draw no sign-out
// control now says where it lives, so it comes out of the header and in here.
export function HamburgerMenu({ onSignOut }: HamburgerMenuProps) {
  return (
    <DropdownMenu>
      {/*
        The glyph is drawn rather than written, so the control is named for
        anybody who cannot see it. "Menu" is what it opens.
      */}
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label="Menu" />}
      >
        <Menu className="size-5" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem onClick={onSignOut}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
