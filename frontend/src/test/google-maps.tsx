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
  zoomControlOptions?: { position?: number };
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

interface MapControlProps {
  children?: ReactNode;
  position: number;
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

// Everything the camera can be told at once: where to look from and how close.
interface Camera {
  center: Point;
  zoom: number;
}

// The one method of the real map instance Shortlist calls. A camera move sets
// the centre and the zoom together, which is what every row of
// list-screen.states.md that moves the map asks for. Everything else about the
// camera is the owner's.
interface FakeMap {
  moveCamera: (camera: Camera) => void;
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

// data-center is where the map opened; data-moved-to is the whole camera, centre
// and zoom together, as moveCamera has set it since. The two are separate
// because the owner can now move the map between them, so a view the map was
// sent to has to be distinguishable from the one it opened at.
//
// data-camera-moves counts the instructions rather than holding one. Shortlist
// centres on the same restaurant twice when the owner chooses it twice, and the
// last value cannot tell that from never having been told again.
export function Map({ children, className, ...props }: MapProps) {
  const [movedTo, setMovedTo] = useState<Camera | undefined>();
  const [moves, setMoves] = useState(0);
  const instance = useMemo<FakeMap>(
    () => ({
      moveCamera: (camera: Camera) => {
        setMovedTo(camera);
        setMoves((counted) => counted + 1);
      },
    }),
    [],
  );

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
        data-moved-to={attribute(movedTo)}
        data-camera-moves={String(moves)}
        data-zoom={attribute(props.defaultZoom)}
        data-gesture-handling={props.gestureHandling}
        data-zoom-control={attribute(props.zoomControl)}
        data-zoom-control-position={attribute(props.zoomControlOptions?.position)}
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

// A marker Shortlist wired a click to is a button, so a test can click a pin
// the way an owner does. The real marker is clickable too; this is the handle
// on it.
//
// A marker with no click is not that. It is something on the map to look at
// rather than something to point at, so it renders as a plain element and keeps
// the "pin" handle meaning one restaurant.
export function AdvancedMarker({ children, position, title, onClick }: MarkerProps) {
  if (onClick === undefined) {
    return (
      <div data-testid="marker" data-title={title} data-position={attribute(position)}>
        {children}
      </div>
    );
  }

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

// The real export is a copy of google.maps.ControlPosition, duplicated in the
// library because the constants cannot be read before the Maps API has loaded.
// This is the one corner Shortlist puts anything in, at the value the real copy
// gives it, so a test can name the corner rather than the number.
export const ControlPosition = {
  RIGHT_CENTER: 8,
  RIGHT_BOTTOM: 9,
} as const;

// The real control is pushed into map.controls[position], which is Google's own
// chrome layer: it sits over the tiles, inside the map, and travels with it
// rather than with the page. There is no such layer under jsdom, so what this
// records is which corner Shortlist asked for.
export function MapControl({ children, position }: MapControlProps) {
  return (
    <div data-testid="map-control" data-position={String(position)}>
      {children}
    </div>
  );
}

// One handle for every pin, and the colour it was drawn in beside it.
//
// seeing-my-list-on-a-map.drawio draws markers in more than one colour and says
// what each means, so the colour is the thing a test has to be able to read.
// Nothing set is the standard Google pin — "Markers should be standard google
// pins" — and what a set background means is the wireframe's to say, not this
// stand-in's: it records the instruction and leaves the reading to the test.
export function Pin({ background, borderColor, glyphColor }: PinProps) {
  return (
    <span
      data-testid="google-pin"
      data-background={background}
      data-border-color={borderColor}
      data-glyph-color={glyphColor}
    />
  );
}
