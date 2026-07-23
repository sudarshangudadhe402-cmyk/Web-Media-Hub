import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Search, MapPin, Navigation, X, ChevronDown, Star, AlertCircle, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { IndiaMap, INDIA_CENTER, isIndiaCoordinate } from "@/components/india-map";

// ─── Inject pulse animation CSS once ─────────────────────────────────────────
if (typeof document !== "undefined" && !document.getElementById("fs-map-css")) {
  const s = document.createElement("style");
  s.id = "fs-map-css";
  s.textContent = `
    @keyframes fs-pulse { 0% { transform:scale(1); opacity:0.7; } 100% { transform:scale(2.8); opacity:0; } }
    .fs-pulse-ring { position:absolute; inset:0; border-radius:50%; background:rgba(59,130,246,0.45); animation:fs-pulse 2s ease-out infinite; }
    .fs-loc-dot { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:13px; height:13px; border-radius:50%; background:#3b82f6; border:2.5px solid white; box-shadow:0 0 0 2px rgba(59,130,246,0.4); }
  `;
  document.head.appendChild(s);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DiscoveredStore {
  id: string;
  name: string;
  publicSlug: string;
  bannerImage: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  category: string;
  storeType: string;
  distance: number | null;
  avgRating: number;
  reviewCount: number;
  isOpen: boolean;
}

interface DiscoverResponse {
  stores: DiscoveredStore[];
  total: number;
  hasMore: boolean;
}

// ─── Debounce hook ────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INDIA_ZOOM = 5;
const LOCAL_ZOOM = 13;

const RADIUS_OPTIONS = [1, 5, 10, 20] as const;
type Radius = (typeof RADIUS_OPTIONS)[number];

// ─── Star Rating display ──────────────────────────────────────────────────────

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <span className="flex items-center gap-1 text-sm">
      <Star className={`w-3.5 h-3.5 ${count === 0 ? "text-gray-300 fill-gray-300" : "fill-amber-400 text-amber-400"}`} />
      <span className={`font-semibold ${count === 0 ? "text-gray-400" : "text-gray-800"}`}>
        {count === 0 ? "0.0" : rating.toFixed(1)}
      </span>
      <span className="text-gray-400">({count})</span>
    </span>
  );
}

// ─── Store Card ───────────────────────────────────────────────────────────────

