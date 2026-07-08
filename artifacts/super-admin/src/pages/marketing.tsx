import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import {
  TrendingUp, Users, DollarSign, Activity, Plus, Trash2, Edit2,
  Download, Search, ChevronLeft, ChevronRight, X, Check, RefreshCw, Link2, QrCode, MoreVertical, ArrowLeft,
} from "lucide-react";

function partnerLink(type: "influencer" | "ambassador" | "referral", code: string) {
  const origin = window.location.origin;
  return `${origin}/partnership/${type}/${code}`;
}

function copyLink(type: "influencer" | "ambassador" | "referral", code: string, toast: any) {
  const url = partnerLink(type, code);
  navigator.clipboard.writeText(url).then(() => {
    toast({ title: "Link copied!", description: `Partnership link for ${code} copied.` });
  }).catch(() => {
    toast({ title: "Link", description: url });
  });
}

/* ── QR Code Dialog ── */
const TYPE_LABELS: Record<string, string> = { influencer: "Influencer", ambassador: "Ambassador", referral: "Referral Partner" };
const TYPE_COLORS: Record<string, string> = { influencer: "from-cyan-500 to-blue-600", ambassador: "from-violet-500 to-purple-700", referral: "from-amber-500 to-orange-600" };

function QRDialog({ open, onClose, type, code, name }: { open: boolean; onClose: () => void; type: string; code: string; name: string }) {
  const { toast } = useToast();
  const url = partnerLink(type as any, code);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=16&data=${encodeURIComponent(url)}`;

  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => toast({ title: "Link copied!" })).catch(() => {});
  }

  function handleDownload() {
    const a = document.createElement("a");
    a.href = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&margin=20&data=${encodeURIComponent(url)}`;
    a.download = `wmh-partnership-${code}.png`;
    a.target = "_blank";
    a.click();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-center">
            <span className={`inline-block text-transparent bg-clip-text bg-gradient-to-r ${TYPE_COLORS[type] || "from-gray-600 to-gray-800"} font-black text-lg`}>
              Partnership QR
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-1">
          {/* Partner info */}
          <div className="text-center">
            <p className="font-bold text-gray-900 text-base">{name}</p>
            <p className="text-xs text-muted-foreground">{TYPE_LABELS[type] || type}</p>
          </div>

          {/* QR Code */}
          <div className="rounded-2xl border-2 border-gray-100 shadow-sm bg-white p-2 overflow-hidden">
            <img
              src={qrUrl}
              alt={`QR code for ${code}`}
              width={220}
              height={220}
              className="block rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://chart.googleapis.com/chart?chs=220x220&cht=qr&chl=${encodeURIComponent(url)}`;
              }}
            />
          </div>

          {/* Code badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-full border text-sm font-mono font-bold text-gray-700">
            <QrCode className="w-3.5 h-3.5 text-gray-500" />
            {code}
          </div>

          {/* URL (truncated) */}
          <p className="text-[10px] text-muted-foreground text-center break-all leading-relaxed px-1 max-h-10 overflow-hidden" title={url}>
            {url}
          </p>

          {/* Action buttons */}
          <div className="flex gap-2 w-full">
            <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={handleCopy}>
              <Link2 className="w-3.5 h-3.5" /> Copy Link
            </Button>
            <Button size="sm" className="flex-1 gap-1.5 bg-gradient-to-r from-gray-800 to-gray-900 text-white hover:from-gray-700" onClick={handleDownload}>
              <Download className="w-3.5 h-3.5" /> Save QR
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const BASE = "/api";
function token() { return sessionStorage.getItem("wmh_super_token") || ""; }
function authHeaders() { return { "Content-Type": "application/json", Authorization: `Bearer ${token()}` }; }

const SOURCES = ["ORGANIC","GOOGLE_AD","FACEBOOK_AD","INSTAGRAM_AD","YOUTUBE","REFERRAL","AMBASSADOR","INFLUENCER","AFFILIATE","WHATSAPP","DIRECT"];

// Non-deletable: 3 fixed partner types (show live count)
const NON_DELETABLE_KEYS = ["INFLUENCER","AMBASSADOR","REFERRAL"] as const;

// Deletable builtin sources — shown in deletable section with tracking link
const DELETABLE_BUILTIN_KEYS = ["GOOGLE_AD","FACEBOOK_AD","INSTAGRAM_AD","YOUTUBE","AFFILIATE","ORGANIC","WHATSAPP","DIRECT"];

const SOURCE_COLORS: Record<string, string> = {
  ORGANIC:"#22c55e", GOOGLE_AD:"#3b82f6", FACEBOOK_AD:"#6366f1", INSTAGRAM_AD:"#ec4899",
  YOUTUBE:"#ef4444", REFERRAL:"#f59e0b", AMBASSADOR:"#8b5cf6", INFLUENCER:"#06b6d4",
  AFFILIATE:"#14b8a6", WHATSAPP:"#10b981", DIRECT:"#6b7280",
};
const SOURCE_LABELS: Record<string, string> = {
  ORGANIC:"Organic", GOOGLE_AD:"Google Ads", FACEBOOK_AD:"Facebook Ads", INSTAGRAM_AD:"Instagram Ads",
  YOUTUBE:"YouTube", REFERRAL:"Referral", AMBASSADOR:"Ambassador", INFLUENCER:"Influencer",
  AFFILIATE:"Affiliate", WHATSAPP:"WhatsApp", DIRECT:"Direct",
};

