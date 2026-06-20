import { Check } from "lucide-react";
import { motion } from "framer-motion";

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
    features: ["Full Feature Access", "2 Store Login", "Virtual Try-On", "Loyalty Card", "AI Videos", "Online Booking"],
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
    features: ["1 Store Login", "Virtual Try-On", "Loyalty Card", "AI Videos", "Online Booking", "Priority Support"],
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
    features: ["Everything in Premium", "Lifetime Access", "4 Store Login", "2000₹ WMH Coin", "Future Updates", "Priority Support"],
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
    features: ["Unlimited Store Login (with Logo)", "4000₹ WMH Coin", "Premium AI Resources", "Early Access", "VIP Support"],
  },
];

interface PlanSelectorProps {
  selected: PlanId | null;
  onChange: (id: PlanId) => void;
}

export default function PlanSelector({ selected, onChange }: PlanSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-2">
          Choose Plan
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {PLANS.map((plan) => {
          const isSelected = selected === plan.id;
          return (
            <motion.button
              key={plan.id}
              type="button"
              onClick={() => onChange(plan.id)}
              whileTap={{ scale: 0.97 }}
              className={`relative text-left rounded-xl border-2 p-3 transition-all duration-200 bg-[#03020A] ${
                isSelected ? plan.borderActive : "border-white/10 hover:border-white/20"
              }`}
              style={isSelected ? { boxShadow: `0 0 18px ${plan.glow}` } : {}}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                  <Check className={`w-3 h-3 ${plan.checkColor}`} />
                </div>
              )}
              <span className="text-[10px] font-bold text-white uppercase tracking-wider block mb-1">
                {plan.badge}
              </span>
              <p className="text-sm font-semibold text-white leading-tight">{plan.label}</p>
              <p className={`text-base font-extrabold mt-1 ${plan.color}`}>
                {plan.price}{" "}
                <span className="text-xs font-normal text-white/80">{plan.period}</span>
              </p>
              <ul className="mt-2 space-y-1">
                {plan.features.slice(0, 3).map((f) => (
                  <li key={f} className="flex items-center gap-1.5">
                    <Check className={`w-2.5 h-2.5 shrink-0 ${plan.checkColor}`} />
                    <span className="text-[11px] text-white/90 leading-tight">{f}</span>
                  </li>
                ))}
              </ul>
            </motion.button>
          );
        })}
      </div>

      {!selected && (
        <p className="text-xs text-center text-amber-400/80 font-medium">
          ⚠️ Please select a plan to continue
        </p>
      )}
      {selected && (
        <p className="text-xs text-center text-green-400/80 font-medium">
          ✅ {PLANS.find((p) => p.id === selected)?.label} selected
        </p>
      )}
    </div>
  );
}
