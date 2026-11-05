import {
  AdvancedMarker,
  APIProvider,
  ControlPosition,
  Map,
  MapControl,
  Pin,
  useMap,
} from "@vis.gl/react-google-maps";
import { LocateFixed } from "lucide-react";
import { useEffect, useRef } from "react";

import type { Restaurant } from "@/api/types";
import { Button } from "@/components/ui/button";

import { located, OPENING_ZOOM, pointOf, viewOf } from "./view";
import type { Point } from "./view";
import type { Selection } from "./selection";
import { useOwnerLocation } from "./location";
import { useConfiguration } from "./queries";

interface ListMapProps {
  restaurants: Restaurant[] | undefined;
  selection: Selection | undefined;
  onSelect: (id: number) => void;

  // list-screen.states.md has Locate-me clear the selection as well as move the
  // camera, and the selection belongs to the page — so the button reports the
  // event rather than owning the answer to it.
  onLocate: () => void;
}

// seeing-my-list-on-a-map.drawio draws the map filling the whole frame, from
// the top of the page to the bottom, with the chrome and the sheet floating
// over it. So the map takes whatever it is given rather than a height of its
// own, and what it is given is the page.
const FILLS_THE_PAGE = "h-full w-full";

// seeing-my-list-on-a-map.drawio highlights the chosen pin in yellow, and its
// own note says the highlight is colour-based. Border and glyph are set with
// the background rather than left to a default, so the pin stays readable
// against it.
const HIGHLIGHT = {
  background: "#ffff33",
  borderColor: "#8a6d1f",
  glyphColor: "#8a6d1f",
} as const;

// seeing-my-list-on-a-map.drawio draws a third marker colour, with its own
// note: "Visited locations should have green markers". shortlist.glossary.md
// defines Visited as a restaurant the owner has an Experience at, and
// shortlist.data.md derives it per owner — "a Restaurant is never visited in
// its own right, only visited by somebody" — so what is green here is mine
// rather than the Restaurant's, and another owner's experiences never colour
// my map.
//
// The wireframe gives the fill, #99FF99, and nothing else. Border and glyph
// are a darker green, set in the same breath as the background rather than
// left to a default picked for a red pin — see ASSUMPTIONS.md, "What a visited
// pin is drawn as".
const VISITED = {
  background: "#99ff99",
  borderColor: "#1f7a3d",
  glyphColor: "#1f7a3d",
} as const;

// Which of the three colours the wireframe draws a given pin in.
//
// The highlight wins over the green rather than the other way round.
// list-screen.states.md has the chosen pin highlighted whichever restaurant it
// is — "Selection should always scroll the list so the selected item is in
// view, and highlight the map pin" — and a visited Bacari that stayed green
// when it was chosen would answer the tap with nothing at all. Green is a
// standing property of the restaurant; the highlight is the answer to what the
// owner just did, and there is only ever one of it.
//
// Nothing overridden is the standard Google pin, per the wireframe's other
// note, and that is what a restaurant the owner has not eaten at reads as.
function colourOf(restaurant: Restaurant, selected: number | undefined) {
  if (restaurant.id === selected) return HIGHLIGHT;
  if (restaurant.visited) return VISITED;

  return {};
}

// Scenario: See restaurants from my list — "And I see a blue dot showing my
// location". The phrase borrows Google's own convention, and so does this: a
// small blue circle, ringed in white so it reads against whatever map tile sits
// under it. The shade, the size and the ring are not in any artifact, and nor
// is the accuracy circle a real blue dot usually carries — see ASSUMPTIONS.md,
// "What the blue dot is drawn as".
const MY_LOCATION_DOT = "block size-3.5 rounded-full border-2 border-white bg-blue-600 shadow-md";

// seeing-my-list-on-a-map.drawio draws the locate-me control as a 24px square
// in the same column as the zoom buttons, at the map's right edge. White with a
// shadow rather than the wireframe's grey, which is what the zoom buttons it
// stacks with are — see ASSUMPTIONS.md, "What the locate-me button is drawn
// as".
//
// The bottom margin lifts it clear of the line it is centred on, which is the
// edge the sheet rests at: the wireframe draws both controls just above that
// edge rather than straddling it.
const LOCATE_ME = "mr-2.5 mb-14 size-10 rounded-sm bg-background shadow-md hover:bg-background";

