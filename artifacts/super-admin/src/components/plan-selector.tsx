import { useQuery } from "@tanstack/react-query";
import { PlanSelector as LibPlanSelector, DEFAULT_PRICING_CONFIG, type PricingConfigData, type PlanId } from "@workspace/pricing";

export type { PlanId };

interface Props {
  selected: PlanId | null;
  onChange: (id: PlanId) => void;
}

async function fetchPricingConfig(): Promise<PricingConfigData> {
  const res = await fetch("/api/settings/pricing");
  if (!res.ok) throw new Error("Failed to fetch pricing");
  const data = await res.json();
  return data.plans;
}

export default function PlanSelector(props: Props) {
  const { data: config } = useQuery<PricingConfigData>({
    queryKey: ["pricing-config"],
    queryFn: fetchPricingConfig,
    staleTime: 5 * 60 * 1000,
    retry: false,
    placeholderData: DEFAULT_PRICING_CONFIG,
  });

  return <LibPlanSelector {...props} config={config ?? DEFAULT_PRICING_CONFIG} />;
}
