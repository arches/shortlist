import { createContext, useContext, useMemo, useState } from "react";
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

interface Point {
  lat: number;
  lng: number;
}

// The handful of the real map instance's methods Shortlist calls. panTo is the
// whole of it: the selection scenarios are the only thing that moves the map,
// and everything else about the camera is the owner's now.
interface FakeMap {
  panTo: (point: Point) => void;
}

const MapInstance = createContext<FakeMap | null>(null);

// The real hook returns the map once it has loaded, to anything inside the
// provider. Null before then, which is why ListMap guards on it.
export function useMap(): FakeMap | null {
  return useContext(MapInstance);
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

// data-center is where the map opened; data-panned-to is where panTo has sent it
// since, which is what the selection scenarios turn on. The two are separate
// because the owner can now move the map between them, and a pan has to be
// distinguishable from the view it opened at.
export function Map({ children, className, ...props }: MapProps) {
  const [pannedTo, setPannedTo] = useState<Point | undefined>();
  const instance = useMemo<FakeMap>(() => ({ panTo: setPannedTo }), []);

  return (
    <MapInstance.Provider value={instance}>
      <div
        // The map is the one thing on the page an owner looks at rather than
        // reads, so it is named for anybody who cannot see it.
        role="application"
        aria-label="My list on a map"
        data-testid="map"
        className={className}
        data-map-id={props.mapId}
        data-center={attribute(props.defaultCenter)}
        data-panned-to={attribute(pannedTo)}
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
    </MapInstance.Provider>
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
