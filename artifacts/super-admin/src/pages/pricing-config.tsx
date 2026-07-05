import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, Tag, Trash2, ChevronDown, ChevronUp, X, Check,
  Clock, Calendar, Pencil, BadgePlus, ChevronRight, GripVertical,
} from "lucide-react";

const TOKEN_KEY = "wmh_super_token";

function authHeaders() {
  const token = sessionStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface PlanCoupon {
  code: string;
  discountedPrice: string;
  maxUses: number;
  usedCount: number;
}

interface Plan {
  id: string;
  badgeText: string;
  name: string;
  price: string;
  durationDays: number | null;
  features: string[];
  coupons: PlanCoupon[];
}

interface PricingData {
  plans: Plan[];
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

// ── API calls ─────────────────────────────────────────────────────────────────
async function fetchPricing(): Promise<PricingData> {
  const res = await fetch("/api/pricing");
  if (!res.ok) throw new Error("Failed to fetch pricing");
  return res.json();
}

async function createPlan(data: Omit<Plan, "id">): Promise<Plan> {
  const res = await fetch("/api/pricing/plans", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).error || "Failed to create plan"); }
  return res.json();
}

async function updatePlan(id: string, data: Partial<Omit<Plan, "id">>): Promise<Plan> {
  const res = await fetch(`/api/pricing/plans/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).error || "Failed to update plan"); }
  return res.json();
}

async function deletePlan(id: string): Promise<void> {
  const res = await fetch(`/api/pricing/plans/${id}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to delete plan");
}

async function reorderPlans(ids: string[]): Promise<PricingData> {
  const res = await fetch("/api/pricing/plans/reorder", {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).error || "Failed to reorder plans"); }
  return res.json();
}

