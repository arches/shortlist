import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { HamburgerMenu } from "./HamburgerMenu";

interface ChromeProps {
  onAdd: () => void;
  onSignOut: () => void;
}

// seeing-my-list-on-a-map.drawio: "Chrome floats over the map. No header, no
// page title." The row is drawn inside the map's own rectangle rather than
// above it, 12px in from each edge, holding the hamburger, the search field and
// a "+" — and the map now runs the full height of the frame behind it.
//
// managing-my-list.wireframe.drawio no longer draws the heading, the grey
// header strip or the "+ Add" button it used to: that deletion and this row are
// one move, which is why the add lives here now.
//
// The search field lands in this row too — "Search stays in the row, and still
// floats above the sheet at full" — and belongs to
// finding-a-restaurant-on-my-list.scenarios.md, which is what gives it
// something to do.
export function Chrome({ onAdd, onSignOut }: ChromeProps) {
  return (
    // Floating means over the map rather than beside it, so the row claims only
    // its own height: the band around it does not take clicks, and what is in
    // the row does. Without that the whole width of the page would be a strip
    // the map cannot be dragged by.
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3">
      <div className="pointer-events-auto mx-auto flex max-w-2xl items-center justify-between gap-2 rounded-lg bg-background/95 p-2 shadow-md ring-1 ring-foreground/10">
        <HamburgerMenu onSignOut={onSignOut} />

        {/*
          managing-my-list.adding-a-restaurant.sequence.d2 is unchanged, so this
          opens the same dialog it always did. The wireframe draws the glyph
          alone, so the name is written for anybody who cannot see it — and it
          is the dialog's own heading, which is what the owner reaches.
        */}
        <Button size="icon" aria-label="Add a restaurant" onClick={onAdd}>
          <Plus className="size-5" />
        </Button>
      </div>
    </div>
  );
}
