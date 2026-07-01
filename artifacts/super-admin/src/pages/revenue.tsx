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
  Tag,
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

interface PricingPlan {
  id: string;
  name: string;
  price: string;
  durationDays: number | null;
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

/* ── Plan card color palette (cycles through created plans) ──────────────────── */
const PLAN_STYLES = [
  {
    Icon: CalendarDays,
    cardCls: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800/40",
    iconCls: "bg-blue-100 dark:bg-blue-900/40",
    iconColor: "text-blue-500",
    valueCls: "text-blue-600 dark:text-blue-400",
    labelCls: "text-blue-500",
  },
  {
    Icon: Star,
    cardCls: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/40",
    iconCls: "bg-amber-100 dark:bg-amber-900/40",
    iconColor: "text-amber-500",
    valueCls: "text-amber-600 dark:text-amber-400",
    labelCls: "text-amber-500",
  },
  {
    Icon: Crown,
    cardCls: "bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800/40",
    iconCls: "bg-purple-100 dark:bg-purple-900/40",
    iconColor: "text-purple-500",
    valueCls: "text-purple-600 dark:text-purple-400",
    labelCls: "text-purple-500",
  },
  {
    Icon: Tag,
    cardCls: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/40",
    iconCls: "bg-emerald-100 dark:bg-emerald-900/40",
    iconColor: "text-emerald-500",
    valueCls: "text-emerald-600 dark:text-emerald-400",
    labelCls: "text-emerald-500",
  },
  {
    Icon: Medal,
    cardCls: "bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800/40",
    iconCls: "bg-rose-100 dark:bg-rose-900/40",
    iconColor: "text-rose-500",
    valueCls: "text-rose-600 dark:text-rose-400",
    labelCls: "text-rose-500",
  },
  {
    Icon: Trophy,
    cardCls: "bg-cyan-50 border-cyan-200 dark:bg-cyan-950/30 dark:border-cyan-800/40",
    iconCls: "bg-cyan-100 dark:bg-cyan-900/40",
    iconColor: "text-cyan-500",
    valueCls: "text-cyan-600 dark:text-cyan-400",
    labelCls: "text-cyan-500",
  },
];

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

  const { data: pricingData, isLoading: plansLoading } = useQuery({
    queryKey: ["pricing-plans"],
    queryFn: async () => {
      const res = await fetch("/api/pricing");
      if (!res.ok) throw new Error("Failed to load plans");
      return res.json() as Promise<{ plans: PricingPlan[] }>;
    },
    staleTime: 30_000,
  });
  const pricingPlans = pricingData?.plans ?? [];

  /* revenue breakdown — computed against the plans currently created on the Pricing page */
  const rev = useMemo(() => {
    const perPlan = pricingPlans.map((plan) => {
      const planNameLc = plan.name.trim().toLowerCase();
      let count = 0;
      let total = 0;
      for (const a of admins) {
        const planName = ((a as any).planName as string ?? "").trim().toLowerCase();
        if (planName === planNameLc) {
          count++;
          total += parsePrice((a as any).planPrice);
        }
      }
      return { ...plan, count, total };
    });

    const grand  = admins.reduce((sum, a) => sum + parsePrice((a as any).planPrice), 0);
    const paying = admins.filter((a) => parsePrice((a as any).planPrice) > 0).length;

    return { perPlan, grand, paying };
  }, [admins, pricingPlans]);

  const leaderboard  = overview?.admins    ?? [];
  const totalTryOn   = overview?.totalTryOn ?? 0;
  const totalAds     = overview?.totalAds   ?? 0;

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

        {/* ── Plan Cards — side by side, scrollable when many plans ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none w-full">
          {plansLoading || adminsLoading ? (
            [1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-28 rounded-xl shrink-0" />
            ))
          ) : rev.perPlan.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-border w-full py-6 text-center">
              <Tag className="w-6 h-6 mx-auto text-muted-foreground/30 mb-1.5" />
              <p className="text-xs text-muted-foreground">No plans created yet on the Pricing page</p>
            </div>
          ) : (
            rev.perPlan.map((plan, i) => {
              const { Icon, cardCls, iconCls, iconColor, valueCls, labelCls } = PLAN_STYLES[i % PLAN_STYLES.length];
              return (
                <div
                  key={plan.id}
                  className={`rounded-xl border p-2.5 flex flex-col items-center gap-2 shrink-0 w-28 ${cardCls}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconCls}`}>
                    <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
                  </div>
                  <p className={`text-[10px] font-bold text-center leading-tight line-clamp-2 ${labelCls}`}>
                    {plan.name}
                  </p>
                  <div className="text-center">
                    <p className={`text-sm font-extrabold leading-tight ${valueCls}`}>
                      {rupees(plan.total)}
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      {plan.count} admin{plan.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          Calculated from each admin's registered plan, matched against plans created on the Pricing page
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
