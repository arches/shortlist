import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import type { Restaurant } from "@/api/types";
import { Button } from "@/components/ui/button";
import { SessionEnded, signOut } from "@/session/session";

import { ListMap } from "@/features/seeing-my-list-on-a-map/ListMap";

import { AddRestaurantDialog } from "./AddRestaurantDialog";
import { RestaurantList } from "./RestaurantList";
import { TakeOffListDialog } from "./TakeOffListDialog";
import { useRestaurants } from "./queries";

// managing-my-list.wireframe.drawio.svg: the screen is headed "My list", with a
// primary Add beside the heading and one card per restaurant below it.
//
// The wireframe shows no sign-out control. One has to exist — "Signing out when
// I am done" is a named scenario — so it sits in the header, which is the only
// chrome the wireframe has.
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

  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <header className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">My list</h1>

        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => void leave()}>
            Sign out
          </Button>

          <Button onClick={() => setAdding(true)}>Add</Button>
        </div>
      </header>

      {/*
        Scenario: Scrolling the list — "the map stays pinned to the top of the
        screen so it's always visible". The page is what scrolls, and the map
        sticks to the top of it, so the cards travel underneath. Opaque rather
        than transparent, for the same reason.
      */}
      <div className="bg-background sticky top-0 z-10 mb-3 pb-3">
        <ListMap restaurants={restaurants} selected={selected} onSelect={setSelected} />
      </div>

      <RestaurantList
        restaurants={restaurants}
        isPending={isPending}
        error={refusal}
        selected={selected}
        onSelect={setSelected}
        onTakeOff={setTakingOff}
      />

      <AddRestaurantDialog open={adding} onOpenChange={setAdding} />
      <TakeOffListDialog restaurant={takingOff} onClose={() => setTakingOff(undefined)} />
    </main>
  );
}
