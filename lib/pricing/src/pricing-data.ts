export type PlanId = "demo" | "premium" | "lifetime" | "enterprise";

export interface Plan {
  id: PlanId;
  label: string;
  badge: string;
  price: string;
  period: string;
  color: string;
  glow: string;
  borderActive: string;
  checkColor: string;
  features: string[];
}

export interface PlanCoupon {
  code: string;
  discountedPrice: string;
  maxUses: number;
  usedCount: number;
}

export interface SelectedPlan {
  planKey: string;
  badge: string;
  name: string;
  price: string;        // effective price paid (may be coupon-discounted)
  originalPrice: string; // plan's base price before any coupon
  period: string;
  tagline: string;
  color: string;
  features: string[];
  couponCode?: string;
}

export interface PricingPlanData {
  displayName: string;
  displayBadge: string;
  price: string;
  displayPeriod: string;
  shortPeriod: string;
  tagline: string;
  features: string[];
  highlights: string[];
  savingsNote?: string | null;
  subscriptionDays: number | null;
  coupons?: PlanCoupon[];
}

export interface PricingConfigData {
  demo: PricingPlanData;
  premium: PricingPlanData;
  lifetime: PricingPlanData;
  enterprise: PricingPlanData;
}

export const DEFAULT_PRICING_CONFIG: PricingConfigData = {
  demo: {
    displayName: "Starting Plan",
    displayBadge: "🧪 Try First",
    price: "₹999",
    displayPeriod: "/ Month ( 31 Day )",
    shortPeriod: "/ Month",
    tagline: "Perfect for testing the platform before upgrading.",
    features: ["Full Feature Access", "2 Store Login", "Virtual Try-On", "Loyalty Card", "AI Promotional Videos", "Online Booking", "Live Notifications"],
    highlights: ["Low investment to get started", "Full access to all features", "Upgrade anytime"],
    subscriptionDays: 30,
    coupons: [],
  },
  premium: {
    displayName: "Premium Annual Plan",
    displayBadge: "⭐ MOST POPULAR CHOICE",
    price: "₹5,999",
    displayPeriod: "/ Year",
    shortPeriod: "/ Year",
    tagline: "Only around ₹16 per day",
    features: ["1 Store Login", "Virtual Try-On Experience", "Loyalty Card System", "AI Promotional Videos", "Online Booking System", "Smart Product Categories", "Live Customer Notifications", "Free Feature Updates", "Priority Support"],
    highlights: ["Low investment", "High return potential", "Ideal for growing clothing stores", "Recover cost with just a few extra sales", "Recommended for 80% of store owners"],
    subscriptionDays: 365,
    coupons: [],
  },
  lifetime: {
    displayName: "Lifetime Business Plan",
    displayBadge: "🏆 HIGHEST VALUE",
    price: "₹15,999",
    displayPeriod: "One-Time",
    shortPeriod: "One-Time",
    tagline: "Pay Once. Use Forever.",
    features: ["Everything in Premium Annual", "Lifetime Access, No Renewal Ever", "4 Store Login", "₹1000 Web Media Hub Coin", "Future Feature Updates", "Priority Support"],
    highlights: ["One-time investment", "No yearly payments", "Better ROI after first year", "Business asset for life", "Long-term savings"],
    savingsNote: "🔥 Save ₹8,000+ Compared To Renewing Every Year",
    subscriptionDays: null,
    coupons: [],
  },
  enterprise: {
    displayName: "Enterprise Plan",
    displayBadge: "👑 PREMIUM BRAND",
    price: "₹19,999",
    displayPeriod: "One-Time",
    shortPeriod: "One-Time",
    tagline: "Designed for large stores and premium brands.",
    features: ["Unlimited Store Login  ∞", "₹4000 Web Media Hub Coin", "Premium AI Resources", "Early Access Features", "VIP Support"],
    highlights: [],
    subscriptionDays: null,
    coupons: [],
  },
};