// Manually panning and zooming is no longer out of scope in
// seeing-my-list-on-a-map.scenarios.md, so the map is the owner's to move.
// Which affordances that comes to is not stated — see ASSUMPTIONS.md, "What
// moving the map themselves comes to".
const THE_OWNER_S_TO_MOVE = {
  // A drag pans and ctrl-scroll zooms, and a plain scroll over the map does
  // nothing — the page has no scrolling of its own any more, and the panel the
  // cards scroll in is below the map rather than under it. "greedy" would zoom
  // on a plain wheel instead, which nothing asks for — see ASSUMPTIONS.md,
  // "What a plain scroll over the map does".
  gestureHandling: "cooperative",

  // The zoom buttons, and nothing else the default UI would bring with them:
  // the wireframe draws a bare map, and street view, map type and fullscreen
  // are not what came into scope. The wheel, double-click zoom and the
  // keyboard are simply no longer suppressed.
  disableDefaultUI: true,
  zoomControl: true,

  // The map fills the page now and the sheet lies over the bottom of it, so
  // the corner these used to sit in is behind the sheet at every position it
  // rests at. The wireframe draws them at the right edge, immediately above
  // the line the sheet's own top edge is at — which is the middle of the map.
  // See ASSUMPTIONS.md, "Where the map's own controls sit".
  zoomControlOptions: { position: ControlPosition.RIGHT_CENTER },
} as const;

// list-screen.states.md gives Tap a row and Tap a pin the same answer from the
// map: "Center on selection, zoom 13". So centring is the whole camera rather
// than a pan — the zoom comes back to 13 however far the owner had zoomed in or
// out since, the same way Locate-me and the opening view set both.
//
// It goes through the map instance rather than a controlled `center` prop. A
// controlled centre is re-asserted on every render, so any move the owner made
// themselves would be undone by the next one — a refetch of the list is enough.
// Keyed on the coordinates, so choosing a different restaurant centres and a
// re-render does not.
//
// A restaurant Google gave no point for has nothing to centre on, so the map
// stays where it is — see ASSUMPTIONS.md, "Centring on a selection with no
// coordinates".
//
// What the camera answers to is the act of choosing rather than the restaurant
// chosen: list-screen.states.md answers Tap a row with "Center on selection"
// however many times it arrives, so an owner who panned away and tapped the
// same row again is taken back. Keyed on the coordinates, the same point twice
// would read as a re-render and move nothing.
//
// So the move is guarded by which act the camera has already answered, rather
// than by the dependencies alone. A point that arrives after the choice — the
// list still loading when the row was tapped — is answered on the render it
// arrives, because nothing was recorded while there was nowhere to go.
function CentreOn({ at, point }: { at: number | undefined; point: Point | undefined }) {
  const map = useMap();
  const centred = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (map === null || at === undefined || point === undefined) return;
    if (centred.current === at) return;

    centred.current = at;
    map.moveCamera({ center: point, zoom: OPENING_ZOOM });
  }, [map, at, point]);

  return null;
}

// list-screen.states.md, Locate-me: "Center on my location, zoom 13" and
// "Selection: None".
//
// Centre and zoom are set together, which is the opening view again — the table
// names the zoom, so the owner having zoomed in since is not a reason to keep
// it. Going back to where they are standing is also leaving behind the
// restaurant they went to look at, so the highlight goes with it.
//
// The location is the one read when the page opened, and clicking this does not
// ask the browser again — see ASSUMPTIONS.md, "Whether the locate-me button
// asks the browser again".
//
// It is drawn into the map's own control layer rather than over the map by this
// page, so it sits inside the map and travels with it, the way the wireframe
// draws it alongside the zoom buttons.
function LocateMe({ shared, onLocate }: { shared: Point; onLocate: () => void }) {
  const map = useMap();

  return (
    <MapControl position={ControlPosition.RIGHT_CENTER}>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Locate me"
        className={LOCATE_ME}
        onClick={() => {
          // The event lands on both regions, so the selection is dropped
          // whether or not there is a map yet to move.
          onLocate();

          if (map === null) return;

          map.moveCamera({ center: shared, zoom: OPENING_ZOOM });
        }}
      >
        <LocateFixed className="size-5" />
      </Button>
    </MapControl>
  );
}

