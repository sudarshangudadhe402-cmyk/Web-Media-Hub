import { useState, useMemo } from "react";
import { useListAdmins } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Calendar,
  Building2,
  CalendarDays,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { authFetch } from "@/lib/admin-api";

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isInDateRange(
  iso: string | null | undefined,
  start: Date | null,
  end: Date | null
): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (start && d < start) return false;
  if (end && d > end) return false;
  return true;
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

// ── date-range presets ───────────────────────────────────────────────────────

const DATE_PRESETS: { label: string; start: Date | null; end: Date | null }[] =
  [
    { label: "All Time", start: null, end: null },
    {
      label: "01 May - 31 May 2024",
      start: new Date("2024-05-01"),
      end: new Date("2024-05-31T23:59:59"),
    },
    {
      label: "01 Apr - 30 Apr 2024",
      start: new Date("2024-04-01"),
      end: new Date("2024-04-30T23:59:59"),
    },
    {
      label: "01 Jun - 30 Jun 2024",
      start: new Date("2024-06-01"),
      end: new Date("2024-06-30T23:59:59"),
    },
    (() => {
      const now = new Date();
      return {
        label: "This Month",
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: null,
      };
    })(),
    (() => {
      const now = new Date();
      const s = new Date(now);
      s.setMonth(s.getMonth() - 3);
      return { label: "Last 3 Months", start: s, end: null };
    })(),
  ];

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

// ── Google Maps iframe component ───────────────────────────────────────────────

