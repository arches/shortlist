import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import type { Restaurant } from "@/api/types";
import { SessionEnded, signOut } from "@/session/session";

import { NarrowingNotice } from "@/features/finding-a-restaurant-on-my-list/NarrowingNotice";
import {
  narrowed,
  nothingMatches,
  NOTHING_NARROWED,
  searching,
} from "@/features/finding-a-restaurant-on-my-list/narrowing";
import type {
  Narrowing,
  VisitedFilter,
} from "@/features/finding-a-restaurant-on-my-list/narrowing";
import { Chrome } from "@/features/seeing-my-list-on-a-map/Chrome";
import { ListMap } from "@/features/seeing-my-list-on-a-map/ListMap";
import { ListSheet } from "@/features/seeing-my-list-on-a-map/ListSheet";
import { chose } from "@/features/seeing-my-list-on-a-map/selection";
import type { Selection } from "@/features/seeing-my-list-on-a-map/selection";
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
  // single page", and list-screen.states.md has choosing move every region of
  // it. So which restaurant is chosen belongs to the page that holds both, not
  // to either one of them. Nothing is chosen until the owner chooses it.
  const [selection, setSelection] = useState<Selection | undefined>();

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

  // list-screen.states.md gives Tap a row and Tap a pin identical rows: the
  // sheet drops to peek, the restaurant becomes the selection, and the map
  // centres on it. So there is one way of choosing a restaurant rather than two
  // that differ by where the owner reached for it, and whichever half they used
  // the sheet gets out of the way of the map it just moved.
  function choose(id: number) {
    setSelection((previous) => chose(id, previous));
    setSheet("peek");
  }

  // list-screen.states.md has two rows for the field, and what tells them apart
  // is the state each leaves the Search region in: Type in search leaves a
  // Query, Clear the search leaves it Empty. So the event is read off what the
  // field is left holding rather than off which keys were pressed — and
  // whitespace is Empty, the way narrowing.ts already has it.
  //
  // Typing raises the sheet to half and drops the choice: the owner is looking
  // for something else now, so the list they are narrowing has to be visible
  // and the restaurant they were looking at is no longer the answer. Clearing
  // does neither — Sheet and Selection both read Unchanged on that row.
  function narrow(search: string) {
    const next = { ...by, search };
    setNarrowing(next);

    if (!searching(next)) return;

    setSelection(undefined);
    setSheet("half");
  }

  // list-screen.states.md, Change the filter: "Selection: None", and the sheet
  // left where it is. The choice goes for the same reason it goes on a search —
  // the owner has changed what they are choosing between — but the sheet does
  // not move, because the filter is chosen in the menu rather than in the row
  // and the owner never lost sight of the list.
  function filterTo(filter: VisitedFilter) {
    setNarrowing({ ...by, filter });
    setSelection(undefined);
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
        <ListMap restaurants={matches} selection={selection} onSelect={choose} />
      </div>

      <Chrome
        by={by}
        onSearch={narrow}
        onFilter={filterTo}
        onAdd={() => setAdding(true)}
        onSignOut={() => void leave()}
      />

      <ListSheet position={sheet} onPosition={setSheet} header={<NarrowingNotice by={by} />}>
        <RestaurantList
          restaurants={matches}
          isPending={isPending}
          error={refusal}
          empty={empty}
          selected={selection?.id}
          onSelect={choose}
          onTakeOff={setTakingOff}
        />
      </ListSheet>

      <AddRestaurantDialog open={adding} onOpenChange={setAdding} />
      <TakeOffListDialog restaurant={takingOff} onClose={() => setTakingOff(undefined)} />
    </main>
  );
}
