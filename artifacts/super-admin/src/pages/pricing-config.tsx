import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_PRICING_CONFIG, PLAN_VISUAL_CONFIG, type PricingConfigData, type PricingPlanData, type PlanId } from "@workspace/pricing";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check, Pencil, Plus, X, Calendar, Clock } from "lucide-react";

const TOKEN_KEY = "wmh_super_token";

const PLAN_TABS: { key: PlanId; emoji: string; label: string }[] = [
  { key: "demo", emoji: "🧪", label: "Starting" },
  { key: "premium", emoji: "⭐", label: "Premium" },
  { key: "lifetime", emoji: "💎", label: "Lifetime" },
  { key: "enterprise", emoji: "🔴", label: "Enterprise" },
];

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
    throw new Error((err as any).error || "Failed to save pricing");
  }
  const data = await res.json();
  return data.plans;
}

function ListEditor({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
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

  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const update = (idx: number, val: string) => {
    const copy = [...items];
    copy[idx] = val;
    onChange(copy);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="space-y-1.5">
        {items.map((item, idx) => (
          <div key={idx} className="flex gap-2">
            <Input value={item} onChange={(e) => update(idx, e.target.value)} className="h-8 text-sm" />
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => remove(idx)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <div className="flex gap-2">
          <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} placeholder={placeholder} className="h-8 text-sm" />
          <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={add}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function PlanViewCard({
  planKey,
  plan,
  onEdit,
}: {
  planKey: PlanId;
  plan: PricingPlanData;
  onEdit: () => void;
}) {
  const vis = PLAN_VISUAL_CONFIG[planKey];
  const accentStyle = { borderColor: `${vis.accentColor}40`, color: vis.accentColor };

  return (
    <Card className="relative overflow-hidden border-2 transition-shadow hover:shadow-md" style={{ borderColor: `${vis.accentColor}30` }}>
      {/* Colored top bar */}
      <div className="h-1 w-full" style={{ background: vis.accentColor }} />

      <CardContent className="pt-5 pb-6 px-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <span
              className="inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider mb-2"
              style={{ background: `${vis.accentColor}15`, color: vis.accentColor }}
            >
              {plan.displayBadge}
            </span>
            <h3 className="text-lg font-bold text-foreground leading-tight">{plan.displayName}</h3>
          </div>
          <Button variant="outline" size="sm" className="shrink-0 gap-1.5 h-8 px-3 text-xs" onClick={onEdit}>
            <Pencil className="h-3 w-3" />
            Edit
          </Button>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-1.5 mb-1">
          <span className="text-3xl font-extrabold" style={{ color: vis.accentColor }}>
            {plan.price}
          </span>
          <span className="text-sm text-muted-foreground">{plan.displayPeriod}</span>
        </div>

        {/* Tagline */}
        <p className="text-sm text-muted-foreground mb-4">{plan.tagline}</p>

        {/* Subscription duration */}
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-4"
          style={{ background: `${vis.accentColor}15`, color: vis.accentColor, border: `1px solid ${vis.accentColor}30` }}
        >
          {plan.subscriptionDays === null ? (
            <>
              <Clock className="h-3 w-3" />
              Lifetime / No expiry
            </>
          ) : (
            <>
              <Calendar className="h-3 w-3" />
              {plan.subscriptionDays} day subscription
            </>
          )}
        </div>

        {/* Savings note */}
        {plan.savingsNote && (
          <div
            className="text-xs font-medium px-3 py-2 rounded-lg mb-4"
            style={{ background: `${vis.accentColor}10`, color: vis.accentColor, border: `1px solid ${vis.accentColor}20` }}
          >
            {plan.savingsNote}
          </div>
        )}

        {/* Features */}
        <div className="space-y-2">
          {plan.features.slice(0, 6).map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 shrink-0" style={{ color: vis.accentColor }} />
              <span className="text-sm text-foreground/80">{f}</span>
            </div>
          ))}
          {plan.features.length > 6 && (
            <p className="text-xs text-muted-foreground pl-5">+{plan.features.length - 6} more features</p>
          )}
        </div>

        {/* Highlights */}
        {plan.highlights.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border space-y-1.5">
            {plan.highlights.slice(0, 4).map((h, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-muted-foreground text-xs mt-0.5">•</span>
                <span className="text-xs text-muted-foreground">{h}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PlanEditDialog({
  planKey,
  plan,
  open,
  onClose,
  onSave,
  saving,
}: {
  planKey: PlanId;
  plan: PricingPlanData;
  open: boolean;
  onClose: () => void;
  onSave: (updated: PricingPlanData) => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState<PricingPlanData>({ ...plan });
  const vis = PLAN_VISUAL_CONFIG[planKey];

  const set = <K extends keyof PricingPlanData>(field: K, value: PricingPlanData[K]) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className="inline-block px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider"
              style={{ background: `${vis.accentColor}15`, color: vis.accentColor }}
            >
              {PLAN_TABS.find((t) => t.key === planKey)?.emoji} {PLAN_TABS.find((t) => t.key === planKey)?.label}
            </span>
            <span className="text-base">Edit Plan</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plan Name</label>
              <Input value={draft.displayName} onChange={(e) => set("displayName", e.target.value)} placeholder="e.g. Premium Annual Plan" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Badge Text</label>
              <Input value={draft.displayBadge} onChange={(e) => set("displayBadge", e.target.value)} placeholder="e.g. ⭐ MOST POPULAR" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Price</label>
              <Input value={draft.price} onChange={(e) => set("price", e.target.value)} placeholder="e.g. ₹5,999" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Period (full, on card)</label>
              <Input value={draft.displayPeriod} onChange={(e) => set("displayPeriod", e.target.value)} placeholder="e.g. / Year  or  One-Time" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Period (short, selector)</label>
              <Input value={draft.shortPeriod} onChange={(e) => set("shortPeriod", e.target.value)} placeholder="e.g. / Year" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tagline</label>
              <Input value={draft.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="e.g. Only around ₹16 per day" />
            </div>
          </div>

          {/* Subscription Days */}
          <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Calendar className="h-3.5 w-3.5" />
              Subscription Duration
            </label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1}
                value={draft.subscriptionDays ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  set("subscriptionDays", val === "" ? null : parseInt(val, 10));
                }}
                placeholder="Leave empty for Lifetime (no expiry)"
                className="max-w-[240px]"
              />
              <span className="text-sm text-muted-foreground">
                {draft.subscriptionDays ? `= ${draft.subscriptionDays} din ka subscription` : "= Lifetime / koi expiry nahi"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Jab kisi admin ka plan renew hoga, tab yahi duration use hogi. Abhi ke subscriptions pe koi asar nahi.
            </p>
          </div>

          {/* Savings Note (lifetime only) */}
          {planKey === "lifetime" && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Savings Banner (optional)</label>
              <Input
                value={draft.savingsNote ?? ""}
                onChange={(e) => set("savingsNote", e.target.value || null)}
                placeholder="e.g. 🔥 Save ₹8,000+ Compared To Renewing Every Year"
              />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ListEditor
              label="Features"
              items={draft.features}
              onChange={(items) => set("features", items)}
              placeholder="Add a feature..."
            />
            <ListEditor
              label="Highlights (bullet points)"
              items={draft.highlights}
              onChange={(items) => set("highlights", items)}
              placeholder="Add a highlight..."
            />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => onSave(draft)} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PricingConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery<PricingConfigData>({
    queryKey: ["pricing-config"],
    queryFn: fetchPricingConfig,
    staleTime: 30_000,
    placeholderData: DEFAULT_PRICING_CONFIG,
  });

  const [editingPlan, setEditingPlan] = useState<PlanId | null>(null);

  const saveMutation = useMutation({
    mutationFn: savePricingConfig,
    onSuccess: (newConfig) => {
      queryClient.setQueryData(["pricing-config"], newConfig);
      setEditingPlan(null);
      toast({ title: "Plan updated", description: "Changes will show everywhere immediately." });
    },
    onError: (err: Error) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const handleSave = async (planKey: PlanId, updated: PricingPlanData) => {
    const currentConfig = config ?? DEFAULT_PRICING_CONFIG;
    await saveMutation.mutateAsync({ ...currentConfig, [planKey]: updated });
  };

  const liveConfig = config ?? DEFAULT_PRICING_CONFIG;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pricing Plans</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Current plans as shown to customers. Click <strong>Edit</strong> on any plan to make changes — updates will appear everywhere instantly.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="h-64 animate-pulse bg-muted/30" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PLAN_TABS.map((tab) => (
            <PlanViewCard
              key={tab.key}
              planKey={tab.key}
              plan={liveConfig[tab.key]}
              onEdit={() => setEditingPlan(tab.key)}
            />
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {editingPlan && (
        <PlanEditDialog
          planKey={editingPlan}
          plan={liveConfig[editingPlan]}
          open={true}
          onClose={() => setEditingPlan(null)}
          onSave={(updated) => handleSave(editingPlan, updated)}
          saving={saveMutation.isPending}
        />
      )}
    </div>
  );
}
