import { useMemo, useState, useEffect, useCallback } from "react";
import { useListAdmins } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TrendingUp,
  CalendarDays,
  Star,
  Shirt,
  Megaphone,
  Trophy,
  Medal,
  Crown,
  Tag,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  ArrowLeft,
} from "lucide-react";

import { BASE, authHeaders, authFetch } from "@/lib/admin-api";

/* ── Types ──────────────────────────────────────────────────────────────────── */
interface StatsOverview {
  totalTryOn: number;
  totalAds: number;
}

type StoreTypeObj = { name: string; category: string };

/* ── Helpers ────────────────────────────────────────────────────────────────── */
function parsePrice(v: string | null | undefined): number {
  if (!v) return 0;
  const n = Number(v.replace(/[₹,\s]/g, ""));
  return isNaN(n) ? 0 : n;
}

interface PricingPlan {
  id: string;
  name: string;
  price: string;
  durationDays: number | null;
}

function rupees(n: number): string {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(2)}L`;
  if (n >= 1_000)     return `₹${n.toLocaleString("en-IN")}`;
  return `₹${n}`;
}

/* ── Plan card color palette (cycles through created plans) ──────────────────── */
const PLAN_STYLES = [
  {
    Icon: CalendarDays,
    cardCls: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800/40",
    iconCls: "bg-blue-100 dark:bg-blue-900/40",
    iconColor: "text-blue-500",
    valueCls: "text-blue-600 dark:text-blue-400",
    labelCls: "text-blue-500",
  },
  {
    Icon: Star,
    cardCls: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/40",
    iconCls: "bg-amber-100 dark:bg-amber-900/40",
    iconColor: "text-amber-500",
    valueCls: "text-amber-600 dark:text-amber-400",
    labelCls: "text-amber-500",
  },
  {
    Icon: Crown,
    cardCls: "bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800/40",
    iconCls: "bg-purple-100 dark:bg-purple-900/40",
    iconColor: "text-purple-500",
    valueCls: "text-purple-600 dark:text-purple-400",
    labelCls: "text-purple-500",
  },
  {
    Icon: Tag,
    cardCls: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/40",
    iconCls: "bg-emerald-100 dark:bg-emerald-900/40",
    iconColor: "text-emerald-500",
    valueCls: "text-emerald-600 dark:text-emerald-400",
    labelCls: "text-emerald-500",
  },
  {
    Icon: Medal,
    cardCls: "bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800/40",
    iconCls: "bg-rose-100 dark:bg-rose-900/40",
    iconColor: "text-rose-500",
    valueCls: "text-rose-600 dark:text-rose-400",
    labelCls: "text-rose-500",
  },
  {
    Icon: Trophy,
    cardCls: "bg-cyan-50 border-cyan-200 dark:bg-cyan-950/30 dark:border-cyan-800/40",
    iconCls: "bg-cyan-100 dark:bg-cyan-900/40",
    iconColor: "text-cyan-500",
    valueCls: "text-cyan-600 dark:text-cyan-400",
    labelCls: "text-cyan-500",
  },
];

/* ── Category Page ───────────────────────────────────────────────────────────── */
function CategoryPage({ onClose, onSaved, categories }: {
  onClose: () => void; onSaved: () => void; categories: string[];
}) {
  const [name, setName] = useState("");
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [deletingCat, setDeletingCat] = useState<string | null>(null);

  function startEdit(cat: string) { setEditingCat(cat); setEditName(cat); }
  function cancelEdit() { setEditingCat(null); setEditName(""); }

  async function add() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const r = await fetch(`${BASE}/marketing/categories`, {
        method: "POST", headers: authHeaders(), body: JSON.stringify({ name: name.trim() }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || "Failed"); }
      toast({ title: "Category added" });
      setName("");
      onSaved();
    } catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  }

  async function saveEdit() {
    if (!editName.trim() || !editingCat) return;
    setSaving(true);
    try {
      const r = await fetch(`${BASE}/marketing/categories/${encodeURIComponent(editingCat)}`, {
        method: "PUT", headers: authHeaders(), body: JSON.stringify({ name: editName.trim() }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || "Failed"); }
      toast({ title: "Category renamed" });
      cancelEdit();
      onSaved();
    } catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  }

  async function deleteCat(cat: string) {
    setDeletingCat(cat);
    try {
      const r = await fetch(`${BASE}/marketing/categories/${encodeURIComponent(cat)}`, {
        method: "DELETE", headers: authHeaders(),
      });
      if (!r.ok) throw new Error("Failed to delete");
      toast({ title: "Category deleted" });
      onSaved();
    } catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
    finally { setDeletingCat(null); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-white shrink-0">
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <h2 className="font-bold text-base text-gray-900">Add Store Category</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex gap-2">
          <Input placeholder="Category name" value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && add()} autoFocus />
          <Button onClick={add} disabled={saving || !name.trim()} className="shrink-0 bg-purple-600 hover:bg-purple-700 text-white px-5">
            {saving ? "…" : "Add"}
          </Button>
        </div>

        {categories.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Added Categories</p>
            <div className="divide-y divide-gray-100 border rounded-lg overflow-hidden bg-white">
              {categories.map(cat => (
                <div key={cat} className="px-4 py-3">
                  {editingCat === cat ? (
                    <div className="flex gap-2 items-center">
                      <Input value={editName} onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                        className="h-8 text-sm flex-1" autoFocus />
                      <button onClick={saveEdit} disabled={saving} className="text-purple-600 hover:text-purple-800 p-1">
                        <Check size={15} />
                      </button>
                      <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600 p-1">
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-800 font-medium">{cat}</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 rounded hover:bg-purple-50 text-purple-500">
                            <Edit2 size={14} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => startEdit(cat)}>
                            <Edit2 size={13} className="mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" disabled={deletingCat === cat}
                            onClick={() => deleteCat(cat)}>
                            <Trash2 size={13} className="mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Store Type Page ─────────────────────────────────────────────────────────── */
function StoreTypePage({ onClose, onSaved, categories, storeTypes }: {
  onClose: () => void; onSaved: () => void;
  categories: string[]; storeTypes: StoreTypeObj[];
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "");
  const [editingType, setEditingType] = useState<StoreTypeObj | null>(null);
  const [editName, setEditName] = useState("");
  const [editCat, setEditCat] = useState("");
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [deletingType, setDeletingType] = useState<string | null>(null);

  useEffect(() => {
    if (!category && categories.length > 0) setCategory(categories[0]);
  }, [categories]);

  function startEdit(st: StoreTypeObj) { setEditingType(st); setEditName(st.name); setEditCat(st.category); }
  function cancelEdit() { setEditingType(null); setEditName(""); setEditCat(""); }

  async function add() {
    if (!name.trim() || !category) return;
    setSaving(true);
    try {
      const r = await fetch(`${BASE}/marketing/store-types`, {
        method: "POST", headers: authHeaders(), body: JSON.stringify({ name: name.trim(), category }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || "Failed"); }
      toast({ title: "Store type added" });
      setName("");
      onSaved();
    } catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  }

  async function saveEdit() {
    if (!editName.trim() || !editingType) return;
    setSaving(true);
    try {
      const r = await fetch(`${BASE}/marketing/store-types/${encodeURIComponent(editingType.name)}`, {
        method: "PUT", headers: authHeaders(), body: JSON.stringify({ name: editName.trim(), category: editCat }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || "Failed"); }
      toast({ title: "Store type updated" });
      cancelEdit();
      onSaved();
    } catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  }

  async function deleteType(st: StoreTypeObj) {
    setDeletingType(st.name);
    try {
      const r = await fetch(`${BASE}/marketing/store-types/${encodeURIComponent(st.name)}`, {
        method: "DELETE", headers: authHeaders(),
      });
      if (!r.ok) throw new Error("Failed to delete");
      toast({ title: "Store type deleted" });
      onSaved();
    } catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
    finally { setDeletingType(null); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-white shrink-0">
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <h2 className="font-bold text-base text-gray-900">Add Store Type</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-3">
          <Input placeholder="Store type name" value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && add()} autoFocus />
          {categories.length === 0 ? (
            <p className="text-sm text-destructive">Add a category first before adding store types.</p>
          ) : (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Select Category</p>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button key={cat} type="button" onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-sm border font-medium transition-all ${category === cat
                      ? "bg-orange-500 text-white border-orange-500"
                      : "border-gray-200 text-gray-600 hover:border-orange-400"}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}
          <Button onClick={add} disabled={saving || !name.trim() || !category || categories.length === 0}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white">
            {saving ? "Adding…" : "Add Store Type"}
          </Button>
        </div>

        {storeTypes.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Added Store Types</p>
            <div className="space-y-3">
              {categories.filter(cat => storeTypes.some(s => s.category === cat)).map(cat => (
                <div key={cat}>
                  <p className="text-xs font-semibold text-orange-500 mb-1.5 px-1">{cat}</p>
                  <div className="divide-y divide-gray-100 border rounded-lg overflow-hidden bg-white">
                    {storeTypes.filter(s => s.category === cat).map(st => (
                      <div key={st.name} className="px-4 py-3">
                        {editingType?.name === st.name ? (
                          <div className="space-y-2">
                            <Input value={editName} onChange={e => setEditName(e.target.value)}
                              onKeyDown={e => { if (e.key === "Escape") cancelEdit(); }}
                              className="h-8 text-sm" autoFocus />
                            <div className="flex flex-wrap gap-1">
                              {categories.map(c => (
                                <button key={c} type="button" onClick={() => setEditCat(c)}
                                  className={`px-2 py-0.5 rounded-full text-xs border transition-all ${editCat === c
                                    ? "bg-orange-500 text-white border-orange-500"
                                    : "border-gray-200 text-gray-500 hover:border-orange-300"}`}>
                                  {c}
                                </button>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <button onClick={saveEdit} disabled={saving} className="text-orange-500 hover:text-orange-700 p-1">
                                <Check size={14} />
                              </button>
                              <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600 p-1">
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-800 font-medium">{st.name}</span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1.5 rounded hover:bg-orange-50 text-orange-400">
                                  <Edit2 size={14} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => startEdit(st)}>
                                  <Edit2 size={13} className="mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" disabled={deletingType === st.name}
                                  onClick={() => deleteType(st)}>
                                  <Trash2 size={13} className="mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────────── */
export default function Revenue() {
  /* data */
  const { data: admins = [], isLoading: adminsLoading } = useListAdmins({});

  const { data: overview, isLoading: statsLoading } = useQuery<StatsOverview>({
    queryKey: ["admins-stats-overview"],
    queryFn: async () => {
      const res = await authFetch("/api/admins/stats-overview");
      if (!res.ok) throw new Error("Failed to load stats");
      return res.json();
    },
    staleTime: 60_000,
    retry: 2,
  });

  const { data: pricingData, isLoading: plansLoading } = useQuery({
    queryKey: ["pricing-plans"],
    queryFn: async () => {
      const res = await fetch("/api/pricing");
      if (!res.ok) throw new Error("Failed to load plans");
      return res.json() as Promise<{ plans: PricingPlan[] }>;
    },
    staleTime: 30_000,
  });
  const pricingPlans = pricingData?.plans ?? [];

  /* revenue breakdown */
  const rev = useMemo(() => {
    const perPlan = pricingPlans.map((plan) => {
      const planNameLc = plan.name.trim().toLowerCase();
      let count = 0;
      let total = 0;
      for (const a of admins) {
        const planName = ((a as any).planName as string ?? "").trim().toLowerCase();
        if (planName === planNameLc) {
          count++;
          total += parsePrice((a as any).planPrice);
        }
      }
      return { ...plan, count, total };
    });

    const grand  = admins.reduce((sum, a) => sum + parsePrice((a as any).planPrice), 0);
    const paying = admins.filter((a) => parsePrice((a as any).planPrice) > 0).length;

    return { perPlan, grand, paying };
  }, [admins, pricingPlans]);

  const totalTryOn = overview?.totalTryOn ?? 0;
  const totalAds   = overview?.totalAds   ?? 0;

  /* category / store-type state */
  const [categories, setCategories] = useState<string[]>([]);
  const [storeTypes, setStoreTypes] = useState<StoreTypeObj[]>([]);
  const [storeTypeCounts, setStoreTypeCounts] = useState<Record<string, number>>({});
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const { toast } = useToast();

  const loadCategories = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/marketing/categories-config`, { headers: authHeaders() });
      if (!r.ok) return;
      const cData = await r.json();
      const cats: string[] = cData.categories ?? [];
      const types: StoreTypeObj[] = (cData.storeTypes ?? []).map((s: any) =>
        typeof s === "string" ? { name: s, category: "" } : s
      );
      setCategories(cats);
      setStoreTypes(types);
      setStoreTypeCounts(cData.storeTypeCounts ?? {});
      if (cats.length > 0) setActiveCategory(prev => prev && cats.includes(prev) ? prev : cats[0]);
    } catch {
      toast({ title: "Failed to load categories", variant: "destructive" });
    }
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  const visibleTypes = activeCategory
    ? storeTypes.filter(s => s.category === activeCategory)
    : [];

  /* ── render ── */
  return (
    <div className="isolate w-full overflow-x-hidden">
      <div className="max-w-2xl mx-auto space-y-5 pb-8">

        {/* ── Header ── */}
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary shrink-0" />
            Revenue &amp; Growth
          </h1>
          <p className="text-muted-foreground text-xs mt-0.5">
            Subscription revenue breakdown across all active plans
          </p>
        </div>

        {/* ── Total Revenue ── */}
        <div className="rounded-2xl border border-border bg-card w-full p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary flex items-center gap-1.5 mb-3">
            <Star className="w-3.5 h-3.5 shrink-0" />
            Total Platform Revenue
          </p>

          {adminsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-36" />
              <Skeleton className="h-4 w-28" />
            </div>
          ) : (
            <>
              <p className="text-4xl font-extrabold tracking-tight text-foreground">
                {rupees(rev.grand)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {rev.paying} paying admin{rev.paying !== 1 ? "s" : ""}
              </p>
            </>
          )}
        </div>

        {/* ── Plan Cards ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none w-full">
          {plansLoading || adminsLoading ? (
            [1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-28 rounded-xl shrink-0" />
            ))
          ) : rev.perPlan.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-border w-full py-6 text-center">
              <Tag className="w-6 h-6 mx-auto text-muted-foreground/30 mb-1.5" />
              <p className="text-xs text-muted-foreground">No plans created yet on the Pricing page</p>
            </div>
          ) : (
            rev.perPlan.map((plan, i) => {
              const { Icon, cardCls, iconCls, iconColor, valueCls, labelCls } = PLAN_STYLES[i % PLAN_STYLES.length];
              return (
                <div
                  key={plan.id}
                  className={`rounded-xl border p-2.5 flex flex-col items-center gap-2 shrink-0 w-28 ${cardCls}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconCls}`}>
                    <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
                  </div>
                  <p className={`text-[10px] font-bold text-center leading-tight line-clamp-2 ${labelCls}`}>
                    {plan.name}
                  </p>
                  <div className="text-center">
                    <p className={`text-sm font-extrabold leading-tight ${valueCls}`}>
                      {rupees(plan.total)}
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      {plan.count} admin{plan.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          Calculated from each admin's registered plan, matched against plans created on the Pricing page
        </p>

        {/* ── Ads & Engagement ── */}
        <div className="w-full">
          <div className="flex items-center gap-2 mb-3">
            <Megaphone className="w-4 h-4 text-primary shrink-0" />
            <h2 className="text-base font-bold">Ads &amp; Engagement</h2>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full">
            {/* Total Virtual Try-On */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800/40 p-4 w-full">
              <div className="flex items-start gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                  <Shirt className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                </div>
                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide leading-snug">
                  Total Virtual<br />Try-On
                </p>
              </div>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {totalTryOn.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">all stores</p>
                </>
              )}
            </div>

            {/* Ads Run */}
            <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800/40 p-4 w-full">
              <div className="flex items-start gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center shrink-0">
                  <Megaphone className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                </div>
                <p className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wide leading-snug">
                  Ads Run
                </p>
              </div>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
                    {totalAds.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">coming soon</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Add Category / Add Store Type buttons ── */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowCatModal(true)}
            className="flex items-center justify-between px-4 py-3 rounded-xl border border-purple-200 bg-white hover:bg-purple-50 transition-colors group">
            <span className="text-sm font-semibold text-purple-600">Add Store Category</span>
            <span className="w-7 h-7 rounded-full border-2 border-purple-500 flex items-center justify-center text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors">
              <Plus size={14} />
            </span>
          </button>
          <button
            onClick={() => setShowTypeModal(true)}
            className="flex items-center justify-between px-4 py-3 rounded-xl border border-orange-200 bg-white hover:bg-orange-50 transition-colors group">
            <span className="text-sm font-semibold text-orange-500">Add Store Type</span>
            <span className="w-7 h-7 rounded-full border-2 border-orange-500 flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
              <Plus size={14} />
            </span>
          </button>
        </div>

        {/* ── Category tabs + store types ── */}
        {categories.length > 0 && (
          <div>
            <div className="flex gap-0 border-b border-gray-200 overflow-x-auto">
              {categories.map(cat => (
                <button key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
                    activeCategory === cat
                      ? "text-purple-600 border-b-2 border-purple-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}>
                  {cat}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <p className="text-sm font-bold text-purple-600 mb-3">Store Type</p>
              {visibleTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No store types yet. Click "Add Store Type" to add one.
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {visibleTypes.map(st => {
                    const countKey = `${st.name}::${st.category}`;
                    const count = (storeTypeCounts[countKey] ?? 0) + (storeTypeCounts[st.name] ?? 0);
                    return (
                      <div key={st.name} className="flex items-center justify-between py-3">
                        <span className="text-sm text-gray-800">{st.name}</span>
                        <span className="text-sm font-semibold text-gray-700">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Full-page overlays */}
      {showCatModal && (
        <CategoryPage
          onClose={() => setShowCatModal(false)}
          onSaved={loadCategories}
          categories={categories}
        />
      )}
      {showTypeModal && (
        <StoreTypePage
          onClose={() => setShowTypeModal(false)}
          onSaved={loadCategories}
          categories={categories}
          storeTypes={storeTypes}
        />
      )}
    </div>
  );
}