// ── Feature List Editor ───────────────────────────────────────────────────────
function FeatureEditor({ features, onChange }: { features: string[]; onChange: (f: string[]) => void }) {
  const [input, setInput] = useState("");
  const add = () => { const t = input.trim(); if (!t) return; onChange([...features, t]); setInput(""); };
  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
        {features.map((f, i) => (
          <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5 text-sm">
            <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
            <span className="flex-1 text-gray-700">{f}</span>
            <button type="button" onClick={() => onChange(features.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Add a feature..." className="h-9 text-sm" />
        <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={add}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ── Coupon Editor ─────────────────────────────────────────────────────────────
function CouponEditor({ coupons, onChange }: { coupons: PlanCoupon[]; onChange: (c: PlanCoupon[]) => void }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [discountedPrice, setDiscountedPrice] = useState("");
  const [maxUses, setMaxUses] = useState("");

  function addCoupon() {
    const trimCode = code.trim().toUpperCase();
    const uses = parseInt(maxUses, 10);
    const price = discountedPrice.trim();
    if (!trimCode || !uses || !price) return;
    onChange([...coupons, { code: trimCode, discountedPrice: price.startsWith("₹") ? price : `₹${price}`, maxUses: uses, usedCount: 0 }]);
    setCode(""); setDiscountedPrice(""); setMaxUses(""); setOpen(false);
  }

  return (
    <div className="rounded-xl border border-green-200 bg-green-50 overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-100 transition-colors">
        <Tag className="h-4 w-4" />
        <span>Coupon Codes</span>
        {coupons.length > 0 && <span className="ml-1 text-xs font-bold bg-green-600 text-white px-2 py-0.5 rounded-full">{coupons.length}</span>}
        <span className="ml-auto">{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-2 space-y-2 border-t border-green-200">
          {coupons.map((c, i) => (
            <div key={i} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-green-100 text-sm">
              <Tag className="h-3.5 w-3.5 text-green-600 shrink-0" />
              <span className="font-mono font-bold text-green-700">{c.code}</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-semibold">{c.discountedPrice}</span>
              <span className="text-xs text-muted-foreground ml-auto">{c.usedCount ?? 0}/{c.maxUses} used</span>
              <button type="button" onClick={() => onChange(coupons.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-red-600 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="CODE e.g. SAVE50" className="h-9 text-sm font-mono" />
              <Input value={discountedPrice} onChange={(e) => setDiscountedPrice(e.target.value)} placeholder="Price e.g. ₹799" className="h-9 text-sm" />
            </div>
            <div className="flex gap-2">
              <Input value={maxUses} onChange={(e) => setMaxUses(e.target.value.replace(/\D/g, ""))} placeholder="Max uses e.g. 10" className="h-9 text-sm flex-1" />
              <Button type="button" size="sm" className="h-9 bg-green-600 hover:bg-green-700 text-white px-4" onClick={addCoupon}>Add</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Add / Edit Plan Dialog ────────────────────────────────────────────────────
const EMPTY_PLAN = (): Omit<Plan, "id"> => ({
  badgeText: "",
  name: "",
  price: "",
  durationDays: null,
  features: [],
  coupons: [],
});

function PlanFormDialog({
  open, onClose, onSave, saving, initial, title,
}: {
  open: boolean; onClose: () => void;
  onSave: (data: Omit<Plan, "id">) => void;
  saving: boolean;
  initial?: Omit<Plan, "id">;
  title: string;
}) {
  const [draft, setDraft] = useState<Omit<Plan, "id">>(
    initial
      ? { ...initial, coupons: [...initial.coupons], features: [...initial.features] }
      : EMPTY_PLAN()
  );
  const set = <K extends keyof Omit<Plan, "id">>(k: K, v: Omit<Plan, "id">[K]) => setDraft((prev) => ({ ...prev, [k]: v }));

  const priceNum = parseInt(draft.price.replace(/[₹,\s]/g, ""), 10);
  const formattedPrice = !isNaN(priceNum) && priceNum > 0 ? `₹${priceNum.toLocaleString("en-IN")}` : draft.price;

  function handleSave() {
    if (!draft.badgeText.trim() || !draft.name.trim() || !draft.price.trim()) return;
    onSave({ ...draft, price: formattedPrice || draft.price });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BadgePlus className="h-5 w-5 text-orange-500" /> {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">

          {/* Badge text */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">1. Badge Text</label>
            <Input value={draft.badgeText} onChange={(e) => set("badgeText", e.target.value)} placeholder='e.g. ⭐ MOST POPULAR' className="h-10" />
            {draft.badgeText && (
              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700 border border-orange-200">
                {draft.badgeText}
              </span>
            )}
          </div>

          {/* Plan name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">2. Plan Name</label>
            <Input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder='e.g. Premium Annual Plan' className="h-10" />
          </div>

          {/* Price */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">3. Price</label>
            <Input value={draft.price} onChange={(e) => set("price", e.target.value)} placeholder="e.g. ₹999 or 999" className="h-10" />
            {formattedPrice && <p className="text-xs text-muted-foreground">Will show as: <span className="font-bold text-foreground">{formattedPrice}</span></p>}
          </div>

          {/* Plan duration */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">4. Plan Duration (days)</label>
            <div className="flex items-center gap-3">
              <Input type="number" min={1} value={draft.durationDays ?? ""}
                onChange={(e) => { const v = e.target.value; set("durationDays", v === "" ? null : parseInt(v, 10)); }}
                placeholder="Leave empty for Lifetime" className="h-10 max-w-[200px]" />
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                {draft.durationDays ? <Calendar className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                {daysToHuman(draft.durationDays)}
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">5. Features</label>
            <FeatureEditor features={draft.features} onChange={(f) => set("features", f)} />
          </div>

          {/* Coupon codes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">6. Coupon Codes (Super Admin only)</label>
            <CouponEditor coupons={draft.coupons} onChange={(c) => set("coupons", c)} />
          </div>

        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave}
            disabled={saving || !draft.badgeText.trim() || !draft.name.trim() || !draft.price.trim()}
            className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white">
            {saving ? "Saving…" : title}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Plan Detail Dialog ────────────────────────────────────────────────────────
function PlanDetailDialog({
  plan, open, onClose, onEdit, onDelete, deleting,
}: {
  plan: Plan | null; open: boolean; onClose: () => void;
  onEdit: () => void; onDelete: () => void; deleting: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  if (!plan) return null;
  const features = showAll ? plan.features : plan.features.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-orange-100 to-pink-100 text-orange-700 border border-orange-200">
              {plan.badgeText}
            </span>
          </div>
          <DialogTitle className="text-xl font-bold mt-1">{plan.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Price + Validity + Data row */}
          <div className="flex items-start gap-6 py-1">
            <div>
              <p className="text-3xl font-extrabold text-gray-900 leading-none">{plan.price}</p>
            </div>
            <div className="flex gap-6">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Validity</p>
                <p className="text-sm font-bold text-gray-800 mt-0.5">
                  {plan.durationDays ? `${plan.durationDays} days` : "Lifetime"}
                </p>
              </div>
            </div>
          </div>

          {plan.features.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Features</p>
              <div className="space-y-1.5">
                {features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    <span className="text-gray-700">{f}</span>
                  </div>
                ))}
                {plan.features.length > 5 && (
                  <button onClick={() => setShowAll((s) => !s)} className="text-xs text-blue-600 hover:underline pl-5">
                    {showAll ? "Show less" : `+${plan.features.length - 5} more features`}
                  </button>
                )}
              </div>
            </div>
          )}

          {plan.coupons.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Tag className="h-3.5 w-3.5 text-green-600" /> Coupon Codes (Admin Only)
              </p>
              <div className="space-y-1.5">
                {plan.coupons.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm">
                    <span className="font-mono font-bold text-green-700">{c.code}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-semibold">{c.discountedPrice}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{c.usedCount ?? 0}/{c.maxUses} used</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 flex-col sm:flex-row">
          <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5 flex-1">
            <Pencil className="h-3.5 w-3.5" /> Edit Plan
          </Button>
          <Button
            variant="destructive" size="sm" onClick={onDelete} disabled={deleting} className="gap-1.5 flex-1">
            <Trash2 className="h-3.5 w-3.5" /> {deleting ? "Deleting…" : "Delete Plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Jio-style Plan Card ───────────────────────────────────────────────────────
function PlanCard({
  plan, onClick, reorderable, dragHandleProps, isDragging, onMoveUp, onMoveDown, canMoveUp, canMoveDown,
}: {
  plan: Plan; onClick: () => void;
  reorderable?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  isDragging?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}) {
  const PREVIEW_COUNT = 2;
  const visibleFeatures = plan.features.slice(0, PREVIEW_COUNT);
  const hasMore = plan.features.length > PREVIEW_COUNT;
  const validityDisplay = plan.durationDays ? `${plan.durationDays} days` : "Lifetime";

  return (
    <div
      className={`w-full bg-white border rounded-xl px-2 py-2 flex items-center gap-1 transition-all duration-150 ${
        isDragging ? "border-orange-400 shadow-md opacity-70" : "border-gray-200 hover:border-orange-300 hover:shadow-sm"
      }`}
    >
      {reorderable && (
        <div className="flex flex-col items-center shrink-0 gap-0.5">
          <div
            {...dragHandleProps}
            className="cursor-grab active:cursor-grabbing p-1.5 rounded hover:bg-gray-100 text-gray-400"
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <div className="flex flex-col -mt-1">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={!canMoveUp}
              className="text-gray-300 hover:text-orange-500 disabled:opacity-30 disabled:hover:text-gray-300"
              title="Move up"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={!canMoveDown}
              className="text-gray-300 hover:text-orange-500 disabled:opacity-30 disabled:hover:text-gray-300"
              title="Move down"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onClick}
        className="flex-1 min-w-0 text-left px-2 py-1.5 active:scale-[0.99] transition-transform"
      >
        {/* Top row: Price | Validity | Chevron */}
        <div className="flex items-start gap-4">
          {/* Price */}
          <div className="flex-none min-w-[90px]">
            <p className="text-xl font-extrabold text-gray-900 leading-tight">{plan.price}</p>
            {plan.badgeText && (
              <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700 border border-orange-200 leading-none">
                {plan.badgeText}
              </span>
            )}
          </div>

          {/* Validity + Name */}
          <div className="flex gap-6 flex-1 pt-0.5 min-w-0">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Validity</p>
              <p className="text-sm font-bold text-gray-800 mt-0.5">{validityDisplay}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Name</p>
              <p className="text-sm font-bold text-gray-800 mt-0.5 truncate">{plan.name}</p>
            </div>
          </div>

          {/* Chevron */}
          <ChevronRight className="h-5 w-5 text-gray-300 shrink-0 mt-1" />
        </div>

        {/* Features row */}
        {(visibleFeatures.length > 0 || hasMore) && (
          <div className="mt-3 border-t border-gray-100 pt-2.5">
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
              {visibleFeatures.join(" • ")}
              {hasMore && (
                <span className="ml-1 text-orange-500 font-semibold inline-flex items-center gap-0.5">
                  See more <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </p>
          </div>
        )}

        {plan.features.length === 0 && (
          <div className="mt-2.5 border-t border-gray-100 pt-2">
            <p className="text-xs text-gray-300 italic">No features added</p>
          </div>
        )}
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PricingConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [orderedPlans, setOrderedPlans] = useState<Plan[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const { data, isLoading } = useQuery<PricingData>({
    queryKey: ["dynamic-pricing"],
    queryFn: fetchPricing,
    staleTime: 0, // always re-fetch on mount so normalized data is used immediately
    placeholderData: { plans: [] },
  });

  const allPlans = data?.plans ?? [];

  // Keep local reorderable copy in sync with server data
  useMemo(() => {
    setOrderedPlans(allPlans);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(allPlans.map((p) => p.id))]);

  // Filter plans (search disables drag reordering since indices no longer map to full order)
  const isSearching = !!search.trim();
  const filteredPlans = useMemo(() => {
    let plans = orderedPlans;
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
  }, [orderedPlans, search]);

  const reorderMutation = useMutation({
    mutationFn: reorderPlans,
    onSuccess: (data) => { queryClient.setQueryData(["dynamic-pricing"], data); },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      setOrderedPlans(allPlans);
    },
  });

  function commitOrder(next: Plan[]) {
    setOrderedPlans(next);
    reorderMutation.mutate(next.map((p) => p.id));
  }

  function moveTo(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= orderedPlans.length || fromIndex === toIndex) return;
    const next = [...orderedPlans];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    commitOrder(next);
  }

  function handleDrop(index: number) {
    if (dragIndex === null || dragIndex === index) { setDragIndex(null); setDragOverIndex(null); return; }
    moveTo(dragIndex, index);
    setDragIndex(null);
    setDragOverIndex(null);
  }

  // ── Mutations ────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: createPlan,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["dynamic-pricing"] }); setShowAddPlan(false); toast({ title: "Plan created!" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<Plan, "id">> }) => updatePlan(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["dynamic-pricing"] }); setEditingPlan(null); setSelectedPlan(null); toast({ title: "Plan updated!" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePlan,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["dynamic-pricing"] }); setSelectedPlan(null); toast({ title: "Plan deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pricing Plans</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{allPlans.length} plan{allPlans.length !== 1 ? "s" : ""} configured</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="gap-2 h-9 px-4 text-sm font-bold bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white shadow-sm"
            onClick={() => setShowAddPlan(true)}>
            <Plus className="h-4 w-4" />
            Add Plan
          </Button>
        </div>
      </div>

      {/* ── Search bar ─────────────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by price, validity (days), or store..."
          className="pl-10 h-11 bg-white border-gray-200 focus:border-orange-300 rounded-xl text-sm"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Plans list ─────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mb-4">
            <BadgePlus className="h-8 w-8 text-orange-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-700 mb-1">
            {search ? "No plans found" : "No plans yet"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search
              ? "Try a different search"
              : "Click Add Plan to create your first pricing plan"}
          </p>
          {!search && (
            <Button className="bg-gradient-to-r from-orange-500 to-pink-500 text-white gap-2" onClick={() => setShowAddPlan(true)}>
              <Plus className="h-4 w-4" /> Add First Plan
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {isSearching && (
            <p className="text-xs text-muted-foreground italic">Clear search to drag &amp; reorder plans</p>
          )}
          {filteredPlans.map((plan, index) => (
            <div
              key={plan.id}
              onDragOver={(e) => { if (!isSearching) { e.preventDefault(); setDragOverIndex(index); } }}
              onDrop={(e) => { if (!isSearching) { e.preventDefault(); handleDrop(index); } }}
              className={!isSearching && dragOverIndex === index && dragIndex !== null && dragIndex !== index ? "outline outline-2 outline-orange-300 rounded-xl" : ""}
            >
              <PlanCard
                plan={plan}
                onClick={() => setSelectedPlan(plan)}
                reorderable={!isSearching}
                isDragging={dragIndex === index}
                canMoveUp={index > 0}
                canMoveDown={index < filteredPlans.length - 1}
                onMoveUp={() => moveTo(index, index - 1)}
                onMoveDown={() => moveTo(index, index + 1)}
                dragHandleProps={{
                  draggable: true,
                  onDragStart: () => setDragIndex(index),
                  onDragEnd: () => { setDragIndex(null); setDragOverIndex(null); },
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Dialogs ─────────────────────────────────────────────────────────── */}
      <PlanFormDialog
        open={showAddPlan}
        onClose={() => setShowAddPlan(false)}
        onSave={(data) => createMutation.mutate(data)}
        saving={createMutation.isPending}
        title="Add Plan"
      />

      {editingPlan && (
        <PlanFormDialog
          open={true}
          onClose={() => setEditingPlan(null)}
          onSave={(data) => updateMutation.mutate({ id: editingPlan.id, data })}
          saving={updateMutation.isPending}
          initial={editingPlan}
          title="Save Changes"
        />
      )}

      <PlanDetailDialog
        plan={selectedPlan}
        open={!!selectedPlan && !editingPlan}
        onClose={() => setSelectedPlan(null)}
        onEdit={() => { setEditingPlan(selectedPlan); }}
        onDelete={() => selectedPlan && deleteMutation.mutate(selectedPlan.id)}
        deleting={deleteMutation.isPending}
      />
    </div>
  );
}