const StoreCard = React.memo(function StoreCard({
  store,
  onView,
}: {
  store: DiscoveredStore;
  onView: (slug: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-2xl shadow-sm border border-gray-100 px-3 py-2.5 hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
        {store.bannerImage ? (
          <img
            src={store.bannerImage}
            alt={store.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-50 to-purple-100">
            <svg
              className="w-7 h-7 text-violet-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.35 2.7A1 1 0 006.56 17H17m-7 0a2 2 0 100 4 2 2 0 000-4zm7 0a2 2 0 100 4 2 2 0 000-4z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {/* Row 1: Name + Distance */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">
            {store.name}
          </h3>
          {store.distance !== null && (
            <div className="flex items-center gap-0.5 text-xs text-violet-600 font-semibold flex-shrink-0">
              <span>
                {store.distance < 1
                  ? `${Math.round(store.distance * 1000)} m`
                  : `${store.distance} km`}
              </span>
              <MapPin className="w-3 h-3" />
            </div>
          )}
        </div>

        {/* Row 2: Store Type */}
        {store.storeType && (
          <p className="text-xs text-violet-600 font-medium mt-0.5 truncate">
            {store.storeType}
            {store.category && (
              <span className="text-gray-400 font-normal"> · {store.category}</span>
            )}
          </p>
        )}
        {!store.storeType && store.category && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">{store.category}</p>
        )}

        {/* Row 3: Rating + Open/Close + View Store */}
        <div className="flex items-center justify-between mt-1.5 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <StarRating rating={store.avgRating} count={store.reviewCount} />
            <span className={`inline-flex items-center gap-1 text-xs font-medium flex-shrink-0 ${store.isOpen ? "text-green-600" : "text-red-500"}`}>
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${store.isOpen ? "bg-green-500" : "bg-red-400"}`} />
              {store.isOpen ? "Open" : "Closed"}
            </span>
          </div>
          <button
            onClick={() => onView(store.publicSlug)}
            className="text-xs font-semibold text-violet-600 border border-violet-200 rounded-lg px-3 py-1 hover:bg-violet-50 active:bg-violet-100 transition-colors flex-shrink-0"
          >
            View Store
          </button>
        </div>
      </div>
    </div>
  );
});

// ─── More Categories Sheet ────────────────────────────────────────────────────

function MoreCategoriesSheet({
  categories,
  selected,
  onSelect,
  onClose,
}: {
  categories: string[];
  selected: string;
  onSelect: (c: string) => void;
  onClose: () => void;
}) {
  const [sheetSearch, setSheetSearch] = useState("");
  const filtered = sheetSearch.trim()
    ? categories.filter((c) =>
        c.toLowerCase().includes(sheetSearch.trim().toLowerCase())
      )
    : categories;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Sheet */}
      <div
        className="relative z-10 w-full max-w-lg bg-white rounded-t-3xl px-4 pt-4 pb-8 max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900 text-base">All Categories</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {categories.length > 6 && (
          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 bg-gray-50"
              placeholder="Search categories..."
              value={sheetSearch}
              onChange={(e) => setSheetSearch(e.target.value)}
            />
          </div>
        )}

        <div className="overflow-y-auto flex-1">
          {/* All Stores option */}
          <button
            key="all"
            onClick={() => { onSelect("all"); onClose(); }}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors mb-1 flex items-center justify-between ${
              selected === "all" || !selected
                ? "bg-violet-600 text-white"
                : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            All Stores
            {(selected === "all" || !selected) && (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
          {filtered.map((cat) => (
            <button
              key={cat}
              onClick={() => { onSelect(cat); onClose(); }}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors mb-1 flex items-center justify-between ${
                selected === cat
                  ? "bg-violet-600 text-white"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {cat}
              {selected === cat && (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              No categories found
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const VISIBLE_CATEGORY_COUNT = 3; // how many category chips to show before "More"

export default function FindStores() {
  const [, navigate] = useLocation();

  // Location state
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Filter state
  const [searchRaw, setSearchRaw] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [radius, setRadius] = useState<Radius>(5);
  const [page, setPage] = useState(1);

  // UI state
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [mapClickEnabled, setMapClickEnabled] = useState(false);

  // Data state
  const [categories, setCategories] = useState<string[]>([]);
  const [stores, setStores] = useState<DiscoveredStore[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true); // true so skeleton shows before first fetch completes
  const [fetchError, setFetchError] = useState<string | null>(null);

  // All stores in broad area — for map only (not filtered by selected radius)
  const [mapStores, setMapStores] = useState<DiscoveredStore[]>([]);
  const mapAbortRef = useRef<AbortController | null>(null);

  const search = useDebounce(searchRaw, 400);
  const abortRef = useRef<AbortController | null>(null);

  // ── Fetch categories on mount ────────────────────────────────────────────
  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/public/store-discovery-categories", { signal: ac.signal })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load categories");
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data.categories)) setCategories(data.categories);
      })
      .catch((err) => {
        if (err.name !== "AbortError") console.error("Could not load store categories:", err);
      });
    return () => ac.abort();
  }, []);

  // ── Request user location (two-attempt: high-accuracy → low-accuracy fallback) ──
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("tap-map"); // triggers map-click mode
      return;
    }
    setLocationLoading(true);
    setLocationError(null);
    setMapClickEnabled(false);

    // First attempt: high accuracy (GPS), 8 s timeout
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!isIndiaCoordinate(pos.coords.latitude, pos.coords.longitude)) {
          setLocationError("India locations only");
          setLocationLoading(false);
          return;
        }
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLoading(false);
        setMapClickEnabled(false);
      },
      () => {
        // High-accuracy failed → retry with low accuracy (network/IP-based), 6 s
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!isIndiaCoordinate(pos.coords.latitude, pos.coords.longitude)) {
              setLocationError("India locations only");
              setLocationLoading(false);
              return;
            }
            setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setLocationLoading(false);
            setMapClickEnabled(false);
          },
          (err) => {
            setLocationLoading(false);
            if (err.code === 1) {
              // Permission denied — can't retry, offer map-click
              setLocationError("tap-map");
              setMapClickEnabled(true);
            } else {
              // Position unavailable or timeout — offer map-click as fallback
              setLocationError("tap-map");
              setMapClickEnabled(true);
            }
          },
          { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }, []);

  /** Called when user taps the map to manually pin their location */
  const handleMapLocationPick = useCallback((lat: number, lng: number) => {
    setUserLocation({ lat, lng });
    setMapClickEnabled(false);
    setLocationError(null);
  }, []);

  // ── Fetch stores ─────────────────────────────────────────────────────────
  const fetchStores = useCallback(
    async (resetPage: boolean, pageOverride?: number) => {
      const currentPage = resetPage ? 1 : (pageOverride ?? page);
      if (resetPage) setPage(1);

      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      setLoading(true);
      setFetchError(null);

      try {
        const params = new URLSearchParams({
          radius: String(radius),
          category: selectedCategory === "all" ? "" : selectedCategory,
          search: search.trim(),
          page: String(currentPage),
          limit: "20",
        });
        if (userLocation) {
          params.set("lat", String(userLocation.lat));
          params.set("lng", String(userLocation.lng));
        }

        const res = await fetch(
          `/api/public/stores/discover?${params.toString()}`,
          { signal: abortRef.current.signal }
        );
        if (!res.ok) throw new Error("Failed to load stores");
        const data: DiscoverResponse = await res.json();

        if (resetPage || currentPage === 1) {
          setStores(data.stores);
        } else {
          setStores((prev) => [...prev, ...data.stores]);
        }
        setTotal(data.total);
        setHasMore(data.hasMore);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setFetchError("Failed to load stores. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    },
    [userLocation, radius, selectedCategory, search]
    // NOTE: `page` intentionally omitted — it is always passed explicitly via
    // resetPage=true (→ currentPage=1) or pageOverride, so a stale closure
    // value is never used.
  );

  // Re-fetch when filters change (always reset to page 1)
  // Cleanup aborts any in-flight request when the component unmounts or deps change
  useEffect(() => {
    fetchStores(true);
    return () => { abortRef.current?.abort(); };
  }, [userLocation, radius, selectedCategory, search, fetchStores]);

  // ── Fetch wide-area stores for map (radius=200, no category filter) ───────
  useEffect(() => {
    if (!userLocation) {
      setMapStores([]);
      return;
    }
    if (mapAbortRef.current) mapAbortRef.current.abort();
    mapAbortRef.current = new AbortController();
    const mapAc = mapAbortRef.current;

    const params = new URLSearchParams({
      lat: String(userLocation.lat),
      lng: String(userLocation.lng),
      radius: "99999",
      category: "",
      search: "",
      page: "1",
      limit: "500",
    });

    fetch(`/api/public/stores/discover?${params.toString()}`, {
      signal: mapAc.signal,
    })
      .then((r) => { if (!r.ok) throw new Error("map fetch failed"); return r.json(); })
      .then((data: DiscoverResponse) => { if (Array.isArray(data.stores)) setMapStores(data.stores); })
      .catch(() => {/* silently ignore map-only fetch errors */});

    return () => { mapAc.abort(); };
  }, [userLocation]);

  // Fetch next page — pass the next page explicitly to avoid stale state closure
  const loadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchStores(false, nextPage);
  }, [page, fetchStores]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const visibleCategories = categories.slice(0, VISIBLE_CATEGORY_COUNT);
  const hasMoreCategories = categories.length > VISIBLE_CATEGORY_COUNT;

  const mapCenter = useMemo<[number, number]>(() => {
    if (userLocation) return [userLocation.lng, userLocation.lat];
    const visibleStores = mapStores.length > 0 ? mapStores : stores;
    if (visibleStores.length > 0) {
      const avgLng = visibleStores.reduce((s, st) => s + st.longitude, 0) / visibleStores.length;
      const avgLat = visibleStores.reduce((s, st) => s + st.latitude, 0) / visibleStores.length;
      return [avgLng, avgLat];
    }
    return INDIA_CENTER;
  }, [userLocation, stores, mapStores]);

  const mapZoom = useMemo(() => {
    if (userLocation) return LOCAL_ZOOM;
    const visibleStores = mapStores.length > 0 ? mapStores : stores;
    if (visibleStores.length === 1) return 15;
    if (visibleStores.length > 1) return 10;
    return INDIA_ZOOM;
  }, [userLocation, stores, mapStores]);

  const handleViewStore = useCallback((slug: string) => {
    navigate(`/store/${slug}`);
  }, [navigate]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Full-width map with overlaid search + categories ─────────────── */}
      <div className="relative w-full h-64 sm:h-72">
        {/* Map fills the entire block */}
        <IndiaMap
          center={mapCenter}
          zoom={mapZoom}
          interactive={mapClickEnabled}
          onPick={handleMapLocationPick}
          onInvalidPick={() => setLocationError("India locations only")}
          userLocation={userLocation ? [userLocation.lat, userLocation.lng] : null}
          markers={(userLocation ? (mapStores.length > 0 ? mapStores : stores) : stores).map((store) => {
            const isNearby = userLocation
              ? store.distance !== null && store.distance <= radius
              : false;
            return {
              id: store.id,
              lat: store.latitude,
              lng: store.longitude,
              title: store.name,
              description: [
                store.category,
                store.distance !== null
                  ? store.distance < 1
                    ? `${Math.round(store.distance * 1000)} m away`
                    : `${store.distance} km away`
                  : null,
                store.isOpen ? "Open" : "Closed",
              ].filter(Boolean).join(" · "),
              color: isNearby ? "#16a34a" : "#7c3aed",
            };
          })}
          className="absolute inset-0 w-full h-full rounded-none"
        />

        {/* ── Overlaid controls ─────────────────────────────────────────── */}
        <div className="absolute inset-x-0 top-0 z-[500] pointer-events-none">
          <div className="px-3 pt-3 space-y-2 pointer-events-auto">

            {/* Row: search bar + My Location button */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search store, category, city..."
                  value={searchRaw}
                  onChange={(e) => setSearchRaw(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-sm rounded-2xl shadow-md bg-white/95 backdrop-blur-sm border-0 focus:outline-none focus:ring-2 focus:ring-violet-400 transition-all"
                />
                {searchRaw && (
                  <button
                    onClick={() => setSearchRaw("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={requestLocation}
                disabled={locationLoading}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/95 backdrop-blur-sm shadow-md text-violet-600 hover:bg-violet-50 active:bg-violet-100 transition-colors disabled:opacity-60 flex-shrink-0"
                title="My Location"
              >
                {locationLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Navigation className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Category chips row */}
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-colors ${
                  selectedCategory === "all"
                    ? "bg-violet-600 text-white"
                    : "bg-white/95 backdrop-blur-sm text-gray-700 hover:bg-white"
                }`}
              >
                All Stores
              </button>
              {visibleCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-colors ${
                    selectedCategory === cat
                      ? "bg-violet-600 text-white"
                      : "bg-white/95 backdrop-blur-sm text-gray-700 hover:bg-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
              {hasMoreCategories && (
                <button
                  onClick={() => setShowMoreSheet(true)}
                  className="flex-shrink-0 flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/95 backdrop-blur-sm text-gray-700 hover:bg-white shadow-sm transition-colors"
                >
                  More <ChevronDown className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Location error banner */}
            {locationError && (
              <div className="flex items-start gap-2 bg-amber-50/95 backdrop-blur-sm border border-amber-200 rounded-xl px-3 py-2.5 shadow-sm">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                {locationError === "tap-map" ? (
                  <div className="flex-1">
                    <p className="text-xs text-amber-700 leading-relaxed">
                      GPS nahi mila. Map par tap karke apni location set karein.
                    </p>
                    <button
                      onClick={() => setMapClickEnabled((v) => !v)}
                      className={`mt-1 text-xs font-bold underline ${mapClickEnabled ? "text-violet-700" : "text-amber-700"}`}
                    >
                      {mapClickEnabled ? "✓ Tap mode active" : "Tap map to set location →"}
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-amber-700 leading-relaxed">{locationError}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tap-to-set-location center hint */}
        {mapClickEnabled && (
          <div className="absolute inset-0 z-[499] pointer-events-none flex items-center justify-center">
            <div className="bg-violet-700/90 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg backdrop-blur-sm animate-pulse mt-24">
              📍 Map par tap karein — apni location set karein
            </div>
          </div>
        )}
      </div>

      {/* ── Stores section ─────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Section header + radius selector */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="font-bold text-gray-900 text-base flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-violet-500" />
              Stores Near You
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {loading && stores.length === 0 ? (
                "Loading..."
              ) : (
                <>
                  {total} store{total !== 1 ? "s" : ""} found
                  {userLocation ? ` within ${radius} km` : ""}
                </>
              )}
            </p>
          </div>

        </div>

        {/* Radius selector */}
        {userLocation && (
          <div className="flex items-center gap-1.5 mb-4">
            <span className="text-xs text-gray-500 font-medium mr-1">
              Show within:
            </span>
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRadius(r)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  radius === r
                    ? "bg-violet-600 text-white shadow-sm shadow-violet-200"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {r} km
              </button>
            ))}
          </div>
        )}

        {/* Error state */}
        {fetchError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{fetchError}</p>
            <button
              onClick={() => fetchStores(true)}
              className="ml-auto text-xs font-semibold text-red-600 underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && stores.length === 0 && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex gap-3 bg-white rounded-2xl border border-gray-100 p-3 animate-pulse"
              >
                <div className="w-20 h-20 bg-gray-100 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                  <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                  <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && stores.length === 0 && !fetchError && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-violet-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-7 h-7 text-violet-300" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">
              No stores found
            </h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">
              {userLocation
                ? `No stores found within ${radius} km. Try increasing the radius or changing your search.`
                : "Allow location access or search by name to discover stores near you."}
            </p>
            {!userLocation && (
              <button
                onClick={requestLocation}
                className="mt-4 px-5 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors inline-flex items-center gap-2"
              >
                <Navigation className="w-4 h-4" />
                Use My Location
              </button>
            )}
          </div>
        )}

        {/* Store cards */}
        {stores.length > 0 && (
          <div className="space-y-3">
            {stores.map((store) => (
              <StoreCard
                key={store.id}
                store={store}
                onView={handleViewStore}
              />
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && !loading && (
          <button
            onClick={loadMore}
            className="w-full mt-4 py-3 text-sm font-semibold text-violet-600 border border-violet-200 rounded-xl hover:bg-violet-50 transition-colors"
          >
            Load more stores
          </button>
        )}

        {/* Loading more indicator */}
        {loading && stores.length > 0 && (
          <div className="flex justify-center mt-4">
            <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
          </div>
        )}

      </div>

      {/* ── More categories bottom sheet ────────────────────────────────── */}
      {showMoreSheet && (
        <MoreCategoriesSheet
          categories={categories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
          onClose={() => setShowMoreSheet(false)}
        />
      )}
    </div>
  );
}