export const PLAN_VISUAL_CONFIG = {
  demo: {
    accentColor: "#94a3b8",
    glow: "rgba(255,255,255,0.15)",
    borderActive: "border-white/50",
    checkColor: "text-white",
    color: "text-white/80",
  },
  premium: {
    accentColor: "#FFD700",
    glow: "rgba(255,215,0,0.3)",
    borderActive: "border-[#FFD700]",
    checkColor: "text-[#FFD700]",
    color: "text-[#FFD700]",
  },
  lifetime: {
    accentColor: "#00FF88",
    glow: "rgba(0,255,136,0.3)",
    borderActive: "border-[#00FF88]",
    checkColor: "text-[#00FF88]",
    color: "text-[#00FF88]",
  },
  enterprise: {
    accentColor: "#FF2D2D",
    glow: "rgba(255,45,45,0.3)",
    borderActive: "border-[#FF2D2D]",
    checkColor: "text-[#FF2D2D]",
    color: "text-[#FF2D2D]",
  },
} satisfies Record<PlanId, { accentColor: string; glow: string; borderActive: string; checkColor: string; color: string }>;

export const PLANS: Plan[] = (["demo", "premium", "lifetime", "enterprise"] as PlanId[]).map(
  (id) => ({
    id,
    label: DEFAULT_PRICING_CONFIG[id].displayName,
    badge: DEFAULT_PRICING_CONFIG[id].displayBadge,
    price: DEFAULT_PRICING_CONFIG[id].price,
    period: DEFAULT_PRICING_CONFIG[id].shortPeriod,
    features: DEFAULT_PRICING_CONFIG[id].features,
    ...PLAN_VISUAL_CONFIG[id],
  })
);

export const PLAN_OVERLAY_CONFIG = {
  demo: {
    accentColor: PLAN_VISUAL_CONFIG.demo.accentColor,
    tagline: DEFAULT_PRICING_CONFIG.demo.tagline,
    displayPeriod: DEFAULT_PRICING_CONFIG.demo.displayPeriod,
    displayBadge: DEFAULT_PRICING_CONFIG.demo.displayBadge,
    displayName: DEFAULT_PRICING_CONFIG.demo.displayName,
    highlights: DEFAULT_PRICING_CONFIG.demo.highlights,
  },
  premium: {
    accentColor: PLAN_VISUAL_CONFIG.premium.accentColor,
    tagline: DEFAULT_PRICING_CONFIG.premium.tagline,
    displayPeriod: DEFAULT_PRICING_CONFIG.premium.displayPeriod,
    displayBadge: DEFAULT_PRICING_CONFIG.premium.displayBadge,
    displayName: DEFAULT_PRICING_CONFIG.premium.displayName,
    highlights: DEFAULT_PRICING_CONFIG.premium.highlights,
  },
  lifetime: {
    accentColor: PLAN_VISUAL_CONFIG.lifetime.accentColor,
    tagline: DEFAULT_PRICING_CONFIG.lifetime.tagline,
    displayPeriod: DEFAULT_PRICING_CONFIG.lifetime.displayPeriod,
    displayBadge: DEFAULT_PRICING_CONFIG.lifetime.displayBadge,
    displayName: DEFAULT_PRICING_CONFIG.lifetime.displayName,
    highlights: DEFAULT_PRICING_CONFIG.lifetime.highlights,
  },
  enterprise: {
    accentColor: PLAN_VISUAL_CONFIG.enterprise.accentColor,
    tagline: DEFAULT_PRICING_CONFIG.enterprise.tagline,
    displayPeriod: DEFAULT_PRICING_CONFIG.enterprise.displayPeriod,
    displayBadge: DEFAULT_PRICING_CONFIG.enterprise.displayBadge,
    displayName: DEFAULT_PRICING_CONFIG.enterprise.displayName,
    highlights: DEFAULT_PRICING_CONFIG.enterprise.highlights,
  },
} satisfies Record<PlanId, { accentColor: string; tagline: string; displayPeriod: string; displayBadge: string; displayName: string; highlights: string[] }>;
