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

  // list-screen.states.md, initial state: "Menu: Closed". It belongs to the
  // page because almost every row of the table closes it, and most of those
  // events land somewhere else on the screen entirely.
  //
  // Fourteen of the fifteen rows read Close, so every handler below ends by
  // shutting it. That is the page answering the event, rather than the menu
  // noticing it was pressed past: an owner who clears the search field they
  // were already typing in presses nothing outside the menu, and the row still
  // says Close.
  const [menu, setMenu] = useState(false);

  // list-screen.states.md gives Tap a row and Tap a pin identical rows: the
  // sheet drops to peek scrolled to show the restaurant, the restaurant becomes
  // the selection, and the map centres on it with its pin highlighted. So there
  // is one way of choosing a restaurant rather than two that differ by where the
  // owner reached for it, and whichever half they used the sheet gets out of the
  // way of the map it just moved.
  //
  // The page sets the selection and nothing else: the scroll belongs to the
  // sheet, which owns the region the cards scroll in, and the centring to the
  // map. Both read the act off the selection rather than being told twice.
  function choose(id: number) {
    setSelection((previous) => chose(id, previous));
    setSheet("peek");
    setMenu(false);
  }

  // Drag the sheet, and Scroll the list up from peek. Both reach the sheet and
  // both close the menu, so the page takes its position rather than handing the
  // setter straight to it.
  function restTheSheetAt(position: SheetPosition) {
    setSheet(position);
    setMenu(false);
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
    setMenu(false);

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
    setMenu(false);
  }

  // Open the "Add" dialog, and Locate-me. Neither moves anything else the table
  // tracks; both close the menu.
  function openTheAddDialog() {
    setAdding(true);
    setMenu(false);
  }

  // list-screen.states.md, Add a restaurant: the restaurant just added becomes
  // the selection, the search goes Empty, the filter goes back to All, the menu
  // closes, and the map centres on the selection at zoom 13.
  //
  // Emptying the search and resetting the filter is the whole of NOTHING_NARROWED,
  // and the two go together for a reason: a restaurant added while the list was
  // narrowed would otherwise be chosen and then hidden by the narrowing that
  // was already there. Clearing both is what makes it the thing the owner is
  // looking at.
  //
  // The sheet drops to peek, which is the cell Tap a row and Tap a pin carry
  // too: the add centres the map on the restaurant it just chose, so the sheet
  // gets out of the way of the map it moved. The row used to read Unchanged, on
  // the reading that an owner coming out of a dialog had nowhere they had got
  // to — the table answers choosing by the add the same way it answers choosing
  // on either half of the page instead.
  function added(restaurant: Restaurant) {
    setAdding(false);
    setNarrowing(NOTHING_NARROWED);
    setSelection((previous) => chose(restaurant.id, previous));
    setSheet("peek");
    setMenu(false);
  }

  function locate() {
    setSelection(undefined);
    setMenu(false);
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
  // Every row of list-screen.states.md but Tap the hamburger closes the menu,
  // and a non-modal menu already closes on an outside pointer interaction —
  // which is what a drag, a tap on a row or a pin, a reach for the search
  // field, a pan of the map and every button on the page all are.
  //
  // A wheel is the one that is not. Zooming the map and scrolling the list are
  // both events in the table, and neither presses anything, so the page closes
  // the menu on a wheel of its own accord. The menu itself is portalled out of
  // here, so scrolling inside it does not shut it.
  return (
    <main
      className="relative h-dvh w-full overflow-hidden"
      onWheel={() => setMenu(false)}
    >
      <div className="absolute inset-0">
        <ListMap
          restaurants={matches}
          selection={selection}
          onSelect={choose}
          onLocate={locate}
        />
      </div>

      <Chrome
        by={by}
        menu={menu}
        onMenu={setMenu}
        onSearch={narrow}
        onFilter={filterTo}
        onAdd={openTheAddDialog}
        onSignOut={() => void leave()}
      />

      <ListSheet
        position={sheet}
        onPosition={restTheSheetAt}
        showing={selection?.at}
        header={<NarrowingNotice by={by} />}
      >
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

      <AddRestaurantDialog open={adding} onOpenChange={setAdding} onAdded={added} />
      <TakeOffListDialog restaurant={takingOff} onClose={() => setTakingOff(undefined)} />
    </main>
  );
}
