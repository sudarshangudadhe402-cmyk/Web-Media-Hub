import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { DEFAULT_PRICING_CONFIG, PLAN_VISUAL_CONFIG, type PlanId, type PricingConfigData } from "./pricing-data";

export { DEFAULT_PRICING_CONFIG as PLANS };
export type { PlanId };

interface PlanSelectorProps {
  selected: PlanId | null;
  onChange: (id: PlanId) => void;
  config?: PricingConfigData;
}

const PLAN_IDS: PlanId[] = ["demo", "premium", "lifetime", "enterprise"];

export default function PlanSelector({ selected, onChange, config }: PlanSelectorProps) {
  const cfg = config ?? DEFAULT_PRICING_CONFIG;

  const plans = PLAN_IDS.map((id) => ({
    id,
    label: cfg[id].displayName,
    badge: cfg[id].displayBadge,
    price: cfg[id].price,
    period: cfg[id].shortPeriod,
    features: cfg[id].features,
    ...PLAN_VISUAL_CONFIG[id],
  }));

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
        {plans.map((plan) => {
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
          ✅ {cfg[selected].displayName} selected
        </p>
      )}
    </div>
  );
}
