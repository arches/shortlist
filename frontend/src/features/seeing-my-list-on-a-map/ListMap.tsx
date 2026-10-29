import { AdvancedMarker, APIProvider, Map, Pin } from "@vis.gl/react-google-maps";

import type { Restaurant } from "@/api/types";

import { located, pointOf, viewOf } from "./view";
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

// seeing-my-list-on-a-map.scenarios.md puts manual panning and zooming out of
// scope, and the Maps API ships both switched on — so leaving them alone would
// build the out-of-scope thing by accident. Everything the owner could use to
// move the map themselves is off; the map still moves when they pick a
// restaurant, which is the main path rather than a gesture.
// seeing-my-list-on-a-map.drawio highlights the chosen pin in yellow, and its
// own note says the highlight is colour-based. Border and glyph are set with
// the background rather than left to a default, so the pin stays readable
// against it.
const HIGHLIGHT = {
  background: "#ffff33",
  borderColor: "#8a6d1f",
  glyphColor: "#8a6d1f",
} as const;

const NOT_THE_OWNER_S_TO_MOVE = {
  gestureHandling: "none",
  disableDefaultUI: true,
  zoomControl: false,
  scrollwheel: false,
  disableDoubleClickZoom: true,
  keyboardShortcuts: false,
} as const;

// The map half of the list screen. shortlist.context.d2 has Google Maps feeding
// Shortlist map tiles and functionality, and shortlist.principles.md is why the
// key it needs arrives from the API rather than from the bundle.
export function ListMap({ restaurants, selected, onSelect }: ListMapProps) {
  const { data: configuration, error } = useConfiguration();

  // Neither state is in an artifact — see ASSUMPTIONS.md, "What stands in for
  // the map before it can be drawn".
  if (error) {
    return (
      <p role="alert" className="text-destructive text-sm">
        The map is unavailable just now.
      </p>
    );
  }

  if (!configuration) {
    return <p className="text-muted-foreground text-sm">Opening the map…</p>;
  }

  const view = viewOf(restaurants);
  const pins = located(restaurants);

  // Scenario: Selecting a restaurant on the list — "the map pans to show Bacari
  // in the center". The centre is controlled only once something is chosen, so
  // until then the map keeps the view it opened at. Nothing changes the zoom:
  // the scenario asks for a pan.
  const chosen = pins.find((restaurant) => restaurant.id === selected);

  return (
    <APIProvider apiKey={configuration.google_maps_api_key}>
      <Map
        // The Maps API will not draw an advanced marker without a Map ID, and
        // an advanced marker is what a pin is now.
        mapId={configuration.google_maps_map_id}
        className={`${HEIGHT} w-full overflow-hidden rounded-lg`}
        {...NOT_THE_OWNER_S_TO_MOVE}
        // "the map is at zoom level 10. And the map is centered around the
        // first restaurant on my list" — where it opens, not where it stays.
        defaultCenter={view.centre}
        defaultZoom={view.zoom}
        {...(chosen === undefined ? {} : { center: pointOf(chosen) })}
      >
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
