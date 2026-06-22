import { useQuery } from "@tanstack/react-query";
import { PricingOverlay as LibPricingOverlay, DEFAULT_PRICING_CONFIG, type PricingConfigData, type SelectedPlan } from "@workspace/pricing";

export type { SelectedPlan };

interface Props {
  onBack: () => void;
  onSelectPlan: (plan: SelectedPlan) => void;
}

async function fetchPricingConfig(): Promise<PricingConfigData> {
  const res = await fetch("/api/settings/pricing");
  if (!res.ok) throw new Error("Failed to fetch pricing");
  const data = await res.json();
  return data.plans;
}

export default function PricingOverlay(props: Props) {
  const { data: config } = useQuery<PricingConfigData>({
    queryKey: ["pricing-config"],
    queryFn: fetchPricingConfig,
    staleTime: 5 * 60 * 1000,
    retry: false,
    placeholderData: DEFAULT_PRICING_CONFIG,
  });

  return <LibPricingOverlay {...props} config={config ?? DEFAULT_PRICING_CONFIG} />;
}
