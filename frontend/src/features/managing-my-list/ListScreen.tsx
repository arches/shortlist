import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import type { Restaurant } from "@/api/types";
import { SessionEnded, signOut } from "@/session/session";

import { Chrome } from "@/features/seeing-my-list-on-a-map/Chrome";
import { ListMap } from "@/features/seeing-my-list-on-a-map/ListMap";

import { AddRestaurantDialog } from "./AddRestaurantDialog";
import { RestaurantList } from "./RestaurantList";
import { TakeOffListDialog } from "./TakeOffListDialog";
import { useRestaurants } from "./queries";

// seeing-my-list-on-a-map.drawio draws the whole page: the map fills it, the
// chrome floats over it, and the list sits in a panel over the bottom half.
// There is no header and no page title — the wireframe says so in its own
// annotation — and managing-my-list.wireframe.drawio, which used to draw both,
// no longer draws either.
//
// seeing-my-list-on-a-map.scenarios.md calls itself an extension of this view:
// "map and list together comprise a single page". So the map is part of this
// screen rather than a screen of its own, and this is where both of them live.
export function ListScreen() {
  const navigate = useNavigate();
  const { data: restaurants, isPending, error } = useRestaurants();
  const [adding, setAdding] = useState(false);
  const [takingOff, setTakingOff] = useState<Restaurant | undefined>();

  // seeing-my-list-on-a-map.scenarios.md: "map and list together comprise a
  // single page", and both of its selection scenarios move the other half. So
  // which restaurant is chosen belongs to the page that holds both, not to
  // either one of them. Nothing is chosen until the owner chooses it.
  const [selected, setSelected] = useState<number | undefined>();

  // Scenario: My session ends in the middle of what I am doing. Only a refused
  // renewal reaches here, and the answer to it is to ask for a sign-in.
  useEffect(() => {
    if (error instanceof SessionEnded) void navigate({ to: "/sign-in" });
  }, [error, navigate]);

  async function leave() {
    try {
      await signOut();
    } finally {
      await navigate({ to: "/sign-in" });
    }
  }

  // A session that has ended is being navigated away from, so it is not
  // something the list reads out. Every other refusal is.
  const refusal = error && !(error instanceof SessionEnded) ? error.message : undefined;

  // The page is the viewport and never scrolls: "the page itself does not
  // scroll", and "One finger drags the map", which is only true of a page with
  // no scrolling of its own to claim the gesture. Everything else is layered
  // over the map rather than stacked beside it.
  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <div className="absolute inset-0">
        <ListMap restaurants={restaurants} selected={selected} onSelect={setSelected} />
      </div>

      <Chrome onAdd={() => setAdding(true)} onSignOut={() => void leave()} />

      {/*
        The sheet, at the half the wireframe draws it at: its top edge sits
        halfway down the frame. Dragging it between peek, half and full is the
        next thing to land; what is here is where it rests.

        The cards scroll inside it and are clipped at its edge — "no restaurant
        appears outside the sheet" — which is what the inner region does, and
        the page itself is not what moves.

        Named rather than headed: the wireframe draws no title, and a region
        with nothing to call it is one an owner using a screen reader cannot
        find.
      */}
      <section
        aria-label="My list"
        className="absolute inset-x-0 bottom-0 z-10 h-1/2 rounded-t-xl bg-background shadow-lg ring-1 ring-foreground/10"
      >
        <div className="h-full overflow-y-auto px-4 pt-4 pb-6">
          <RestaurantList
            restaurants={restaurants}
            isPending={isPending}
            error={refusal}
            selected={selected}
            onSelect={setSelected}
            onTakeOff={setTakingOff}
          />
        </div>
      </section>

      <AddRestaurantDialog open={adding} onOpenChange={setAdding} />
      <TakeOffListDialog restaurant={takingOff} onClose={() => setTakingOff(undefined)} />
    </main>
  );
}
