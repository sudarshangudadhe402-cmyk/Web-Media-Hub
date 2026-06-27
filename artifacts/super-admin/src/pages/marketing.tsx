import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import {
  TrendingUp, Users, DollarSign, Activity, Plus, Trash2, Edit2,
  Download, Search, ChevronLeft, ChevronRight, X, Check, RefreshCw, Link2, QrCode,
} from "lucide-react";

function partnerLink(type: "influencer" | "ambassador" | "referral", code: string) {
  const origin = window.location.origin;
  const base = (import.meta.env.BASE_URL || "/super-admin").replace(/\/$/, "");
  return `${origin}${base}/partnership/${type}/${code}`;
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

// Auto-tracked by system (UTM params / coupon codes / referral codes) — non-deletable, toggleable
const AUTO_SOURCES = ["GOOGLE_AD","FACEBOOK_AD","INSTAGRAM_AD","YOUTUBE","REFERRAL","AMBASSADOR","INFLUENCER","AFFILIATE"];

// Admin manually selects these when signup can't be auto-detected — in deletable section
const MANUAL_BUILTIN_SOURCES = ["ORGANIC","WHATSAPP","DIRECT"];

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

/* ── DASHBOARD ── */
function DashboardTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [analysisMode, setAnalysisMode] = useState<"admin" | "revenue" | "paying">("admin");
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ range });
      if (range === "custom" && from && to) { params.set("from", from); params.set("to", to); }
      const r = await fetch(`${BASE}/marketing/dashboard?${params}`, { headers: authHeaders() });
      if (!r.ok) throw new Error("Server error");
      setData(await r.json());
    } catch { toast({ title: "Failed to load dashboard", variant: "destructive" }); }
    finally { setLoading(false); }
  }, [range, from, to]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <DateFilterBar range={range} setRange={setRange} from={from} setFrom={setFrom} to={to} setTo={setTo} />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Admins" value={fmt(data.totalAdmins)} icon={Users} color="bg-blue-500" />
        <StatCard title="Paying Admins" value={fmt(data.totalPayingAdmins)} sub={`${data.totalAdmins > 0 ? Math.round(data.totalPayingAdmins/data.totalAdmins*100) : 0}% conversion`} icon={Activity} color="bg-green-500" />
        <StatCard title="Total Revenue" value={fmtRs(data.totalRevenue)} icon={DollarSign} color="bg-purple-500" />
        <StatCard title="This Month" value={fmtRs(data.monthlyRevenue)} icon={TrendingUp} color="bg-orange-500" />
      </div>

      {/* Combined Source Analysis */}
      {(() => {
        const sorted = [...(data.bySource || [])].sort((a: any, b: any) =>
          analysisMode === "admin" ? b.signups - a.signups :
          analysisMode === "paying" ? b.payingAdmins - a.payingAdmins :
          b.revenue - a.revenue
        );
        const topColor = analysisMode === "admin" ? "#3b82f6" : analysisMode === "paying" ? "#8b5cf6" : "#16a34a";
        return (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-sm">Source Analysis</CardTitle>
                <div className="flex rounded-lg border overflow-hidden text-xs font-semibold">
                  <button
                    onClick={() => setAnalysisMode("admin")}
                    className={`px-3 py-1.5 transition-colors ${analysisMode === "admin" ? "bg-blue-600 text-white" : "text-muted-foreground hover:bg-muted"}`}
                  >
                    Admin
                  </button>
                  <button
                    onClick={() => setAnalysisMode("paying")}
                    className={`px-3 py-1.5 border-l transition-colors ${analysisMode === "paying" ? "bg-purple-600 text-white" : "text-muted-foreground hover:bg-muted"}`}
                  >
                    Paying
                  </button>
                  <button
                    onClick={() => setAnalysisMode("revenue")}
                    className={`px-3 py-1.5 border-l transition-colors ${analysisMode === "revenue" ? "bg-green-600 text-white" : "text-muted-foreground hover:bg-muted"}`}
                  >
                    Revenue
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-4 border-b bg-muted/30 px-3 py-2 text-xs font-semibold text-muted-foreground">
                <span>Source</span>
                <span className="text-center text-blue-600">Admins</span>
                <span className="text-center text-purple-600">Paying</span>
                <span className="text-right text-green-600">Revenue</span>
              </div>
              {sorted.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">No data available</div>
              ) : (
                sorted.map((s: any, i: number) => {
                  const color = s.color || SOURCE_COLORS[s.source] || "#6b7280";
                  const label = s.label || SOURCE_LABELS[s.source] || s.source;
                  const isTop = i === 0;
                  return (
                    <div
                      key={s.source}
                      className={`grid grid-cols-4 items-center px-3 py-3 border-b last:border-0 hover:bg-muted/20 transition-colors ${isTop ? "bg-muted/10" : ""}`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                        <span className="text-xs font-medium truncate">{label}</span>
                        {isTop && (
                          <span className="text-[9px] px-1 py-0.5 rounded font-bold shrink-0" style={{ background: topColor + "22", color: topColor }}>TOP</span>
                        )}
                      </div>
                      <div className="text-center">
                        <span className="text-sm font-bold" style={{ color: "#3b82f6" }}>{s.signups}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-sm font-bold" style={{ color: "#8b5cf6" }}>{s.payingAdmins ?? 0}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold" style={{ color: "#16a34a" }}>{fmtRs(s.revenue)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Monthly Growth Trend by Source */}
      {(() => {
        const bySourceMonthly: Record<string, { month: string; signups: number; revenue: number }[]> = data.bySourceMonthly || {};
        const sources = (data.bySource || []).filter((s: any) => s.signups > 0 || s.revenue > 0);
        if (sources.length === 0) return null;
        const sorted = [...sources].sort((a: any, b: any) =>
          analysisMode === "admin" ? b.signups - a.signups :
          analysisMode === "paying" ? b.payingAdmins - a.payingAdmins :
          b.revenue - a.revenue
        );
        const monthKeys: string[] = sorted.length > 0
          ? (bySourceMonthly[sorted[0].source] || []).map((m: any) => m.month)
          : [];
        const shortMonth = (key: string) => {
          const [y, m] = key.split("-");
          return new Date(Number(y), Number(m) - 1, 1).toLocaleString("en", { month: "short" });
        };
        return (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-sm">Monthly Growth Trend</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Last 6 months — {analysisMode === "admin" ? "Admin signups" : "Revenue"} per source
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-3 h-0.5 bg-green-500 inline-block rounded" /> Growing
                  <span className="w-3 h-0.5 bg-red-500 inline-block rounded ml-2" /> Declining
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex items-center border-b bg-muted/30 px-4 py-2">
                <div className="w-32 text-xs font-semibold text-muted-foreground shrink-0">Source</div>
                <div className="flex-1 flex justify-between px-2">
                  {monthKeys.map(k => (
                    <span key={k} className="text-[10px] text-muted-foreground">{shortMonth(k)}</span>
                  ))}
                </div>
                <div className="w-16 text-right text-xs font-semibold text-muted-foreground shrink-0">
                  {analysisMode === "admin" ? "Signups" : "Revenue"}
                </div>
              </div>
              {sorted.map((s: any) => {
                const color = s.color || SOURCE_COLORS[s.source] || "#6b7280";
                const label = s.label || SOURCE_LABELS[s.source] || s.source;
                const monthly = bySourceMonthly[s.source] || [];
                const values = monthly.map((m: any) => analysisMode === "admin" ? m.signups : m.revenue);
                const last = values[values.length - 1] ?? 0;
                const prev = values[values.length - 2] ?? 0;
                const trend = last - prev;
                return (
                  <div key={s.source} className="flex items-center border-b last:border-0 px-4 py-2.5 hover:bg-muted/20 transition-colors">
                    <div className="w-32 shrink-0 flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                      <span className="text-xs font-medium truncate">{label}</span>
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <Sparkline values={values} color={color} width={160} height={28} />
                    </div>
                    <div className="w-16 shrink-0 text-right">
                      <div className="text-xs font-bold" style={{ color }}>
                        {analysisMode === "admin" ? last : fmtRs(last)}
                      </div>
                      {trend !== 0 && (
                        <div className={`text-[10px] font-semibold ${trend > 0 ? "text-green-600" : "text-red-500"}`}>
                          {trend > 0 ? "▲" : "▼"} {analysisMode === "admin" ? Math.abs(trend) : fmtRs(Math.abs(trend))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })()}

      {/* Monthly charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Monthly Signups</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data.monthlySignups || []} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} name="Signups" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Monthly Revenue</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data.monthlyRevenueChart || []} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => fmtRs(v)} />
                <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} dot={false} name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

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

      {/* Top Ambassadors */}
      {data.topAmbassadors?.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top Ambassadors</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground text-xs">
                  <th className="text-left pb-2 pr-4">Name</th>
                  <th className="text-left pb-2 pr-4">City</th>
                  <th className="text-left pb-2 pr-4">Code</th>
                  <th className="text-right pb-2 pr-4">Signups</th>
                  <th className="text-right pb-2 pr-4">Paying</th>
                  <th className="text-right pb-2 pr-4">Revenue</th>
                  <th className="text-right pb-2">Commission</th>
                </tr></thead>
                <tbody>
                  {data.topAmbassadors.map((amb: any) => (
                    <tr key={amb._id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{amb.name}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{amb.city || "—"}</td>
                      <td className="py-2 pr-4"><Badge variant="outline">{amb.referral_code}</Badge></td>
                      <td className="text-right py-2 pr-4">{amb.total_signups}</td>
                      <td className="text-right py-2 pr-4 text-green-600">{amb.total_paid_admins}</td>
                      <td className="text-right py-2 pr-4">{fmtRs(amb.total_revenue)}</td>
                      <td className="text-right py-2 text-purple-600 font-semibold">{fmtRs(amb.total_revenue * amb.commission_percentage / 100)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
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
  const [form, setForm] = useState({ name: "", coupon_code: "", commission_percentage: "" });
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
      const r = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify({ ...form, commission_percentage: parseFloat(form.commission_percentage) || 0 }) });
      if (!r.ok) { const e = await r.json(); toast({ title: e.error || "Failed", variant: "destructive" }); return; }
      toast({ title: editing ? "Updated" : "Created" });
      setShowForm(false); setEditing(null); setForm({ name: "", coupon_code: "", commission_percentage: "" });
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
          <Button size="sm" onClick={() => { setEditing(null); setForm({ name: "", coupon_code: "", commission_percentage: "" }); setShowForm(true); }}><Plus className="w-4 h-4 mr-1" />Add Influencer</Button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="border-primary/30">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div><label className="text-xs font-medium mb-1 block">Name *</label><Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="Influencer name" /></div>
              <div><label className="text-xs font-medium mb-1 block">Coupon Code *</label><Input value={form.coupon_code} onChange={e => setForm(p => ({...p, coupon_code: e.target.value.toUpperCase()}))} placeholder="CODE123" /></div>
              <div><label className="text-xs font-medium mb-1 block">Commission %</label><Input type="number" value={form.commission_percentage} onChange={e => setForm(p => ({...p, commission_percentage: e.target.value}))} placeholder="10" min="0" max="100" /></div>
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
                  <th className="text-left p-3 font-medium">Coupon Code</th>
                  <th className="text-right p-3 font-medium">Commission</th>
                  <th className="text-right p-3 font-medium">Signups</th>
                  <th className="text-right p-3 font-medium">Paying</th>
                  <th className="text-right p-3 font-medium">Revenue</th>
                  <th className="text-right p-3 font-medium">Commission Earned</th>
                  <th className="p-3" />
                </tr></thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">No influencers found</td></tr>
                  ) : paged.map((inf) => (
                    <tr key={inf._id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-3 font-medium">{inf.name}</td>
                      <td className="p-3"><Badge variant="outline">{inf.coupon_code}</Badge></td>
                      <td className="p-3 text-right">{inf.commission_percentage}%</td>
                      <td className="p-3 text-right font-semibold">{inf.total_signups}</td>
                      <td className="p-3 text-right text-green-600 font-semibold">{inf.total_paid_admins}</td>
                      <td className="p-3 text-right font-semibold">{fmtRs(inf.total_revenue)}</td>
                      <td className="p-3 text-right text-purple-600 font-semibold">{fmtRs(inf.total_revenue * inf.commission_percentage / 100)}</td>
                      <td className="p-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50" title="Show QR code" onClick={() => setQrTarget({ code: inf.coupon_code, name: inf.name })}><QrCode className="w-3.5 h-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50" title="Copy partnership link" onClick={() => copyLink("influencer", inf.coupon_code, toast)}><Link2 className="w-3.5 h-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(inf); setForm({ name: inf.name, coupon_code: inf.coupon_code, commission_percentage: String(inf.commission_percentage) }); setShowForm(true); }}><Edit2 className="w-3.5 h-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => del(inf._id)}><Trash2 className="w-3.5 h-3.5" /></Button>
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
  const [form, setForm] = useState({ name: "", city: "", referral_code: "", commission_percentage: "" });
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
      const r = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify({ ...form, commission_percentage: parseFloat(form.commission_percentage) || 0 }) });
      if (!r.ok) { const e = await r.json(); toast({ title: e.error || "Failed", variant: "destructive" }); return; }
      toast({ title: editing ? "Updated" : "Created" });
      setShowForm(false); setEditing(null); setForm({ name: "", city: "", referral_code: "", commission_percentage: "" });
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
          <Button size="sm" onClick={() => { setEditing(null); setForm({ name: "", city: "", referral_code: "", commission_percentage: "" }); setShowForm(true); }}><Plus className="w-4 h-4 mr-1" />Add Ambassador</Button>
        </div>
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div><label className="text-xs font-medium mb-1 block">Name *</label><Input value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} placeholder="Ambassador name" /></div>
              <div><label className="text-xs font-medium mb-1 block">City</label><Input value={form.city} onChange={e => setForm(p=>({...p,city:e.target.value}))} placeholder="City" /></div>
              <div><label className="text-xs font-medium mb-1 block">Referral Code *</label><Input value={form.referral_code} onChange={e => setForm(p=>({...p,referral_code:e.target.value.toUpperCase()}))} placeholder="REF123" /></div>
              <div><label className="text-xs font-medium mb-1 block">Commission %</label><Input type="number" value={form.commission_percentage} onChange={e => setForm(p=>({...p,commission_percentage:e.target.value}))} placeholder="10" min="0" max="100" /></div>
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
                  <th className="text-left p-3 font-medium">City</th>
                  <th className="text-left p-3 font-medium">Code</th>
                  <th className="text-right p-3 font-medium">Commission</th>
                  <th className="text-right p-3 font-medium">Signups</th>
                  <th className="text-right p-3 font-medium">Paying</th>
                  <th className="text-right p-3 font-medium">Revenue</th>
                  <th className="text-right p-3 font-medium">Earned</th>
                  <th className="p-3" />
                </tr></thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-10 text-muted-foreground">No ambassadors found</td></tr>
                  ) : paged.map((amb) => (
                    <tr key={amb._id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-3 font-medium">{amb.name}</td>
                      <td className="p-3 text-muted-foreground">{amb.city || "—"}</td>
                      <td className="p-3"><Badge variant="outline">{amb.referral_code}</Badge></td>
                      <td className="p-3 text-right">{amb.commission_percentage}%</td>
                      <td className="p-3 text-right font-semibold">{amb.total_signups}</td>
                      <td className="p-3 text-right text-green-600 font-semibold">{amb.total_paid_admins}</td>
                      <td className="p-3 text-right font-semibold">{fmtRs(amb.total_revenue)}</td>
                      <td className="p-3 text-right text-purple-600 font-semibold">{fmtRs(amb.total_revenue * amb.commission_percentage / 100)}</td>
                      <td className="p-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-violet-600 hover:text-violet-700 hover:bg-violet-50" title="Show QR code" onClick={() => setQrTarget({ code: amb.referral_code, name: amb.name })}><QrCode className="w-3.5 h-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-violet-600 hover:text-violet-700 hover:bg-violet-50" title="Copy partnership link" onClick={() => copyLink("ambassador", amb.referral_code, toast)}><Link2 className="w-3.5 h-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(amb); setForm({ name: amb.name, city: amb.city||"", referral_code: amb.referral_code, commission_percentage: String(amb.commission_percentage) }); setShowForm(true); }}><Edit2 className="w-3.5 h-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => del(amb._id)}><Trash2 className="w-3.5 h-3.5" /></Button>
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
  const [qrTarget, setQrTarget] = useState<{ code: string; name: string } | null>(null);
  const { toast } = useToast();
  const PAGE_SIZE = 10;

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/marketing/referral-codes`, { headers: authHeaders() });
      const data = await r.json();
      setList(Array.isArray(data) ? data : []);
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = list.filter(r =>
    r.referral_code?.toLowerCase().includes(search.toLowerCase()) ||
    r.owner_admin_id?.username?.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  async function del(id: string) {
    if (!confirm("Delete this referral code?")) return;
    await fetch(`${BASE}/marketing/referral-codes/${id}`, { method: "DELETE", headers: authHeaders() });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search by code or admin..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9 h-9 w-64" /></div>
        <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-1" />Refresh</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                  <th className="text-left p-3 font-medium">Referral Code</th>
                  <th className="text-left p-3 font-medium">Owner Admin</th>
                  <th className="text-right p-3 font-medium">Signups</th>
                  <th className="text-right p-3 font-medium">Paying Admins</th>
                  <th className="text-right p-3 font-medium">Created</th>
                  <th className="p-3" />
                </tr></thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No referral codes found</td></tr>
                  ) : paged.map((rc) => (
                    <tr key={rc._id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-3"><Badge variant="outline">{rc.referral_code}</Badge></td>
                      <td className="p-3 font-medium">{rc.owner_admin_id?.username || "—"}</td>
                      <td className="p-3 text-right font-semibold">{rc.total_signups}</td>
                      <td className="p-3 text-right text-green-600 font-semibold">{rc.total_paid_admins}</td>
                      <td className="p-3 text-right text-muted-foreground">{new Date(rc.createdAt).toLocaleDateString()}</td>
                      <td className="p-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50" title="Show QR code" onClick={() => setQrTarget({ code: rc.referral_code, name: rc.owner_admin_id?.username || rc.referral_code })}><QrCode className="w-3.5 h-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50" title="Copy partnership link" onClick={() => copyLink("referral", rc.referral_code, toast)}><Link2 className="w-3.5 h-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => del(rc._id)}><Trash2 className="w-3.5 h-3.5" /></Button>
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

      {qrTarget && <QRDialog open={true} onClose={() => setQrTarget(null)} type="referral" code={qrTarget.code} name={qrTarget.name} />}
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

function SourcesTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [customSources, setCustomSources] = useState<any[]>([]);
  const [csLoading, setCsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#6b7280");
  const [saving, setSaving] = useState(false);

  // builtin active/inactive map: key → isActive (default true)
  const [builtinSettings, setBuiltinSettings] = useState<Record<string, boolean>>({});
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ range });
      if (range === "custom" && from && to) { params.set("from", from); params.set("to", to); }
      const r = await fetch(`${BASE}/marketing/sources?${params}`, { headers: authHeaders() });
      const d = await r.json();
      setData(Array.isArray(d) ? d : []);
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    finally { setLoading(false); }
  }, [range, from, to]);

  const loadCustom = async () => {
    setCsLoading(true);
    try {
      const [cr, br] = await Promise.all([
        fetch(`${BASE}/marketing/sources/config`, { headers: authHeaders() }),
        fetch(`${BASE}/marketing/sources/builtin`, { headers: authHeaders() }),
      ]);
      const cd = await cr.json();
      const bd = await br.json();
      setCustomSources(Array.isArray(cd) ? cd : []);
      if (bd && typeof bd === "object") setBuiltinSettings(bd);
    } catch { }
    finally { setCsLoading(false); }
  };

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadCustom(); }, []);

  async function toggleBuiltin(key: string) {
    const current = builtinSettings[key] !== false; // default true
    setTogglingKey(key);
    try {
      const r = await fetch(`${BASE}/marketing/sources/builtin/${key}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ isActive: !current }),
      });
      if (!r.ok) { toast({ title: "Failed to update", variant: "destructive" }); return; }
      setBuiltinSettings(prev => ({ ...prev, [key]: !current }));
      toast({ title: `${SOURCE_LABELS[key]} ${!current ? "activated" : "deactivated"}` });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    finally { setTogglingKey(null); }
  }

  async function addSource() {
    if (!newLabel.trim()) { toast({ title: "Label is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const r = await fetch(`${BASE}/marketing/sources/config`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ key: newLabel.trim().toUpperCase().replace(/\s+/g, "_"), label: newLabel.trim(), color: newColor }),
      });
      if (!r.ok) { const e = await r.json(); toast({ title: e.error || "Failed", variant: "destructive" }); return; }
      toast({ title: "Source added" });
      setNewLabel(""); setNewColor("#6b7280"); setShowAddForm(false);
      loadCustom();
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    finally { setSaving(false); }
  }

  async function deleteSource(id: string) {
    if (!confirm("Delete this custom source?")) return;
    await fetch(`${BASE}/marketing/sources/config/${id}`, { method: "DELETE", headers: authHeaders() });
    loadCustom();
  }

  return (
    <div className="space-y-4">
      <DateFilterBar range={range} setRange={setRange} from={from} setFrom={setFrom} to={to} setTo={setTo} />

      {loading && <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}

      {/* ── Sources Management ── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Sources Management</CardTitle>
            <Button size="sm" onClick={() => setShowAddForm(v => !v)}>
              <Plus className="w-4 h-4 mr-1" />{showAddForm ? "Cancel" : "Add Source"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Trackable sources auto-detected via UTM/coupon — toggle Active/Inactive. Manual sources shown to admins for self-selection.</p>
        </CardHeader>
        <CardContent className="space-y-0 p-0 pt-0">

          {/* Add form — sits above the list */}
          {showAddForm && (
            <div className="flex flex-wrap gap-3 items-end p-4 border-b border-border bg-muted/20">
              <div className="flex-1 min-w-[160px]">
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
              <Button size="sm" onClick={addSource} disabled={saving}>
                <Check className="w-4 h-4 mr-1" />{saving ? "Saving..." : "Add"}
              </Button>
            </div>
          )}

          {/* ── Section: Auto-Trackable (non-deletable, toggleable) ── */}
          <div className="px-4 py-2 bg-muted/30 border-b border-border">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Direct Trackable Sources — Non-deletable</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Auto-detected via UTM params, coupon codes, or referral links</p>
          </div>

          <div className="divide-y divide-border">
            {AUTO_SOURCES.map(key => {
              const isActive = builtinSettings[key] !== false;
              return (
                <div key={key} className={`flex items-center justify-between px-4 py-3 transition-colors ${isActive ? "hover:bg-muted/10" : "opacity-50 hover:bg-muted/10"}`}>
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: SOURCE_COLORS[key] }} />
                    <div>
                      <p className="text-sm font-medium">{SOURCE_LABELS[key]}</p>
                      <p className="text-xs text-muted-foreground font-mono">{key}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${isActive ? "text-green-600" : "text-muted-foreground"}`}>
                      {isActive ? "Active" : "Inactive"}
                    </span>
                    <ToggleSwitch
                      checked={isActive}
                      onChange={() => toggleBuiltin(key)}
                      disabled={togglingKey === key}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Divider ── */}
          <div className="border-t-2 border-border">
            <div className="px-4 py-2 bg-muted/30 border-b border-border">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Manual Selection Sources — Deletable</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Admin manually chooses these when signup can't be auto-tracked</p>
            </div>
          </div>

          {/* Manual built-in sources (ORGANIC, WHATSAPP, DIRECT) — toggleable, no delete */}
          <div className="divide-y divide-border">
            {MANUAL_BUILTIN_SOURCES.map(key => {
              const isActive = builtinSettings[key] !== false;
              return (
                <div key={key} className={`flex items-center justify-between px-4 py-3 transition-colors ${isActive ? "hover:bg-muted/10" : "opacity-50 hover:bg-muted/10"}`}>
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: SOURCE_COLORS[key] }} />
                    <div>
                      <p className="text-sm font-medium">{SOURCE_LABELS[key]}</p>
                      <p className="text-xs text-muted-foreground font-mono">{key}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${isActive ? "text-green-600" : "text-muted-foreground"}`}>
                      {isActive ? "Active" : "Inactive"}
                    </span>
                    <ToggleSwitch
                      checked={isActive}
                      onChange={() => toggleBuiltin(key)}
                      disabled={togglingKey === key}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom sources — toggleable + deletable */}
          <div className="divide-y divide-border">
            {csLoading ? (
              <div className="flex justify-center py-5"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
            ) : customSources.length === 0 ? (
              <div className="px-4 py-4 text-center text-xs text-muted-foreground">No custom sources yet — click "Add Source" above to add one.</div>
            ) : customSources.map(src => (
              <div key={src._id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/10">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: src.color }} />
                  <div>
                    <p className="text-sm font-medium">{src.label}</p>
                    <p className="text-xs text-muted-foreground font-mono">{src.key}</p>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteSource(src._id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>

        </CardContent>
      </Card>
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
