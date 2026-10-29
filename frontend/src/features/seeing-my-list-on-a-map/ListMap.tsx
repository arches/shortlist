import { AdvancedMarker, APIProvider, Map, Pin, useMap } from "@vis.gl/react-google-maps";
import { useEffect } from "react";

import type { Restaurant } from "@/api/types";

import { located, pointOf, viewOf } from "./view";
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
