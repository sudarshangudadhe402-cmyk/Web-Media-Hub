import { useEffect, useRef, useState } from "react";
import maplibregl, { type Map, type Marker, type Popup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export const INDIA_CENTER: [number, number] = [78.9629, 20.5937];
export const INDIA_BOUNDS: [[number, number], [number, number]] = [
  [68.1, 6.5],
  [97.5, 37.2],
];

// A simplified India outline used for click validation and masking. The map
// tiles remain provider-agnostic; this boundary is part of our domain layer.
const INDIA_BOUNDARY: [number, number][] = [
  [77.837451, 35.49401], [78.912269, 34.321936], [79.176129, 32.48378],
  [81.111256, 30.183481], [80.476721, 29.729865], [81.057203, 28.416095],
  [83.304249, 27.364506], [85.251779, 26.726198], [87.227472, 26.397898],
  [88.174804, 26.810405], [88.730326, 28.086865], [89.744528, 26.719403],
  [91.217513, 26.808648], [92.103712, 27.452614], [91.696657, 27.771742],
  [93.413348, 28.640629], [95.404802, 29.031717], [96.117679, 29.452802],
  [96.586591, 28.83098], [96.248833, 28.411031], [97.327114, 28.261583],
  [97.051989, 27.699059], [97.133999, 27.083774], [96.419366, 27.264589],
  [95.124768, 26.573572], [94.603249, 25.162495], [94.106742, 23.850741],
  [93.325188, 24.078556], [93.286327, 23.043658], [93.166128, 22.27846],
  [92.146035, 23.627499], [91.869928, 23.624346], [91.158963, 23.503527],
  [91.46773, 24.072639], [92.376202, 24.976693], [91.799596, 25.147601],
  [89.920693, 25.26975], [89.355094, 26.014407], [88.563049, 26.446526],
  [88.209789, 25.768066], [88.931554, 25.238692], [88.306373, 24.866079],
  [88.084422, 24.501657], [88.69994, 24.233715], [88.52977, 23.631142],
  [88.876312, 22.879146], [88.888766, 21.690588], [88.208497, 21.703172],
  [86.975704, 21.495562], [87.033169, 20.743308], [85.060266, 19.478579],
  [83.189217, 17.671221], [82.192792, 17.016636], [81.692719, 16.310219],
  [80.791999, 15.951972], [80.025069, 15.136415], [80.233274, 13.835771],
  [80.286294, 13.006261], [79.862547, 12.056215], [79.857999, 10.357275],
  [79.340512, 10.308854], [78.885345, 9.546136], [79.18972, 9.216544],
  [78.277941, 8.933047], [77.539898, 7.965535], [76.592979, 8.899276],
  [76.130061, 10.29963], [75.396101, 11.781245], [74.616717, 13.992583],
  [74.443859, 14.617222], [73.534199, 15.990652], [73.119909, 17.92857],
  [72.820909, 19.208234], [72.824475, 20.419503], [72.630533, 21.356009],
  [71.175273, 20.757441], [70.470459, 20.877331], [69.16413, 22.089298],
  [69.644928, 22.450775], [68.176645, 23.691965], [68.842599, 24.359134],
  [71.04324, 24.356524], [70.844699, 25.215102], [70.282873, 25.722229],
  [70.168927, 26.491872], [69.514393, 26.940966], [70.616496, 27.989196],
  [71.777666, 27.91318], [72.823752, 28.961592], [73.450638, 29.976413],
  [74.42138, 30.979815], [74.405929, 31.692639], [75.258642, 32.271105],
  [74.451559, 32.7649], [74.104294, 33.441473], [73.749948, 34.317699],
  [74.240203, 34.748887], [75.757061, 34.504923], [76.871722, 34.653544],
];

function pointInIndia(lng: number, lat: number) {
  let inside = false;
  for (let i = 0, j = INDIA_BOUNDARY.length - 1; i < INDIA_BOUNDARY.length; j = i++) {
    const [xi, yi] = INDIA_BOUNDARY[i];
    const [xj, yj] = INDIA_BOUNDARY[j];
    const intersects = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function isIndiaCoordinate(lat: number, lng: number) {
  return lat >= INDIA_BOUNDS[0][1] && lat <= INDIA_BOUNDS[1][1] &&
    lng >= INDIA_BOUNDS[0][0] && lng <= INDIA_BOUNDS[1][0] && pointInIndia(lng, lat);
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
  /** MapLibre order: [longitude, latitude]. Store/user domain data remains lat/lng. */
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

function getStyle() {
  const key = import.meta.env.VITE_MAPTILER_API_KEY as string | undefined;
  if (key) return `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(key)}`;
  // OpenFreeMap bright: vivid road colours, green parks, blue water — closest to Google Maps feel
  return "https://tiles.openfreemap.org/styles/bright";
}

function addIndiaMask(map: Map) {
  if (map.getSource("india-mask")) return;
  // GeoJSON spec: exterior ring must be CCW (counterclockwise), holes must be CW.
  // INDIA_BOUNDARY traverses clockwise (NW Kashmir → east coast south → west coast north → back),
  // so it is already CW → valid hole without reversing.
  // Outer ring: SW→SE→NE→NW = counterclockwise.
  const outer: [number, number][] = [
    [55, -5], [115, -5], [115, 50], [55, 50], [55, -5],
  ];
  map.addSource("india-mask", {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [outer, [...INDIA_BOUNDARY, INDIA_BOUNDARY[0]]] },
    },
  });
  map.addLayer({
    id: "india-outside-mask",
    type: "fill",
    source: "india-mask",
    // Keep nearby city labels readable. A nearly opaque mask cuts raster
    // labels at the simplified boundary, especially around border cities.
    // Keep the boundary for orientation without washing out nearby labels.
    // OSM labels are baked into raster tiles, so any opaque fill here hides
    // part of names that cross the simplified India outline.
    paint: { "fill-color": "#ffffff", "fill-opacity": 1 },
  });
  map.addSource("india-boundary", {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [[...INDIA_BOUNDARY, INDIA_BOUNDARY[0]]] },
    },
  });
  // Dotted circles: dasharray [0, gap] with round cap turns every "dash"
  // into a perfect circle — no jagged corners at sharp boundary turns.
  map.addLayer({
    id: "india-boundary-line",
    type: "line",
    source: "india-boundary",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#7c3aed",
      "line-width": 4,
      "line-opacity": 0.9,
      "line-dasharray": [0, 1.6],
    },
  });
}

