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

export interface SelectedPlan {
  badge: string;
  name: string;
  price: string;
  period: string;
  tagline: string;
  color: string;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: "demo",
    label: "Starting Plan",
    badge: "🧪 Try First",
    price: "₹999",
    period: "/ Month",
    color: "text-white/80",
    glow: "rgba(255,255,255,0.15)",
    borderActive: "border-white/50",
    checkColor: "text-white",
    features: ["Full Feature Access", "2 Store Login", "Virtual Try-On", "Loyalty Card", "AI Promotional Videos", "Online Booking", "Live Notifications"],
  },
  {
    id: "premium",
    label: "Premium Annual",
    badge: "⭐ Most Popular",
    price: "₹5,999",
    period: "/ Year",
    color: "text-[#FFD700]",
    glow: "rgba(255,215,0,0.3)",
    borderActive: "border-[#FFD700]",
    checkColor: "text-[#FFD700]",
    features: ["1 Store Login", "Virtual Try-On Experience", "Loyalty Card System", "AI Promotional Videos", "Online Booking System", "Smart Product Categories", "Live Customer Notifications", "Free Feature Updates", "Priority Support"],
  },
  {
    id: "lifetime",
    label: "Lifetime Business",
    badge: "💎 Best Value",
    price: "₹15,999",
    period: "One-Time",
    color: "text-[#00FF88]",
    glow: "rgba(0,255,136,0.3)",
    borderActive: "border-[#00FF88]",
    checkColor: "text-[#00FF88]",
    features: ["Everything in Premium Annual", "Lifetime Access, No Renewal Ever", "4 Store Login", "₹2000 Web Media Hub Coin", "Future Feature Updates", "Priority Support"],
  },
  {
    id: "enterprise",
    label: "Enterprise",
    badge: "🔴 Enterprise",
    price: "₹19,999",
    period: "One-Time",
    color: "text-[#FF2D2D]",
    glow: "rgba(255,45,45,0.3)",
    borderActive: "border-[#FF2D2D]",
    checkColor: "text-[#FF2D2D]",
    features: ["Unlimited Store Login  ∞", "₹4000 Web Media Hub Coin", "Premium AI Resources", "Early Access Features", "VIP Support"],
  },
];

export const PLAN_OVERLAY_CONFIG = {
  demo: {
    accentColor: "#94a3b8",
    tagline: "Perfect for testing the platform before upgrading.",
    displayPeriod: "/ Month ( 31 Day )",
    displayBadge: "🧪 Try First",
    displayName: "Starting Plan",
    highlights: ["Low investment to get started", "Full access to all features", "Upgrade anytime"],
  },
  premium: {
    accentColor: "#FFD700",
    tagline: "Only around ₹16 per day",
    displayPeriod: "/ Year",
    displayBadge: "⭐ MOST POPULAR CHOICE",
    displayName: "Premium Annual Plan",
    highlights: ["Low investment", "High return potential", "Ideal for growing clothing stores", "Recover cost with just a few extra sales", "Recommended for 80% of store owners"],
  },
  lifetime: {
    accentColor: "#00FF88",
    tagline: "Pay Once. Use Forever.",
    displayPeriod: "One-Time",
    displayBadge: "🏆 HIGHEST VALUE",
    displayName: "Lifetime Business Plan",
    highlights: ["One-time investment", "No yearly payments", "Better ROI after first year", "Business asset for life", "Long-term savings"],
  },
  enterprise: {
    accentColor: "#FF2D2D",
    tagline: "Designed for large stores and premium brands.",
    displayPeriod: "One-Time",
    displayBadge: "👑 PREMIUM BRAND",
    displayName: "Enterprise Plan",
    highlights: [],
  },
} satisfies Record<PlanId, { accentColor: string; tagline: string; displayPeriod: string; displayBadge: string; displayName: string; highlights: string[] }>;
