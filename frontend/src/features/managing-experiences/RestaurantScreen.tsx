import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

import { subtitleOf } from "@/features/managing-my-list/RestaurantCard";
import { useRestaurants } from "@/features/managing-my-list/queries";
import { SessionEnded } from "@/session/session";

import { ExperienceList } from "./ExperienceList";
import { RecordExperienceDialog } from "./RecordExperienceDialog";

// managing-experiences.wireframe.drawio.svg settles where experiences live: the
// restaurant's own screen. It is headed with a "‹ My list" back link, the
// restaurant's name, and the same subtitle the card on the list carries —
// "Pizza · visited · 3 experiences" — so subtitleOf is reused rather than
// rebuilt.
//
// The restaurant itself comes out of the list response. shortlist.data.md has
// exactly one List per owner and the list screen already fetches all of it, so
// nothing here needs a second endpoint that returns one restaurant.
export function RestaurantScreen({ restaurantId }: { restaurantId: number }) {
  const navigate = useNavigate();
  const { data: restaurants, isPending, error } = useRestaurants();
  const [recording, setRecording] = useState(false);

  const restaurant = restaurants?.find((one) => one.id === restaurantId);

  // Scenario: My session ends in the middle of what I am doing. Only a refused
  // renewal reaches here, and the answer to it is to ask for a sign-in.
  useEffect(() => {
    if (error instanceof SessionEnded) void navigate({ to: "/sign-in" });
  }, [error, navigate]);

  // A restaurant that is not on the list is not reachable, and reaching the
  // experiences of one that is off the list is out of scope in
  // managing-experiences.scenarios.md. There is nothing to show, so the owner
  // goes back to the list rather than being shown an error about a restaurant
  // they cannot see.
  useEffect(() => {
    if (restaurants !== undefined && restaurant === undefined) void navigate({ to: "/" });
  }, [restaurants, restaurant, navigate]);

  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <Link to="/" className="text-muted-foreground hover:text-foreground mb-4 inline-block text-sm">
        ‹ My list
      </Link>

      {isPending && <p className="text-muted-foreground text-sm">Opening your list…</p>}

      {error && !(error instanceof SessionEnded) && (
        <p role="alert" className="text-destructive text-sm">
          {error.message}
        </p>
      )}

      {restaurant && (
        <>
          {/*
            The wireframe heads the screen with the name and its subtitle, and
            puts "+ Record an experience" beside them.
          */}
          <header className="mb-6 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">{restaurant.name}</h1>
              <p className="text-muted-foreground text-sm">{subtitleOf(restaurant)}</p>
            </div>

            <Button className="shrink-0" onClick={() => setRecording(true)}>
              Record an experience
            </Button>
          </header>

          <RecordExperienceDialog
            restaurant={restaurant}
            open={recording}
            onOpenChange={setRecording}
          />

          <ExperienceList restaurantId={restaurant.id} />
        </>
      )}
    </main>
  );
}