export function IndiaMap({
  center = INDIA_CENTER,
  zoom = 5,
  markers = [],
  userLocation = null,
  interactive = true,
  onPick,
  onInvalidPick,
  className = "h-72 w-full",
  showNavigation = true,
}: IndiaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const fallbackMapRef = useRef<L.Map | null>(null);
  const fallbackMarkerRefs = useRef<L.Layer[]>([]);
  const fallbackBuildingLayer = useRef<L.GeoJSON | null>(null);
  const fallbackLanduseLayer = useRef<L.GeoJSON | null>(null);
  const fallbackPoiLayer = useRef<L.LayerGroup | null>(null);
  const buildingFetchController = useRef<AbortController | null>(null);
  const landuseFetchController = useRef<AbortController | null>(null);
  const poiFetchController = useRef<AbortController | null>(null);
  const overpassDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markerRefs = useRef<Marker[]>([]);
  const popupRefs = useRef<Popup[]>([]);
  const [useLeafletFallback, setUseLeafletFallback] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(5);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    // MapLibre needs WebGL. Replit's preview browser can disable WebGL, so
    // keep the same India-only behavior with the existing OSM Leaflet stack.
    let canvas: HTMLCanvasElement | null = null;
    try {
      canvas = document.createElement("canvas");
      if (!canvas.getContext("webgl") && !canvas.getContext("experimental-webgl")) {
        setUseLeafletFallback(true);
        return;
      }
    } catch {
      setUseLeafletFallback(true);
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getStyle(),
      center,
      zoom,
      maxBounds: INDIA_BOUNDS,
      minZoom: 4,
      maxZoom: 18,
      cooperativeGestures: false,
      fadeDuration: 0,
      renderWorldCopies: false,
    });
    mapRef.current = map;
    if (showNavigation) map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-left");
    map.on("load", () => addIndiaMask(map));
    map.on("zoom", () => setCurrentZoom(Math.round(map.getZoom())));
    map.on("click", (event) => {
      if (!interactive || !onPick) return;
      const { lat, lng } = event.lngLat;
      if (isIndiaCoordinate(lat, lng)) onPick(lat, lng);
      else onInvalidPick?.();
    });
    return () => {
      markerRefs.current.forEach((marker) => marker.remove());
      popupRefs.current.forEach((popup) => popup.remove());
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!useLeafletFallback || !containerRef.current || fallbackMapRef.current) return;
    const map = L.map(containerRef.current, {
      maxBounds: [
        [INDIA_BOUNDS[0][1], INDIA_BOUNDS[0][0]],
        [INDIA_BOUNDS[1][1], INDIA_BOUNDS[1][0]],
      ],
      maxBoundsViscosity: 1,
      minZoom: 4,
      maxZoom: 18,
      zoomControl: false,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
    }).setView([center[1], center[0]], zoom);
    if (showNavigation) L.control.zoom({ position: "bottomleft" }).addTo(map);
    map.on("zoomend", () => setCurrentZoom(Math.round(map.getZoom())));
    // OpenStreetMap standard: maximum free detail — building outlines, parks,
    // water, POI icons, residential/commercial colour zones, village labels.
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      subdomains: ["a", "b", "c"],
      maxZoom: 19,
      updateWhenZooming: true,
      updateWhenIdle: false,
      updateInterval: 0,
      keepBuffer: 8,
    }).addTo(map);
    const outerRing: [number, number][] = [
      [-5, 55], [50, 55], [50, 115], [-5, 115], [-5, 55],
    ];
    L.polygon(
      [outerRing, INDIA_BOUNDARY.map(([lng, lat]) => [lat, lng] as [number, number]).reverse()],
      { stroke: false, fillColor: "#ffffff", fillOpacity: 1 },
    ).addTo(map);
    // dashArray "1 10" + lineCap round = circular dots along the border.
    // Round caps mean every dot is a perfect circle regardless of turn angle.
    L.polyline(
      [...INDIA_BOUNDARY, INDIA_BOUNDARY[0]].map(([lng, lat]) => [lat, lng] as [number, number]),
      { color: "#7c3aed", weight: 4, fill: false, dashArray: "1 10", lineCap: "round", lineJoin: "round", opacity: 0.9 },
    ).addTo(map);
    if (interactive && onPick) {
      map.on("click", (event) => {
        if (isIndiaCoordinate(event.latlng.lat, event.latlng.lng)) {
          onPick(event.latlng.lat, event.latlng.lng);
        } else {
          onInvalidPick?.();
        }
      });
    }

    // ── Overpass fetch with automatic server fallback ────────────────────────
    const OVERPASS_SERVERS = [
      "https://overpass-api.de/api/interpreter",
      "https://overpass.kumi.systems/api/interpreter",
      "https://overpass.openstreetmap.ru/api/interpreter",
    ];
    async function overpassFetch(query: string, signal: AbortSignal): Promise<unknown> {
      for (const server of OVERPASS_SERVERS) {
        if (signal.aborted) throw new DOMException("Aborted", "AbortError");
        try {
          const res = await fetch(`${server}?data=${encodeURIComponent(query)}`, { signal });
          if (res.ok) return res.json();
        } catch {
          // try next server
        }
      }
      throw new Error("All Overpass servers failed");
    }

    type OsmElement = { type: string; geometry?: Array<{ lat: number; lon: number }>; tags?: Record<string, string>; lat?: number; lon?: number };

    // ── Building type → fill colour (Google/Apple Maps palette) ─────────────
    function buildingColor(tags: Record<string, string>): string {
      const b = tags.building ?? "";
      const am = tags.amenity ?? "";
      if (["church", "cathedral", "mosque", "temple", "shrine", "religious", "place_of_worship"].includes(b) || am === "place_of_worship") return "#f5e6c8";
      if (["school", "university", "college", "kindergarten"].includes(b) || ["school", "university", "college"].includes(am)) return "#d4edda";
      if (["commercial", "retail", "supermarket", "mall", "shop"].includes(b) || ["marketplace"].includes(am)) return "#cce5ff";
      if (["industrial", "warehouse", "factory"].includes(b)) return "#e2d9f3";
      if (["hospital", "clinic", "healthcare"].includes(b) || ["hospital", "clinic", "doctors", "pharmacy"].includes(am)) return "#f8d7da";
      if (["government", "civic", "public"].includes(b)) return "#fff3cd";
      if (["hotel", "dormitory"].includes(b) || ["hotel"].includes(am)) return "#ffe5b4";
      if (b === "garage" || b === "garages") return "#e0e0e0";
      return "#ddd5c8"; // residential / generic
    }

    // ── Landuse / natural / leisure → colours ────────────────────────────────
    function landuseColor(tags: Record<string, string>): { fill: string; stroke: string } {
      const lu = tags.landuse ?? ""; const le = tags.leisure ?? "";
      const nat = tags.natural ?? ""; const am = tags.amenity ?? "";
      if (nat === "water" || nat === "wetland" || lu === "reservoir" || lu === "basin") return { fill: "#aad3df", stroke: "#7ab5cc" };
      if (nat === "beach" || nat === "sand") return { fill: "#fef9c3", stroke: "#e5d77a" };
      if (["wood", "scrub", "tree_row"].includes(nat) || lu === "forest") return { fill: "#add19e", stroke: "#8ab88a" };
      if (["park", "garden", "playground", "nature_reserve"].includes(le) || ["park", "grass", "recreation_ground", "village_green", "meadow", "orchard", "allotments"].includes(lu)) return { fill: "#c8e6c9", stroke: "#81c784" };
      if (lu === "farmland" || lu === "farmyard" || nat === "scrub") return { fill: "#eef0d5", stroke: "#c5c98a" };
      if (lu === "residential") return { fill: "#f2ede9", stroke: "#e0d8d0" };
      if (["commercial", "retail"].includes(lu)) return { fill: "#f4e4e4", stroke: "#e0c8c8" };
      if (lu === "industrial") return { fill: "#e8e0f0", stroke: "#ccc0e0" };
      if (["school", "university", "college"].includes(am)) return { fill: "#d4edda", stroke: "#a3cfb3" };
      if (am === "hospital") return { fill: "#fde8ec", stroke: "#f0a0b0" };
      if (am === "place_of_worship") return { fill: "#fdf3e3", stroke: "#e0c080" };
      if (["sports_centre", "pitch", "track", "swimming_pool"].includes(le)) return { fill: "#b5d9b5", stroke: "#80b880" };
      if (lu === "cemetery" || am === "grave_yard") return { fill: "#d9e8cc", stroke: "#aac0a0" };
      return { fill: "#e8e4de", stroke: "#ccc" };
    }

    // ── POI icon & colour ─────────────────────────────────────────────────────
    function poiMeta(tags: Record<string, string>): { emoji: string; bg: string } {
      const am = tags.amenity ?? ""; const sh = tags.shop ?? "";
      const to = tags.tourism ?? ""; const le = tags.leisure ?? "";
      const na = tags.natural ?? ""; const hw = tags.highway ?? "";
      if (am === "restaurant" || am === "food_court") return { emoji: "🍽️", bg: "#fff3e0" };
      if (am === "cafe") return { emoji: "☕", bg: "#fbe9e7" };
      if (am === "fast_food") return { emoji: "🍔", bg: "#fff8e1" };
      if (am === "hospital" || am === "clinic" || am === "doctors") return { emoji: "🏥", bg: "#fce4ec" };
      if (am === "pharmacy") return { emoji: "💊", bg: "#e8f5e9" };
      if (am === "school" || am === "kindergarten") return { emoji: "🏫", bg: "#e8f5e9" };
      if (am === "university" || am === "college") return { emoji: "🎓", bg: "#e3f2fd" };
      if (am === "place_of_worship") {
        const rel = tags.religion ?? "";
        if (rel === "muslim") return { emoji: "🕌", bg: "#f3e5f5" };
        if (rel === "sikh") return { emoji: "⛪", bg: "#fff3e0" };
        return { emoji: "🛕", bg: "#fff8e1" };
      }
      if (am === "bank" || am === "atm") return { emoji: "🏦", bg: "#e3f2fd" };
      if (am === "fuel") return { emoji: "⛽", bg: "#fff9c4" };
      if (am === "police") return { emoji: "👮", bg: "#e8eaf6" };
      if (am === "post_office") return { emoji: "📮", bg: "#fce4ec" };
      if (am === "bus_station" || hw === "bus_stop") return { emoji: "🚌", bg: "#e0f7fa" };
      if (am === "marketplace") return { emoji: "🏪", bg: "#fff3e0" };
      if (sh === "supermarket" || sh === "mall") return { emoji: "🛒", bg: "#e8f5e9" };
      if (sh === "clothes" || sh === "fashion") return { emoji: "👗", bg: "#fce4ec" };
      if (sh) return { emoji: "🛍️", bg: "#fff3e0" };
      if (to === "hotel" || to === "guest_house") return { emoji: "🏨", bg: "#e3f2fd" };
      if (to === "museum") return { emoji: "🏛️", bg: "#f3e5f5" };
      if (to === "attraction" || to === "viewpoint") return { emoji: "📸", bg: "#fff8e1" };
      if (le === "park" || na === "park") return { emoji: "🌳", bg: "#e8f5e9" };
      if (le === "playground") return { emoji: "🎠", bg: "#e8f5e9" };
      if (le === "sports_centre" || le === "pitch") return { emoji: "⚽", bg: "#e8f5e9" };
      return { emoji: "📍", bg: "#f5f5f5" };
    }

    // ── Layer loaders ─────────────────────────────────────────────────────────
    async function loadLanduse() {
      const z = map.getZoom();
      if (z < 11) {
        if (fallbackLanduseLayer.current) { map.removeLayer(fallbackLanduseLayer.current); fallbackLanduseLayer.current = null; }
        return;
      }
      landuseFetchController.current?.abort();
      const ctrl = new AbortController(); landuseFetchController.current = ctrl;
      try {
        const b = map.getBounds();
        const bbox = `${b.getSouth().toFixed(4)},${b.getWest().toFixed(4)},${b.getNorth().toFixed(4)},${b.getEast().toFixed(4)}`;
        const query = `[out:json][timeout:25];(
          way[landuse](${bbox});way[leisure~"^(park|garden|playground|sports_centre|pitch|track|swimming_pool|nature_reserve)$"](${bbox});
          way[natural~"^(wood|scrub|water|wetland|beach|sand|tree_row)$"](${bbox});
          way[amenity~"^(school|hospital|university|college|place_of_worship|grave_yard|marketplace)$"](${bbox});
          relation[natural="water"](${bbox});
        );out geom qt;`;
        const data = await overpassFetch(query, ctrl.signal) as { elements: OsmElement[] };
        if (ctrl.signal.aborted) return;
        const features: GeoJSON.Feature[] = data.elements
          .filter(el => el.type === "way" && el.geometry && el.geometry.length > 2)
          .map(el => ({
            type: "Feature" as const,
            properties: { tags: el.tags ?? {} },
            geometry: { type: "Polygon" as const, coordinates: [el.geometry!.map(({ lat, lon }) => [lon, lat])] },
          }));
        if (fallbackLanduseLayer.current) map.removeLayer(fallbackLanduseLayer.current);
        fallbackLanduseLayer.current = L.geoJSON({ type: "FeatureCollection", features }, {
          style: (f) => { const { fill, stroke } = landuseColor((f?.properties?.tags ?? {}) as Record<string, string>); return { color: stroke, weight: 1, fillColor: fill, fillOpacity: 0.6 }; },
        }).addTo(map);
        if (fallbackBuildingLayer.current) fallbackBuildingLayer.current.bringToFront();
      } catch { /* aborted / network */ }
    }

    async function loadBuildings() {
      const z = map.getZoom();
      if (z < 13) {
        if (fallbackBuildingLayer.current) { map.removeLayer(fallbackBuildingLayer.current); fallbackBuildingLayer.current = null; }
        return;
      }
      buildingFetchController.current?.abort();
      const ctrl = new AbortController(); buildingFetchController.current = ctrl;
      try {
        const b = map.getBounds();
        const bbox = `${b.getSouth().toFixed(4)},${b.getWest().toFixed(4)},${b.getNorth().toFixed(4)},${b.getEast().toFixed(4)}`;
        const query = `[out:json][timeout:25];(way[building](${bbox}););out geom qt;`;
        const data = await overpassFetch(query, ctrl.signal) as { elements: OsmElement[] };
        if (ctrl.signal.aborted) return;
        const features: GeoJSON.Feature[] = data.elements
          .filter(el => el.type === "way" && el.geometry && el.geometry.length > 2)
          .map(el => ({
            type: "Feature" as const,
            properties: { tags: el.tags ?? {} },
            geometry: { type: "Polygon" as const, coordinates: [el.geometry!.map(({ lat, lon }) => [lon, lat])] },
          }));
        if (fallbackBuildingLayer.current) map.removeLayer(fallbackBuildingLayer.current);
        fallbackBuildingLayer.current = L.geoJSON({ type: "FeatureCollection", features }, {
          style: (f) => {
            const tags = (f?.properties?.tags ?? {}) as Record<string, string>;
            return { color: "#8a7a6a", weight: 0.8, fillColor: buildingColor(tags), fillOpacity: 0.88 };
          },
        }).addTo(map);
        if (fallbackPoiLayer.current) fallbackPoiLayer.current.bringToFront();
      } catch { /* aborted / network */ }
    }

    async function loadPOIs() {
      const z = map.getZoom();
      if (z < 14) {
        if (fallbackPoiLayer.current) { map.removeLayer(fallbackPoiLayer.current); fallbackPoiLayer.current = null; }
        return;
      }
      poiFetchController.current?.abort();
      const ctrl = new AbortController(); poiFetchController.current = ctrl;
      try {
        const b = map.getBounds();
        const bbox = `${b.getSouth().toFixed(4)},${b.getWest().toFixed(4)},${b.getNorth().toFixed(4)},${b.getEast().toFixed(4)}`;
        const query = `[out:json][timeout:25];(
          node[amenity~"^(restaurant|cafe|fast_food|hospital|clinic|doctors|pharmacy|school|university|college|kindergarten|place_of_worship|bank|atm|fuel|police|post_office|bus_station|marketplace|grave_yard)$"](${bbox});
          node[shop~"^(supermarket|mall|clothes|fashion|grocery|bakery|electronics)$"](${bbox});
          node[tourism~"^(hotel|guest_house|museum|attraction|viewpoint)$"](${bbox});
          node[leisure~"^(park|playground|sports_centre)$"](${bbox});
          node[highway="bus_stop"](${bbox});
        );out body qt;`;
        const data = await overpassFetch(query, ctrl.signal) as { elements: OsmElement[] };
        if (ctrl.signal.aborted) return;
        const group = L.layerGroup();
        data.elements
          .filter(el => el.type === "node" && el.lat != null && el.lon != null)
          .slice(0, 300) // cap at 300 POIs to avoid DOM overload
          .forEach(el => {
            const tags = el.tags ?? {};
            const name = tags.name ?? tags["name:en"] ?? "";
            const { emoji, bg } = poiMeta(tags);
            const icon = L.divIcon({
              html: `<div style="background:${bg};border:1.5px solid rgba(0,0,0,0.18);border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:12px;box-shadow:0 1px 4px rgba(0,0,0,0.25);line-height:1;">${emoji}</div>`,
              iconSize: [22, 22], iconAnchor: [11, 11], className: "",
            });
            const marker = L.marker([el.lat!, el.lon!], { icon }).addTo(group);
            if (name) marker.bindTooltip(name, { permanent: false, direction: "top", offset: [0, -12], className: "leaflet-poi-tooltip" });
          });
        if (fallbackPoiLayer.current) map.removeLayer(fallbackPoiLayer.current);
        fallbackPoiLayer.current = group;
        group.addTo(map);
      } catch { /* aborted / network */ }
    }

    // Debounced refresh — fires all three loaders after 350 ms idle
    function scheduleRefresh() {
      if (overpassDebounce.current) clearTimeout(overpassDebounce.current);
      overpassDebounce.current = setTimeout(() => {
        void loadLanduse();
        void loadBuildings();
        void loadPOIs();
      }, 350);
    }

    map.on("moveend", scheduleRefresh);
    map.on("zoomend", scheduleRefresh);
    // Initial load
    setTimeout(scheduleRefresh, 500);

    // Add tooltip CSS once
    if (!document.getElementById("leaflet-poi-tooltip-css")) {
      const s = document.createElement("style");
      s.id = "leaflet-poi-tooltip-css";
      s.textContent = `.leaflet-poi-tooltip{background:rgba(30,30,30,0.85);color:#fff;border:none;border-radius:6px;font-size:11px;padding:3px 7px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3)}.leaflet-poi-tooltip::before{display:none}`;
      document.head.appendChild(s);
    }

    fallbackMapRef.current = map;
    return () => {
      if (overpassDebounce.current) clearTimeout(overpassDebounce.current);
      buildingFetchController.current?.abort();
      landuseFetchController.current?.abort();
      poiFetchController.current?.abort();
      fallbackMarkerRefs.current.forEach((marker) => marker.remove());
      fallbackMarkerRefs.current = [];
      if (fallbackBuildingLayer.current) { map.removeLayer(fallbackBuildingLayer.current); fallbackBuildingLayer.current = null; }
      if (fallbackLanduseLayer.current) { map.removeLayer(fallbackLanduseLayer.current); fallbackLanduseLayer.current = null; }
      if (fallbackPoiLayer.current) { map.removeLayer(fallbackPoiLayer.current); fallbackPoiLayer.current = null; }
      map.remove();
      fallbackMapRef.current = null;
    };
  }, [useLeafletFallback]);

  useEffect(() => {
    const map = mapRef.current;
    if (map) {
      map.setCenter(center);
      map.setZoom(zoom);
      return;
    }
    const fallbackMap = fallbackMapRef.current;
    if (fallbackMap) fallbackMap.setView([center[1], center[0]], zoom);
  }, [center[0], center[1], zoom]);

  useEffect(() => {
    const map = mapRef.current;
    const fallbackMap = fallbackMapRef.current;
    if (!map && !fallbackMap) return;
    markerRefs.current.forEach((marker) => marker.remove());
    popupRefs.current.forEach((popup) => popup.remove());
    fallbackMarkerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = [];
    popupRefs.current = [];
    fallbackMarkerRefs.current = [];
    const allMarkers = [
      ...markers,
      ...(userLocation ? [{ id: "user-location", lat: userLocation[0], lng: userLocation[1], title: "Your location", color: "#2563eb" }] : []),
    ];
    allMarkers.forEach((item) => {
      if (fallbackMap) {
        // Use a divIcon with teardrop SVG so Leaflet fallback matches MapLibre pins
        const pinColor = (item.color ?? "#7c3aed").replace("#", "%23");
        const isUser = item.id === "user-location";
        const iconHtml = isUser
          ? `<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 3px rgba(59,130,246,0.35);"></div>`
          : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 28 36"><path d="M14 0C6.268 0 0 6.268 0 14c0 9.5 14 22 14 22S28 23.5 28 14C28 6.268 21.732 0 14 0z" fill="${pinColor}"/><circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/></svg>`;
        const icon = L.divIcon({
          html: iconHtml,
          iconSize: isUser ? [16, 16] : [24, 32],
          iconAnchor: isUser ? [8, 8] : [12, 32],
          className: "",
        });
        const marker = L.marker([item.lat, item.lng], { icon }).addTo(fallbackMap);
        if (item.title || item.description) {
          marker.bindPopup(
            `<strong>${escapeHtml(item.title ?? "")}</strong>${item.description ? `<br/><span>${escapeHtml(item.description)}</span>` : ""}`,
          );
        }
        fallbackMarkerRefs.current.push(marker);
        return;
      }
      const element = document.createElement("div");
      // Teardrop SVG pin — same look as Google Maps / Apple Maps
      const pinColor = encodeURIComponent(item.color ?? "#7c3aed");
      element.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36"><path d="M14 0C6.268 0 0 6.268 0 14c0 9.5 14 22 14 22S28 23.5 28 14C28 6.268 21.732 0 14 0z" fill="${pinColor}"/><circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/></svg>`;
      element.style.cssText = "width:28px;height:36px;cursor:pointer;transform:translate(-50%,-100%);filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));";
      if (!map) return;
      const marker = new maplibregl.Marker({ element }).setLngLat([item.lng, item.lat]).addTo(map);
      if (item.title || item.description) {
        const popup = new maplibregl.Popup({ offset: 18, closeButton: true }).setHTML(
          `<strong>${escapeHtml(item.title ?? "")}</strong>${item.description ? `<br/><span>${escapeHtml(item.description)}</span>` : ""}`,
        );
        marker.setPopup(popup);
        popupRefs.current.push(popup);
      }
      markerRefs.current.push(marker);
    });
  }, [markers, userLocation, useLeafletFallback]);

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`} aria-label="India map">
      <div ref={containerRef} className="absolute inset-0" />
      {/* Zoom-in hint — disappears once buildings are visible (zoom ≥ 13) */}
      {currentZoom < 13 && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-[600] pointer-events-none">
          <div className="flex items-center gap-1.5 bg-black/70 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm whitespace-nowrap">
            <span>🔍</span>
            <span>Zoom in to see buildings, shops &amp; POIs</span>
          </div>
        </div>
      )}
    </div>
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] ?? char);
}
