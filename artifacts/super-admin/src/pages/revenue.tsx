import { useMemo } from "react";
import { useListAdmins } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  CalendarDays,
  Star,
  Infinity as InfinityIcon,
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

  const plans = [
    {
      key: "monthly",
      label: "Monthly",
      icon: CalendarDays,
      color: "#3b82f6",
      bg: "rgba(59,130,246,0.08)",
      border: "rgba(59,130,246,0.2)",
      count: stats.monthly.count,
      total: stats.monthly.total,
    },
    {
      key: "yearly",
      label: "Yearly",
      icon: Star,
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.08)",
      border: "rgba(245,158,11,0.2)",
      count: stats.yearly.count,
      total: stats.yearly.total,
    },
    {
      key: "lifetime",
      label: "Lifetime",
      icon: InfinityIcon,
      color: "#a855f7",
      bg: "rgba(168,85,247,0.08)",
      border: "rgba(168,85,247,0.2)",
      count: stats.lifetime.count,
      total: stats.lifetime.total,
    },
  ];

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
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : (
          <>
            <p className="text-4xl font-extrabold tracking-tight text-foreground">
              {formatINR(stats.grandTotal)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.monthly.count + stats.yearly.count + stats.lifetime.count} paying admins
            </p>
          </>
        )}
      </div>

      {/* 3 Plan Cards — always side by side */}
      <div className="grid grid-cols-3 gap-2">
        {plans.map(({ key, label, icon: Icon, color, bg, border, count, total }) => (
          <div
            key={key}
            className="rounded-xl border p-3 flex flex-col gap-2 overflow-hidden"
            style={{ background: bg, borderColor: border }}
          >
            {/* Icon + Label */}
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: color + "22" }}
              >
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <p className="text-[10px] font-bold text-center leading-tight" style={{ color }}>
                {label}
              </p>
            </div>

            {/* Revenue */}
            {isLoading ? (
              <Skeleton className="h-6 w-full" />
            ) : (
              <div className="text-center">
                <p className="text-base font-extrabold leading-tight" style={{ color }}>
                  {formatINR(total)}
                </p>
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  {count} admin{count !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground text-center pb-2">
        Calculated from each admin's registered plan · Enterprise excluded
      </p>
    </div>
  );
}
