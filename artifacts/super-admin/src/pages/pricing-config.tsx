import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, Tag, Trash2, ChevronDown, ChevronUp, X, Check,
  Clock, Calendar, Pencil, BadgePlus, Layers, Store, ChevronRight,
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
  storeTypes: string[];
}

interface StoreTypeObj {
  name: string;
  category: string;
}

interface PricingData {
  plans: Plan[];
  categories: string[];
  storeTypes: string[];          // normalized name strings (for filter chips & plan form)
  rawStoreTypes: StoreTypeObj[]; // full objects (for the store manager dialog)
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
function normalizeStoreTypes(raw: unknown[]): string[] {
  return raw.map((st) => (typeof st === "string" ? st : (st as { name: string }).name));
}

async function fetchPricing(): Promise<PricingData> {
  const res = await fetch("/api/pricing");
  if (!res.ok) throw new Error("Failed to fetch pricing");
  const data = await res.json();
  const rawStoreTypes: StoreTypeObj[] = (data.storeTypes ?? []).map((st: unknown) =>
    typeof st === "string" ? { name: st, category: "" } : st as StoreTypeObj
  );
  return {
    ...data,
    storeTypes: rawStoreTypes.map((st) => st.name),
    rawStoreTypes,
  };
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

async function addCategory(name: string): Promise<string[]> {
  const res = await fetch("/api/pricing/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to add category");
  return (await res.json()).categories;
}

async function removeCategory(name: string): Promise<string[]> {
  const res = await fetch(`/api/pricing/categories/${encodeURIComponent(name)}`, {
    method: "DELETE", headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to remove category");
  return (await res.json()).categories;
}

async function addStoreType({ name, category }: { name: string; category: string }): Promise<string[]> {
  const res = await fetch("/api/pricing/store-types", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ name, category }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).error || "Failed to add store type"); }
  return normalizeStoreTypes((await res.json()).storeTypes ?? []);
}

async function removeStoreType(name: string): Promise<string[]> {
  const res = await fetch(`/api/pricing/store-types/${encodeURIComponent(name)}`, {
    method: "DELETE", headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to remove store type");
  return normalizeStoreTypes((await res.json()).storeTypes ?? []);
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

// ── Store Type Manager Dialog (name + category required) ─────────────────────
function StoreTypeMgrDialog({
  open, onClose, allCategories, rawStoreTypes, onAdd, onRemove, adding, removing,
}: {
  open: boolean; onClose: () => void;
  allCategories: string[];
  rawStoreTypes: StoreTypeObj[];
  onAdd: (name: string, category: string) => void;
  onRemove: (name: string) => void;
  adding: boolean; removing: string | null;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");

  function handleAdd() {
    const n = name.trim();
    const c = category.trim();
    if (!n || !c) return;
    onAdd(n, c);
    setName("");
    setCategory("");
  }

  // Group by category for display
  const grouped = allCategories.map((cat) => ({
    cat,
    types: rawStoreTypes.filter((st) => st.category === cat),
  })).filter((g) => g.types.length > 0);
  const uncategorized = rawStoreTypes.filter((st) => !st.category || !allCategories.includes(st.category));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-orange-500" /> Store Types
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          {/* Add form */}
          <div className="space-y-2 p-3 bg-orange-50 border border-orange-100 rounded-xl">
            <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Add Store Type</p>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
              placeholder="Store type name e.g. Men's wear"
              className="h-9 text-sm"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select category…</option>
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <Button
              size="sm"
              className="h-9 px-4 text-white bg-orange-500 hover:bg-orange-600 w-full"
              onClick={handleAdd}
              disabled={adding || !name.trim() || !category.trim()}
            >
              {adding ? "Adding…" : "Add Store Type"}
            </Button>
          </div>

          {/* Existing list */}
          {rawStoreTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No store types yet. Add one above.</p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {grouped.map(({ cat, types }) => (
                <div key={cat}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 px-1">{cat}</p>
                  <div className="space-y-1">
                    {types.map((st) => (
                      <div key={st.name} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5">
                        <span className="flex-1 text-sm font-medium text-gray-700">{st.name}</span>
                        <button type="button" onClick={() => onRemove(st.name)} disabled={removing === st.name}
                          className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40">
                          {removing === st.name ? <span className="text-xs">…</span> : <X className="h-4 w-4" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {uncategorized.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 px-1">Uncategorized</p>
                  <div className="space-y-1">
                    {uncategorized.map((st) => (
                      <div key={st.name} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5">
                        <span className="flex-1 text-sm font-medium text-gray-700">{st.name}</span>
                        <button type="button" onClick={() => onRemove(st.name)} disabled={removing === st.name}
                          className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40">
                          {removing === st.name ? <span className="text-xs">…</span> : <X className="h-4 w-4" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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

// ── Generic Tag Manager Dialog ─────────────────────────────────────────────────
function TagManagerDialog({
  open, onClose, title, icon, items, onAdd, onRemove, adding, removing, color,
}: {
  open: boolean; onClose: () => void;
  title: string; icon: React.ReactNode;
  items: string[];
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
  adding: boolean; removing: string | null;
  color: string;
}) {
  const [input, setInput] = useState("");
  function handleAdd() {
    const t = input.trim();
    if (!t) return;
    onAdd(t);
    setInput("");
  }
  const colorMap: Record<string, { btn: string; badge: string; tag: string }> = {
    violet: { btn: "bg-violet-600 hover:bg-violet-700", badge: "bg-violet-600", tag: "bg-violet-50 text-violet-700 border-violet-200" },
    orange: { btn: "bg-orange-500 hover:bg-orange-600", badge: "bg-orange-500", tag: "bg-orange-50 text-orange-700 border-orange-200" },
  };
  const c = colorMap[color] ?? colorMap.violet;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icon} {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
              placeholder={`New ${title.toLowerCase()} name...`}
              className="h-9 text-sm"
            />
            <Button size="sm" className={`h-9 px-4 text-white ${c.btn}`} onClick={handleAdd} disabled={adding}>
              {adding ? "..." : "Add"}
            </Button>
          </div>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No items yet. Add one above.</p>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {items.map((item) => (
                <div key={item} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5">
                  <span className="flex-1 text-sm font-medium text-gray-700">{item}</span>
                  <button type="button" onClick={() => onRemove(item)} disabled={removing === item}
                    className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40">
                    {removing === item ? <span className="text-xs">...</span> : <X className="h-4 w-4" />}
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
  storeTypes: [],
});

function PlanFormDialog({
  open, onClose, onSave, saving, initial, allCategories, allStoreTypes, title,
}: {
  open: boolean; onClose: () => void;
  onSave: (data: Omit<Plan, "id">) => void;
  saving: boolean;
  initial?: Omit<Plan, "id">;
  allCategories: string[];
  allStoreTypes: string[];
  title: string;
}) {
  const [draft, setDraft] = useState<Omit<Plan, "id">>(
    initial
      ? { ...initial, coupons: [...initial.coupons], features: [...initial.features], categories: [...initial.categories], storeTypes: [...(initial.storeTypes ?? [])] }
      : EMPTY_PLAN()
  );
  const set = <K extends keyof Omit<Plan, "id">>(k: K, v: Omit<Plan, "id">[K]) => setDraft((prev) => ({ ...prev, [k]: v }));

  const priceNum = parseInt(draft.price.replace(/[₹,\s]/g, ""), 10);
  const formattedPrice = !isNaN(priceNum) && priceNum > 0 ? `₹${priceNum.toLocaleString("en-IN")}` : draft.price;

  function toggleCategory(cat: string) {
    set("categories", draft.categories.includes(cat) ? draft.categories.filter((c) => c !== cat) : [...draft.categories, cat]);
  }

  function toggleStoreType(st: string) {
    set("storeTypes", (draft.storeTypes ?? []).includes(st) ? (draft.storeTypes ?? []).filter((s) => s !== st) : [...(draft.storeTypes ?? []), st]);
  }

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

          {/* Categories */}
          {allCategories.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">7. Categories</label>
              <div className="flex flex-wrap gap-2">
                {allCategories.map((cat) => (
                  <button key={cat} type="button" onClick={() => toggleCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                      draft.categories.includes(cat)
                        ? "bg-violet-600 text-white border-violet-600"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:border-violet-300"
                    }`}>
                    {draft.categories.includes(cat) && <Check className="inline h-3 w-3 mr-1" />}
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Store types */}
          {allStoreTypes.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">8. Store (for "Data" field on card)</label>
              <div className="flex flex-wrap gap-2">
                {allStoreTypes.map((st) => (
                  <button key={st} type="button" onClick={() => toggleStoreType(st)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                      (draft.storeTypes ?? []).includes(st)
                        ? "bg-orange-500 text-white border-orange-500"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:border-orange-300"
                    }`}>
                    {(draft.storeTypes ?? []).includes(st) && <Check className="inline h-3 w-3 mr-1" />}
                    {st}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Selected store shows in the "Data" field of the plan card.</p>
            </div>
          )}
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
              {(plan.storeTypes ?? []).length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Store</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">{(plan.storeTypes ?? []).join(", ")}</p>
                </div>
              )}
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
function PlanCard({ plan, onClick }: { plan: Plan; onClick: () => void }) {
  const PREVIEW_COUNT = 2;
  const visibleFeatures = plan.features.slice(0, PREVIEW_COUNT);
  const hasMore = plan.features.length > PREVIEW_COUNT;
  const storeDisplay = (plan.storeTypes ?? []).length > 0
    ? (plan.storeTypes ?? []).join(", ")
    : "All Stores";
  const validityDisplay = plan.durationDays ? `${plan.durationDays} days` : "Lifetime";

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-white border border-gray-200 rounded-xl px-4 py-3.5 hover:border-orange-300 hover:shadow-sm transition-all duration-150 active:scale-[0.99]"
    >
      {/* Top row: Price | Validity | Data | Chevron */}
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

        {/* Validity + Data */}
        <div className="flex gap-6 flex-1 pt-0.5">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Validity</p>
            <p className="text-sm font-bold text-gray-800 mt-0.5">{validityDisplay}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Store</p>
            <p className="text-sm font-bold text-gray-800 mt-0.5 truncate max-w-[110px]">{storeDisplay}</p>
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
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PricingConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const storeScrollRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState("");
  const [activeStore, setActiveStore] = useState("all");
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [showCategoryMgr, setShowCategoryMgr] = useState(false);
  const [showStoreMgr, setShowStoreMgr] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const [addingCategory, setAddingCategory] = useState(false);
  const [removingCategory, setRemovingCategory] = useState<string | null>(null);
  const [addingStore, setAddingStore] = useState(false);
  const [removingStore, setRemovingStore] = useState<string | null>(null);

  const { data, isLoading } = useQuery<PricingData>({
    queryKey: ["dynamic-pricing"],
    queryFn: fetchPricing,
    staleTime: 0, // always re-fetch on mount so normalized data is used immediately
    placeholderData: { plans: [], categories: [], storeTypes: [], rawStoreTypes: [] },
  });

  const allCategories = data?.categories ?? [];
  const allStoreTypes = data?.storeTypes ?? [];
  const allRawStoreTypes = data?.rawStoreTypes ?? [];
  const allPlans = data?.plans ?? [];

  // Filter plans
  const filteredPlans = useMemo(() => {
    let plans = allPlans;
    if (activeStore !== "all") {
      plans = plans.filter((p) => (p.storeTypes ?? []).includes(activeStore));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      plans = plans.filter(
        (p) =>
          p.price.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          String(p.durationDays ?? "").includes(q) ||
          (p.storeTypes ?? []).some((s) => s.toLowerCase().includes(q))
      );
    }
    return plans;
  }, [allPlans, activeStore, search]);

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

  const addCatMutation = useMutation({
    mutationFn: addCategory,
    onMutate: () => setAddingCategory(true),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["dynamic-pricing"] }); setAddingCategory(false); toast({ title: "Category added" }); },
    onError: (e: Error) => { setAddingCategory(false); toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });

  const removeCatMutation = useMutation({
    mutationFn: removeCategory,
    onMutate: (name) => setRemovingCategory(name),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["dynamic-pricing"] }); setRemovingCategory(null); toast({ title: "Category removed" }); },
    onError: (e: Error) => { setRemovingCategory(null); toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });

  const addStoreMutation = useMutation({
    mutationFn: ({ name, category }: { name: string; category: string }) => addStoreType({ name, category }),
    onMutate: () => setAddingStore(true),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["dynamic-pricing"] }); setAddingStore(false); toast({ title: "Store type added" }); },
    onError: (e: Error) => { setAddingStore(false); toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });

  const removeStoreMutation = useMutation({
    mutationFn: removeStoreType,
    onMutate: (name) => setRemovingStore(name),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["dynamic-pricing"] }); setRemovingStore(null); toast({ title: "Store removed" }); },
    onError: (e: Error) => { setRemovingStore(null); toast({ title: "Error", description: e.message, variant: "destructive" }); },
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
          <Button variant="outline" size="sm" className="gap-1.5 h-9 text-violet-700 border-violet-200 hover:bg-violet-50 hover:border-violet-400"
            onClick={() => setShowCategoryMgr(true)}>
            <Layers className="h-4 w-4" />
            Category
            {allCategories.length > 0 && (
              <span className="ml-0.5 text-xs font-bold bg-violet-600 text-white px-1.5 py-0.5 rounded-full">{allCategories.length}</span>
            )}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-9 text-orange-700 border-orange-200 hover:bg-orange-50 hover:border-orange-400"
            onClick={() => setShowStoreMgr(true)}>
            <Store className="h-4 w-4" />
            Store
            {allStoreTypes.length > 0 && (
              <span className="ml-0.5 text-xs font-bold bg-orange-500 text-white px-1.5 py-0.5 rounded-full">{allStoreTypes.length}</span>
            )}
          </Button>
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

      {/* ── Store filter chips ──────────────────────────────────────────────── */}
      {allStoreTypes.length > 0 && (
        <div ref={storeScrollRef} className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveStore("all")}
            className={`flex-none px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
              activeStore === "all"
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}
          >
            All
          </button>
          {allStoreTypes.map((st) => (
            <button key={st}
              onClick={() => setActiveStore(st === activeStore ? "all" : st)}
              className={`flex-none px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                activeStore === st
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-white text-gray-600 border-gray-200 hover:border-orange-300"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      )}

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
            {search || activeStore !== "all" ? "No plans found" : "No plans yet"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search || activeStore !== "all"
              ? "Try a different search or store filter"
              : "Click Add Plan to create your first pricing plan"}
          </p>
          {!search && activeStore === "all" && (
            <Button className="bg-gradient-to-r from-orange-500 to-pink-500 text-white gap-2" onClick={() => setShowAddPlan(true)}>
              <Plus className="h-4 w-4" /> Add First Plan
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
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
        allStoreTypes={allStoreTypes}
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
          allStoreTypes={allStoreTypes}
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

      <TagManagerDialog
        open={showCategoryMgr}
        onClose={() => setShowCategoryMgr(false)}
        title="Categories"
        icon={<Layers className="h-5 w-5 text-violet-600" />}
        items={allCategories}
        onAdd={(name) => addCatMutation.mutate(name)}
        onRemove={(name) => removeCatMutation.mutate(name)}
        adding={addingCategory}
        removing={removingCategory}
        color="violet"
      />

      <StoreTypeMgrDialog
        open={showStoreMgr}
        onClose={() => setShowStoreMgr(false)}
        allCategories={allCategories}
        rawStoreTypes={allRawStoreTypes}
        onAdd={(name, category) => addStoreMutation.mutate({ name, category })}
        onRemove={(name) => removeStoreMutation.mutate(name)}
        adding={addingStore}
        removing={removingStore}
      />
    </div>
  );
}
