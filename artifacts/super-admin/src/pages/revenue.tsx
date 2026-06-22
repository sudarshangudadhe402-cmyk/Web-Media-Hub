import { useMemo } from "react";
import { useListAdmins } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  CalendarDays,
  Star,
  Infinity as InfinityIcon,
  Shirt,
  Megaphone,
  Trophy,
  Store,
  Medal,
} from "lucide-react";

const TOKEN_KEY = "wmh_super_token";
function authFetch(url: string) {
  const token = sessionStorage.getItem(TOKEN_KEY);
  return fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

interface AdminStat {
  id: string;
  username: string;
  email: string;
  storeName: string;
  planName: string;
  planBadge: string;
  planColor: string;
  tryOnCount: number;
  adsCount: number;
}

interface StatsOverview {
  totalTryOn: number;
  totalAds: number;
  admins: AdminStat[];
}

function parsePrice(planPrice: string | null | undefined): number {
  if (!planPrice) return 0;
  const n = Number(planPrice.replace(/[₹,\s]/g, ""));
  return isNaN(n) ? 0 : n;
}

type PlanCategory = "monthly" | "yearly" | "lifetime" | "other";

function classifyAdmin(admin: any): PlanCategory {
  const price = (admin.planPrice as string) || "";
  const name = ((admin.planName as string) || "").toLowerCase();
  const period = ((admin.planPeriod as string) || "").toLowerCase();
  if (price.includes("15,999") || name.includes("lifetime")) return "lifetime";
  if (price.includes("5,999") || period.includes("year") || name.includes("premium annual")) return "yearly";
  if (price.includes("999") && !price.includes("5,999") && !price.includes("15,999") && !price.includes("19,999")) return "monthly";
  if (period.includes("month")) return "monthly";
  return "other";
}

function formatINR(amount: number): string {
  if (amount >= 10_00_000) return `₹${(amount / 10_00_000).toFixed(2)}L`;
  if (amount >= 1_000) return `₹${amount.toLocaleString("en-IN")}`;
  return `₹${amount}`;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="w-4 h-4 text-yellow-500 shrink-0" />;
  if (rank === 2) return <Medal className="w-4 h-4 text-slate-400 shrink-0" />;
  if (rank === 3) return <Medal className="w-4 h-4 text-amber-600 shrink-0" />;
  return (
    <span className="w-4 h-4 flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
      {rank}
    </span>
  );
}

export default function Revenue() {
  const { data: admins = [], isLoading: adminsLoading } = useListAdmins({});

  const { data: overview, isLoading: statsLoading } = useQuery<StatsOverview>({
    queryKey: ["admins-stats-overview"],
    queryFn: async () => {
      const res = await authFetch("/api/admins/stats-overview");
      if (!res.ok) throw new Error("Failed to load stats");
      return res.json();
    },
    staleTime: 60_000,
  });

  const stats = useMemo(() => {
    const monthly = { count: 0, total: 0 };
    const yearly = { count: 0, total: 0 };
    const lifetime = { count: 0, total: 0 };
    for (const admin of admins) {
      const cat = classifyAdmin(admin);
      const price = parsePrice((admin as any).planPrice);
      if (cat === "monthly") { monthly.count++; monthly.total += price; }
      else if (cat === "yearly") { yearly.count++; yearly.total += price; }
      else if (cat === "lifetime") { lifetime.count++; lifetime.total += price; }
    }
    return { monthly, yearly, lifetime, grandTotal: monthly.total + yearly.total + lifetime.total };
  }, [admins]);

  const plans = [
    { key: "monthly", label: "Monthly", icon: CalendarDays, color: "#3b82f6", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.2)", count: stats.monthly.count, total: stats.monthly.total },
    { key: "yearly",  label: "Yearly",  icon: Star,         color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.2)",  count: stats.yearly.count,  total: stats.yearly.total  },
    { key: "lifetime",label: "Lifetime",icon: InfinityIcon, color: "#a855f7", bg: "rgba(168,85,247,0.08)", border: "rgba(168,85,247,0.2)", count: stats.lifetime.count,total: stats.lifetime.total},
  ];

  const leaderboard = overview?.admins ?? [];
  const totalTryOn = overview?.totalTryOn ?? 0;
  const totalAds = overview?.totalAds ?? 0;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Revenue &amp; Growth
        </h1>
        <p className="text-muted-foreground text-xs mt-0.5">
          Subscription revenue breakdown across all active plans
        </p>
      </div>

      {/* Total Revenue Box */}
      <div className="rounded-2xl border bg-card p-5 overflow-hidden">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1 mb-3">
          <Star className="w-3 h-3" /> Total Platform Revenue
        </p>
        {adminsLoading ? (
          <div className="space-y-2"><Skeleton className="h-10 w-36" /><Skeleton className="h-4 w-24" /></div>
        ) : (
          <>
            <p className="text-4xl font-extrabold tracking-tight text-foreground">{formatINR(stats.grandTotal)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.monthly.count + stats.yearly.count + stats.lifetime.count} paying admins
            </p>
          </>
        )}
      </div>

      {/* 3 Plan Cards */}
      <div className="grid grid-cols-3 gap-2">
        {plans.map(({ key, label, icon: Icon, color, bg, border, count, total }) => (
          <div key={key} className="rounded-xl border p-3 flex flex-col gap-2 overflow-hidden" style={{ background: bg, borderColor: border }}>
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + "22" }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <p className="text-[10px] font-bold text-center leading-tight" style={{ color }}>{label}</p>
            </div>
            {adminsLoading ? <Skeleton className="h-6 w-full" /> : (
              <div className="text-center">
                <p className="text-base font-extrabold leading-tight" style={{ color }}>{formatINR(total)}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{count} admin{count !== 1 ? "s" : ""}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Calculated from each admin's registered plan · Enterprise excluded
      </p>

      {/* ── Ads Section ── */}
      <div className="pt-1">
        <div className="flex items-center gap-2 mb-3">
          <Megaphone className="w-4 h-4 text-primary" />
          <h2 className="text-base font-bold">Ads &amp; Engagement</h2>
        </div>

        {/* 2 side-by-side boxes */}
        <div className="grid grid-cols-2 gap-3">
          {/* Total Virtual Try-On */}
          <div className="rounded-xl border p-4 overflow-hidden" style={{ background: "rgba(16,185,129,0.06)", borderColor: "rgba(16,185,129,0.2)" }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)" }}>
                <Shirt className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider leading-tight">
                Total Virtual Try-On
              </p>
            </div>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <p className="text-3xl font-extrabold text-emerald-600">{totalTryOn.toLocaleString("en-IN")}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">across all stores</p>
              </>
            )}
          </div>

          {/* Ads Run */}
          <div className="rounded-xl border p-4 overflow-hidden" style={{ background: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.15)" }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(239,68,68,0.12)" }}>
                <Megaphone className="w-3.5 h-3.5 text-red-500" />
              </div>
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider leading-tight">
                Ads Run
              </p>
            </div>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <p className="text-3xl font-extrabold text-red-500">{totalAds.toLocaleString("en-IN")}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">coming soon</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Virtual Try-On Leaderboard ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <h2 className="text-base font-bold">Virtual Try-On Leaderboard</h2>
        </div>

        {statsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="rounded-xl border border-dashed border-2 py-10 text-center">
            <Shirt className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No virtual try-on data yet</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">Data will appear as admins get try-ons on their stores</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((admin, idx) => {
              const rank = idx + 1;
              const isTop3 = rank <= 3;
              return (
                <div
                  key={admin.id}
                  className="rounded-xl border bg-card px-4 py-3 flex items-center gap-3"
                  style={isTop3 ? {
                    borderColor: rank === 1 ? "rgba(234,179,8,0.4)" : rank === 2 ? "rgba(148,163,184,0.4)" : "rgba(217,119,6,0.3)",
                    background: rank === 1 ? "rgba(234,179,8,0.04)" : rank === 2 ? "rgba(148,163,184,0.04)" : "rgba(217,119,6,0.03)",
                  } : {}}
                >
                  {/* Rank */}
                  <RankBadge rank={rank} />

                  {/* Store icon */}
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Store className="w-4 h-4 text-muted-foreground" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {admin.storeName || admin.email || admin.username}
                    </p>
                    {admin.planName && (
                      <p className="text-[10px] text-muted-foreground truncate">{admin.planName}</p>
                    )}
                  </div>

                  {/* Try-on count */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-extrabold text-emerald-600">
                      {admin.tryOnCount.toLocaleString("en-IN")}
                    </p>
                    <p className="text-[9px] text-muted-foreground">try-ons</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pb-4" />
    </div>
  );
}
