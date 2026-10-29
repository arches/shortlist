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
  defaultCenter?: { lat: number; lng: number };
  defaultZoom?: number;
  center?: { lat: number; lng: number };
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
  onClick?: () => void;
}

interface PinProps {
  background?: string;
  borderColor?: string;
  glyphColor?: string;
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

// data-center is where the map opened; data-panned-to is where it has been sent
// since, which is what the selection scenarios turn on.
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
      data-center={attribute(props.defaultCenter)}
      data-panned-to={attribute(props.center)}
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

// A button, so a test can click a pin the way an owner does. The real marker is
// clickable too; this is the handle on it.
export function AdvancedMarker({ children, position, title, onClick }: MarkerProps) {
  return (
    <button
      type="button"
      aria-label={title}
      data-testid="pin"
      data-title={title}
      data-position={attribute(position)}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// Nothing set is the standard Google pin. A background set is the highlight,
// which is what "Highlight is color-based" in the wireframe comes to.
export function Pin({ background, borderColor, glyphColor }: PinProps) {
  return (
    <span
      data-testid={background === undefined ? "standard-google-pin" : "highlighted-google-pin"}
      data-background={background}
      data-border-color={borderColor}
      data-glyph-color={glyphColor}
    />
  );
}
