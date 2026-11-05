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

import { boundsOf, located, OPENING_ZOOM, pointOf, viewOf } from "./view";
import type { Point } from "./view";
import { useOwnerLocation } from "./location";
import { useConfiguration } from "./queries";

interface ListMapProps {
  restaurants: Restaurant[] | undefined;
  selected: number | undefined;
  onSelect: (id: number) => void;

  // What is narrowing the list, as one value that changes whenever the
  // narrowing does. The map moves to fit the matches each time it changes, and
  // the empty string is a list nothing is narrowing.
  narrowedBy: string;
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
// The highlight wins over the green rather than the other way round. Scenario:
// Selecting a restaurant on the list — "the Bacari pin is highlighted" —
// exempts no restaurant, and a visited Bacari that stayed green when it was
// chosen would answer the click with nothing at all. Green is a standing
// property of the restaurant; the highlight is the answer to what the owner
// just did, and there is only ever one of it.
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

// Scenario: Selecting a restaurant on the list — "the map pans to show Bacari
// in the center" — and the same pan from the other side, on the map.
//
// The pan goes through the map instance rather than a controlled `center` prop.
// A controlled centre is re-asserted on every render, so any move the owner
// made themselves would be undone by the next one — a refetch of the list is
// enough. Keyed on the coordinates, so choosing a different restaurant pans and
// a re-render does not.
//
// Nothing changes the zoom: the scenario asks for a pan, and the zoom is now
// the owner's. See ASSUMPTIONS.md, "Whether choosing a restaurant changes the
// zoom".
function PanTo({ point }: { point: Point | undefined }) {
  const map = useMap();
  const lat = point?.lat;
  const lng = point?.lng;

  useEffect(() => {
    if (map === null || lat === undefined || lng === undefined) return;

    map.panTo({ lat, lng });
  }, [map, lat, lng]);

  return null;
}

// finding-a-restaurant-on-my-list.scenarios.md: "And <match> is all that is
// pinned on the map. And the map moves to fit it." So narrowing the list moves
// the camera, and it is the narrowing that moves it rather than the pins: a
// refetch that brings back the same restaurants is not the owner asking for
// anything.
//
// Nothing matched leaves the camera alone — "And the map stays where it was" —
// and so does the first draw, which is where the opening view is settled.
function FitToTheMatches({ narrowedBy, points }: { narrowedBy: string; points: Point[] }) {
  const map = useMap();

  // The narrowing the map has already answered. Everything else that changes
  // the pins — a restaurant added, one taken off, the list simply arriving
  // again — leaves the camera alone, because none of it is the owner asking to
  // see something else.
  const fitted = useRef(narrowedBy);

  useEffect(() => {
    if (map === null || fitted.current === narrowedBy) return;

    fitted.current = narrowedBy;

    const bounds = boundsOf(points);
    if (bounds === undefined) return;

    // One match has no box to fit, so it is the opening view again, centred on
    // it — see ASSUMPTIONS.md, "What fitting the matches comes to".
    const [only] = points;
    if (points.length === 1 && only !== undefined) {
      map.moveCamera({ center: only, zoom: OPENING_ZOOM });
      return;
    }

    map.fitBounds(bounds);
  }, [map, narrowedBy, points]);

  return null;
}

// Scenario: Recentering on the user location — "When I click on the 'locate me'
// button. Then I see a map centered around my location at zoom level 13".
//
// Both halves of that are set at once, which is what separates this from the
// selection pan: a pan leaves the zoom where the owner left it, and this is the
// opening view again, zoom included. The scenario names the zoom, so the owner
// having zoomed in since is not a reason to keep it.
//
// The location is the one read when the page opened, and clicking this does not
// ask the browser again — see ASSUMPTIONS.md, "Whether the locate-me button
// asks the browser again".
//
// It is drawn into the map's own control layer rather than over the map by this
// page, so it sits inside the map and travels with it, the way the wireframe
// draws it alongside the zoom buttons.
function LocateMe({ shared }: { shared: Point }) {
  const map = useMap();

  return (
    <MapControl position={ControlPosition.RIGHT_CENTER}>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Locate me"
        className={LOCATE_ME}
        onClick={() => {
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
export function ListMap({ restaurants, selected, onSelect, narrowedBy }: ListMapProps) {
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
  const chosen = pins.find((restaurant) => restaurant.id === selected);

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
        <PanTo point={chosen === undefined ? undefined : pointOf(chosen)} />
        <FitToTheMatches narrowedBy={narrowedBy} points={pins.map(pointOf)} />

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
        {shared ? <LocateMe shared={shared} /> : null}

        {pins.map((restaurant) => (
          // "Markers should be standard google pins", per the wireframe's own
          // note — which is what Pin draws when nothing overrides it.
          <AdvancedMarker
            key={restaurant.id}
            position={pointOf(restaurant)}
            title={restaurant.name}
            onClick={() => onSelect(restaurant.id)}
          >
            <Pin {...colourOf(restaurant, selected)} />
          </AdvancedMarker>
        ))}
      </Map>
    </APIProvider>
  );
}
