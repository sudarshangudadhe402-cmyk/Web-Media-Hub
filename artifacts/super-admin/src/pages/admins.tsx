import { useState, useMemo } from "react";
import { useListAdmins } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  MapPin,
  Store,
  UserCheck,
  UserX,
  MessageSquare,
  TrendingUp,
  RefreshCw,
  Search,
  Plus,
  ArrowLeftRight,
  Radio,
  MoreVertical,
  Eye,
  Pencil,
  UserMinus,
  ChevronDown,
  Globe,
  Building2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { authFetch } from "@/lib/admin-api";
import { INDIA_LOCATIONS } from "@/lib/india-locations";

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

/** Subscription health as a 0–100 percentage */
function subscriptionHealth(admin: any): number {
  if (admin.isActive === false) return 0;
  const end = admin.subscriptionEndDate
    ? new Date(admin.subscriptionEndDate)
    : null;
  const start = admin.subscriptionStartDate
    ? new Date(admin.subscriptionStartDate)
    : null;
  const now = new Date();
  if (!end) return admin.isActive !== false ? 50 : 0;
  if (end < now) return 0;
  if (!start) return 80;
  const total = end.getTime() - start.getTime();
  const remaining = end.getTime() - now.getTime();
  return Math.max(5, Math.min(100, Math.round((remaining / total) * 100)));
}

// ── India states / UTs ────────────────────────────────────────────────────────

// ── Circular Progress ─────────────────────────────────────────────────────────

