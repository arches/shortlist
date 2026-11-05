import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import type { Restaurant } from "@/api/types";
import { SessionEnded, signOut } from "@/session/session";

import { NarrowingNotice } from "@/features/finding-a-restaurant-on-my-list/NarrowingNotice";
import {
  narrowed,
  nothingMatches,
  NOTHING_NARROWED,
  signatureOf,
} from "@/features/finding-a-restaurant-on-my-list/narrowing";
import type { Narrowing } from "@/features/finding-a-restaurant-on-my-list/narrowing";
import { Chrome } from "@/features/seeing-my-list-on-a-map/Chrome";
import { ListMap } from "@/features/seeing-my-list-on-a-map/ListMap";
import { ListSheet } from "@/features/seeing-my-list-on-a-map/ListSheet";
import { OPENS_AT } from "@/features/seeing-my-list-on-a-map/sheet";
import type { SheetPosition } from "@/features/seeing-my-list-on-a-map/sheet";

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

  // "And the sheet rests at half" — where it opens, and the owner's to drag
  // from there. It belongs to the page for the same reason the choice does:
  // choosing a restaurant on either half moves it.
  const [sheet, setSheet] = useState<SheetPosition>(OPENS_AT);

  // finding-a-restaurant-on-my-list.scenarios.md: what the owner is choosing
  // between. It belongs to the page because it narrows both halves of it —
  // "<match> is all that is pinned on the map" as well as all that is listed.
  // Nothing is narrowing it until the owner narrows it, and it is not in the
  // URL — see ASSUMPTIONS.md, "Whether the narrowing is in the URL".
  const [by, setNarrowing] = useState<Narrowing>(NOTHING_NARROWED);

  // The two selection scenarios differ in exactly one thing, and it is the
  // sheet. Choosing in the sheet is choosing something to go and look at —
  // "Then the sheet drops to peek", which is what uncovers the map it pans.
  // Choosing on the map is already looking at it, so "the sheet stays at half".
  function chooseInTheSheet(id: number) {
    setSelected(id);
    setSheet("peek");
  }

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

  // The restaurants the owner is choosing between, which is what both the sheet
  // and the map are given. Everything downstream sees the narrowed list and
  // nothing has to narrow it twice.
  const matches = narrowed(restaurants, by);

  // Scenario: Nothing matches names the search; an empty list has nothing to
  // name. The page is what can tell those apart.
  const empty =
    restaurants !== undefined && restaurants.length > 0
      ? nothingMatches(by)
      : "Nothing on your list yet.";

  // The page is the viewport and never scrolls: "the page itself does not
  // scroll", and "One finger drags the map", which is only true of a page with
  // no scrolling of its own to claim the gesture. Everything else is layered
  // over the map rather than stacked beside it.
  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <div className="absolute inset-0">
        <ListMap
          restaurants={matches}
          selected={selected}
          onSelect={setSelected}
          narrowedBy={signatureOf(by)}
        />
      </div>

      <Chrome
        by={by}
        onSearch={(search) => setNarrowing({ ...by, search })}
        onFilter={(filter) => setNarrowing({ ...by, filter })}
        onAdd={() => setAdding(true)}
        onSignOut={() => void leave()}
      />

      <ListSheet position={sheet} onPosition={setSheet} header={<NarrowingNotice by={by} />}>
        <RestaurantList
          restaurants={matches}
          isPending={isPending}
          error={refusal}
          empty={empty}
          selected={selected}
          onSelect={chooseInTheSheet}
          onTakeOff={setTakingOff}
        />
      </ListSheet>

      <AddRestaurantDialog open={adding} onOpenChange={setAdding} />
      <TakeOffListDialog restaurant={takingOff} onClose={() => setTakingOff(undefined)} />
    </main>
  );
}
