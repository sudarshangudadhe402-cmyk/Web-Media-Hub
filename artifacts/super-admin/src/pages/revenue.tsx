import { useMemo } from "react";
import { useListAdmins } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  Users,
  IndianRupee,
  CalendarDays,
  Infinity,
  Star,
} from "lucide-react";

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

function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  adminCount,
  revenuePerAdmin,
  totalRevenue,
  accentColor,
  loading,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  adminCount: number;
  revenuePerAdmin: number;
  totalRevenue: number;
  accentColor: string;
  loading: boolean;
}) {
  return (
    <div
      className="rounded-2xl border bg-card p-5 flex flex-col gap-4"
      style={{ borderColor: accentColor + "33" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: iconBg }}
        >
          <Icon className="w-5 h-5" style={{ color: iconColor }} />
        </div>
        <p className="font-bold text-base">{label}</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-40" />
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-3xl font-extrabold tracking-tight" style={{ color: accentColor }}>
              {formatINR(totalRevenue)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Revenue</p>
          </div>
          <div
            className="rounded-xl px-4 py-3 space-y-1.5"
            style={{ background: accentColor + "0f" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Active Admins
              </span>
              <span className="text-sm font-bold">{adminCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5" /> Per Admin
              </span>
              <span className="text-sm font-semibold">{formatINR(revenuePerAdmin)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Revenue() {
  const { data: admins = [], isLoading } = useListAdmins({});

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

    const grandTotal = monthly.total + yearly.total + lifetime.total;

    return { monthly, yearly, lifetime, grandTotal };
  }, [admins]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" />
          Revenue &amp; Growth
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Subscription revenue breakdown across all active plans
        </p>
      </div>

      {/* ── Total Revenue Card ── */}
      <div className="rounded-2xl border bg-gradient-to-br from-primary/5 via-card to-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-primary" />
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            Total Platform Revenue
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-48" />
            <div className="grid grid-cols-3 gap-3">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
          </div>
        ) : (
          <>
            <p className="text-5xl font-extrabold tracking-tight text-foreground">
              {formatINR(stats.grandTotal)}
            </p>

            <div className="grid grid-cols-3 gap-3">
              {/* Monthly contribution */}
              <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 px-3 py-2.5 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <CalendarDays className="w-3 h-3 text-blue-500" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Monthly</p>
                </div>
                <p className="text-lg font-extrabold text-blue-600 dark:text-blue-400">
                  {formatINR(stats.monthly.total)}
                </p>
                <p className="text-[10px] text-muted-foreground">{stats.monthly.count} admins</p>
              </div>

              {/* Yearly contribution */}
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 px-3 py-2.5 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Star className="w-3 h-3 text-amber-500" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Yearly</p>
                </div>
                <p className="text-lg font-extrabold text-amber-600 dark:text-amber-400">
                  {formatINR(stats.yearly.total)}
                </p>
                <p className="text-[10px] text-muted-foreground">{stats.yearly.count} admins</p>
              </div>

              {/* Lifetime contribution */}
              <div className="rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/40 px-3 py-2.5 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Infinity className="w-3 h-3 text-purple-500" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-purple-500">Lifetime</p>
                </div>
                <p className="text-lg font-extrabold text-purple-600 dark:text-purple-400">
                  {formatINR(stats.lifetime.total)}
                </p>
                <p className="text-[10px] text-muted-foreground">{stats.lifetime.count} admins</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── 3 Plan Boxes ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={CalendarDays}
          iconBg="rgba(59,130,246,0.12)"
          iconColor="#3b82f6"
          label="Monthly Revenue"
          adminCount={stats.monthly.count}
          revenuePerAdmin={999}
          totalRevenue={stats.monthly.total}
          accentColor="#3b82f6"
          loading={isLoading}
        />
        <StatCard
          icon={Star}
          iconBg="rgba(245,158,11,0.12)"
          iconColor="#f59e0b"
          label="Yearly Revenue"
          adminCount={stats.yearly.count}
          revenuePerAdmin={5999}
          totalRevenue={stats.yearly.total}
          accentColor="#f59e0b"
          loading={isLoading}
        />
        <StatCard
          icon={Infinity}
          iconBg="rgba(168,85,247,0.12)"
          iconColor="#a855f7"
          label="Lifetime Revenue"
          adminCount={stats.lifetime.count}
          revenuePerAdmin={15999}
          totalRevenue={stats.lifetime.total}
          accentColor="#a855f7"
          loading={isLoading}
        />
      </div>

      <p className="text-xs text-muted-foreground text-center pb-2">
        Revenue calculated from each admin's registered plan price · Enterprise plan excluded
      </p>
    </div>
  );
}