// The map half of the list screen. shortlist.context.d2 has Google Maps feeding
// Shortlist map tiles and functionality, and shortlist.principles.md is why the
// key it needs arrives from the API rather than from the bundle.
export function ListMap({ restaurants, selection, onSelect, onLocate }: ListMapProps) {
  const { data: configuration, error } = useConfiguration();

  // Scenario: See restaurants from my list opens the map on the owner's own
  // location, so where it opens is not known until the browser has answered.
  const { data: shared, isPending: asking } = useOwnerLocation();

  // Neither state is in an artifact — see ASSUMPTIONS.md, "What stands in for
  // the map before it can be drawn".
  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted p-6">
        <p role="alert" className="text-destructive text-sm">
          The map is unavailable just now.
        </p>
      </div>
    );
  }

  // The same line covers both waits. The map opens once, at a centre it cannot
  // take back — `defaultCenter` is read on the first draw and the camera is the
  // owner's after that — so drawing before the answer arrives would mean either
  // showing a centre the scenario does not ask for, or panning away from one
  // the owner may already have moved. See ASSUMPTIONS.md, "When the map waits
  // for the owner's location".
  if (!configuration || asking) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted p-6">
        <p className="text-muted-foreground text-sm">Opening the map…</p>
      </div>
    );
  }

  const view = viewOf(restaurants, shared);
  const pins = located(restaurants);

  // Nothing is chosen until the owner chooses something, and until then the map
  // keeps the view it opened at.
  const chosen = pins.find((restaurant) => restaurant.id === selection?.id);

  return (
    <APIProvider apiKey={configuration.google_maps_api_key}>
      <Map
        // The Maps API will not draw an advanced marker without a Map ID, and
        // an advanced marker is what a pin is now.
        mapId={configuration.google_maps_map_id}
        className={FILLS_THE_PAGE}
        {...THE_OWNER_S_TO_MOVE}
        // "I see a map centered around my location at zoom level 13", or the
        // first restaurant on the list when the owner shared nothing — where it
        // opens, not where it stays.
        defaultCenter={view.centre}
        defaultZoom={view.zoom}
      >
        <CentreOn at={selection?.at} point={chosen === undefined ? undefined : pointOf(chosen)} />

        {/* The owner, where they are standing, when they shared it. Nothing is
            drawn when there is nothing to draw — "And there is no blue dot
            showing my location", which Scenario: Location not shared says in so
            many words. The dot is not a restaurant, so nothing happens when it
            is clicked. */}
        {shared ? (
          <AdvancedMarker position={shared} title="My location">
            <span data-testid="my-location-dot" className={MY_LOCATION_DOT} />
          </AdvancedMarker>
        ) : null}

        {/* Nothing to locate the owner at when they shared nothing, so there is
            nothing to offer them — the same silence Scenario: Location not
            shared gives the blue dot. See ASSUMPTIONS.md, "The locate-me button
            when there is no location to go to". */}
        {shared ? <LocateMe shared={shared} onLocate={onLocate} /> : null}

        {pins.map((restaurant) => (
          // "Markers should be standard google pins", per the wireframe's own
          // note — which is what Pin draws when nothing overrides it.
          <AdvancedMarker
            key={restaurant.id}
            position={pointOf(restaurant)}
            title={restaurant.name}
            onClick={() => onSelect(restaurant.id)}
          >
            <Pin {...colourOf(restaurant, selection?.id)} />
          </AdvancedMarker>
        ))}
      </Map>
    </APIProvider>
  );
}
