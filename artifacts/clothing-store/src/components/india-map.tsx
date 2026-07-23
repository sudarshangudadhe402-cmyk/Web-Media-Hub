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
  return {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        minzoom: 4,
        maxzoom: 18,
        attribution: "© OpenStreetMap contributors",
      },
    },
    layers: [{
      id: "osm",
      type: "raster",
      source: "osm",
      paint: {
        "raster-fade-duration": 0,
        "raster-opacity": 1,
      },
    }],
  } as maplibregl.StyleSpecification;
}

function addIndiaMask(map: Map) {
  if (map.getSource("india-mask")) return;
  const outer: [number, number][] = [
    [60, 45], [105, 45], [105, 3], [60, 3], [60, 45],
  ];
  map.addSource("india-mask", {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [outer, [...INDIA_BOUNDARY, INDIA_BOUNDARY[0]].reverse()] },
    },
  });
  map.addLayer({
    id: "india-outside-mask",
    type: "fill",
    source: "india-mask",
    paint: { "fill-color": "#f8fafc", "fill-opacity": 0.94 },
  });
  map.addSource("india-boundary", {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [[...INDIA_BOUNDARY, INDIA_BOUNDARY[0]]] },
    },
  });
  map.addLayer({
    id: "india-boundary-line",
    type: "line",
    source: "india-boundary",
    paint: { "line-color": "#7c3aed", "line-width": 2, "line-opacity": 0.85 },
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
  const markerRefs = useRef<Marker[]>([]);
  const popupRefs = useRef<Popup[]>([]);
  const [useLeafletFallback, setUseLeafletFallback] = useState(false);

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
      cooperativeGestures: true,
      fadeDuration: 0,
      renderWorldCopies: false,
    });
    mapRef.current = map;
    if (showNavigation) map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
    map.on("load", () => addIndiaMask(map));
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
      zoomControl: showNavigation,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
    }).setView([center[1], center[0]], zoom);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
      updateWhenZooming: false,
      updateWhenIdle: true,
      updateInterval: 100,
      keepBuffer: 4,
    }).addTo(map);
    const outerRing: [number, number][] = [
      [3, 60], [3, 105], [45, 105], [45, 60], [3, 60],
    ];
    L.polygon(
      [outerRing, INDIA_BOUNDARY.map(([lng, lat]) => [lat, lng] as [number, number]).reverse()],
      { stroke: false, fillColor: "#f8fafc", fillOpacity: 0.94 },
    ).addTo(map);
    L.polygon(
      INDIA_BOUNDARY.map(([lng, lat]) => [lat, lng] as [number, number]),
      { color: "#7c3aed", weight: 2, fill: false },
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
    fallbackMapRef.current = map;
    return () => {
      fallbackMarkerRefs.current.forEach((marker) => marker.remove());
      fallbackMarkerRefs.current = [];
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
        const marker = L.circleMarker([item.lat, item.lng], {
          radius: item.id === "user-location" ? 7 : 8,
          color: "#fff",
          weight: 2,
          fillColor: item.color ?? "#7c3aed",
          fillOpacity: 1,
        }).addTo(fallbackMap);
        if (item.title || item.description) {
          marker.bindPopup(
            `<strong>${escapeHtml(item.title ?? "")}</strong>${item.description ? `<br/><span>${escapeHtml(item.description)}</span>` : ""}`,
          );
        }
        fallbackMarkerRefs.current.push(marker);
        return;
      }
      const element = document.createElement("div");
      element.style.cssText = `width:18px;height:18px;border-radius:50%;background:${item.color ?? "#7c3aed"};border:3px solid white;box-shadow:0 1px 7px rgba(0,0,0,.4);`;
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

  return <div ref={containerRef} className={`overflow-hidden rounded-xl ${className}`} aria-label="India map" />;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] ?? char);
}
