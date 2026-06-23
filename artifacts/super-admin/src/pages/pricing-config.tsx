import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_PRICING_CONFIG, PLAN_VISUAL_CONFIG, type PricingConfigData, type PricingPlanData, type PlanId, type PlanCoupon } from "@workspace/pricing";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Check, Pencil, Plus, X, Calendar, Clock, Tag, ChevronDown, ChevronUp, Trash2 } from "lucide-react";

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
  label, items, onChange, placeholder,
}: {
  label: string; items: string[]; onChange: (items: string[]) => void; placeholder: string;
}) {
  const [newItem, setNewItem] = useState("");
  const add = () => { const t = newItem.trim(); if (!t) return; onChange([...items, t]); setNewItem(""); };
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const update = (idx: number, val: string) => { const c = [...items]; c[idx] = val; onChange(c); };
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

// ── Coupon form for adding/editing a single coupon ────────────────────────────
function CouponForm({
  initial,
  existingUsedCount,
  onSave,
  onCancel,
  saveLabel = "Add Coupon",
}: {
  initial?: Partial<PlanCoupon>;
  existingUsedCount?: number;
  onSave: (c: PlanCoupon) => void;
  onCancel: () => void;
  saveLabel?: string;
}) {
  const [code, setCode] = useState(initial?.code ?? "");
  const [maxUses, setMaxUses] = useState(String(initial?.maxUses ?? ""));
  const [price, setPrice] = useState(
    initial?.discountedPrice
      ? initial.discountedPrice.replace("₹", "").replace(/,/g, "")
      : ""
  );

  function handleSave() {
    const trimmedCode = code.trim().toUpperCase();
    const uses = parseInt(maxUses, 10);
    const discounted = parseInt(price, 10);
    if (!trimmedCode || !uses || !discounted) return;
    onSave({
      code: trimmedCode,
      discountedPrice: `₹${discounted.toLocaleString("en-IN")}`,
      maxUses: uses,
      usedCount: existingUsedCount ?? initial?.usedCount ?? 0,
    });
  }

  return (
    <div className="border border-green-200 rounded-xl bg-green-50 p-3 space-y-3">
      <div>
        <label className="text-xs text-muted-foreground font-medium mb-1 block">Coupon Code</label>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. SAVE50"
          className="h-9 font-mono tracking-widest"
        />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground font-medium mb-1 block">Max Admins</label>
          <Input
            inputMode="numeric"
            pattern="[0-9]*"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value.replace(/\D/g, ""))}
            placeholder="e.g. 10"
            className="h-9"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-muted-foreground font-medium mb-1 block">Discounted Price (₹)</label>
          <Input
            inputMode="numeric"
            pattern="[0-9]*"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
            placeholder="e.g. 799"
            className="h-9"
          />
        </div>
      </div>
      <div className="flex gap-2 pt-0.5">
        <Button type="button" size="sm" className="bg-green-600 hover:bg-green-700 text-white h-8 px-4" onClick={handleSave}>
          {saveLabel}
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 text-muted-foreground" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ── Coupon history row (saved coupon) ─────────────────────────────────────────
function CouponRow({
  coupon,
  idx,
  onEdit,
  onDelete,
}: {
  coupon: PlanCoupon;
  idx: number;
  onEdit: (idx: number) => void;
  onDelete: (idx: number) => void;
}) {
  const remaining = coupon.maxUses - (coupon.usedCount ?? 0);
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-green-100 text-sm">
      <Tag className="h-3.5 w-3.5 text-green-600 shrink-0" />
      <span className="font-mono font-bold text-green-700 tracking-widest">{coupon.code}</span>
      <span className="text-muted-foreground">→</span>
      <span className="font-semibold text-foreground">{coupon.discountedPrice}</span>
      <span className="text-xs text-muted-foreground ml-auto shrink-0">
        {coupon.usedCount ?? 0}/{coupon.maxUses} used · {remaining} left
      </span>
      <button
        type="button"
        onClick={() => onEdit(idx)}
        className="ml-2 p-1 rounded hover:bg-green-50 text-muted-foreground hover:text-green-700 transition-colors shrink-0"
        title="Edit coupon"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(idx)}
        className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors shrink-0"
        title="Delete coupon"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Full coupon section with multiple coupons ─────────────────────────────────
function CouponSection({
  coupons,
  onChange,
}: {
  coupons: PlanCoupon[];
  onChange: (c: PlanCoupon[]) => void;
}) {
  const [open, setOpen] = useState(coupons.length > 0);
  const [showForm, setShowForm] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  function handleAdd(c: PlanCoupon) {
    onChange([...coupons, c]);
    setShowForm(false);
  }

  function handleEditSave(idx: number, c: PlanCoupon) {
    const next = [...coupons];
    next[idx] = c;
    onChange(next);
    setEditingIdx(null);
  }

  function handleDelete(idx: number) {
    onChange(coupons.filter((_, i) => i !== idx));
  }

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-100 transition-colors"
      >
        <Tag className="h-4 w-4" />
        <span>Coupon Codes</span>
        {coupons.length > 0 && (
          <span className="ml-1 text-xs font-bold bg-green-600 text-white px-2 py-0.5 rounded-full">
            {coupons.length}
          </span>
        )}
        <span className="ml-auto">{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
      </button>

      {open && (
        <div className="px-3 pb-3 pt-2 space-y-2 border-t border-green-200">
          {/* History rows */}
          {coupons.map((c, idx) =>
            editingIdx === idx ? (
              <CouponForm
                key={idx}
                initial={c}
                existingUsedCount={c.usedCount}
                onSave={(updated) => handleEditSave(idx, updated)}
                onCancel={() => setEditingIdx(null)}
                saveLabel="Save Changes"
              />
            ) : (
              <CouponRow
                key={idx}
                coupon={c}
                idx={idx}
                onEdit={setEditingIdx}
                onDelete={handleDelete}
              />
            )
          )}

          {/* Add new coupon form */}
          {showForm ? (
            <CouponForm
              onSave={handleAdd}
              onCancel={() => setShowForm(false)}
              saveLabel="Add Coupon"
            />
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full h-8 border-dashed border-green-300 text-green-700 hover:bg-green-100 hover:border-green-400 gap-1.5"
              onClick={() => { setShowForm(true); setEditingIdx(null); }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Coupon Code
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function PlanViewCard({ planKey, plan, onEdit }: { planKey: PlanId; plan: PricingPlanData; onEdit: () => void }) {
  const vis = PLAN_VISUAL_CONFIG[planKey];
  const coupons = plan.coupons ?? [];
  return (
    <Card className="relative overflow-hidden border-2 transition-shadow hover:shadow-md" style={{ borderColor: `${vis.accentColor}30` }}>
      <div className="h-1 w-full" style={{ background: vis.accentColor }} />
      <CardContent className="pt-5 pb-6 px-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider mb-2" style={{ background: `${vis.accentColor}15`, color: vis.accentColor }}>
              {plan.displayBadge}
            </span>
            <h3 className="text-lg font-bold text-foreground leading-tight">{plan.displayName}</h3>
          </div>
          <Button variant="outline" size="sm" className="shrink-0 gap-1.5 h-8 px-3 text-xs" onClick={onEdit}>
            <Pencil className="h-3 w-3" />Edit
          </Button>
        </div>

        <div className="flex items-baseline gap-1.5 mb-1">
          <span className="text-3xl font-extrabold" style={{ color: vis.accentColor }}>{plan.price}</span>
          <span className="text-sm text-muted-foreground">{plan.displayPeriod}</span>
        </div>
        <p className="text-sm text-muted-foreground mb-3">{plan.tagline}</p>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-3" style={{ background: `${vis.accentColor}15`, color: vis.accentColor, border: `1px solid ${vis.accentColor}30` }}>
          {plan.subscriptionDays === null ? (<><Clock className="h-3 w-3" />Lifetime</>) : (<><Calendar className="h-3 w-3" />{plan.subscriptionDays} day subscription</>)}
        </div>

        {coupons.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {coupons.map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                <Tag className="h-2.5 w-2.5" />{c.code} → {c.discountedPrice}
                <span className="text-green-500">({c.usedCount ?? 0}/{c.maxUses})</span>
              </span>
            ))}
          </div>
        )}

        {plan.savingsNote && (
          <div className="text-xs font-medium px-3 py-2 rounded-lg mb-3" style={{ background: `${vis.accentColor}10`, color: vis.accentColor, border: `1px solid ${vis.accentColor}20` }}>
            {plan.savingsNote}
          </div>
        )}

        <div className="space-y-2">
          {plan.features.slice(0, 5).map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 shrink-0" style={{ color: vis.accentColor }} />
              <span className="text-sm text-foreground/80">{f}</span>
            </div>
          ))}
          {plan.features.length > 5 && <p className="text-xs text-muted-foreground pl-5">+{plan.features.length - 5} more features</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function PlanEditDialog({
  planKey, plan, open, onClose, onSave, saving,
}: {
  planKey: PlanId; plan: PricingPlanData; open: boolean; onClose: () => void;
  onSave: (updated: PricingPlanData) => void; saving: boolean;
}) {
  const [draft, setDraft] = useState<PricingPlanData>({ ...plan, coupons: [...(plan.coupons ?? [])] });
  const vis = PLAN_VISUAL_CONFIG[planKey];
  const set = <K extends keyof PricingPlanData>(field: K, value: PricingPlanData[K]) =>
    setDraft((prev) => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-block px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider" style={{ background: `${vis.accentColor}15`, color: vis.accentColor }}>
              {PLAN_TABS.find((t) => t.key === planKey)?.emoji} {PLAN_TABS.find((t) => t.key === planKey)?.label}
            </span>
            <span className="text-base">Edit Plan</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plan Name</label>
              <Input value={draft.displayName} onChange={(e) => set("displayName", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Badge Text</label>
              <Input value={draft.displayBadge} onChange={(e) => set("displayBadge", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Period (full, on card)</label>
              <Input value={draft.displayPeriod} onChange={(e) => set("displayPeriod", e.target.value)} placeholder="e.g. / Year  or  One-Time" />
            </div>
          </div>

          {/* Coupon Codes — between period and price */}
          <CouponSection
            coupons={draft.coupons ?? []}
            onChange={(c) => set("coupons", c)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Price</label>
              <Input value={draft.price} onChange={(e) => set("price", e.target.value)} placeholder="e.g. ₹5,999" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Period (short, selector)</label>
              <Input value={draft.shortPeriod} onChange={(e) => set("shortPeriod", e.target.value)} placeholder="e.g. / Year" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tagline</label>
              <Input value={draft.tagline} onChange={(e) => set("tagline", e.target.value)} />
            </div>
          </div>

          <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Calendar className="h-3.5 w-3.5" />Subscription Duration
            </label>
            <div className="flex items-center gap-3">
              <Input
                type="number" min={1}
                value={draft.subscriptionDays ?? ""}
                onChange={(e) => { const v = e.target.value; set("subscriptionDays", v === "" ? null : parseInt(v, 10)); }}
                placeholder="Leave empty for Lifetime (no expiry)"
                className="max-w-[240px]"
              />
              <span className="text-sm text-muted-foreground">
                {draft.subscriptionDays ? `= ${draft.subscriptionDays} din ka subscription` : "= Lifetime / koi expiry nahi"}
              </span>
            </div>
          </div>

          {planKey === "lifetime" && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Savings Banner (optional)</label>
              <Input value={draft.savingsNote ?? ""} onChange={(e) => set("savingsNote", e.target.value || null)} placeholder="e.g. 🔥 Save ₹8,000+" />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ListEditor label="Features" items={draft.features} onChange={(items) => set("features", items)} placeholder="Add a feature..." />
            <ListEditor label="Highlights" items={draft.highlights} onChange={(items) => set("highlights", items)} placeholder="Add a highlight..." />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
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

  const liveConfig = config ?? DEFAULT_PRICING_CONFIG;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pricing Plans</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Click <strong>Edit</strong> on any plan to update price, features, or manage coupon codes.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <Card key={i} className="h-64 animate-pulse bg-muted/30" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PLAN_TABS.map((tab) => (
            <PlanViewCard key={tab.key} planKey={tab.key} plan={liveConfig[tab.key]} onEdit={() => setEditingPlan(tab.key)} />
          ))}
        </div>
      )}

      {editingPlan && (
        <PlanEditDialog
          planKey={editingPlan}
          plan={liveConfig[editingPlan]}
          open={true}
          onClose={() => setEditingPlan(null)}
          onSave={(updated) => saveMutation.mutateAsync({ ...liveConfig, [editingPlan]: updated })}
          saving={saveMutation.isPending}
        />
      )}
    </div>
  );
}