function GoogleMapEmbed({ zoom }: { zoom: number }) {
  // Centered on India (lat 20.5937, lon 78.9629), terrain/roadmap style
  const src =
    `https://maps.google.com/maps?q=India&t=m&z=${zoom}` +
    `&ll=20.5937,78.9629&ie=UTF8&iwloc=&output=embed`;

  return (
    <div
      style={{
        height: 320,
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid #e5e7eb",
      }}
    >
      <iframe
        key={zoom}               /* remount on zoom change */
        src={src}
        width="100%"
        height="100%"
        style={{ border: 0, display: "block" }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="India Managers Map"
      />
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
  const { data: admins = [], isLoading } = useListAdmins();

  // Filters
  const [search, setSearch]           = useState("");
  const [locationFilter, setLocationFilter] = useState("All India");
  const [datePresetIdx, setDatePresetIdx]   = useState(0);
  const [mapDropdown, setMapDropdown]       = useState("Total Stores");
  const [mapZoom, setMapZoom]               = useState(4); // 4 = all-India view

  const datePreset = DATE_PRESETS[datePresetIdx];

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

  // Pending store requests (used as proxy for pending queries)
  const { data: storeRequests } = useQuery({
    queryKey: ["dashboard-store-requests"],
    queryFn: async () => {
      const res = await authFetch("/api/store-requests");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60_000,
  });

  // ── Derived stats from real API data ────────────────────────────────────────

  const adminsArr = admins as any[];

  // Date-range filtered set (applied to createdAt / storeCreatedAt)
  const dateFilteredAdmins = useMemo(
    () =>
      datePreset.start || datePreset.end
        ? adminsArr.filter((a) =>
            isInDateRange(
              a.storeCreatedAt ?? a.createdAt,
              datePreset.start,
              datePreset.end
            )
          )
        : adminsArr,
    [adminsArr, datePreset]
  );

  const totalStores   = dateFilteredAdmins.length;
  const activeStores  = dateFilteredAdmins.filter((a) => a.isActive !== false).length;
  const offlineStores = totalStores - activeStores;
  const newStoresToday = adminsArr.filter((a) =>
    isToday(a.storeCreatedAt ?? a.createdAt)
  ).length;

  const totalRenewals: number =
    revenueData?.renewalCount ?? revenueData?.total ?? 0;

  const pendingQueriesCount: number = Array.isArray(storeRequests)
    ? storeRequests.filter((r: any) => r.status === "pending").length
    : (storeRequests?.pending ?? 0);

  const activeRate  = totalStores > 0
    ? Math.round((activeStores  / totalStores) * 10000) / 100
    : 0;
  const offlineRate = totalStores > 0
    ? Math.round((offlineStores / totalStores) * 10000) / 100
    : 0;

  // ── Search + list filter ─────────────────────────────────────────────────

  const filteredAdmins = useMemo(() => {
    const q = search.trim().toLowerCase();
    return dateFilteredAdmins.filter(
      (a) =>
        !q ||
        (a.storeName   ?? "").toLowerCase().includes(q) ||
        (a.username    ?? "").toLowerCase().includes(q) ||
        (a.email       ?? "").toLowerCase().includes(q) ||
        (a.adminNumber ?? "").toLowerCase().includes(q)
    );
  }, [dateFilteredAdmins, search]);

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
      // Each admin account IS a store owner / manager
      value: isLoading ? "—" : totalStores.toLocaleString(),
      action: "View all", actionColor: "#7c3aed",
    },
    {
      icon: <Building2 className="w-5 h-5" style={{ color: "#0891b2" }} />,
      bg: "rgba(8,145,178,0.10)", border: "rgba(8,145,178,0.18)",
      label: "Total Cities",
      // City field not yet in listAdmins response; shows 0 until API updated
      value: isLoading ? "—" : "0",
      action: "View all", actionColor: "#0891b2",
    },
    {
      icon: <Store className="w-5 h-5" style={{ color: "#059669" }} />,
      bg: "rgba(5,150,105,0.10)", border: "rgba(5,150,105,0.18)",
      label: "Total Stores",
      value: isLoading ? "—" : totalStores.toLocaleString(),
      action: "View all", actionColor: "#059669",
    },
    {
      icon: <MessageSquare className="w-5 h-5" style={{ color: "#d97706" }} />,
      bg: "rgba(217,119,6,0.10)", border: "rgba(217,119,6,0.18)",
      label: "Pending Queries",
      value: isLoading ? "—" : pendingQueriesCount.toLocaleString(),
      action: "View all", actionColor: "#d97706",
    },
  ];

  const row2Stats = [
    {
      icon: <UserCheck className="w-5 h-5" style={{ color: "#059669" }} />,
      bg: "rgba(5,150,105,0.10)", border: "rgba(5,150,105,0.18)",
      label: "Active Managers",
      value: isLoading ? "—" : activeStores.toLocaleString(),
      badge: `${activeRate}%`, badgeColor: "#059669",
    },
    {
      icon: <UserX className="w-5 h-5" style={{ color: "#dc2626" }} />,
      bg: "rgba(220,38,38,0.10)", border: "rgba(220,38,38,0.18)",
      label: "Offline Managers",
      value: isLoading ? "—" : offlineStores.toLocaleString(),
      badge: `${offlineRate}%`, badgeColor: "#dc2626",
    },
    {
      icon: <TrendingUp className="w-5 h-5" style={{ color: "#0891b2" }} />,
      bg: "rgba(8,145,178,0.10)", border: "rgba(8,145,178,0.18)",
      label: "New Stores Today",
      value: isLoading ? "—" : newStoresToday.toLocaleString(),
      badge: newStoresToday > 0 ? `+${newStoresToday}` : null,
      badgeColor: "#059669",
    },
    {
      icon: <RefreshCw className="w-5 h-5" style={{ color: "#7c3aed" }} />,
      bg: "rgba(124,58,237,0.10)", border: "rgba(124,58,237,0.18)",
      label: "Total Renewals",
      value: isLoading ? "—" : totalRenewals.toLocaleString(),
      action: "View all", actionColor: "#7c3aed",
    },
  ];

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
            <DropdownMenuContent className="w-48">
              {["All India", "North India", "South India", "East India", "West India"].map((o) => (
                <DropdownMenuItem key={o} onClick={() => setLocationFilter(o)} className="text-sm">
                  {o}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Date range filter — applies to store created date */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex-1 flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium bg-white border"
                style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
              >
                <Calendar className="w-4 h-4 shrink-0" style={{ color: "#7c3aed" }} />
                <span className="flex-1 text-left text-gray-700 text-xs truncate">
                  {datePreset.label}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-52">
              {DATE_PRESETS.map((p, i) => (
                <DropdownMenuItem key={p.label} onClick={() => setDatePresetIdx(i)} className="text-xs">
                  {p.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ── Stats Row 1 ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {row1Stats.map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-2xl p-4 transition-transform duration-200 hover:scale-[1.02] cursor-default"
              style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: "1px solid #f0f0f5" }}
            >
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: s.bg, border: `1px solid ${s.border}` }}
              >
                {s.icon}
              </div>
              <p className="text-xs text-gray-500 font-medium leading-tight mb-1">{s.label}</p>
              <p className="text-2xl font-bold tracking-tight" style={{ color: "#1e1b4b" }}>
                {s.value}
              </p>
              {s.action && (
                <button
                  className="text-xs font-semibold mt-2 transition-opacity hover:opacity-70"
                  style={{ color: s.actionColor }}
                  onClick={() => handleComingSoon(s.label)}
                >
                  {s.action}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* ── Stats Row 2 ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {row2Stats.map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-2xl p-4 transition-transform duration-200 hover:scale-[1.02] cursor-default"
              style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: "1px solid #f0f0f5" }}
            >
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: s.bg, border: `1px solid ${s.border}` }}
              >
                {s.icon}
              </div>
              <p className="text-xs text-gray-500 font-medium leading-tight mb-1">{s.label}</p>
              <p className="text-2xl font-bold tracking-tight" style={{ color: "#1e1b4b" }}>
                {s.value}
              </p>
              {s.badge && (
                <p className="text-xs font-bold mt-1.5" style={{ color: s.badgeColor }}>
                  {s.badge}
                </p>
              )}
              {(s as any).action && (
                <button
                  className="text-xs font-semibold mt-2 transition-opacity hover:opacity-70"
                  style={{ color: (s as any).actionColor }}
                  onClick={() => handleComingSoon(s.label)}
                >
                  {(s as any).action}
                </button>
              )}
            </div>
          ))}
        </div>

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
          <div className="flex gap-2 px-4 pb-3">
            <div
              className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border"
              style={{ borderColor: "#e5e7eb", background: "#f9f9fc" }}
            >
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                placeholder="Search by name, city or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 text-sm bg-transparent outline-none text-gray-600 placeholder-gray-400"
              />
            </div>
            <button
              onClick={() => handleComingSoon("Add Manager")}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 hover:shadow-lg shrink-0"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #9333ea)",
                boxShadow: "0 4px 12px rgba(124,58,237,0.3)",
              }}
            >
              <Plus className="w-4 h-4" />
              Add Manager
            </button>
          </div>

          {/* Rows */}
          {isLoading ? (
            <div className="px-4 pb-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-xl animate-pulse"
                  style={{ background: "#f0f0f5" }}
                />
              ))}
            </div>
          ) : filteredAdmins.length === 0 ? (
            <div className="px-4 pb-6 pt-2 text-center">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-15" style={{ color: "#7c3aed" }} />
              <p className="text-sm font-medium text-gray-500">
                {search ? "No results found" : "No managers added yet"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {search ? "Try a different search term" : 'Click "Add Manager" to get started'}
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "#f0f0f5" }}>
              {filteredAdmins.slice(0, 10).map((admin: any, idx: number) => {
                const isActive   = admin.isActive !== false;
                const isOnline   = (admin.activeSessionCount ?? 0) > 0;
                const displayName = admin.storeName || admin.username || admin.email || "—";
                const subLabel    = admin.adminNumber ?? admin.email ?? "—";
                const initials    = displayName.substring(0, 2).toUpperCase();
                const hues        = ["#7c3aed", "#0891b2", "#059669", "#d97706", "#db2777"];
                const hue         = hues[idx % hues.length];
                const perf        = subscriptionHealth(admin);

                return (
                  <div
                    key={admin.id ?? idx}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors"
                  >
                    {/* Avatar */}
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{ background: `linear-gradient(135deg, ${hue}, ${hue}cc)` }}
                    >
                      {initials}
                    </div>

                    {/* Name + ID */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "#1e1b4b" }}>
                        {displayName}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{subLabel}</p>
                      {admin.planName && (
                        <span
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded mt-0.5 inline-block"
                          style={{
                            background: admin.planColor ? admin.planColor + "18" : "rgba(124,58,237,0.08)",
                            color: admin.planColor || "#7c3aed",
                          }}
                        >
                          {admin.planName}
                        </span>
                      )}
                    </div>

                    {/* Stores: 1 per admin (each admin owns exactly one store) */}
                    <div className="text-center shrink-0 hidden sm:block">
                      <p className="text-[10px] text-gray-400 font-medium">Stores</p>
                      <p className="text-base font-bold" style={{ color: "#1e1b4b" }}>1</p>
                    </div>

                    {/* Subscription health circle */}
                    <div className="shrink-0">
                      <CircularProgress
                        pct={perf}
                        color={isActive ? "#7c3aed" : "#dc2626"}
                      />
                    </div>

                    {/* Online / offline badge — uses activeSessionCount from API */}
                    <div
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0"
                      style={{
                        background: isOnline
                          ? "rgba(5,150,105,0.10)"
                          : "rgba(219,39,119,0.10)",
                        color:      isOnline ? "#059669" : "#db2777",
                        border: `1px solid ${isOnline ? "rgba(5,150,105,0.2)" : "rgba(219,39,119,0.2)"}`,
                      }}
                    >
                      {isOnline ? "Online" : "Offline"}
                    </div>

                    {/* 3-dot menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors shrink-0">
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem className="text-xs gap-2">
                          <Eye className="w-3.5 h-3.5" /> View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-xs gap-2">
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-xs gap-2">
                          <ArrowLeftRight className="w-3.5 h-3.5" /> Change Manager
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-xs gap-2 text-red-600 focus:text-red-600">
                          <UserMinus className="w-3.5 h-3.5" /> Disable
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
              {filteredAdmins.length > 10 && (
                <div className="px-4 py-3 text-center">
                  <p className="text-xs text-gray-400">
                    Showing 10 of {filteredAdmins.length} stores
                  </p>
                </div>
              )}
            </div>
          )}
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
                  onClick={() => handleComingSoon(action.label)}
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

        {/* ── All Stores (real data) ─────────────────────────────────────── */}
        {!isLoading && adminsArr.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Store className="w-4 h-4" style={{ color: "#7c3aed" }} />
              <h2 className="text-base font-bold" style={{ color: "#1e1b4b" }}>
                All Stores
              </h2>
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(124,58,237,0.10)", color: "#7c3aed" }}
              >
                {filteredAdmins.length}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredAdmins.slice(0, 12).map((admin: any) => {
                const isActive    = admin.isActive !== false;
                const displayName = admin.storeName || admin.email || "—";
                const planName    = admin.planName as string;
                const planColor   = admin.planColor as string;
                const endDate     = admin.subscriptionEndDate as string | null;
                return (
                  <div
                    key={admin.id}
                    className="bg-white rounded-2xl p-4 flex items-center gap-3 hover:shadow-md transition-all duration-200"
                    style={{ border: "1px solid #f0f0f5", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        background: isActive
                          ? "linear-gradient(135deg, #7c3aed, #a855f7)"
                          : "#d1d5db",
                        color: "white",
                      }}
                    >
                      {displayName.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold truncate">{displayName}</span>
                        {!isActive && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {planName && (
                          <span
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                            style={{
                              background: planColor ? planColor + "18" : "rgba(124,58,237,0.08)",
                              color: planColor || "#7c3aed",
                            }}
                          >
                            {planName}
                          </span>
                        )}
                        {endDate && (
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <CalendarDays className="w-2.5 h-2.5" />
                            {fmtDate(endDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredAdmins.length > 12 && (
              <p className="text-xs text-center text-gray-400 mt-3">
                Showing 12 of {filteredAdmins.length} stores
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
