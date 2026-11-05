import { useRef } from "react";
import type { KeyboardEvent, PointerEvent, ReactNode, UIEvent } from "react";

import { dragged, directionOf, HEIGHTS, scrolled } from "./sheet";
import type { SheetPosition } from "./sheet";

interface ListSheetProps {
  position: SheetPosition;
  onPosition: (position: SheetPosition) => void;

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
export function ListSheet({ position, onPosition, header, children }: ListSheetProps) {
  const from = useRef<number | undefined>(undefined);

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
      */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6" onScroll={readScroll}>
        {children}
      </div>
    </section>
  );
}
