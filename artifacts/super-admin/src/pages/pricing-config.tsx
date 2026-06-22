import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_PRICING_CONFIG, type PricingConfigData, type PricingPlanData } from "@workspace/pricing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Save,
  Plus,
  X,
  RotateCcw,
  Tag,
  DollarSign,
  Calendar,
  AlignLeft,
  Star,
  List,
  Sparkles,
} from "lucide-react";

const TOKEN_KEY = "wmh_super_token";

async function fetchPricingConfig(): Promise<PricingConfigData> {
  const res = await fetch("/api/settings/pricing");
  if (!res.ok) throw new Error("Failed to fetch pricing");
  const data = await res.json();
  return data.plans;
}

async function savePricingConfig(plans: PricingConfigData): Promise<PricingConfigData> {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const res = await fetch("/api/settings/pricing", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ plans }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to save pricing");
  }
  const data = await res.json();
  return data.plans;
}

const PLAN_TABS = [
  { key: "demo" as const, label: "Starting", accent: "#94a3b8", emoji: "🧪" },
  { key: "premium" as const, label: "Premium", accent: "#FFD700", emoji: "⭐" },
  { key: "lifetime" as const, label: "Lifetime", accent: "#00FF88", emoji: "💎" },
  { key: "enterprise" as const, label: "Enterprise", accent: "#FF2D2D", emoji: "🔴" },
];

function ListEditor({
  label,
  icon: Icon,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  icon: React.ElementType;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const [newItem, setNewItem] = useState("");

  const add = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    onChange([...items, trimmed]);
    setNewItem("");
  };

  const remove = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const update = (idx: number, val: string) => {
    const copy = [...items];
    copy[idx] = val;
    onChange(copy);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex gap-2">
            <Input
              value={item}
              onChange={(e) => update(idx, e.target.value)}
              className="h-8 text-sm"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => remove(idx)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <div className="flex gap-2">
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
            placeholder={placeholder}
            className="h-8 text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={add}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function PlanEditor({
  planKey,
  plan,
  accent,
  onChange,
}: {
  planKey: string;
  plan: PricingPlanData;
  accent: string;
  onChange: (updated: PricingPlanData) => void;
}) {
  const set = (field: keyof PricingPlanData, value: string | string[] | null) => {
    onChange({ ...plan, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Tag className="h-3 w-3" /> Plan Name
          </label>
          <Input
            value={plan.displayName}
            onChange={(e) => set("displayName", e.target.value)}
            placeholder="e.g. Premium Annual Plan"
          />
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3 w-3" /> Badge Text
          </label>
          <Input
            value={plan.displayBadge}
            onChange={(e) => set("displayBadge", e.target.value)}
            placeholder="e.g. ⭐ MOST POPULAR"
          />
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <DollarSign className="h-3 w-3" /> Price
          </label>
          <Input
            value={plan.price}
            onChange={(e) => set("price", e.target.value)}
            placeholder="e.g. ₹5,999"
          />
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Calendar className="h-3 w-3" /> Period (full display)
          </label>
          <Input
            value={plan.displayPeriod}
            onChange={(e) => set("displayPeriod", e.target.value)}
            placeholder="e.g. / Year  or  One-Time"
          />
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Calendar className="h-3 w-3" /> Period (short, for selector)
          </label>
          <Input
            value={plan.shortPeriod}
            onChange={(e) => set("shortPeriod", e.target.value)}
            placeholder="e.g. / Year"
          />
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <AlignLeft className="h-3 w-3" /> Tagline
          </label>
          <Input
            value={plan.tagline}
            onChange={(e) => set("tagline", e.target.value)}
            placeholder="e.g. Only around ₹16 per day"
          />
        </div>
      </div>

      {planKey === "lifetime" && (
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Star className="h-3 w-3" /> Savings Note (optional banner)
          </label>
          <Input
            value={plan.savingsNote ?? ""}
            onChange={(e) => set("savingsNote", e.target.value || null)}
            placeholder="e.g. 🔥 Save ₹8,000+ Compared To Renewing Every Year"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ListEditor
          label="Features"
          icon={List}
          items={plan.features}
          onChange={(items) => set("features", items)}
          placeholder="Add a feature..."
        />
        <ListEditor
          label="Highlights (bullet points below features)"
          icon={Star}
          items={plan.highlights}
          onChange={(items) => set("highlights", items)}
          placeholder="Add a highlight..."
        />
      </div>

      <div className="p-3 rounded-lg border" style={{ borderColor: `${accent}30`, background: `${accent}08` }}>
        <p className="text-xs font-medium" style={{ color: accent }}>Preview</p>
        <div className="mt-2 flex flex-wrap gap-2 items-baseline">
          <span className="text-xl font-extrabold text-foreground">{plan.price}</span>
          <span className="text-sm text-muted-foreground">{plan.displayPeriod}</span>
          <Badge variant="outline" className="text-xs">{plan.displayBadge}</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{plan.tagline}</p>
      </div>
    </div>
  );
}

export default function PricingConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: savedConfig, isLoading } = useQuery<PricingConfigData>({
    queryKey: ["pricing-config"],
    queryFn: fetchPricingConfig,
    staleTime: 30_000,
  });

  const [draft, setDraft] = useState<PricingConfigData | null>(null);

  const config = draft ?? savedConfig ?? DEFAULT_PRICING_CONFIG;

  const updatePlan = (key: keyof PricingConfigData, updated: PricingPlanData) => {
    setDraft({ ...config, [key]: updated });
  };

  const resetDraft = () => setDraft(null);

  const isDirty = draft !== null;

  const saveMutation = useMutation({
    mutationFn: savePricingConfig,
    onSuccess: (newConfig) => {
      queryClient.setQueryData(["pricing-config"], newConfig);
      setDraft(null);
      toast({ title: "Pricing saved", description: "All 3 places will now show the updated pricing." });
    },
    onError: (err: Error) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pricing Plans</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Edit plan prices, features, and details. Changes update everywhere — Admin add, Super Admin, and Self Registration.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isDirty && (
            <Button variant="outline" size="sm" onClick={resetDraft} disabled={saveMutation.isPending}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Discard
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => saveMutation.mutate(config)}
            disabled={!isDirty || saveMutation.isPending}
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {saveMutation.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>

      {isDirty && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          You have unsaved changes. Click "Save Changes" to publish them.
        </div>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Loading pricing config…</CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="demo">
          <TabsList className="w-full grid grid-cols-4">
            {PLAN_TABS.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key} className="text-xs sm:text-sm">
                <span className="mr-1">{tab.emoji}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {PLAN_TABS.map((tab) => (
            <TabsContent key={tab.key} value={tab.key} className="mt-4">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span>{tab.emoji}</span>
                    <span>{config[tab.key].displayName}</span>
                    <Badge
                      variant="outline"
                      className="ml-auto font-mono text-xs"
                      style={{ borderColor: `${tab.accent}50`, color: tab.accent }}
                    >
                      {config[tab.key].price}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PlanEditor
                    planKey={tab.key}
                    plan={config[tab.key]}
                    accent={tab.accent}
                    onChange={(updated) => updatePlan(tab.key, updated)}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
