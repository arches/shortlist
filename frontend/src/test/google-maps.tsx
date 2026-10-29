import type { ReactNode } from "react";

// The Google Maps JS API cannot run under jsdom: it loads a script, draws into
// a canvas, and needs a real browser and a real key to do either. So the
// library is stood in for across the whole suite, and what these elements
// record is the instruction ListMap gave it — which restaurants became pins,
// where they sit, and what the map was told it may not do.
//
// shortlist.stack.md leaves End-to-end tests TBD, and this is the hole that
// leaves: nothing here proves Google drew anything. What it proves is that
// Shortlist asked for the right thing.

interface MapProps {
  children?: ReactNode;
  mapId?: string;
  defaultBounds?: { north: number; south: number; east: number; west: number };
  defaultCenter?: { lat: number; lng: number };
  defaultZoom?: number;
  gestureHandling?: string;
  zoomControl?: boolean;
  scrollwheel?: boolean;
  disableDefaultUI?: boolean;
  disableDoubleClickZoom?: boolean;
  keyboardShortcuts?: boolean;
  className?: string;
}

interface MarkerProps {
  children?: ReactNode;
  position: { lat: number; lng: number };
  title?: string;
}

function attribute(value: unknown): string | undefined {
  return value === undefined ? undefined : JSON.stringify(value);
}

export function APIProvider({ children, apiKey }: { children?: ReactNode; apiKey: string }) {
  return (
    <div data-testid="maps-api" data-api-key={apiKey}>
      {children}
    </div>
  );
}

export function Map({ children, className, ...props }: MapProps) {
  return (
    <div
      // The map is the one thing on the page an owner looks at rather than
      // reads, so it is named for anybody who cannot see it.
      role="application"
      aria-label="My list on a map"
      data-testid="map"
      className={className}
      data-map-id={props.mapId}
      data-bounds={attribute(props.defaultBounds)}
      data-center={attribute(props.defaultCenter)}
      data-zoom={attribute(props.defaultZoom)}
      data-gesture-handling={props.gestureHandling}
      data-zoom-control={attribute(props.zoomControl)}
      data-scrollwheel={attribute(props.scrollwheel)}
      data-default-ui-disabled={attribute(props.disableDefaultUI)}
      data-double-click-zoom-disabled={attribute(props.disableDoubleClickZoom)}
      data-keyboard-shortcuts={attribute(props.keyboardShortcuts)}
    >
      {children}
    </div>
  );
}

export function AdvancedMarker({ children, position, title }: MarkerProps) {
  return (
    <div data-testid="pin" data-title={title} data-position={attribute(position)}>
      {children}
    </div>
  );
}

export function Pin() {
  return <span data-testid="standard-google-pin" />;
}