const TABS = ["Dashboard","Influencers","Ambassadors","Referral Tracking","Marketing Sources","Revenue Analytics"] as const;
type Tab = typeof TABS[number];

const DATE_RANGES = [
  { label:"Today", value:"today" },
  { label:"Last 7 Days", value:"7d" },
  { label:"Last 30 Days", value:"30d" },
  { label:"Last 90 Days", value:"90d" },
  { label:"This Year", value:"year" },
  { label:"All Time", value:"all" },
  { label:"Custom", value:"custom" },
];

function fmt(n: number | undefined | null) { return (n ?? 0).toLocaleString("en-IN"); }
function fmtRs(n: number | undefined | null) { return `₹${fmt(n)}`; }

/* ── Stat Card ── */
function StatCard({ title, value, sub, icon: Icon, color }: { title: string; value: string; sub?: string; icon: any; color: string }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Mini Sparkline SVG ── */
function Sparkline({ values, color, width = 80, height = 32 }: { values: number[]; color: string; width?: number; height?: number }) {
  if (!values || values.length < 2) {
    return <svg width={width} height={height}><line x1={0} y1={height/2} x2={width} y2={height/2} stroke={color} strokeWidth={1.5} strokeOpacity={0.3} strokeDasharray="3 2" /></svg>;
  }
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const pad = 3;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = pad + ((max - v) / range) * (height - pad * 2);
    return `${x},${y}`;
  });
  const d = `M${pts.join(" L")}`;
  const last = pts[pts.length - 1].split(",");
  const trend = values[values.length - 1] - values[0];
  const trendColor = trend > 0 ? "#16a34a" : trend < 0 ? "#ef4444" : color;
  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <path d={d} fill="none" stroke={trendColor} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill={trendColor} />
    </svg>
  );
}

