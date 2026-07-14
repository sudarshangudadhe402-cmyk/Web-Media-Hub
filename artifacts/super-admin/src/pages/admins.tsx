import { useState, useMemo } from "react";
import { useListAdmins } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Bell,
  Filter,
  Plus,
  ArrowLeftRight,
  Radio,
  Map,
  MoreVertical,
  Eye,
  Pencil,
  UserMinus,
  ChevronRight,
  Activity,
  Star,
  LayoutGrid,
  CalendarDays,
  Zap,
} from "lucide-react";
import { authFetch } from "@/lib/admin-api";

// ── helpers ──────────────────────────────────────────────────────────────────

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

// ── constants ─────────────────────────────────────────────────────────────────

const INDIA_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
  "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
  "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu & Kashmir",
];

const QUICK_ACTIONS = [
  { icon: Plus,          label: "Add Manager",     color: "#7c3aed", bg: "rgba(124,58,237,0.10)" },
  { icon: ArrowLeftRight,label: "Change Manager",  color: "#0891b2", bg: "rgba(8,145,178,0.10)"  },
  { icon: Store,         label: "Transfer Store",  color: "#059669", bg: "rgba(5,150,105,0.10)"  },
  { icon: MapPin,        label: "Add City",        color: "#d97706", bg: "rgba(217,119,6,0.10)"  },
  { icon: Radio,         label: "Send Broadcast",  color: "#db2777", bg: "rgba(219,39,119,0.10)" },
];

