import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import type { Restaurant } from "@/api/types";
import { Button } from "@/components/ui/button";
import { SessionEnded, signOut } from "@/session/session";

import { AddRestaurantDialog } from "./AddRestaurantDialog";
import { RestaurantCard } from "./RestaurantCard";
import { TakeOffListDialog } from "./TakeOffListDialog";
import { useRestaurants } from "./queries";

// managing-my-list.wireframe.drawio.svg: the screen is headed "My list", with a
// primary Add beside the heading and one card per restaurant below it.
//
// The wireframe shows no sign-out control. One has to exist — "Signing out when
// I am done" is a named scenario — so it sits in the header, which is the only
// chrome the wireframe has.
export function ListScreen() {
  const navigate = useNavigate();
  const { data: restaurants, isPending, error } = useRestaurants();
  const [adding, setAdding] = useState(false);
  const [takingOff, setTakingOff] = useState<Restaurant | undefined>();

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

      {isPending && <p className="text-muted-foreground text-sm">Opening your list…</p>}

      {error && !(error instanceof SessionEnded) && (
        <p role="alert" className="text-destructive text-sm">
          {error.message}
        </p>
      )}

      {restaurants && restaurants.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Nothing on your list yet.
        </p>
      )}

      <AddRestaurantDialog open={adding} onOpenChange={setAdding} />
      <TakeOffListDialog restaurant={takingOff} onClose={() => setTakingOff(undefined)} />

      {restaurants && restaurants.length > 0 && (
        <ul className="flex flex-col gap-3">
          {restaurants.map((restaurant) => (
            <li key={restaurant.id}>
              <RestaurantCard restaurant={restaurant} onTakeOff={setTakingOff} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
