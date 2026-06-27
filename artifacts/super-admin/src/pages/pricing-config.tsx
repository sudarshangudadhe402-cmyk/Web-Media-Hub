import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, Tag, Trash2, ChevronDown, ChevronUp, X, Check,
  Clock, Calendar, Pencil, BadgePlus, Layers,
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
  categories: string[];
}

interface PricingData {
  plans: Plan[];
  categories: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysToHuman(days: number | null): string {
  if (days === null) return "Lifetime";
  if (days <= 0) return "Lifetime";
  if (days === 1) return "1 day";
  if (days < 7) return `${days} days`;
  if (days < 30) return `${Math.round(days / 7)} week${Math.round(days / 7) > 1 ? "s" : ""}`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months > 1 ? "s" : ""}`;
  const years = +(days / 365).toFixed(1);
  return years === 1 ? "1 year" : `${years} years`;
}

function daysToMonthLabel(days: number | null): string {
  if (days === null) return "Lifetime";
  if (days <= 0) return "Lifetime";
  if (days < 7) return `${days} days`;
  if (days < 30) return `${Math.round(days / 7)} weeks`;
  const months = Math.round(days / 30);
  if (months === 1) return "Monthly";
  if (months === 3) return "Quarterly";
  if (months === 6) return "Half Yearly";
  if (months < 12) return `${months} Months`;
  if (months === 12) return "Yearly";
  return `${Math.round(days / 365)} Years`;
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
  const res = await fetch(`/api/pricing/plans/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete plan");
}

async function addCategory(name: string): Promise<string[]> {
  const res = await fetch("/api/pricing/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to add category");
  const d = await res.json();
  return d.categories;
}

