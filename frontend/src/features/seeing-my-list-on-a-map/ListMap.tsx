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
import { useEffect } from "react";

import type { Restaurant } from "@/api/types";
import { Button } from "@/components/ui/button";

import { located, OPENING_ZOOM, pointOf, viewOf } from "./view";
import type { Point } from "./view";
import { useOwnerLocation } from "./location";
import { useConfiguration } from "./queries";

interface ListMapProps {
  restaurants: Restaurant[] | undefined;
  selected: number | undefined;
  onSelect: (id: number) => void;
}

// seeing-my-list-on-a-map.drawio draws the map 323px tall at the top of the
// column, roughly square at the width that wireframe is drawn at. The height is
// what carries over rather than the squareness: the map has to stay visible
// while the list scrolls under it, and a square map at this page's width would
// take the whole screen.
const HEIGHT = "h-80";

// seeing-my-list-on-a-map.drawio highlights the chosen pin in yellow, and its
// own note says the highlight is colour-based. Border and glyph are set with
// the background rather than left to a default, so the pin stays readable
// against it.
const HIGHLIGHT = {
  background: "#ffff33",
  borderColor: "#8a6d1f",
  glyphColor: "#8a6d1f",
} as const;

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
const LOCATE_ME = "m-2.5 size-10 rounded-sm bg-background shadow-md hover:bg-background";

// Manually panning and zooming is no longer out of scope in
// seeing-my-list-on-a-map.scenarios.md, so the map is the owner's to move.
// Which affordances that comes to is not stated — see ASSUMPTIONS.md, "What
// moving the map themselves comes to".
const THE_OWNER_S_TO_MOVE = {
  // A drag pans and ctrl-scroll zooms, while a plain scroll still scrolls the
  // page. "greedy" would swallow that scroll, and Scenario: Scrolling the list
  // needs the cards to travel under a map stuck to the top of the page.
  gestureHandling: "cooperative",

  // The zoom buttons, and nothing else the default UI would bring with them:
  // the wireframe draws a bare map, and street view, map type and fullscreen
  // are not what came into scope. The wheel, double-click zoom and the
  // keyboard are simply no longer suppressed.
  disableDefaultUI: true,
  zoomControl: true,
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

// Scenario: Recentering on the user location — "When I click on the 'locate me'
// button. Then I see a map centered around my location at zoom level 10".
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
    <MapControl position={ControlPosition.RIGHT_BOTTOM}>
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
export function ListMap({ restaurants, selected, onSelect }: ListMapProps) {
  const { data: configuration, error } = useConfiguration();

  // Scenario: See restaurants from my list opens the map on the owner's own
  // location, so where it opens is not known until the browser has answered.
  const { data: shared, isPending: asking } = useOwnerLocation();

  // Neither state is in an artifact — see ASSUMPTIONS.md, "What stands in for
  // the map before it can be drawn".
  if (error) {
    return (
      <p role="alert" className="text-destructive text-sm">
        The map is unavailable just now.
      </p>
    );
  }

  // The same line covers both waits. The map opens once, at a centre it cannot
  // take back — `defaultCenter` is read on the first draw and the camera is the
  // owner's after that — so drawing before the answer arrives would mean either
  // showing a centre the scenario does not ask for, or panning away from one
  // the owner may already have moved. See ASSUMPTIONS.md, "When the map waits
  // for the owner's location".
  if (!configuration || asking) {
    return <p className="text-muted-foreground text-sm">Opening the map…</p>;
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
        className={`${HEIGHT} w-full overflow-hidden rounded-lg`}
        {...THE_OWNER_S_TO_MOVE}
        // "I see a map centered around my location at zoom level 10", or the
        // first restaurant on the list when the owner shared nothing — where it
        // opens, not where it stays.
        defaultCenter={view.centre}
        defaultZoom={view.zoom}
      >
        <PanTo point={chosen === undefined ? undefined : pointOf(chosen)} />

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
            <Pin {...(restaurant.id === selected ? HIGHLIGHT : {})} />
          </AdvancedMarker>
        ))}
      </Map>
    </APIProvider>
  );
}