function CircularProgress({
  pct,
  color,
  size = 52,
}: {
  pct: number;
  color: string;
  size?: number;
}) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (Math.min(100, Math.max(0, pct)) / 100) * circ;
  return (
    <svg
      width={size}
      height={size}
      style={{ transform: "rotate(-90deg)", display: "block", flexShrink: 0 }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#f0f0f0"
        strokeWidth={5}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeLinecap="round"
      />
      <text
        x={size / 2}
        y={size / 2 + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#1e1b4b"
        fontSize={9}
        fontWeight="700"
        style={{
          transform: `rotate(90deg)`,
          transformOrigin: `${size / 2}px ${size / 2}px`,
        }}
      >
        {pct}%
      </text>
    </svg>
  );
}

// ── Map placeholder (map will be added later) ──────────────────────────────────

function GoogleMapEmbed({ zoom: _zoom }: { zoom: number }) {
  // Map placeholder — actual map will be added back later
  return (
    <div
      style={{
        height: 320,
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid #e5e7eb",
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

// ── Quick Actions ─────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { icon: Users,          label: "Add Manager",    color: "#7c3aed", bg: "rgba(124,58,237,0.10)" },
  { icon: ArrowLeftRight, label: "Change Manager", color: "#0891b2", bg: "rgba(8,145,178,0.10)"  },
  { icon: Store,          label: "Transfer Store", color: "#059669", bg: "rgba(5,150,105,0.10)"  },
  { icon: Building2,      label: "Add City",       color: "#d97706", bg: "rgba(217,119,6,0.10)"  },
  { icon: Radio,          label: "Send Broadcast", color: "#db2777", bg: "rgba(219,39,119,0.10)" },
];

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { toast } = useToast();
  const { data: admins = [], isLoading, isError } = useListAdmins();

  // Filters
  const [search, setSearch]           = useState("");
  const [locationFilter, setLocationFilter] = useState("All India");
  const [cityFilter, setCityFilter]         = useState("City");
  const [mapDropdown, setMapDropdown]       = useState("Total Stores");
  const [mapZoom, setMapZoom]               = useState(4); // 4 = all-India view
  const [, setLocation] = useLocation();

  // Cities — scoped to the selected state so the City filter only shows
  // cities that were actually added under that state.
  const { data: cities = [] } = useQuery({
    queryKey: ["cities", locationFilter],
    queryFn: async () => {
      const qs = locationFilter !== "All India" ? `?state=${encodeURIComponent(locationFilter)}` : "";
      const res = await authFetch(`/api/cities${qs}`);
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 30_000,
  });
  const citiesArr = cities as { id: string; name: string; state: string }[];

  // All cities (unfiltered) — used for the "Total Cities" stat card
  const { data: allCities = [] } = useQuery({
    queryKey: ["cities", "all"],
    queryFn: async () => {
      const res = await authFetch("/api/cities");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 30_000,
  });
  const totalCities = (allCities as any[]).length;

  // Store counts per registered city and state (computed from store addresses + lat/lng)
  const { data: storeCounts } = useQuery({
    queryKey: ["cities-store-counts"],
    queryFn: async () => {
      const res = await authFetch("/api/cities/store-counts");
      if (!res.ok) return { byCity: {}, byState: {}, totalCitiesWithStores: 0 };
      return res.json();
    },
    staleTime: 60_000,
  });
  const storeCountsByState: Record<string, number> = (storeCounts as any)?.byState ?? {};
  const storeCountsByCity:  Record<string, number> = (storeCounts as any)?.byCity  ?? {};

  // Marketing / revenue data for renewals
  const { data: revenueData } = useQuery({
    queryKey: ["dashboard-marketing-revenue"],
    queryFn: async () => {
      const res = await authFetch("/api/marketing/revenue");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60_000,
  });

  // Renewal count (number of renewals, not revenue amount)
  const { data: renewalsDetail } = useQuery({
    queryKey: ["dashboard-renewals-detail"],
    queryFn: async () => {
      const res = await authFetch("/api/marketing/renewals-detail");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60_000,
  });

  // ── Derived stats from real API data ────────────────────────────────────────

  const adminsArr = admins as any[];

  const totalStores   = adminsArr.length;
  const activeStores  = adminsArr.filter((a) => a.isActive !== false).length;
  const offlineStores = totalStores - activeStores;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

  const newStoresToday = adminsArr.filter((a) =>
    isToday(a.storeCreatedAt ?? a.createdAt)
  ).length;

  const newStoresThisMonth = adminsArr.filter((a) => {
    const d = new Date(a.storeCreatedAt ?? a.createdAt);
    return d >= monthStart;
  }).length;

  const totalRenewals: number =
    renewalsDetail?.totalRenewalCount ?? 0;

  const activeRate  = totalStores > 0
    ? Math.round((activeStores  / totalStores) * 10000) / 100
    : 0;
  const offlineRate = totalStores > 0
    ? Math.round((offlineStores / totalStores) * 10000) / 100
    : 0;

  // ── Search + list filter ─────────────────────────────────────────────────

  const filteredAdmins = useMemo(() => {
    const q = search.trim().toLowerCase();
    return adminsArr.filter(
      (a) =>
        !q ||
        (a.storeName   ?? "").toLowerCase().includes(q) ||
        (a.username    ?? "").toLowerCase().includes(q) ||
        (a.email       ?? "").toLowerCase().includes(q) ||
        (a.adminNumber ?? "").toLowerCase().includes(q)
    );
  }, [adminsArr, search]);

  function handleComingSoon(label: string) {
    toast({
      title: `${label} — Coming Soon`,
      description: "This feature is under development.",
    });
  }

  // ── Stat card data ────────────────────────────────────────────────────────

  const row1Stats = [
    {
      icon: <Users className="w-5 h-5" style={{ color: "#7c3aed" }} />,
      bg: "rgba(124,58,237,0.10)", border: "rgba(124,58,237,0.18)",
      label: "Total Managers",
      // Managers are a separate concept from store-owner admins; not built yet
      value: "0",
      action: "View all", actionColor: "#7c3aed",
    },
    {
      icon: <Building2 className="w-5 h-5" style={{ color: "#0891b2" }} />,
      bg: "rgba(8,145,178,0.10)", border: "rgba(8,145,178,0.18)",
      label: "Total Cities",
      value: isLoading ? "—" : totalCities.toLocaleString(),
      action: "View all", actionColor: "#0891b2",
      onAction: () => setLocation("/cities"),
    },
    {
      icon: <Store className="w-5 h-5" style={{ color: "#059669" }} />,
      bg: "rgba(5,150,105,0.10)", border: "rgba(5,150,105,0.18)",
      label: "Total Stores",
      value: isLoading ? "—" : totalStores.toLocaleString(),
      action: "View all", actionColor: "#059669",
      onAction: () => setLocation("/stores"),
    },
    {
      icon: <MessageSquare className="w-5 h-5" style={{ color: "#d97706" }} />,
      bg: "rgba(217,119,6,0.10)", border: "rgba(217,119,6,0.18)",
      label: "Pending Queries",
      value: "0",
      action: "View all", actionColor: "#d97706",
    },
  ];

  const row2Stats = [
    {
      icon: <UserCheck className="w-5 h-5" style={{ color: "#059669" }} />,
      bg: "rgba(5,150,105,0.10)", border: "rgba(5,150,105,0.18)",
      label: "Online Managers",
      // Manager online/offline tracking not built yet
      value: "0",
      badge: "0%", badgeColor: "#059669",
    },
    {
      icon: <UserX className="w-5 h-5" style={{ color: "#dc2626" }} />,
      bg: "rgba(220,38,38,0.10)", border: "rgba(220,38,38,0.18)",
      label: "Offline Managers",
      value: "0",
      badge: "0%", badgeColor: "#dc2626",
    },
    {
      icon: <TrendingUp className="w-5 h-5" style={{ color: "#0891b2" }} />,
      bg: "rgba(8,145,178,0.10)", border: "rgba(8,145,178,0.18)",
      label: "New Store This Month",
      value: isLoading ? "—" : newStoresThisMonth.toLocaleString(),
      subValue: isLoading ? "—" : newStoresToday.toLocaleString(),
      subLabel: "Today",
      subColor: "#059669",
    },
    {
      icon: <RefreshCw className="w-5 h-5" style={{ color: "#7c3aed" }} />,
      bg: "rgba(124,58,237,0.10)", border: "rgba(124,58,237,0.18)",
      label: "Total Renewals",
      value: isLoading ? "—" : totalRenewals.toLocaleString(),
      action: "View all", actionColor: "#7c3aed",
      onAction: () => setLocation("/renewals"),
    },
  ];

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f8f8fc" }}>
        <div className="text-center space-y-3">
          <Users className="w-12 h-12 mx-auto opacity-20" style={{ color: "#dc2626" }} />
          <p className="text-sm font-medium text-gray-500">Failed to load dashboard data</p>
          <p className="text-xs text-gray-400">Check your connection and refresh the page</p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs font-semibold px-4 py-2 rounded-xl text-white"
            style={{ background: "#7c3aed" }}
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-8"
      style={{ background: "#f8f8fc", fontFamily: "'Inter', sans-serif" }}
    >
      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">

        {/* ── Filter Row ─────────────────────────────────────────────────── */}
        <div className="flex gap-3">
          {/* Location / region filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex-1 flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium bg-white border"
                style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
              >
                <Globe className="w-4 h-4 shrink-0" style={{ color: "#7c3aed" }} />
                <span className="flex-1 text-left text-gray-700 truncate">{locationFilter}</span>
                <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 max-h-72 overflow-y-auto">
              {INDIA_LOCATIONS.map((o) => {
                const cnt = o === "All India"
                  ? adminsArr.length
                  : (storeCountsByState[o] ?? 0);
                return (
                  <DropdownMenuItem
                    key={o}
                    onClick={() => {
                      setLocationFilter(o);
                      setCityFilter("City");
                    }}
                    className="text-sm flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{o}</span>
                    {cnt > 0 && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ background: "rgba(124,58,237,0.10)", color: "#7c3aed" }}
                      >
                        {cnt}
                      </span>
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* City filter — cities added under the selected state via "Add City" */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex-1 flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium bg-white border"
                style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
              >
                <Building2 className="w-4 h-4 shrink-0" style={{ color: "#7c3aed" }} />
                <span className="flex-1 text-left text-gray-700 text-xs truncate">
                  {cityFilter}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 max-h-72 overflow-y-auto">
              {citiesArr.length === 0 ? (
                <div className="px-2 py-3 text-xs text-gray-400 text-center">
                  {locationFilter === "All India"
                    ? "No cities added yet"
                    : `No cities added under ${locationFilter} yet`}
                </div>
              ) : (
                citiesArr.map((c) => {
                  const cnt = storeCountsByCity[c.id] ?? 0;
                  return (
                    <DropdownMenuItem
                      key={c.id}
                      onClick={() => setCityFilter(c.name)}
                      className="text-sm flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{c.name}</span>
                      {cnt > 0 && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                          style={{ background: "rgba(124,58,237,0.10)", color: "#7c3aed" }}
                        >
                          {cnt}
                        </span>
                      )}
                    </DropdownMenuItem>
                  );
                })
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ── Stats Grid: 4 col × 2 row compact cards ────────────────────── */}
        {[row1Stats, row2Stats].map((row, ri) => (
          <div key={ri} className="grid grid-cols-4 gap-2">
            {row.map((s) => (
              <div
                key={s.label}
                className="bg-white rounded-xl p-2.5 flex flex-col cursor-default hover:shadow-md transition-shadow duration-200"
                style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.06)", border: "1px solid #f0f0f5" }}
              >
                {/* Icon */}
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center mb-2 shrink-0"
                  style={{ background: s.bg }}
                >
                  {/* re-render icon smaller */}
                  <span className="[&_svg]:w-4 [&_svg]:h-4">{s.icon}</span>
                </div>
                {/* Label */}
                <p
                  className="leading-tight font-medium text-gray-500 mb-0.5"
                  style={{ fontSize: 9 }}
                >
                  {s.label}
                </p>
                {/* Value */}
                <p className="font-bold text-base leading-tight" style={{ color: "#1e1b4b" }}>
                  {s.value}
                </p>
                {/* Badge (%) */}
                {"badge" in s && s.badge && (
                  <p className="font-bold mt-0.5" style={{ fontSize: 10, color: (s as any).badgeColor }}>
                    {s.badge}
                  </p>
                )}
                {/* Sub value — compact inline, no extra height */}
                {"subValue" in s && (s as any).subValue !== undefined && (
                  <p className="mt-0.5 leading-tight" style={{ fontSize: 9, color: "#9ca3af" }}>
                    <span style={{ color: (s as any).subColor ?? "#059669", fontWeight: 700 }}>
                      {(s as any).subValue}
                    </span>
                    {" "}{(s as any).subLabel}
                  </p>
                )}
                {/* Action link */}
                {"action" in s && s.action && (
                  <button
                    className="font-semibold mt-0.5 text-left transition-opacity hover:opacity-70"
                    style={{ fontSize: 10, color: (s as any).actionColor }}
                    onClick={() =>
                      (s as any).onAction ? (s as any).onAction() : handleComingSoon(s.label)
                    }
                  >
                    {s.action}
                  </button>
                )}
              </div>
            ))}
          </div>
        ))}

        {/* ── Managers / Stores Overview ──────────────────────────────────── */}
        <div
          className="bg-white rounded-2xl overflow-hidden"
          style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: "1px solid #f0f0f5" }}
        >
          {/* Section header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <h2 className="text-base font-bold" style={{ color: "#1e1b4b" }}>
              Managers Overview
            </h2>
            <button
              className="text-sm font-semibold"
              style={{ color: "#7c3aed" }}
              onClick={() => handleComingSoon("View All Managers")}
            >
              View All
            </button>
          </div>

          {/* Search + Add Manager */}
          <div className="flex gap-1.5 px-4 pb-3">
            <div
              className="flex-1 min-w-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border"
              style={{ borderColor: "#e5e7eb", background: "#f9f9fc" }}
            >
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input
                placeholder="Search by name, city or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 min-w-0 text-xs bg-transparent outline-none text-gray-600 placeholder-gray-400"
              />
            </div>
            <button
              onClick={() => handleComingSoon("Add Manager")}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-all duration-200 hover:opacity-90 hover:shadow-lg shrink-0 whitespace-nowrap"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #9333ea)",
                boxShadow: "0 4px 12px rgba(124,58,237,0.3)",
              }}
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              Add Manager
            </button>
          </div>

          {/* Rows — managers are a separate feature from store-owner admins, coming later */}
          <div className="px-4 pb-6 pt-2 text-center">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-15" style={{ color: "#7c3aed" }} />
            <p className="text-sm font-medium text-gray-500">No managers added yet</p>
            <p className="text-xs text-gray-400 mt-1">Click "Add Manager" to get started</p>
          </div>
        </div>

        {/* ── India Map Card ──────────────────────────────────────────────── */}
        <div
          className="bg-white rounded-2xl overflow-hidden"
          style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: "1px solid #f0f0f5" }}
        >
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" style={{ color: "#7c3aed" }} />
              <h2 className="text-base font-bold" style={{ color: "#1e1b4b" }}>
                India - Managers Map
              </h2>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors">
                  {mapDropdown} <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {["Total Stores", "Active Stores", "Total Managers", "Pending Queries"].map((o) => (
                  <DropdownMenuItem key={o} onClick={() => setMapDropdown(o)} className="text-sm">
                    {o}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="relative px-4 pb-4">
            <GoogleMapEmbed zoom={mapZoom} />
            <div className="absolute right-7 bottom-8 flex flex-col gap-1" style={{ zIndex: 10 }}>
              <button
                className="w-8 h-8 rounded-xl flex items-center justify-center bg-white shadow-md border hover:bg-gray-50 transition-colors"
                style={{ borderColor: "#e5e7eb" }}
                onClick={() => setMapZoom((z) => Math.min(z + 1, 10))}
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4 text-gray-600" />
              </button>
              <button
                className="w-8 h-8 rounded-xl flex items-center justify-center bg-white shadow-md border hover:bg-gray-50 transition-colors"
                style={{ borderColor: "#e5e7eb" }}
                onClick={() => setMapZoom((z) => Math.max(z - 1, 3))}
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Quick Actions ───────────────────────────────────────────────── */}
        <div>
          <h2 className="text-base font-bold mb-3" style={{ color: "#1e1b4b" }}>
            Quick Actions
          </h2>
          <div className="grid grid-cols-5 gap-2">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={() =>
                    action.label === "Add City" ? setLocation("/add-city") : handleComingSoon(action.label)
                  }
                  className="group flex flex-col items-center gap-2 py-4 rounded-2xl bg-white border transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
                  style={{ borderColor: "#f0f0f5", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}
                >
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                    style={{ background: action.bg }}
                  >
                    <Icon className="w-5 h-5" style={{ color: action.color }} />
                  </div>
                  <span
                    className="text-[10px] font-semibold text-center leading-tight px-1"
                    style={{ color: "#374151" }}
                  >
                    {action.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