async function removeCategory(name: string): Promise<string[]> {
  const res = await fetch(`/api/pricing/categories/${encodeURIComponent(name)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to remove category");
  const d = await res.json();
  return d.categories;
}

// ── Feature List Editor ───────────────────────────────────────────────────────
function FeatureEditor({ features, onChange }: { features: string[]; onChange: (f: string[]) => void }) {
  const [input, setInput] = useState("");
  const add = () => { const t = input.trim(); if (!t) return; onChange([...features, t]); setInput(""); };
  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
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
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Add a feature..."
          className="h-9 text-sm"
        />
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
          {!open || (
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
          )}
        </div>
      )}
    </div>
  );
}

// ── Category Manager Dialog ───────────────────────────────────────────────────
function CategoryManagerDialog({
  open, onClose, categories, onAdd, onRemove, adding, removing,
}: {
  open: boolean; onClose: () => void;
  categories: string[];
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
  adding: boolean; removing: string | null;
}) {
  const [input, setInput] = useState("");
  function handleAdd() {
    const t = input.trim();
    if (!t) return;
    onAdd(t);
    setInput("");
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-violet-600" /> Manage Categories
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
              placeholder="New category name..."
              className="h-9 text-sm"
            />
            <Button size="sm" className="h-9 px-4 bg-violet-600 hover:bg-violet-700 text-white" onClick={handleAdd} disabled={adding}>
              {adding ? "..." : "Add"}
            </Button>
          </div>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No categories yet. Add one above.</p>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {categories.map((cat) => (
                <div key={cat} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5">
                  <span className="flex-1 text-sm font-medium text-gray-700">{cat}</span>
                  <button
                    type="button"
                    onClick={() => onRemove(cat)}
                    disabled={removing === cat}
                    className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                  >
                    {removing === cat ? <span className="text-xs">...</span> : <X className="h-4 w-4" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  categories: [],
});

function PlanFormDialog({
  open, onClose, onSave, saving, initial, allCategories, title,
}: {
  open: boolean; onClose: () => void;
  onSave: (data: Omit<Plan, "id">) => void;
  saving: boolean;
  initial?: Omit<Plan, "id">;
  allCategories: string[];
  title: string;
}) {
  const [draft, setDraft] = useState<Omit<Plan, "id">>(initial ? { ...initial, coupons: [...initial.coupons], features: [...initial.features], categories: [...initial.categories] } : EMPTY_PLAN());
  const set = <K extends keyof Omit<Plan, "id">>(k: K, v: Omit<Plan, "id">[K]) => setDraft((prev) => ({ ...prev, [k]: v }));

  const priceNum = parseInt(draft.price.replace(/[₹,\s]/g, ""), 10);
  const formattedPrice = !isNaN(priceNum) && priceNum > 0 ? `₹${priceNum.toLocaleString("en-IN")}` : draft.price;

  const monthLabel = daysToHuman(draft.durationDays);

  function toggleCategory(cat: string) {
    set("categories", draft.categories.includes(cat)
      ? draft.categories.filter((c) => c !== cat)
      : [...draft.categories, cat]);
  }

  function handleSave() {
    if (!draft.badgeText.trim() || !draft.name.trim() || !draft.price.trim()) return;
    onSave({
      ...draft,
      price: formattedPrice || draft.price,
    });
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
            <Input
              value={draft.price}
              onChange={(e) => set("price", e.target.value)}
              placeholder="e.g. ₹999 or 999"
              className="h-10"
            />
            {formattedPrice && <p className="text-xs text-muted-foreground">Will show as: <span className="font-bold text-foreground">{formattedPrice}</span></p>}
          </div>

          {/* Plan duration */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">4. Plan Duration (days)</label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1}
                value={draft.durationDays ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  set("durationDays", v === "" ? null : parseInt(v, 10));
                }}
                placeholder="Leave empty for Lifetime"
                className="h-10 max-w-[200px]"
              />
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                {draft.durationDays ? <Calendar className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                {monthLabel}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">System will count subscription start & end date from this duration.</p>
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

          {/* Categories */}
          {allCategories.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categories</label>
              <div className="flex flex-wrap gap-2">
                {allCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                      draft.categories.includes(cat)
                        ? "bg-violet-600 text-white border-violet-600"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:border-violet-300"
                    }`}
                  >
                    {draft.categories.includes(cat) && <Check className="inline h-3 w-3 mr-1" />}
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={saving || !draft.badgeText.trim() || !draft.name.trim() || !draft.price.trim()}
            className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white"
          >
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
  const features = showAll ? plan.features : plan.features.slice(0, 4);

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
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-gray-900">{plan.price}</span>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              {plan.durationDays ? <Calendar className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              {daysToHuman(plan.durationDays)}
              {plan.durationDays && <span className="text-xs">({plan.durationDays} days)</span>}
            </div>
          </div>

          {plan.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {plan.categories.map((c) => (
                <span key={c} className="px-2 py-0.5 rounded-full text-xs bg-violet-100 text-violet-700 font-medium border border-violet-200">{c}</span>
              ))}
            </div>
          )}

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
                {plan.features.length > 4 && (
                  <button
                    onClick={() => setShowAll((s) => !s)}
                    className="text-xs text-blue-600 hover:underline pl-5"
                  >
                    {showAll ? "Show less" : `+${plan.features.length - 4} more features`}
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
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-400"
            onClick={onDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : <><Trash2 className="h-3.5 w-3.5 mr-1" />Delete</>}
          </Button>
          <Button size="sm" className="gap-1" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" /> Edit Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Plan Card (telecom style) ─────────────────────────────────────────────────
function PlanCard({ plan, onClick }: { plan: Plan; onClick: () => void }) {
  const PREVIEW_COUNT = 3;
  const hasMore = plan.features.length > PREVIEW_COUNT;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-orange-300 transition-all duration-200 overflow-hidden group"
    >
      {/* Top stripe */}
      <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500" />

      <div className="p-4 space-y-3">
        {/* Badge */}
        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-gradient-to-r from-orange-50 to-pink-50 text-orange-700 border border-orange-200">
          {plan.badgeText}
        </span>

        {/* Price + Validity row */}
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-2xl font-extrabold text-gray-900 leading-none">{plan.price}</p>
            <div className="flex items-center gap-1 mt-1">
              {plan.durationDays ? (
                <Calendar className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              ) : (
                <Clock className="h-3.5 w-3.5 text-purple-500 shrink-0" />
              )}
              <span className="text-xs text-muted-foreground font-medium">
                {daysToHuman(plan.durationDays)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-800 leading-tight">{plan.name}</p>
            {plan.durationDays && (
              <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-100">
                {daysToMonthLabel(plan.durationDays)}
              </span>
            )}
          </div>
        </div>

        {/* Category chips */}
        {plan.categories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {plan.categories.map((c) => (
              <span key={c} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-50 text-violet-600 border border-violet-100">{c}</span>
            ))}
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-dashed border-gray-200" />

        {/* Features preview */}
        <div className="space-y-1.5">
          {plan.features.slice(0, PREVIEW_COUNT).map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
              <Check className="h-3 w-3 text-green-500 shrink-0" />
              <span className="truncate">{f}</span>
            </div>
          ))}
          {hasMore && (
            <p className="text-xs text-blue-500 font-medium pl-5 group-hover:underline">
              +{plan.features.length - PREVIEW_COUNT} more… see details
            </p>
          )}
          {plan.features.length === 0 && (
            <p className="text-xs text-gray-400 italic">No features added yet</p>
          )}
        </div>

        {plan.coupons.length > 0 && (
          <div className="flex items-center gap-1.5 pt-1">
            <Tag className="h-3 w-3 text-green-600" />
            <span className="text-xs text-green-700 font-medium">{plan.coupons.length} coupon code{plan.coupons.length > 1 ? "s" : ""} available</span>
          </div>
        )}
      </div>
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PricingConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [showCategoryMgr, setShowCategoryMgr] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [removingCategory, setRemovingCategory] = useState<string | null>(null);

  const { data, isLoading } = useQuery<PricingData>({
    queryKey: ["dynamic-pricing"],
    queryFn: fetchPricing,
    staleTime: 30_000,
    placeholderData: { plans: [], categories: [] },
  });

  const allCategories = data?.categories ?? [];
  const allPlans = data?.plans ?? [];

  // Filter plans
  const filteredPlans = useMemo(() => {
    let plans = allPlans;
    if (activeCategory !== "all") {
      plans = plans.filter((p) => p.categories.includes(activeCategory));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      plans = plans.filter(
        (p) => p.name.toLowerCase().includes(q) || p.price.toLowerCase().includes(q)
      );
    }
    return plans;
  }, [allPlans, activeCategory, search]);

  // ── Mutations ────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: createPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dynamic-pricing"] });
      setShowAddPlan(false);
      toast({ title: "Plan created!", description: "New plan added successfully." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<Plan, "id">> }) => updatePlan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dynamic-pricing"] });
      setEditingPlan(null);
      setSelectedPlan(null);
      toast({ title: "Plan updated!", description: "Changes saved." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dynamic-pricing"] });
      setSelectedPlan(null);
      toast({ title: "Plan deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addCatMutation = useMutation({
    mutationFn: addCategory,
    onMutate: () => setAddingCategory(true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dynamic-pricing"] });
      setAddingCategory(false);
      toast({ title: "Category added" });
    },
    onError: (e: Error) => { setAddingCategory(false); toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });

  const removeCatMutation = useMutation({
    mutationFn: removeCategory,
    onMutate: (name) => setRemovingCategory(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dynamic-pricing"] });
      setRemovingCategory(null);
      toast({ title: "Category removed" });
    },
    onError: (e: Error) => { setRemovingCategory(null); toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pricing Plans</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{allPlans.length} plan{allPlans.length !== 1 ? "s" : ""} configured</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-9 text-violet-700 border-violet-200 hover:bg-violet-50 hover:border-violet-400"
            onClick={() => setShowCategoryMgr(true)}
          >
            <Layers className="h-4 w-4" />
            Category
            {allCategories.length > 0 && (
              <span className="ml-0.5 text-xs font-bold bg-violet-600 text-white px-1.5 py-0.5 rounded-full">{allCategories.length}</span>
            )}
          </Button>
          <Button
            className="gap-2 h-10 px-5 text-sm font-bold bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white shadow-md shadow-orange-200 hover:shadow-orange-300 transition-all"
            onClick={() => setShowAddPlan(true)}
          >
            <Plus className="h-4 w-4" />
            Add Plan
          </Button>
        </div>
      </div>

      {/* ── Category tabs ──────────────────────────────────────────────────── */}
      {allCategories.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all border ${
              activeCategory === "all"
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}
          >
            All Plans
          </button>
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat === activeCategory ? "all" : cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all border ${
                activeCategory === cat
                  ? "bg-violet-600 text-white border-violet-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-violet-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* ── Search bar ─────────────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search plans by name or price..."
          className="pl-10 h-11 bg-white border-gray-200 focus:border-orange-300 rounded-xl"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Plans grid ─────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-52 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mb-4">
            <BadgePlus className="h-8 w-8 text-orange-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-700 mb-1">
            {search || activeCategory !== "all" ? "No plans found" : "No plans yet"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search || activeCategory !== "all"
              ? "Try a different search or category"
              : "Click Add Plan to create your first pricing plan"}
          </p>
          {!search && activeCategory === "all" && (
            <Button className="bg-gradient-to-r from-orange-500 to-pink-500 text-white gap-2" onClick={() => setShowAddPlan(true)}>
              <Plus className="h-4 w-4" /> Add First Plan
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} onClick={() => setSelectedPlan(plan)} />
          ))}
        </div>
      )}

      {/* ── Dialogs ─────────────────────────────────────────────────────────── */}
      <PlanFormDialog
        open={showAddPlan}
        onClose={() => setShowAddPlan(false)}
        onSave={(data) => createMutation.mutate(data)}
        saving={createMutation.isPending}
        allCategories={allCategories}
        title="Add Plan"
      />

      {editingPlan && (
        <PlanFormDialog
          open={true}
          onClose={() => setEditingPlan(null)}
          onSave={(data) => updateMutation.mutate({ id: editingPlan.id, data })}
          saving={updateMutation.isPending}
          initial={editingPlan}
          allCategories={allCategories}
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

      <CategoryManagerDialog
        open={showCategoryMgr}
        onClose={() => setShowCategoryMgr(false)}
        categories={allCategories}
        onAdd={(name) => addCatMutation.mutate(name)}
        onRemove={(name) => removeCatMutation.mutate(name)}
        adding={addingCategory}
        removing={removingCategory}
      />
    </div>
  );
}
