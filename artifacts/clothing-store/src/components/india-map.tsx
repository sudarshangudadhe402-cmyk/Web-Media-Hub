// Map libraries removed — will be added back later.
// All map display spots show a black placeholder with "India" text.
// Business logic exports (INDIA_CENTER, INDIA_BOUNDS, isIndiaCoordinate) are preserved.

export const INDIA_CENTER: [number, number] = [78.9629, 20.5937];
export const INDIA_BOUNDS: [[number, number], [number, number]] = [
  [68.1, 6.5],
  [97.5, 37.2],
];

export function isIndiaCoordinate(lat: number, lng: number) {
  return (
    lat >= INDIA_BOUNDS[0][1] &&
    lat <= INDIA_BOUNDS[1][1] &&
    lng >= INDIA_BOUNDS[0][0] &&
    lng <= INDIA_BOUNDS[1][0]
  );
}

export interface IndiaMapMarker {
  id: string;
  lat: number;
  lng: number;
  title?: string;
  description?: string;
  color?: string;
}

interface IndiaMapProps {
  center?: [number, number];
  zoom?: number;
  markers?: IndiaMapMarker[];
  userLocation?: [number, number] | null;
  interactive?: boolean;
  onPick?: (lat: number, lng: number) => void;
  onInvalidPick?: () => void;
  className?: string;
  showNavigation?: boolean;
}

export function IndiaMap({ className = "h-72 w-full" }: IndiaMapProps) {
  return (
    <div
      className={className}
      style={{
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span style={{ color: "#fff", fontSize: "1.5rem", fontWeight: 600, letterSpacing: 2 }}>
        India
      </span>
    </div>
  );
}
