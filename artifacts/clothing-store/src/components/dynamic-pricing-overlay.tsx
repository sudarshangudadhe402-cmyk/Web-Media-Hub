import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search, X, Check, ChevronRight, Star, Tag, Ticket } from "lucide-react";

// ── Colors (match create-store.tsx theme) ─────────────────────────────────────
const GOLD = "#D4A017";
const GOLD_BG = "#F5A623";
const BG = "#FAF6EE";
const BORDER = "#E8E0D0";
const HINT = "#9A9485";
const LABEL = "#1A1A1A";

// ── Types ─────────────────────────────────────────────────────────────────────
interface DynamicPlan {
  id: string;
  badgeText: string;
  name: string;
  price: string;
  durationDays: number | null;
  features: string[];
}

interface PricingData {
  plans: DynamicPlan[];
}

export interface SelectedPlan {
  key: string;
  planKey: string;
  badge: string;
  name: string;
  price: string;
  period: string;
  tagline: string;
  color: string;
  features: string[];
  couponCode?: string;
}

interface CouponResult {
  valid: boolean;
  type?: "plan" | "influencer" | "ambassador";
  discountedPrice?: string;
  originalPrice?: string;
  discountPercent?: number;
  savings?: string;
  partnerName?: string;
  error?: string;
}