/* ── Date Filter Bar ── */
function DateFilterBar({ range, setRange, from, setFrom, to, setTo }: any) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {DATE_RANGES.map(r => (
        <button
          key={r.value}
          onClick={() => setRange(r.value)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
            range === r.value ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary"
          }`}
        >{r.label}</button>
      ))}
      {range === "custom" && (
        <div className="flex gap-2 items-center ml-2">
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-8 text-xs w-36" />
          <span className="text-xs text-muted-foreground">to</span>
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-8 text-xs w-36" />
        </div>
      )}
    </div>
  );
}

/* ── STORE CATEGORY & TYPE MODALS ── */
type StoreTypeObj = { name: string; category: string };

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
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-white shrink-0">
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <h2 className="font-bold text-base text-gray-900">Add Store Category</h2>
      </div>

      {/* Content */}
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
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-white shrink-0">
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <h2 className="font-bold text-base text-gray-900">Add Store Type</h2>
      </div>

      {/* Content */}
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

/* ── DASHBOARD ── */
function DashboardTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [storeTypes, setStoreTypes] = useState<StoreTypeObj[]>([]);
  const [storeTypeCounts, setStoreTypeCounts] = useState<Record<string, number>>({});
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dashR, catR] = await Promise.all([
        fetch(`${BASE}/marketing/dashboard?range=all`, { headers: authHeaders() }),
        fetch(`${BASE}/marketing/categories-config`, { headers: authHeaders() }),
      ]);
      if (!dashR.ok) throw new Error("Server error");
      const dashData = await dashR.json();
      setData(dashData);
      if (catR.ok) {
        const cData = await catR.json();
        const cats: string[] = cData.categories ?? [];
        const types: StoreTypeObj[] = (cData.storeTypes ?? []).map((s: any) =>
          typeof s === "string" ? { name: s, category: "" } : s
        );
        setCategories(cats);
        setStoreTypes(types);
        setStoreTypeCounts(cData.storeTypeCounts ?? {});
        if (cats.length > 0) setActiveCategory(prev => prev && cats.includes(prev) ? prev : cats[0]);
      }
    } catch { toast({ title: "Failed to load dashboard", variant: "destructive" }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visibleTypes = activeCategory
    ? storeTypes.filter(s => s.category === activeCategory)
    : [];

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Stats — always all-time cumulative */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard title="Total Admins" value={fmt(data.totalAdmins)} icon={Users} color="bg-blue-500" />
        <StatCard title="Paying Admins" value={fmt(data.totalPayingAdmins)} sub={`${data.totalAdmins > 0 ? Math.round(data.totalPayingAdmins/data.totalAdmins*100) : 0}% conversion`} icon={Activity} color="bg-green-500" />
      </div>

      {/* Revenue — single combined card with 3 columns separated by vertical lines */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-stretch divide-x divide-border">
            {/* Left: Total Revenue */}
            <div className="flex-1 flex flex-col items-center justify-center py-4 px-3 text-center">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-500 mb-2">
                <DollarSign className="w-4 h-4 text-white" />
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight mb-1">Total Revenue</p>
              <p className="text-xl font-bold">{fmtRs(data.totalRevenue)}</p>
            </div>

            {/* Middle: New Signups Revenue */}
            <div className="flex-1 flex flex-col items-center justify-center py-4 px-3 text-center">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-500 mb-2">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight mb-1">New Signups Revenue</p>
              <p className="text-xl font-bold">{fmtRs(data.newSignupsRevenue)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">This month</p>
            </div>

            {/* Right: Renewals Revenue */}
            <div className="flex-1 flex flex-col items-center justify-center py-4 px-3 text-center">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-teal-500 mb-2">
                <RefreshCw className="w-4 h-4 text-white" />
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight mb-1">Renewals Revenue</p>
              <p className="text-xl font-bold">{fmtRs(data.renewalsRevenue)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">This month</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dashed divider */}
      <div className="border-t border-dashed border-gray-300" />

      {/* Add Category / Add Store Type buttons */}
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

      {/* Category tabs + store types */}
      {categories.length > 0 && (
        <div>
          {/* Tabs row */}
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

          {/* Store types list */}
          <div className="mt-4">
            <p className="text-sm font-bold text-purple-600 mb-3">Store Type</p>
            {visibleTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No store types yet. Click "Add Store Type" to add one.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {visibleTypes.map(st => {
                  // Key: "name::category" with fallback to plain name (legacy admins without category)
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

      {/* Top Influencers */}
      {data.topInfluencers?.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top Influencers</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground text-xs">
                  <th className="text-left pb-2 pr-4">Name</th>
                  <th className="text-left pb-2 pr-4">Coupon</th>
                  <th className="text-right pb-2 pr-4">Signups</th>
                  <th className="text-right pb-2 pr-4">Paying</th>
                  <th className="text-right pb-2 pr-4">Revenue</th>
                  <th className="text-right pb-2">Commission</th>
                </tr></thead>
                <tbody>
                  {data.topInfluencers.map((inf: any) => (
                    <tr key={inf._id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{inf.name}</td>
                      <td className="py-2 pr-4"><Badge variant="outline">{inf.coupon_code}</Badge></td>
                      <td className="text-right py-2 pr-4">{inf.total_signups}</td>
                      <td className="text-right py-2 pr-4 text-green-600">{inf.total_paid_admins}</td>
                      <td className="text-right py-2 pr-4">{fmtRs(inf.total_revenue)}</td>
                      <td className="text-right py-2 text-purple-600 font-semibold">{fmtRs(inf.total_revenue * inf.commission_percentage / 100)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full-page overlays */}
      {showCatModal && (
        <CategoryPage
          onClose={() => setShowCatModal(false)}
          onSaved={load}
          categories={categories}
        />
      )}
      {showTypeModal && (
        <StoreTypePage
          onClose={() => setShowTypeModal(false)}
          onSaved={load}
          categories={categories}
          storeTypes={storeTypes}
        />
      )}
    </div>
  );
}

/* ── INFLUENCERS ── */
function InfluencersTab() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", coupon_code: "", commission_percentage: "", customer_discount_percentage: "" });
  const [qrTarget, setQrTarget] = useState<{ code: string; name: string } | null>(null);
  const { toast } = useToast();
  const PAGE_SIZE = 10;

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/marketing/influencers`, { headers: authHeaders() });
      const data = await r.json();
      setList(Array.isArray(data) ? data : []);
    } catch { toast({ title: "Failed to load", variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = list.filter(i => i.name?.toLowerCase().includes(search.toLowerCase()) || i.coupon_code?.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  async function save() {
    if (!form.name || !form.coupon_code) { toast({ title: "Name and coupon code required", variant: "destructive" }); return; }
    try {
      const url = editing ? `${BASE}/marketing/influencers/${editing._id}` : `${BASE}/marketing/influencers`;
      const method = editing ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify({ ...form, commission_percentage: parseFloat(form.commission_percentage) || 0, customer_discount_percentage: parseFloat(form.customer_discount_percentage) || 0 }) });
      if (!r.ok) { const e = await r.json(); toast({ title: e.error || "Failed", variant: "destructive" }); return; }
      toast({ title: editing ? "Updated" : "Created" });
      setShowForm(false); setEditing(null); setForm({ name: "", coupon_code: "", commission_percentage: "", customer_discount_percentage: "" });
      load();
    } catch { toast({ title: "Failed", variant: "destructive" }); }
  }

  async function del(id: string) {
    if (!confirm("Delete this influencer?")) return;
    await fetch(`${BASE}/marketing/influencers/${id}`, { method: "DELETE", headers: authHeaders() });
    load();
  }

  function exportCSV() { window.open(`${BASE}/marketing/export/csv?type=influencers&token=${token()}`, "_blank"); }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9 h-9 w-52" /></div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV}><Download className="w-4 h-4 mr-1" />CSV</Button>
          <Button size="sm" onClick={() => { setEditing(null); setForm({ name: "", coupon_code: "", commission_percentage: "", customer_discount_percentage: "" }); setShowForm(true); }}><Plus className="w-4 h-4 mr-1" />Add Influencer</Button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="border-primary/30">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div><label className="text-xs font-medium mb-1 block">Name *</label><Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="Influencer name" /></div>
              <div><label className="text-xs font-medium mb-1 block">Coupon Code *</label><Input value={form.coupon_code} onChange={e => setForm(p => ({...p, coupon_code: e.target.value.toUpperCase()}))} placeholder="CODE123" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="text-xs font-medium mb-1 block">Commission % <span className="text-muted-foreground">(partner earns)</span></label><Input type="number" value={form.commission_percentage} onChange={e => setForm(p => ({...p, commission_percentage: e.target.value}))} placeholder="10" min="0" max="100" /></div>
              <div><label className="text-xs font-medium mb-1 block">Customer Discount % <span className="text-muted-foreground">(buyer gets)</span></label><Input type="number" value={form.customer_discount_percentage} onChange={e => setForm(p => ({...p, customer_discount_percentage: e.target.value}))} placeholder="5" min="0" max="100" /></div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={save}><Check className="w-4 h-4 mr-1" />{editing ? "Update" : "Create"}</Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setEditing(null); }}><X className="w-4 h-4 mr-1" />Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Code</th>
                  <th className="text-right p-3 font-medium">Commission</th>
                  <th className="text-right p-3 font-medium">Cust. Discount</th>
                  <th className="text-right p-3 font-medium">Signups</th>
                  <th className="text-right p-3 font-medium">Paying Admin</th>
                  <th className="text-right p-3 font-medium">Revenue</th>
                  <th className="text-right p-3 font-medium">Earned</th>
                  <th className="text-center p-3 font-medium">Partner Page</th>
                  <th className="text-center p-3 font-medium">Edit</th>
                </tr></thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr><td colSpan={10} className="text-center py-10 text-muted-foreground">No influencers found</td></tr>
                  ) : paged.map((inf) => (
                    <tr key={inf._id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-3"><p className="font-medium">{inf.name}</p>{inf.email && <p className="text-xs text-gray-400">{inf.email}</p>}</td>
                      <td className="p-3"><Badge variant="outline" className="font-mono">{inf.coupon_code}</Badge></td>
                      <td className="p-3 text-right font-semibold text-indigo-600">{inf.commission_percentage}%</td>
                      <td className="p-3 text-right font-semibold text-blue-600">{inf.customer_discount_percentage ?? 0}%</td>
                      <td className="p-3 text-right font-semibold">{inf.total_signups}</td>
                      <td className="p-3 text-right text-green-600 font-semibold">{inf.total_paid_admins}</td>
                      <td className="p-3 text-right font-semibold">{fmtRs(inf.total_revenue)}</td>
                      <td className="p-3 text-right text-purple-600 font-bold">{fmtRs(inf.total_revenue * inf.commission_percentage / 100)}</td>
                      <td className="p-3 text-center">
                        <Button size="sm" variant="outline" className="h-7 text-xs text-cyan-600 border-cyan-200 hover:bg-cyan-50 gap-1" onClick={() => copyLink("influencer", inf.coupon_code, toast)}>
                          <Link2 className="w-3 h-3" />Partner Page
                        </Button>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="Edit" onClick={() => { setEditing(inf); setForm({ name: inf.name, coupon_code: inf.coupon_code, commission_percentage: String(inf.commission_percentage), customer_discount_percentage: String(inf.customer_discount_percentage ?? 0) }); setShowForm(true); }}><Edit2 className="w-3.5 h-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Delete" onClick={() => del(inf._id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" disabled={page===1} onClick={() => setPage(p=>p-1)}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm">{page} / {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page===totalPages} onClick={() => setPage(p=>p+1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      )}

      {qrTarget && <QRDialog open={true} onClose={() => setQrTarget(null)} type="influencer" code={qrTarget.code} name={qrTarget.name} />}
    </div>
  );
}

/* ── AMBASSADORS ── */
function AmbassadorsTab() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", city: "", referral_code: "", commission_percentage: "", customer_discount_percentage: "" });
  const [qrTarget, setQrTarget] = useState<{ code: string; name: string } | null>(null);
  const { toast } = useToast();
  const PAGE_SIZE = 10;

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/marketing/ambassadors`, { headers: authHeaders() });
      const data = await r.json();
      setList(Array.isArray(data) ? data : []);
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = list.filter(a => a.name?.toLowerCase().includes(search.toLowerCase()) || a.referral_code?.toLowerCase().includes(search.toLowerCase()) || a.city?.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  async function save() {
    if (!form.name || !form.referral_code) { toast({ title: "Name and referral code required", variant: "destructive" }); return; }
    try {
      const url = editing ? `${BASE}/marketing/ambassadors/${editing._id}` : `${BASE}/marketing/ambassadors`;
      const method = editing ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify({ ...form, commission_percentage: parseFloat(form.commission_percentage) || 0, customer_discount_percentage: parseFloat(form.customer_discount_percentage) || 0 }) });
      if (!r.ok) { const e = await r.json(); toast({ title: e.error || "Failed", variant: "destructive" }); return; }
      toast({ title: editing ? "Updated" : "Created" });
      setShowForm(false); setEditing(null); setForm({ name: "", city: "", referral_code: "", commission_percentage: "", customer_discount_percentage: "" });
      load();
    } catch { toast({ title: "Failed", variant: "destructive" }); }
  }

  async function del(id: string) {
    if (!confirm("Delete this ambassador?")) return;
    await fetch(`${BASE}/marketing/ambassadors/${id}`, { method: "DELETE", headers: authHeaders() });
    load();
  }

  function exportCSV() { window.open(`${BASE}/marketing/export/csv?type=ambassadors`, "_blank"); }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9 h-9 w-52" /></div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV}><Download className="w-4 h-4 mr-1" />CSV</Button>
          <Button size="sm" onClick={() => { setEditing(null); setForm({ name: "", city: "", referral_code: "", commission_percentage: "", customer_discount_percentage: "" }); setShowForm(true); }}><Plus className="w-4 h-4 mr-1" />Add Ambassador</Button>
        </div>
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
              <div><label className="text-xs font-medium mb-1 block">Name *</label><Input value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} placeholder="Ambassador name" /></div>
              <div><label className="text-xs font-medium mb-1 block">City</label><Input value={form.city} onChange={e => setForm(p=>({...p,city:e.target.value}))} placeholder="City" /></div>
              <div><label className="text-xs font-medium mb-1 block">Referral Code *</label><Input value={form.referral_code} onChange={e => setForm(p=>({...p,referral_code:e.target.value.toUpperCase()}))} placeholder="REF123" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="text-xs font-medium mb-1 block">Commission % <span className="text-muted-foreground">(partner earns)</span></label><Input type="number" value={form.commission_percentage} onChange={e => setForm(p=>({...p,commission_percentage:e.target.value}))} placeholder="10" min="0" max="100" /></div>
              <div><label className="text-xs font-medium mb-1 block">Cust. Discount % <span className="text-muted-foreground">(buyer gets)</span></label><Input type="number" value={form.customer_discount_percentage} onChange={e => setForm(p=>({...p,customer_discount_percentage:e.target.value}))} placeholder="5" min="0" max="100" /></div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={save}><Check className="w-4 h-4 mr-1" />{editing ? "Update" : "Create"}</Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setEditing(null); }}><X className="w-4 h-4 mr-1" />Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Code</th>
                  <th className="text-right p-3 font-medium">Commission</th>
                  <th className="text-right p-3 font-medium">Cust. Discount</th>
                  <th className="text-right p-3 font-medium">Signups</th>
                  <th className="text-right p-3 font-medium">Paying Admin</th>
                  <th className="text-right p-3 font-medium">Revenue</th>
                  <th className="text-right p-3 font-medium">Earned</th>
                  <th className="text-center p-3 font-medium">Partner Page</th>
                  <th className="text-center p-3 font-medium">Edit</th>
                </tr></thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr><td colSpan={10} className="text-center py-10 text-muted-foreground">No ambassadors found</td></tr>
                  ) : paged.map((amb) => (
                    <tr key={amb._id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-3"><p className="font-medium">{amb.name}</p>{amb.email && <p className="text-xs text-gray-400">{amb.email}</p>}</td>
                      <td className="p-3"><Badge variant="outline" className="font-mono">{amb.referral_code}</Badge></td>
                      <td className="p-3 text-right font-semibold text-indigo-600">{amb.commission_percentage}%</td>
                      <td className="p-3 text-right font-semibold text-blue-600">{amb.customer_discount_percentage ?? 0}%</td>
                      <td className="p-3 text-right font-semibold">{amb.total_signups}</td>
                      <td className="p-3 text-right text-green-600 font-semibold">{amb.total_paid_admins}</td>
                      <td className="p-3 text-right font-semibold">{fmtRs(amb.total_revenue)}</td>
                      <td className="p-3 text-right text-purple-600 font-bold">{fmtRs(amb.total_revenue * amb.commission_percentage / 100)}</td>
                      <td className="p-3 text-center">
                        <Button size="sm" variant="outline" className="h-7 text-xs text-violet-600 border-violet-200 hover:bg-violet-50 gap-1" onClick={() => copyLink("ambassador", amb.referral_code, toast)}>
                          <Link2 className="w-3 h-3" />Partner Page
                        </Button>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="Edit" onClick={() => { setEditing(amb); setForm({ name: amb.name, city: amb.city||"", referral_code: amb.referral_code, commission_percentage: String(amb.commission_percentage), customer_discount_percentage: String(amb.customer_discount_percentage ?? 0) }); setShowForm(true); }}><Edit2 className="w-3.5 h-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Delete" onClick={() => del(amb._id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" disabled={page===1} onClick={() => setPage(p=>p-1)}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm">{page} / {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page===totalPages} onClick={() => setPage(p=>p+1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      )}

      {qrTarget && <QRDialog open={true} onClose={() => setQrTarget(null)} type="ambassador" code={qrTarget.code} name={qrTarget.name} />}
    </div>
  );
}

/* ── REFERRAL TRACKING ── */
function ReferralTab() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<any>(null);
  const { toast } = useToast();
  const PAGE_SIZE = 12;

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/store-requests/referral-history`, { headers: authHeaders() });
      if (!r.ok) throw new Error("Failed");
      const data = await r.json();
      setList(Array.isArray(data) ? data : []);
    } catch { toast({ title: "Failed to load referral history", variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = list.filter(r =>
    (r.referred_by_admin_username ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (r.storeName ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (r.email ?? "").toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const approved = list.filter(r => r.status === "approved").length;
  const pending  = list.filter(r => r.status === "pending").length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{list.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Referrals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{approved}</p>
            <p className="text-xs text-muted-foreground mt-1">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{pending}</p>
            <p className="text-xs text-muted-foreground mt-1">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + Refresh */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by store or referrer..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 h-9 w-64"
          />
        </div>
        <Button size="sm" variant="outline" onClick={load}>
          <RefreshCw className="w-4 h-4 mr-1" />Refresh
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                    <th className="text-left p-3 font-medium">Referred By (Admin)</th>
                    <th className="text-left p-3 font-medium">New Store</th>
                    <th className="text-left p-3 font-medium">Email</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-center p-3 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-muted-foreground">
                        {search ? "No matches found" : "No admin referrals yet. Admins share their referral link and when their friend creates a store, it appears here."}
                      </td>
                    </tr>
                  ) : paged.map((r) => (
                    <tr
                      key={r._id || r.id}
                      className="border-b last:border-0 hover:bg-muted/20 cursor-pointer"
                      onClick={() => setSelected(r)}
                    >
                      <td className="p-3 font-semibold text-primary">{r.referred_by_admin_username || "—"}</td>
                      <td className="p-3 font-medium">{r.storeName}</td>
                      <td className="p-3 text-muted-foreground text-xs">{r.email}</td>
                      <td className="p-3">
                        <Badge variant="outline" className={
                          r.status === "approved" ? "border-green-300 text-green-700 bg-green-50" :
                          r.status === "rejected" ? "border-red-300 text-red-700 bg-red-50" :
                          "border-amber-300 text-amber-700 bg-amber-50"
                        }>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={e => { e.stopPropagation(); setSelected(r); }}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm">{page} / {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Referral Details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-blue-50/50 p-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">Referring Admin</p>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span className="font-semibold text-sm">{selected.referred_by_admin_username || "—"}</span>
                </div>
              </div>
              <div className="rounded-xl border bg-green-50/50 p-4 space-y-1.5">
                <p className="text-xs font-bold uppercase tracking-wider text-green-600 mb-2">New Store (Referred)</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  <div className="text-muted-foreground text-xs">Store Name</div>
                  <div className="font-medium text-xs">{selected.storeName}</div>
                  <div className="text-muted-foreground text-xs">Email</div>
                  <div className="text-xs truncate">{selected.email}</div>
                  <div className="text-muted-foreground text-xs">WhatsApp</div>
                  <div className="text-xs">{selected.whatsapp}</div>
                  <div className="text-muted-foreground text-xs">Plan</div>
                  <div className="text-xs">{selected.planName || selected.plan || "—"}</div>
                  <div className="text-muted-foreground text-xs">Status</div>
                  <div>
                    <Badge variant="outline" className={`text-[10px] ${
                      selected.status === "approved" ? "border-green-300 text-green-700 bg-green-50" :
                      selected.status === "rejected" ? "border-red-300 text-red-700 bg-red-50" :
                      "border-amber-300 text-amber-700 bg-amber-50"
                    }`}>
                      {selected.status}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground text-xs">Date</div>
                  <div className="text-xs">{new Date(selected.createdAt).toLocaleString("en-IN")}</div>
                </div>
              </div>
              <Button className="w-full" size="sm" onClick={() => setSelected(null)}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── MARKETING SOURCES ── */
function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${checked ? "bg-green-500" : "bg-muted-foreground/30"}`}
      aria-checked={checked}
      role="switch"
    >
      <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-200 ${checked ? "translate-x-4" : "translate-x-0"}`} />
    </button>
  );
}

function trackingLink(key: string) {
  return `${window.location.origin}/?utm_source=${key.toLowerCase()}`;
}

function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }
  return (
    <button
      onClick={copy}
      title="Copy link"
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors border border-border rounded px-2 py-1 bg-muted/30 hover:bg-muted/60 shrink-0"
    >
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Link2 className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

type SortMode = "admin" | "paying" | "revenue";

function EditSourceDialog({
  open, onClose, source, onSaved,
}: {
  open: boolean; onClose: () => void;
  source: { type: "builtin" | "custom"; key: string; id?: string; label: string; color: string };
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(source.label);
  const [color, setColor] = useState(source.color);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => { setLabel(source.label); setColor(source.color); }, [source]);

  async function save() {
    setSaving(true);
    try {
      if (source.type === "custom") {
        const r = await fetch(`${BASE}/marketing/sources/config/${source.id}`, {
          method: "PUT", headers: authHeaders(),
          body: JSON.stringify({ label, color }),
        });
        if (!r.ok) throw new Error();
      } else {
        const r = await fetch(`${BASE}/marketing/sources/builtin/${source.key}`, {
          method: "PATCH", headers: authHeaders(),
          body: JSON.stringify({ label_override: label, color_override: color }),
        });
        if (!r.ok) throw new Error();
      }
      toast({ title: "Source updated" });
      onSaved();
      onClose();
    } catch { toast({ title: "Failed to update", variant: "destructive" }); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-xs">
        <DialogHeader><DialogTitle>Edit Source</DialogTitle></DialogHeader>
        <div className="space-y-4 py-1">
          <div>
            <label className="text-xs font-medium mb-1 block">Label</label>
            <Input value={label} onChange={e => setLabel(e.target.value)} className="h-9" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-9 h-9 rounded border border-border cursor-pointer p-0.5 bg-card" />
              <span className="text-xs text-muted-foreground font-mono">{color}</span>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={saving || !label.trim()}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SourcesTab() {
  const [stats, setStats] = useState<any[]>([]);
  const [builtinSettings, setBuiltinSettings] = useState<Record<string, any>>({});
  const [customSources, setCustomSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>("admin");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#6b7280");
  const [saving, setSaving] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const { toast } = useToast();

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, builtinRes, customRes] = await Promise.all([
        fetch(`${BASE}/marketing/sources`, { headers: authHeaders() }),
        fetch(`${BASE}/marketing/sources/builtin`, { headers: authHeaders() }),
        fetch(`${BASE}/marketing/sources/config`, { headers: authHeaders() }),
      ]);
      const [statsData, builtinData, customData] = await Promise.all([
        statsRes.json(), builtinRes.json(), customRes.json(),
      ]);
      setStats(Array.isArray(statsData) ? statsData : []);
      setBuiltinSettings(builtinData || {});
      setCustomSources(Array.isArray(customData) ? customData : []);
    } catch { toast({ title: "Failed to load sources", variant: "destructive" }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function addSource() {
    if (!newLabel.trim()) { toast({ title: "Label is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const key = newLabel.trim().toUpperCase().replace(/\s+/g, "_");
      const r = await fetch(`${BASE}/marketing/sources/config`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ key, label: newLabel.trim(), color: newColor }),
      });
      if (!r.ok) { const e = await r.json(); toast({ title: e.error || "Failed", variant: "destructive" }); return; }
      toast({ title: "Source added" });
      setNewLabel(""); setNewColor("#6b7280"); setShowAddForm(false);
      loadAll();
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    finally { setSaving(false); }
  }

  async function deleteCustomSource(id: string, label: string) {
    if (!confirm(`Delete "${label}" source?`)) return;
    await fetch(`${BASE}/marketing/sources/config/${id}`, { method: "DELETE", headers: authHeaders() });
    toast({ title: "Source deleted" });
    loadAll();
  }

  async function deleteBuiltinSource(key: string, label: string) {
    if (!confirm(`Delete "${label}" source? It will be hidden from all views.`)) return;
    await fetch(`${BASE}/marketing/sources/builtin/${key}`, {
      method: "PATCH", headers: authHeaders(),
      body: JSON.stringify({ isActive: false }),
    });
    toast({ title: "Source deleted" });
    loadAll();
  }

  const statsMap: Record<string, any> = {};
  for (const s of stats) { statsMap[s.source] = s; }

  const customMap: Record<string, any> = {};
  for (const c of customSources) { customMap[c.key] = c; }

  const activeBuiltinDeletable = DELETABLE_BUILTIN_KEYS.filter(key => {
    const setting = builtinSettings[key];
    return !setting || setting.isActive !== false;
  });

  type SourceRow = {
    key: string; label: string; color: string;
    admin: number; paying: number; revenue: number;
    type: "non-deletable" | "builtin" | "custom";
    id?: string;
  };

  const rows: SourceRow[] = [
    ...activeBuiltinDeletable.map(key => {
      const setting = builtinSettings[key];
      const effectiveLabel = setting?.label_override || SOURCE_LABELS[key] || key;
      const effectiveColor = setting?.color_override || SOURCE_COLORS[key] || "#6b7280";
      const s = statsMap[key];
      return {
        key, label: effectiveLabel, color: effectiveColor,
        admin: s?.total_signups ?? 0, paying: s?.total_paid_admins ?? 0, revenue: s?.total_revenue ?? 0,
        type: "builtin" as const,
      };
    }),
    ...customSources.map(src => {
      const s = statsMap[src.key];
      return {
        key: src.key, label: src.label, color: src.color,
        admin: s?.total_signups ?? 0, paying: s?.total_paid_admins ?? 0, revenue: s?.total_revenue ?? 0,
        type: "custom" as const, id: src._id,
      };
    }),
  ];

  const sorted = [...rows].sort((a, b) =>
    sortMode === "admin" ? b.admin - a.admin :
    sortMode === "paying" ? b.paying - a.paying :
    b.revenue - a.revenue
  );

  /* Non-deletable rows — INFLUENCER, AMBASSADOR, REFERRAL */
  const nonDeletableRows = (["INFLUENCER","AMBASSADOR","REFERRAL"] as const).map(key => {
    const s = statsMap[key];
    return {
      key,
      label: SOURCE_LABELS[key] || key,
      color: SOURCE_COLORS[key] || "#6b7280",
      admin: s?.total_signups ?? 0,
      paying: s?.total_paid_admins ?? 0,
      revenue: s?.total_revenue ?? 0,
    };
  });

  return (
    <div className="space-y-4">

      {/* Non-deletable Partner Sources Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground font-semibold tracking-wide uppercase">Partner Channels</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-[1fr_52px_52px_72px] border-b bg-muted/30 px-3 py-2 text-xs font-semibold text-muted-foreground gap-1">
            <span>Source</span>
            <span className="text-center text-blue-600">Admin</span>
            <span className="text-center text-purple-600">Paying</span>
            <span className="text-right text-green-600">Revenue</span>
          </div>
          {nonDeletableRows.map(row => (
            <div key={row.key} className="grid grid-cols-[1fr_52px_52px_72px] items-center px-3 py-2.5 border-b-2 border-border last:border-0 hover:bg-muted/10 transition-colors gap-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: row.color }} />
                <span className="text-sm font-medium truncate">{row.label}</span>
              </div>
              <div className="text-center">
                <span className="text-sm font-bold text-blue-600">{row.admin}</span>
              </div>
              <div className="text-center">
                <span className="text-sm font-bold text-purple-600">{row.paying}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-green-600">{fmtRs(row.revenue)}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Add Source Form */}
      {showAddForm && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[150px]">
                <label className="text-xs font-medium mb-1 block">Source Name *</label>
                <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="e.g. Telegram, Twitter" className="h-9" onKeyDown={e => e.key === "Enter" && addSource()} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="w-9 h-9 rounded border border-border cursor-pointer p-0.5 bg-card" />
                  <span className="text-xs text-muted-foreground font-mono">{newColor}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setShowAddForm(false); setNewLabel(""); setNewColor("#6b7280"); }}>Cancel</Button>
                <Button size="sm" onClick={addSource} disabled={saving}>
                  <Check className="w-4 h-4 mr-1" />{saving ? "Saving..." : "Add"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex rounded-lg border overflow-hidden text-xs font-semibold">
              <button
                onClick={() => setSortMode("admin")}
                className={`px-3 py-1.5 transition-colors ${sortMode === "admin" ? "bg-blue-600 text-white" : "text-muted-foreground hover:bg-muted"}`}
              >Admin</button>
              <button
                onClick={() => setSortMode("paying")}
                className={`px-3 py-1.5 border-l transition-colors ${sortMode === "paying" ? "bg-purple-600 text-white" : "text-muted-foreground hover:bg-muted"}`}
              >Paying</button>
              <button
                onClick={() => setSortMode("revenue")}
                className={`px-3 py-1.5 border-l transition-colors ${sortMode === "revenue" ? "bg-green-600 text-white" : "text-muted-foreground hover:bg-muted"}`}
              >Revenue</button>
            </div>
            <Button size="sm" onClick={() => setShowAddForm(v => !v)}>
              <Plus className="w-4 h-4 mr-1" />Add Source
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_52px_52px_72px_44px] border-b bg-muted/30 px-3 py-2 text-xs font-semibold text-muted-foreground gap-1">
            <span>Source</span>
            <span className="text-center text-blue-600">Admin</span>
            <span className="text-center text-purple-600">Paying</span>
            <span className="text-right text-green-600">Revenue</span>
            <span></span>
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : sorted.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">No sources found</div>
          ) : sorted.map((row) => {
            const url = trackingLink(row.key);
            return (
              <div key={row.key} className="border-b-2 border-border last:border-0">
                {/* Main Row */}
                <div className="grid grid-cols-[1fr_52px_52px_72px_44px] items-center px-3 py-2.5 hover:bg-muted/10 transition-colors gap-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: row.color }} />
                    <span className="text-sm font-medium truncate">{row.label}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-bold text-blue-600">{row.admin}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-bold text-purple-600">{row.paying}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-green-600">{fmtRs(row.revenue)}</span>
                  </div>
                  <div className="flex items-center justify-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0">
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditTarget({ type: row.type, key: row.key, id: row.id, label: row.label, color: row.color })}>
                          <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => row.type === "custom" ? deleteCustomSource(row.id!, row.label) : deleteBuiltinSource(row.key, row.label)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                {/* Copy Link Row */}
                <div className="px-3 pb-2 flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground font-mono truncate flex-1">{url}</span>
                  <CopyLinkButton url={url} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {editTarget && (
        <EditSourceDialog
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          source={editTarget}
          onSaved={loadAll}
        />
      )}
    </div>
  );
}

/* ── REVENUE ANALYTICS ── */
function RevenueTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ range });
      if (range === "custom" && from && to) { params.set("from", from); params.set("to", to); }
      const r = await fetch(`${BASE}/marketing/revenue?${params}`, { headers: authHeaders() });
      setData(await r.json());
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    finally { setLoading(false); }
  }, [range, from, to]);

  useEffect(() => { load(); }, [load]);

  function exportCSV() { window.open(`${BASE}/marketing/export/csv?type=admins`, "_blank"); }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <DateFilterBar range={range} setRange={setRange} from={from} setFrom={setFrom} to={to} setTo={setTo} />
        <Button size="sm" variant="outline" onClick={exportCSV}><Download className="w-4 h-4 mr-1" />Export CSV</Button>
      </div>

      {loading ? <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div> : data && (
        <>
          <Card>
            <CardContent className="pt-5">
              <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
              <p className="text-3xl font-bold text-green-600">{fmtRs(data.total || 0)}</p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Revenue by Source</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.bySource || []} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="source" tick={{ fontSize: 9 }} tickFormatter={v => SOURCE_LABELS[v]?.split(" ")[0]} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => fmtRs(v)} labelFormatter={l => SOURCE_LABELS[l] || l} />
                    <Bar dataKey="revenue" name="Revenue" radius={[4,4,0,0]}>
                      {(data.bySource || []).map((s: any, i: number) => <Cell key={i} fill={SOURCE_COLORS[s.source]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Revenue by Plan</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.byPlan || []} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="plan" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => fmtRs(v)} />
                    <Bar dataKey="revenue" name="Revenue" fill="#8b5cf6" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                    <th className="text-left p-3 font-medium">Source</th>
                    <th className="text-right p-3 font-medium">Admins</th>
                    <th className="text-right p-3 font-medium">Revenue</th>
                    <th className="text-right p-3 font-medium">% of Total</th>
                  </tr></thead>
                  <tbody>
                    {(data.bySource || []).map((s: any) => (
                      <tr key={s.source} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="p-3 font-medium flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full inline-block" style={{ background: SOURCE_COLORS[s.source] }} />
                          {SOURCE_LABELS[s.source]}
                        </td>
                        <td className="p-3 text-right">{s.admins}</td>
                        <td className="p-3 text-right font-semibold text-green-600">{fmtRs(s.revenue)}</td>
                        <td className="p-3 text-right text-muted-foreground">{data.total > 0 ? `${Math.round(s.revenue/data.total*100)}%` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

/* ── MAIN PAGE ── */
export default function MarketingAnalytics() {
  const [activeTab, setActiveTab] = useState<Tab>("Dashboard");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />Growth & Marketing Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track admin acquisition sources, influencers, ambassadors and revenue attribution.</p>
      </div>

      {/* Tab Bar */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex gap-1 min-w-max border-b border-border pb-0">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 whitespace-nowrap -mb-px ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >{tab}</button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "Dashboard" && <DashboardTab />}
      {activeTab === "Influencers" && <InfluencersTab />}
      {activeTab === "Ambassadors" && <AmbassadorsTab />}
      {activeTab === "Referral Tracking" && <ReferralTab />}
      {activeTab === "Marketing Sources" && <SourcesTab />}
      {activeTab === "Revenue Analytics" && <RevenueTab />}
    </div>
  );
}