// ── main component ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { toast } = useToast();
  const { data: admins = [], isLoading } = useListAdmins();

  // Filters
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("All States");
  const [cityFilter, setCityFilter] = useState("All Cities");
  const [subCityFilter, setSubCityFilter] = useState("All Sub-Cities");
  const [dateFilter, setDateFilter] = useState("This Month");

  // Map drill-down
  const [mapLevel, setMapLevel] = useState<"india" | "state" | "city">("india");
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  // Revenue data for renewals
  const { data: revenueData } = useQuery({
    queryKey: ["dashboard-revenue"],
    queryFn: async () => {
      const res = await authFetch("/api/revenue/summary");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60_000,
  });

  // ── derived stats from real admin data ──────────────────────────────────────
  const totalStores = (admins as any[]).length;
  const newStoresToday = (admins as any[]).filter((a) =>
    isToday(a.storeCreatedAt ?? a.createdAt)
  ).length;
  const activeStores = (admins as any[]).filter((a) => a.isActive !== false).length;

  const totalRenewals = revenueData?.renewalCount ?? 0;

  const stats = [
    { icon: Users,        label: "Total Managers",  value: 0,              color: "#7c3aed", bg: "rgba(124,58,237,0.10)", trend: null },
    { icon: MapPin,       label: "Total Cities",    value: 0,              color: "#0891b2", bg: "rgba(8,145,178,0.10)",  trend: null },
    { icon: Map,          label: "Total Sub-Cities",value: 0,              color: "#0d9488", bg: "rgba(13,148,136,0.10)", trend: null },
    { icon: Store,        label: "Total Stores",    value: totalStores,    color: "#7c3aed", bg: "rgba(124,58,237,0.10)", trend: "+2" },
    { icon: UserCheck,    label: "Active Managers", value: 0,              color: "#059669", bg: "rgba(5,150,105,0.10)",  trend: null },
    { icon: UserX,        label: "Offline Managers",value: 0,              color: "#dc2626", bg: "rgba(220,38,38,0.10)",  trend: null },
    { icon: MessageSquare,label: "Pending Queries", value: 0,              color: "#d97706", bg: "rgba(217,119,6,0.10)",  trend: null },
    { icon: TrendingUp,   label: "New Stores Today",value: newStoresToday, color: "#db2777", bg: "rgba(219,39,119,0.10)", trend: newStoresToday > 0 ? `+${newStoresToday}` : null },
    { icon: RefreshCw,    label: "Total Renewals",  value: totalRenewals,  color: "#7c3aed", bg: "rgba(124,58,237,0.10)", trend: null },
  ];

  // ── mock manager rows for the table (empty until backend ready) ──────────
  const managerRows: any[] = [];

  // ── mock recent activities ────────────────────────────────────────────────
  const activities: Array<{ icon: any; label: string; time: string; color: string }> = [];

  // ── mock pending queries ──────────────────────────────────────────────────
  const pendingQueries: any[] = [];

  // ── mock city report ──────────────────────────────────────────────────────
  const cityReport: any[] = [];

  // ── map breadcrumb label ──────────────────────────────────────────────────
  const mapBreadcrumb =
    mapLevel === "india"
      ? "India"
      : mapLevel === "state"
      ? selectedState ?? "State"
      : `${selectedCity ?? "City"} — ${selectedState}`;

  function handleComingSoon(label: string) {
    toast({ title: `${label} — Coming Soon`, description: "This feature is under development." });
  }

  return (
    <div className="space-y-6 pb-16">

      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {/* Title row */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#1e1b4b" }}>
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {fmtDate(new Date().toISOString())} · Super Admin View
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105"
              style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)" }}
              onClick={() => handleComingSoon("Notifications")}
            >
              <Bell className="w-4 h-4" style={{ color: "#7c3aed" }} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border border-white" />
            </button>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold"
              style={{ background: "rgba(124,58,237,0.12)", color: "#7c3aed", border: "1px solid rgba(124,58,237,0.2)" }}
            >
              SA
            </div>
          </div>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search managers, stores..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>

          {/* Date filter */}
          {(["This Month", "Last Month", "Last 3 Months", "This Year"] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setDateFilter(opt)}
              className="h-9 px-3 rounded-lg text-xs font-medium transition-all border"
              style={{
                background: dateFilter === opt ? "rgba(124,58,237,0.10)" : "transparent",
                borderColor: dateFilter === opt ? "rgba(124,58,237,0.4)" : "hsl(var(--border))",
                color: dateFilter === opt ? "#7c3aed" : "hsl(var(--muted-foreground))",
              }}
            >
              {opt}
            </button>
          ))}

          {/* State / City / Sub-City dropdowns */}
          {[
            { label: stateFilter,    options: ["All States", ...INDIA_STATES], setter: setStateFilter },
            { label: cityFilter,     options: ["All Cities"],                  setter: setCityFilter   },
            { label: subCityFilter,  options: ["All Sub-Cities"],              setter: setSubCityFilter },
          ].map(({ label, options, setter }) => (
            <DropdownMenu key={label}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-medium">
                  <Filter className="w-3 h-3" />
                  {label}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-60 overflow-y-auto w-44">
                {options.map((o) => (
                  <DropdownMenuItem key={o} onClick={() => setter(o)} className="text-xs">
                    {o}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ))}
        </div>
      </div>

      {/* ── Stats Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="relative overflow-hidden group hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-default">
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{ background: `linear-gradient(135deg, ${s.bg} 0%, transparent 60%)` }}
              />
              <CardContent className="p-4 relative z-10">
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: s.bg, border: `1px solid ${s.color}22` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: s.color }} />
                  </div>
                  {s.trend && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(5,150,105,0.12)", color: "#059669" }}
                    >
                      {s.trend}
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold tracking-tight" style={{ color: "#1e1b4b" }}>
                  {isLoading && s.label === "Total Stores" ? "—" : s.value.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Quick Actions ───────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4" style={{ color: "#7c3aed" }} />
          <h2 className="text-base font-semibold">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => handleComingSoon(action.label)}
                className="group relative overflow-hidden rounded-2xl p-4 flex flex-col items-center gap-3 border transition-all duration-200 hover:-translate-y-1 hover:shadow-lg text-center"
                style={{
                  background: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                }}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: `linear-gradient(135deg, ${action.bg} 0%, transparent 70%)` }}
                />
                <div
                  className="relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                  style={{ background: action.bg, border: `1px solid ${action.color}22` }}
                >
                  <Icon className="w-5 h-5" style={{ color: action.color }} />
                </div>
                <span className="relative z-10 text-xs font-semibold text-foreground/80 group-hover:text-foreground transition-colors leading-tight">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Managers Overview + Top Performers ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Managers Table */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: "#7c3aed" }} />
              <h2 className="text-base font-semibold">Managers Overview</h2>
            </div>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleComingSoon("Add Manager")}>
              <Plus className="w-3 h-3" /> Add Manager
            </Button>
          </div>

          <Card className="overflow-hidden">
            {/* Table header */}
            <div
              className="grid text-[10px] font-bold uppercase tracking-wider text-white px-4 py-3"
              style={{
                background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
                gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 80px",
              }}
            >
              <span>Manager</span>
              <span>State</span>
              <span>City</span>
              <span>Stores</span>
              <span>Performance</span>
              <span>Status</span>
              <span></span>
            </div>

            {/* Table body */}
            {managerRows.length === 0 ? (
              <CardContent className="py-14 text-center">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-15" style={{ color: "#7c3aed" }} />
                <p className="text-sm font-medium text-muted-foreground">No managers added yet</p>
                <p className="text-xs text-muted-foreground mt-1">Click "Add Manager" to get started</p>
              </CardContent>
            ) : (
              <div className="divide-y divide-border">
                {managerRows.map((m, i) => (
                  <div
                    key={i}
                    className="grid items-center px-4 py-3 hover:bg-muted/40 transition-colors text-sm"
                    style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 80px" }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
                        {m.name?.[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate text-xs">{m.name}</p>
                        <p className="text-[10px] text-muted-foreground">{m.empId}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground truncate">{m.state}</span>
                    <span className="text-xs text-muted-foreground truncate">{m.city}</span>
                    <span className="text-xs font-medium">{m.stores}</span>
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${m.perf}%`, background: "linear-gradient(90deg, #7c3aed, #a855f7)" }} />
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: "#7c3aed" }}>{m.perf}%</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full w-fit ${m.online ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {m.online ? "Online" : "Offline"}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem className="text-xs gap-2"><Eye className="w-3 h-3" /> View Profile</DropdownMenuItem>
                        <DropdownMenuItem className="text-xs gap-2"><Pencil className="w-3 h-3" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-xs gap-2"><ArrowLeftRight className="w-3 h-3" /> Change Manager</DropdownMenuItem>
                        <DropdownMenuItem className="text-xs gap-2 text-red-600 focus:text-red-600"><UserMinus className="w-3 h-3" /> Disable Manager</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Top Performers */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4" style={{ color: "#d97706" }} />
            <h2 className="text-base font-semibold">Top Performers</h2>
          </div>
          <Card className="overflow-hidden">
            <div className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white"
              style={{ background: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)" }}>
              Manager Performance
            </div>
            {managerRows.length === 0 ? (
              <CardContent className="py-10 text-center">
                <Star className="w-8 h-8 mx-auto mb-2 opacity-15" style={{ color: "#d97706" }} />
                <p className="text-xs text-muted-foreground">No data yet</p>
              </CardContent>
            ) : (
              <div className="divide-y divide-border">
                {managerRows.slice(0, 5).map((m, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-xs font-bold w-4 text-muted-foreground">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{m.name}</p>
                      <p className="text-[10px] text-muted-foreground">{m.city}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold" style={{ color: "#7c3aed" }}>{m.perf}%</p>
                      <p className="text-[10px] text-muted-foreground">{m.stores} stores</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ── India Map + Geographic Breakdown ──────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" style={{ color: "#7c3aed" }} />
            <h2 className="text-base font-semibold">India Map</h2>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <button
                className={`hover:text-foreground transition-colors ${mapLevel === "india" ? "font-semibold text-foreground" : ""}`}
                onClick={() => { setMapLevel("india"); setSelectedState(null); setSelectedCity(null); }}
              >
                India
              </button>
              {selectedState && (
                <>
                  <ChevronRight className="w-3 h-3" />
                  <button
                    className={`hover:text-foreground transition-colors ${mapLevel === "state" ? "font-semibold text-foreground" : ""}`}
                    onClick={() => { setMapLevel("state"); setSelectedCity(null); }}
                  >
                    {selectedState}
                  </button>
                </>
              )}
              {selectedCity && (
                <>
                  <ChevronRight className="w-3 h-3" />
                  <span className="font-semibold text-foreground">{selectedCity}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            {mapLevel === "india" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {INDIA_STATES.map((state) => (
                  <button
                    key={state}
                    onClick={() => { setSelectedState(state); setMapLevel("state"); }}
                    className="group relative text-left rounded-xl p-3 border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                    style={{
                      background: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                    }}
                  >
                    <div
                      className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: "rgba(124,58,237,0.06)" }}
                    />
                    <p className="relative z-10 text-xs font-semibold text-foreground/80 group-hover:text-foreground transition-colors leading-tight">{state}</p>
                    <div className="relative z-10 flex gap-2 mt-2">
                      <span className="text-[10px] text-muted-foreground">0 mgrs</span>
                      <span className="text-[10px] text-muted-foreground">0 stores</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {mapLevel === "state" && (
              <div className="space-y-3">
                <div
                  className="rounded-xl p-4 border"
                  style={{ background: "rgba(124,58,237,0.05)", borderColor: "rgba(124,58,237,0.2)" }}
                >
                  <p className="font-semibold" style={{ color: "#7c3aed" }}>{selectedState}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                    {["Managers", "Stores", "Pending Queries", "Active Stores"].map((label, i) => (
                      <div key={label} className="text-center">
                        <p className="text-lg font-bold" style={{ color: "#7c3aed" }}>0</p>
                        <p className="text-[10px] text-muted-foreground">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">No cities added for {selectedState} yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Activities + Pending Queries ────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Recent Activities */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4" style={{ color: "#059669" }} />
            <h2 className="text-base font-semibold">Recent Activities</h2>
          </div>
          <Card>
            {activities.length === 0 ? (
              <CardContent className="py-12 text-center">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-15" style={{ color: "#059669" }} />
                <p className="text-sm font-medium text-muted-foreground">No recent activities</p>
                <p className="text-xs text-muted-foreground mt-1">Activity feed will appear here</p>
              </CardContent>
            ) : (
              <div className="divide-y divide-border">
                {activities.map((a, i) => {
                  const Icon = a.icon;
                  return (
                    <div key={i} className="flex items-start gap-3 px-4 py-3">
                      <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: `${a.color}18`, border: `1px solid ${a.color}22` }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: a.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">{a.label}</p>
                        <p className="text-[10px] text-muted-foreground">{a.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Pending Queries */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4" style={{ color: "#d97706" }} />
            <h2 className="text-base font-semibold">Pending Queries</h2>
          </div>
          <Card>
            {pendingQueries.length === 0 ? (
              <CardContent className="py-12 text-center">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-15" style={{ color: "#d97706" }} />
                <p className="text-sm font-medium text-muted-foreground">No pending queries</p>
                <p className="text-xs text-muted-foreground mt-1">All clear! 🎉</p>
              </CardContent>
            ) : (
              <div className="divide-y divide-border">
                {pendingQueries.map((q, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium truncate">{q.storeName}</p>
                        <Badge className="text-[9px] px-1.5 py-0 h-4"
                          style={{
                            background: q.priority === "High" ? "rgba(220,38,38,0.1)" : "rgba(217,119,6,0.1)",
                            color: q.priority === "High" ? "#dc2626" : "#d97706",
                            border: "none",
                          }}>
                          {q.priority}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{q.manager} · {fmtDate(q.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ── City / Sub-City Report ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <LayoutGrid className="w-4 h-4" style={{ color: "#0891b2" }} />
          <h2 className="text-base font-semibold">City / Sub-City Report</h2>
        </div>
        <Card className="overflow-hidden">
          <div
            className="grid text-[10px] font-bold uppercase tracking-wider text-white px-4 py-3 gap-2"
            style={{
              background: "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)",
              gridTemplateColumns: "1fr 1fr 1fr 80px 80px 80px 80px 1fr",
            }}
          >
            <span>State</span>
            <span>City</span>
            <span>Sub-City</span>
            <span>Total</span>
            <span>Active</span>
            <span>Trial</span>
            <span>Queries</span>
            <span>Manager</span>
          </div>

          {cityReport.length === 0 ? (
            <CardContent className="py-12 text-center">
              <LayoutGrid className="w-8 h-8 mx-auto mb-2 opacity-15" style={{ color: "#0891b2" }} />
              <p className="text-sm font-medium text-muted-foreground">No city data yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add cities and assign managers to see the report</p>
            </CardContent>
          ) : (
            <div className="divide-y divide-border">
              {cityReport.map((row, i) => (
                <div
                  key={i}
                  className="grid items-center px-4 py-3 hover:bg-muted/30 transition-colors text-xs gap-2"
                  style={{ gridTemplateColumns: "1fr 1fr 1fr 80px 80px 80px 80px 1fr" }}
                >
                  <span className="font-medium truncate">{row.state}</span>
                  <span className="text-muted-foreground truncate">{row.city}</span>
                  <span className="text-muted-foreground truncate">{row.subCity}</span>
                  <span className="font-semibold">{row.total}</span>
                  <span className="text-green-600 font-semibold">{row.active}</span>
                  <span className="text-amber-600 font-semibold">{row.trial}</span>
                  <span className="text-red-500 font-semibold">{row.queries}</span>
                  <span className="text-muted-foreground truncate">{row.manager}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Admin Stores Summary (existing real data) ──────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Store className="w-4 h-4" style={{ color: "#7c3aed" }} />
          <h2 className="text-base font-semibold">All Stores</h2>
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(124,58,237,0.10)", color: "#7c3aed" }}
          >
            {totalStores}
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: "hsl(var(--muted))" }} />
            ))}
          </div>
        ) : totalStores === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Store className="w-10 h-10 mx-auto mb-3 opacity-15" style={{ color: "#7c3aed" }} />
              <p className="text-sm text-muted-foreground">No stores registered yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(admins as any[])
              .filter((a) =>
                !search.trim() ||
                (a.storeName ?? "").toLowerCase().includes(search.toLowerCase()) ||
                (a.email ?? "").toLowerCase().includes(search.toLowerCase())
              )
              .slice(0, 12)
              .map((admin) => {
                const isActive = admin.isActive !== false;
                const displayName = admin.storeName || admin.email || "—";
                const planName = admin.planName as string;
                const planColor = admin.planColor as string;
                const endDate = admin.subscriptionEndDate as string | null;
                return (
                  <Card key={admin.id} className="hover:border-purple-200 transition-colors">
                    <CardContent className="p-3.5 flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: isActive ? "linear-gradient(135deg, #7c3aed, #a855f7)" : "hsl(var(--muted))", color: isActive ? "white" : "hsl(var(--muted-foreground))" }}
                      >
                        {displayName.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold truncate">{displayName}</span>
                          {!isActive && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">Inactive</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {planName && (
                            <span
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                              style={{ background: planColor ? planColor + "18" : "rgba(124,58,237,0.08)", color: planColor || "#7c3aed" }}
                            >
                              {planName}
                            </span>
                          )}
                          {endDate && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <CalendarDays className="w-2.5 h-2.5" />
                              {fmtDate(endDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}
        {totalStores > 12 && (
          <p className="text-xs text-center text-muted-foreground mt-3">
            Showing 12 of {totalStores} stores · Use the Admins section for full list
          </p>
        )}
      </div>

    </div>
  );
}