interface Props {
  onBack: () => void;
  onSelectPlan: (plan: SelectedPlan) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysToHuman(days: number | null): string {
  if (days === null || days <= 0) return "Lifetime";
  if (days === 1) return "1 day";
  if (days < 30) return `${days} days`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months > 1 ? "s" : ""}`;
  const years = +(days / 365).toFixed(1);
  return years === 1 ? "1 year" : `${years} years`;
}

function planToPeriod(days: number | null): string {
  if (days === null || days <= 0) return "Lifetime";
  if (days <= 31) return `/ ${days} Days`;
  const months = Math.round(days / 30);
  if (months < 12) return `/ ${months} Months`;
  if (months === 12) return "/ Year";
  return `/ ${Math.round(days / 365)} Years`;
}

function planToTagline(plan: DynamicPlan): string {
  return plan.durationDays ? `${plan.durationDays}-day plan` : "Lifetime access";
}

async function fetchPricing(): Promise<PricingData> {
  const res = await fetch("/api/pricing");
  if (!res.ok) throw new Error("Failed to fetch pricing");
  return res.json();
}

// ── Plan Card (Jio style) ─────────────────────────────────────────────────────
function PlanCard({ plan, onSelect }: { plan: DynamicPlan; onSelect: () => void }) {
  const validityDisplay = plan.durationDays ? `${plan.durationDays} days` : "Lifetime";
  const PREVIEW = 2;
  const visibleFeatures = plan.features.slice(0, PREVIEW);
  const hasMore = plan.features.length > PREVIEW;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left transition-all active:scale-[0.99]"
      style={{
        background: "white",
        border: `1.5px solid ${BORDER}`,
        borderRadius: "14px",
        padding: "14px 16px",
      }}
    >
      {/* Top row */}
      <div className="flex items-start gap-3">
        {/* Price + badge */}
        <div className="flex-none" style={{ minWidth: "90px" }}>
          <p className="font-extrabold text-lg leading-tight" style={{ color: LABEL }}>{plan.price}</p>
          {plan.badgeText && (
            <span
              className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider leading-none"
              style={{
                background: `${GOLD_BG}20`,
                color: GOLD,
                border: `1px solid ${GOLD_BG}60`,
                borderRadius: "4px",
                padding: "2px 5px",
              }}
            >
              {plan.badgeText}
            </span>
          )}
        </div>

        {/* Validity */}
        <div className="flex gap-5 flex-1 pt-0.5">
          <div>
            <p className="text-[9px] uppercase tracking-wide font-semibold" style={{ color: HINT }}>Validity</p>
            <p className="text-sm font-bold mt-0.5" style={{ color: LABEL }}>{validityDisplay}</p>
          </div>
        </div>

        {/* Chevron */}
        <ChevronRight className="shrink-0 mt-1" style={{ color: BORDER, width: "18px", height: "18px" }} />
      </div>

      {/* Features */}
      {(visibleFeatures.length > 0 || hasMore) && (
        <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: `1px solid ${BORDER}` }}>
          <p className="text-xs leading-relaxed" style={{ color: HINT }}>
            {visibleFeatures.join(" • ")}
            {hasMore && (
              <span className="font-semibold ml-1" style={{ color: GOLD_BG }}>
                See more
              </span>
            )}
          </p>
        </div>
      )}
    </button>
  );
}

// ── Main Overlay ──────────────────────────────────────────────────────────────
export default function DynamicPricingOverlay({ onBack, onSelectPlan }: Props) {
  const [search, setSearch] = useState("");
  const [detailPlan, setDetailPlan] = useState<DynamicPlan | null>(null);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<CouponResult | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const couponInputRef = useRef<HTMLInputElement>(null);

  function openDetail(plan: DynamicPlan) {
    setCouponCode("");
    setCouponResult(null);
    setDetailPlan(plan);
  }

  async function applyCoupon() {
    if (!couponCode.trim() || !detailPlan) return;
    setCouponLoading(true);
    setCouponResult(null);
    try {
      const res = await fetch(
        `/api/pricing/validate-coupon?code=${encodeURIComponent(couponCode.trim())}&planId=${detailPlan.id}`
      );
      const data: CouponResult = await res.json();
      setCouponResult(data);
    } catch {
      setCouponResult({ valid: false, error: "Network error. Please try again." });
    } finally {
      setCouponLoading(false);
    }
  }

  function removeCoupon() {
    setCouponCode("");
    setCouponResult(null);
    setTimeout(() => couponInputRef.current?.focus(), 50);
  }

  const { data, isLoading } = useQuery<PricingData>({
    queryKey: ["dynamic-pricing-public"],
    queryFn: fetchPricing,
    staleTime: 60_000,
    placeholderData: { plans: [] },
  });

  const allPlans = data?.plans ?? [];

  const filteredPlans = useMemo(() => {
    let plans = allPlans;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      plans = plans.filter(
        (p) =>
          p.price.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          String(p.durationDays ?? "").includes(q)
      );
    }
    return plans;
  }, [allPlans, search]);

  function handleSelect(plan: DynamicPlan) {
    const finalPrice =
      couponResult?.valid && couponResult.discountedPrice
        ? couponResult.discountedPrice
        : plan.price;
    const selected: SelectedPlan = {
      key: plan.id,
      planKey: plan.id,
      badge: plan.badgeText,
      name: plan.name,
      price: finalPrice,
      period: planToPeriod(plan.durationDays),
      tagline: planToTagline(plan),
      color: GOLD_BG,
      features: plan.features,
      couponCode: couponResult?.valid ? couponCode.trim().toUpperCase() : undefined,
    };
    onSelectPlan(selected);
  }

  // ── Detail view ───────────────────────────────────────────────────────────
  if (detailPlan) {
    const SHOW_COUNT = 5;
    return (
      <div className="flex flex-col" style={{ height: "100vh", background: BG, overflow: "hidden" }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 shrink-0"
          style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(250,246,238,0.97)" }}>
          <button onClick={() => setDetailPlan(null)}
            className="flex items-center gap-1.5 text-sm font-semibold hover:opacity-70 transition-opacity"
            style={{ color: LABEL }}>
            <ArrowLeft className="w-4 h-4" /> Back to Plans
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5">
          <div className="max-w-md mx-auto space-y-5">
            {/* Plan header card */}
            <div className="bg-white rounded-2xl p-5" style={{ border: `1.5px solid ${BORDER}` }}>
              {detailPlan.badgeText && (
                <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3"
                  style={{ background: `${GOLD_BG}18`, color: GOLD, border: `1px solid ${GOLD_BG}50` }}>
                  {detailPlan.badgeText}
                </span>
              )}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-3xl font-extrabold leading-none" style={{ color: LABEL }}>{detailPlan.price}</p>
                  <p className="text-sm font-medium mt-1" style={{ color: HINT }}>{planToPeriod(detailPlan.durationDays)}</p>
                </div>
                <div className="text-right">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: HINT }}>Validity</p>
                    <p className="text-sm font-bold" style={{ color: LABEL }}>
                      {detailPlan.durationDays ? `${detailPlan.durationDays} days` : "Lifetime"}
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-sm mt-2" style={{ color: HINT }}>{detailPlan.name}</p>
            </div>

            {/* Features */}
            {detailPlan.features.length > 0 && (
              <div className="bg-white rounded-2xl p-5" style={{ border: `1.5px solid ${BORDER}` }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: HINT }}>What's Included</p>
                <div className="space-y-2.5">
                  {detailPlan.features.slice(0, SHOW_COUNT).map((f, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: `${GOLD_BG}20` }}>
                        <Check className="w-2.5 h-2.5" style={{ color: GOLD_BG }} />
                      </div>
                      <span className="text-xs font-medium leading-relaxed" style={{ color: "#333" }}>{f}</span>
                    </div>
                  ))}
                  {detailPlan.features.length > SHOW_COUNT && (
                    <p className="text-xs font-semibold pl-6.5" style={{ color: GOLD }}>
                      +{detailPlan.features.length - SHOW_COUNT} more features included
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Coupon Code Section */}
            <div className="bg-white rounded-2xl p-5" style={{ border: `1.5px solid ${BORDER}` }}>
              <div className="flex items-center gap-2 mb-3">
                <Ticket className="w-4 h-4" style={{ color: GOLD }} />
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: HINT }}>Have a Coupon Code?</p>
              </div>

              {couponResult?.valid ? (
                /* ── Applied state ── */
                <div>
                  <div className="flex items-center justify-between p-3 rounded-xl mb-2"
                    style={{ background: "#F0FAF0", border: "1.5px solid #4CAF50" }}>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-green-700">{couponCode.toUpperCase()} applied!</p>
                        {couponResult.partnerName && (
                          <p className="text-[10px] text-green-600">{couponResult.type === "influencer" ? "Influencer" : "Ambassador"}: {couponResult.partnerName}</p>
                        )}
                      </div>
                    </div>
                    <button onClick={removeCoupon} className="ml-2 p-1 rounded-full hover:bg-green-100 transition-colors">
                      <X className="w-3.5 h-3.5 text-green-600" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <div>
                      <span className="text-xs line-through" style={{ color: HINT }}>{couponResult.originalPrice}</span>
                      <span className="text-base font-extrabold ml-2" style={{ color: LABEL }}>{couponResult.discountedPrice}</span>
                    </div>
                    {couponResult.savings && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#E8F5E9", color: "#2E7D32" }}>
                        Save {couponResult.savings}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                /* ── Input state ── */
                <div>
                  <div className="flex gap-2">
                    <input
                      ref={couponInputRef}
                      type="text"
                      value={couponCode}
                      onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponResult(null); }}
                      onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                      placeholder="Enter coupon code"
                      className="flex-1 outline-none text-sm font-medium uppercase tracking-wider"
                      style={{
                        height: "44px",
                        borderRadius: "10px",
                        border: `1.5px solid ${couponResult?.valid === false ? "#EF5350" : BORDER}`,
                        background: "#FAFAFA",
                        paddingLeft: "12px",
                        paddingRight: "12px",
                        color: LABEL,
                      }}
                      disabled={couponLoading}
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      disabled={!couponCode.trim() || couponLoading}
                      className="font-bold text-white text-sm px-4 rounded-xl shrink-0 transition-opacity"
                      style={{
                        height: "44px",
                        background: couponCode.trim() && !couponLoading
                          ? `linear-gradient(135deg, ${GOLD_BG}, #E8940A)`
                          : "#D4C5A9",
                        opacity: couponCode.trim() && !couponLoading ? 1 : 0.7,
                        cursor: couponCode.trim() && !couponLoading ? "pointer" : "not-allowed",
                      }}
                    >
                      {couponLoading ? "..." : "Apply"}
                    </button>
                  </div>
                  {couponResult?.valid === false && (
                    <p className="text-xs font-medium mt-2 px-1" style={{ color: "#EF5350" }}>
                      {couponResult.error ?? "Invalid coupon code"}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Select button */}
            <button
              type="button"
              onClick={() => handleSelect(detailPlan)}
              className="w-full flex items-center justify-center gap-2 font-bold text-white"
              style={{
                height: "54px",
                borderRadius: "14px",
                background: `linear-gradient(135deg, ${GOLD_BG}, #E8940A)`,
                boxShadow: "0 4px 16px rgba(212,160,23,0.35)",
                fontSize: "15px",
              }}
            >
              <Star className="w-4 h-4 fill-white" />
              {couponResult?.valid ? `Select at ${couponResult.discountedPrice}` : "Select This Plan"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col" style={{ height: "100vh", background: BG, overflow: "hidden" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 shrink-0"
        style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(250,246,238,0.97)" }}>
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-semibold hover:opacity-70 transition-opacity"
          style={{ color: LABEL }}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex-1 text-center">
          <p className="font-bold text-sm" style={{ color: LABEL }}>Select a Plan</p>
        </div>
        <div style={{ width: "60px" }} />
      </div>

      {/* Search bar */}
      <div className="px-4 pt-3 pb-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: HINT }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by price, days, or store..."
            className="w-full outline-none text-sm font-medium"
            style={{
              height: "44px",
              borderRadius: "12px",
              border: `1.5px solid ${BORDER}`,
              background: "white",
              paddingLeft: "40px",
              paddingRight: search ? "40px" : "16px",
              color: LABEL,
            }}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4" style={{ color: HINT }} />
            </button>
          )}
        </div>
      </div>

      {/* Plans list */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {isLoading ? (
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "#EDE8DF" }} />
            ))}
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Tag className="w-10 h-10 mb-3" style={{ color: "#D1D5DB" }} />
            <p className="font-semibold text-sm mb-1" style={{ color: LABEL }}>
              {search ? "No plans found" : "No plans available"}
            </p>
            <p className="text-xs" style={{ color: HINT }}>
              {search ? "Try a different search" : "Plans will appear here once added"}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 pt-1">
            <p className="text-xs font-semibold pb-1" style={{ color: HINT }}>
              Note: Check the plan details before selecting.
            </p>
            {filteredPlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} onSelect={() => openDetail(plan)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
