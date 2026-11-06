import { useEffect, useRef } from "react";
import type { KeyboardEvent, PointerEvent, ReactNode, UIEvent } from "react";

import { dragged, directionOf, HEIGHTS, scrolled } from "./sheet";
import type { SheetPosition } from "./sheet";

interface ListSheetProps {
  position: SheetPosition;
  onPosition: (position: SheetPosition) => void;

  // Which act of choosing the sheet is answering, counted by selection.ts, or
  // nothing while nothing is chosen.
  //
  // list-screen.states.md gives Tap a row, Tap a pin and Add a restaurant one
  // Sheet cell between them — "→ Peek, scrolled to show selection" — so the
  // scroll is the sheet's answer to those three events. It used to be the
  // chosen card scrolling itself whenever it was chosen, which is the standing
  // rule the table replaced.
  showing?: number | undefined;

  // What sits between the handle and the cards, outside the scroll: anything
  // about the list as a whole, which must not scroll away from it.
  header?: ReactNode;
  children: ReactNode;
}

// seeing-my-list-on-a-map.drawio draws the sheet over the bottom of the map
// with a grab handle centred at its top edge, and annotates it twice: "Sheet
// drags between peek, half and full. It cannot be dismissed", and "Cards scroll
// inside the sheet and are clipped at its edge. Nothing passes outside it."
//
// Clipping is structural rather than promised: the cards scroll in a region
// bounded by the sheet, so a card reaching the top edge is cut off there. The
// page itself has no scrolling of its own — "the page itself does not scroll" —
// which is also what leaves a single finger free to drag the map.
export function ListSheet({ position, onPosition, showing, header, children }: ListSheetProps) {
  const from = useRef<number | undefined>(undefined);

  // The region the cards scroll in, which is the one the sheet scrolls to show
  // a selection and the one it reads the owner's own scrolling off.
  const scroller = useRef<HTMLDivElement>(null);

  // Which act of choosing the sheet has already scrolled to. The cell names an
  // act rather than a state, so it is performed once per act — and tapping the
  // row already chosen is a new act, which is the reading the Map cell beside
  // it already gets.
  const shown = useRef<number | undefined>(undefined);

  // Where the cards were scrolled to when this was last asked, so the next
  // answer can be compared against it. A scroll event says that the region
  // moved and not which way.
  const scrolledTo = useRef(0);

  function startDragging(event: PointerEvent<HTMLDivElement>) {
    from.current = event.clientY;
  }

  // A drag is read on release rather than followed pixel by pixel, because what
  // the scenario asks for is which way it went: "When I drag the sheet <down>,
  // Then the sheet rests at <peek>". Travel shorter than a drag moves nothing,
  // so a tap on the handle is not half a gesture.
  function stopDragging(event: PointerEvent<HTMLDivElement>) {
    const started = from.current;
    from.current = undefined;
    if (started === undefined) return;

    const direction = directionOf(event.clientY - started);
    if (direction === undefined) return;

    onPosition(dragged(position, direction));
  }

  // "scrolled to show selection". The chosen card goes to the top of what the
  // sheet shows rather than merely into view: all three rows leave the sheet at
  // peek, which sheet.ts gives room for the handle and one card, so the top of
  // the region is the only place a card can be shown at all.
  //
  // What to scroll to is whatever the sheet's own contents mark as current. The
  // sheet holds a list of anything and knows nothing about restaurants, and
  // aria-current is already how the chosen one says it is the chosen one.
  //
  // No dependency list, because the card may not be there yet: the restaurant
  // an add just chose arrives with the refetch the add goes back for, several
  // renders after the act. Nothing is recorded until there was something to
  // scroll to, so the act is answered on the render it first becomes possible
  // and the guard makes every render after that a no-op.
  useEffect(() => {
    if (showing === undefined || shown.current === showing) return;

    const region = scroller.current;
    if (region === null) return;

    const current = region.querySelector<HTMLElement>("[aria-current='true']");
    if (current === null) return;

    shown.current = showing;
    current.scrollIntoView({ block: "start" });

    // Where that landed, recorded as though the sheet had been asked for it.
    //
    // list-screen.states.md has Scroll the list up as an event in its own
    // right, and the scroll above moves the very region that event is read
    // off. Read back as that event it would be answered "Peek → Half", taking
    // the sheet off the peek the same cell had just put it at — one answer to
    // one event arriving as a second event. So the movement is recorded as
    // already seen, and the scroll event it causes reads as no movement at
    // all. See ASSUMPTIONS.md, "Whether a scroll Shortlist performed is an
    // event".
    //
    // Recording where it landed rather than raising a flag, because the
    // browser fires the scroll event a frame or more after the movement and
    // may fire none at all when the region was already there. Nothing here
    // depends on whether it comes or when.
    scrolledTo.current = region.scrollTop;
  });

  // list-screen.states.md gives the list's own scrolling two rows of its own,
  // and the one that moves the sheet is Scroll the list up: "Peek → Half".
  //
  // Read off the region actually scrolling rather than off a wheel, so a swipe,
  // a scrollbar and the keyboard all count — they are the same event to the
  // owner. A gesture over a region with nothing to reveal scrolls nothing and
  // moves nothing: see ASSUMPTIONS.md, "What scrolling the list is when there
  // is nothing to scroll".
  function readScroll(event: UIEvent<HTMLDivElement>) {
    const was = scrolledTo.current;
    const now = event.currentTarget.scrollTop;
    scrolledTo.current = now;

    if (now === was) return;

    onPosition(scrolled(position, now > was ? "up" : "down"));
  }

  // Nothing in the artifacts covers reaching the sheet without a pointer, and
  // an owner who cannot drag would be left with whatever position the page
  // opened at — see ASSUMPTIONS.md, "What makes a drag count". The arrows are
  // the same move as a drag in the same direction.
  function pressKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;

    event.preventDefault();
    onPosition(dragged(position, event.key === "ArrowUp" ? "up" : "down"));
  }

  return (
    <section
      aria-label="My list"
      // Where it rests, for anybody reading the page rather than looking at it.
      data-position={position}
      className={`absolute inset-x-0 bottom-0 z-10 flex flex-col ${HEIGHTS[position]} rounded-t-xl bg-background shadow-lg ring-1 ring-foreground/10`}
    >
      {/*
        The strip the sheet is dragged by, rather than the handle alone: the
        handle is 48×6 in the wireframe, which is a target nobody hits. The
        strip is what takes the gesture and the handle is what shows where.

        touch-none keeps the browser from reading the same gesture as a scroll
        of something.
      */}
      <div
        className="flex shrink-0 cursor-grab touch-none justify-center py-3"
        onPointerDown={startDragging}
        onPointerUp={stopDragging}
        onPointerCancel={() => {
          from.current = undefined;
        }}
      >
        <button
          type="button"
          aria-label="Resize the list"
          onKeyDown={pressKey}
          className="h-1.5 w-12 rounded-full bg-muted-foreground/40 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      {header !== undefined && <div className="shrink-0">{header}</div>}

      {/*
        min-h-0 is what lets this shrink past its content and overflow inside
        the sheet instead of growing it. Without it the cards would push the
        sheet past the positions it is allowed to rest at.

        pt-2 is room for the first card's ring. A card paints its ring outside
        its own box, so a first card flush with this region's clip edge keeps
        its border and loses the ring — and loses 2px of it rather than 1px
        once it is the chosen one. The number is the sheet's own drawing:
        seeing-my-list-on-a-map.drawio puts the handle's bottom edge at y=489
        and the first card's top at y=497. What the drawing does not say is
        which side of the clip that room sits on — see ASSUMPTIONS.md, "Where
        the sheet's clip edge falls".

        scroll-pt-2 is the same room for every other card. scrollIntoView
        aligns a card's top with the top of the scrollport, so the padding
        alone would answer only the card at rest and leave the ring of
        whichever card the sheet scrolled to under the clip. The padding
        answers the first card; the scroll-padding answers "scrolled to show
        selection".
      */}
      <div
        ref={scroller}
        className="min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-6 scroll-pt-2"
        onScroll={readScroll}
      >
        {children}
      </div>
    </section>
  );
}
