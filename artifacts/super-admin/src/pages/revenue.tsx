import { useMemo } from "react";
import { useListAdmins } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  CalendarDays,
  Star,
  Shirt,
  Megaphone,
  Trophy,
  Store,
  Medal,
  Crown,
} from "lucide-react";

/* ── Auth fetch ─────────────────────────────────────────────────────────────── */
function authFetch(url: string) {
  const token = sessionStorage.getItem("wmh_super_token");
  return fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

/* ── Types ──────────────────────────────────────────────────────────────────── */
interface AdminStat {
  id: string;
  username: string;
  email: string;
  storeName: string;
  planName: string;
  tryOnCount: number;
  adsCount: number;
}

interface StatsOverview {
  totalTryOn: number;
  totalAds: number;
  admins: AdminStat[];
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */
function parsePrice(v: string | null | undefined): number {
  if (!v) return 0;
  const n = Number(v.replace(/[₹,\s]/g, ""));
  return isNaN(n) ? 0 : n;
}

type PlanCategory = "monthly" | "yearly" | "lifetime" | "other";

function classify(admin: { planPrice?: string; planName?: string; planPeriod?: string }): PlanCategory {
  const price  = admin.planPrice  ?? "";
  const name   = (admin.planName  ?? "").toLowerCase();
  const period = (admin.planPeriod ?? "").toLowerCase();
  if (price.includes("15,999") || name.includes("lifetime"))            return "lifetime";
  if (price.includes("5,999")  || period.includes("year") || name.includes("premium annual")) return "yearly";
  if (price.includes("999") && !price.includes("5,999") && !price.includes("15,999") && !price.includes("19,999")) return "monthly";
  if (period.includes("month"))                                          return "monthly";
  return "other";
}

function rupees(n: number): string {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(2)}L`;
  if (n >= 1_000)     return `₹${n.toLocaleString("en-IN")}`;
  return `₹${n}`;
}

/* ── Rank badge ─────────────────────────────────────────────────────────────── */
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Crown  className="w-4 h-4 text-yellow-500 shrink-0" />;
  if (rank === 2) return <Trophy className="w-4 h-4 text-slate-400  shrink-0" />;
  if (rank === 3) return <Medal  className="w-4 h-4 text-amber-600  shrink-0" />;
  return (
    <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
      {rank}
    </span>
  );
}

/* ── Plan card data ─────────────────────────────────────────────────────────── */
const PLANS = [
  {
    key: "monthly",
    label: "Monthly",
    Icon: CalendarDays,
    cardCls: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800/40",
    iconCls: "bg-blue-100 dark:bg-blue-900/40",
    iconColor: "text-blue-500",
    valueCls: "text-blue-600 dark:text-blue-400",
    labelCls: "text-blue-500",
  },
  {
    key: "yearly",
    label: "Yearly",
    Icon: Star,
    cardCls: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/40",
    iconCls: "bg-amber-100 dark:bg-amber-900/40",
    iconColor: "text-amber-500",
    valueCls: "text-amber-600 dark:text-amber-400",
    labelCls: "text-amber-500",
  },
  {
    key: "lifetime",
    label: "Lifetime",
    Icon: Crown,
    cardCls: "bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800/40",
    iconCls: "bg-purple-100 dark:bg-purple-900/40",
    iconColor: "text-purple-500",
    valueCls: "text-purple-600 dark:text-purple-400",
    labelCls: "text-purple-500",
  },
] as const;

/* ── Page ───────────────────────────────────────────────────────────────────── */
export default function Revenue() {
  /* data */
  const { data: admins = [], isLoading: adminsLoading } = useListAdmins({});

  const { data: overview, isLoading: statsLoading } = useQuery<StatsOverview>({
    queryKey: ["admins-stats-overview"],
    queryFn: async () => {
      const res = await authFetch("/api/admins/stats-overview");
      if (!res.ok) throw new Error("Failed to load stats");
      return res.json();
    },
    staleTime: 60_000,
    retry: 2,
  });

  /* revenue breakdown */
  const rev = useMemo(() => {
    const monthly  = { count: 0, total: 0 };
    const yearly   = { count: 0, total: 0 };
    const lifetime = { count: 0, total: 0 };

    for (const a of admins) {
      const cat   = classify(a as any);
      const price = parsePrice((a as any).planPrice);
      if (cat === "monthly")  { monthly.count++;  monthly.total  += price; }
      if (cat === "yearly")   { yearly.count++;   yearly.total   += price; }
      if (cat === "lifetime") { lifetime.count++; lifetime.total += price; }
    }

    return {
      monthly, yearly, lifetime,
      grand: monthly.total + yearly.total + lifetime.total,
      paying: monthly.count + yearly.count + lifetime.count,
    };
  }, [admins]);

  const leaderboard  = overview?.admins    ?? [];
  const totalTryOn   = overview?.totalTryOn ?? 0;
  const totalAds     = overview?.totalAds   ?? 0;

  /* plan counts by key */
  const planData: Record<string, { count: number; total: number }> = {
    monthly:  rev.monthly,
    yearly:   rev.yearly,
    lifetime: rev.lifetime,
  };

  /* ── render ── */
  return (
    <div className="isolate w-full overflow-x-hidden">
      <div className="max-w-2xl mx-auto space-y-5 pb-8">

        {/* ── Header ── */}
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary shrink-0" />
            Revenue &amp; Growth
          </h1>
          <p className="text-muted-foreground text-xs mt-0.5">
            Subscription revenue breakdown across all active plans
          </p>
        </div>

        {/* ── Total Revenue ── */}
        <div className="rounded-2xl border border-border bg-card w-full p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary flex items-center gap-1.5 mb-3">
            <Star className="w-3.5 h-3.5 shrink-0" />
            Total Platform Revenue
          </p>

          {adminsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-36" />
              <Skeleton className="h-4 w-28" />
            </div>
          ) : (
            <>
              <p className="text-4xl font-extrabold tracking-tight text-foreground">
                {rupees(rev.grand)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {rev.paying} paying admin{rev.paying !== 1 ? "s" : ""}
              </p>
            </>
          )}
        </div>

        {/* ── 3 Plan Cards (always side-by-side) ── */}
        <div className="grid grid-cols-3 gap-2 w-full">
          {PLANS.map(({ key, label, Icon, cardCls, iconCls, iconColor, valueCls, labelCls }) => {
            const { count, total } = planData[key] ?? { count: 0, total: 0 };
            return (
              <div
                key={key}
                className={`rounded-xl border p-2.5 flex flex-col items-center gap-2 w-full ${cardCls}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconCls}`}>
                  <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
                </div>
                <p className={`text-[10px] font-bold text-center leading-tight ${labelCls}`}>
                  {label}
                </p>
                {adminsLoading ? (
                  <Skeleton className="h-5 w-12" />
                ) : (
                  <div className="text-center">
                    <p className={`text-sm font-extrabold leading-tight ${valueCls}`}>
                      {rupees(total)}
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      {count} admin{count !== 1 ? "s" : ""}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          Calculated from each admin's registered plan · Enterprise excluded
        </p>

        {/* ── Ads & Engagement ── */}
        <div className="w-full">
          <div className="flex items-center gap-2 mb-3">
            <Megaphone className="w-4 h-4 text-primary shrink-0" />
            <h2 className="text-base font-bold">Ads &amp; Engagement</h2>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full">
            {/* Total Virtual Try-On */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800/40 p-4 w-full">
              <div className="flex items-start gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                  <Shirt className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                </div>
                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide leading-snug">
                  Total Virtual<br />Try-On
                </p>
              </div>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {totalTryOn.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">all stores</p>
                </>
              )}
            </div>

            {/* Ads Run */}
            <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800/40 p-4 w-full">
              <div className="flex items-start gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center shrink-0">
                  <Megaphone className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                </div>
                <p className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wide leading-snug">
                  Ads Run
                </p>
              </div>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
                    {totalAds.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">coming soon</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Virtual Try-On Leaderboard ── */}
        <div className="w-full">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-yellow-500 shrink-0" />
            <h2 className="text-base font-bold">Virtual Try-On Leaderboard</h2>
          </div>

          {statsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-border w-full py-10 text-center">
              <Shirt className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground font-medium">No try-on data yet</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5 px-6">
                Data appears as admins receive virtual try-ons on their stores
              </p>
            </div>
          ) : (
            <div className="space-y-2 w-full">
              {leaderboard.map((admin, idx) => {
                const rank   = idx + 1;
                const isGold = rank === 1;
                return (
                  <div
                    key={admin.id}
                    className={`rounded-xl border w-full px-3 py-3 flex items-center gap-3 ${
                      isGold
                        ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800/40"
                        : "bg-card border-border"
                    }`}
                  >
                    <RankBadge rank={rank} />

                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Store className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate leading-tight">
                        {admin.storeName || admin.email || admin.username}
                      </p>
                      {admin.planName ? (
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                          {admin.planName}
                        </p>
                      ) : null}
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
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

      </div>
    </div>
  );
}
