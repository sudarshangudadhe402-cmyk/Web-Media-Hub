import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QRCodeCanvas } from "qrcode.react";
import PricingOverlay, { type SelectedPlan } from "@/components/pricing-overlay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  useSubmitStoreRequest,
  useMyStoreRequests,
  getMyStoreRequestsQueryKey,
  useGetStore,
  useGetDashboardSummary,
} from "@workspace/api-client-react";
import {
  TrendingUp,
  Video,
  PlusCircle,
  Star,
  MapPin,
  CheckCircle,
  XCircle,
  Store,
  Gift,
  Clock,
  Copy,
  Link as LinkIcon,
  ChevronRight,
  ChevronLeft,
  QrCode,
  Download,
  Trash2,
  Power,
  Users,
  RefreshCw,
  Globe,
  Megaphone,
} from "lucide-react";

type Tab = "friend" | "approved" | "rejected";
type PageView = "main" | "addFriend" | "choosePlan";

const SOURCE_OPTIONS = [
  { value: "instagram", label: "Instagram", color: "#E1306C" },
  { value: "facebook", label: "Facebook", color: "#1877F2" },
  { value: "whatsapp", label: "WhatsApp", color: "#25D366" },
  { value: "google", label: "Google", color: "#4285F4" },
  { value: "sms", label: "SMS", color: "#6B7280" },
  { value: "direct", label: "Direct", color: "#8B5CF6" },
  { value: "other", label: "Other", color: "#F59E0B" },
  { value: "custom", label: "Custom (Type your own)…", color: "#0EA5E9" },
];

function sourceColor(source: string) {
  return SOURCE_OPTIONS.find((s) => s.value === source)?.color ?? "#6B7280";
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function buildTrackingLink(storeSlug: string, source: string, campaignSlug: string) {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  return `${window.location.origin}${base}/store/${storeSlug}?source=${source}&campaign=${campaignSlug}`;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("wmh_token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

interface Campaign {
  id: string;
  campaignName: string;
  campaignSlug: string;
  source: string;
  trackingLink: string;
  qrEnabled: boolean;
  isActive: boolean;
  customerCount: number;
  createdAt: string;
}

function CampaignQrDownload({ link, name }: { link: string; name: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleDownload = useCallback(() => {
    const canvas = document.querySelector(`canvas[data-qr="${name}"]`) as HTMLCanvasElement | null;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${name}.png`;
    a.click();
  }, [name]);

  return (
    <div className="flex flex-col items-center gap-2">
      <QRCodeCanvas
        value={link}
        size={120}
        data-qr={name}
        bgColor="#ffffff"
        fgColor="#1a1a1a"
        level="M"
      />
      <Button size="sm" variant="outline" onClick={handleDownload} className="gap-1.5 text-xs">
        <Download className="w-3 h-3" />
        Download QR
      </Button>
    </div>
  );
}

function CampaignCard({ campaign, onCopyLink, onDeactivate, onDelete }: {
  campaign: Campaign;
  onCopyLink: (link: string) => void;
  onDeactivate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [showQr, setShowQr] = useState(false);
  const src = SOURCE_OPTIONS.find((s) => s.value === campaign.source);

  return (
    <Card className={`overflow-hidden transition-all ${!campaign.isActive ? "opacity-60" : ""}`}>
      <CardContent className="p-0">
        {/* Header strip */}
        <div
          className="h-1.5 w-full"
          style={{ background: sourceColor(campaign.source) }}
        />
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm truncate">{campaign.campaignName}</p>
                {!campaign.isActive && (
                  <Badge variant="secondary" className="text-[10px] shrink-0">Inactive</Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full text-white shrink-0"
                  style={{ background: sourceColor(campaign.source) }}
                >
                  {src?.label ?? campaign.source}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(campaign.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-primary/5 rounded-lg px-2.5 py-1.5 shrink-0">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-bold text-primary">{campaign.customerCount}</span>
            </div>
          </div>

          {/* Tracking Link */}
          <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-2">
            <LinkIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground truncate flex-1 font-mono">{campaign.trackingLink}</span>
            <button
              onClick={() => onCopyLink(campaign.trackingLink)}
              className="p-1 hover:bg-background rounded transition-colors shrink-0"
            >
              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* QR Code */}
          {campaign.qrEnabled && (
            <div>
              <button
                onClick={() => setShowQr((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
              >
                <QrCode className="w-3.5 h-3.5" />
                {showQr ? "Hide QR Code" : "Show QR Code"}
              </button>
              {showQr && (
                <div className="mt-3 flex justify-center">
                  <CampaignQrDownload link={campaign.trackingLink} name={campaign.campaignSlug} />
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1 border-t border-border">
            {campaign.isActive && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-1.5 text-xs"
                onClick={() => onDeactivate(campaign.id)}
              >
                <Power className="w-3 h-3" />
                Deactivate
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1.5 text-xs text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
              onClick={() => onDelete(campaign.id)}
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MarketingGrowth() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  /* ── AI Video state ── */
  const [pageView, setPageView] = useState<PageView>("main");
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("friend");
  const [selectedApproved, setSelectedApproved] = useState<any>(null);
  const [approvedTabSeenAt, setApprovedTabSeenAt] = useState<string | null>(() =>
    localStorage.getItem("wmh_ai_video_approved_tab_seen_at")
  );
  const [claimHelpOpen, setClaimHelpOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", storeName: "", whatsapp: "" });

  const submitRequest = useSubmitStoreRequest();
  const { data: myRequests } = useMyStoreRequests();

  const pending = (myRequests ?? []).filter((r) => r.status === "pending");
  const approved = (myRequests ?? []).filter((r) => r.status === "approved");
  const rejected = (myRequests ?? []).filter((r) => r.status === "rejected");
  const rewardCoins = approved.filter((r) => r.rewardCode !== "NO_REWARD_MONTHLY_PLAN").length * 2000;

  const approvedTabHasDot =
    approved.length > 0 &&
    (!approvedTabSeenAt ||
      approved.some((r) => new Date((r as any).updatedAt ?? r.createdAt) > new Date(approvedTabSeenAt!)));

  /* ── Store data for tracking links ── */
  const { data: store } = useGetStore({ query: { retry: false } });
  const storeSlug = (store as any)?.publicSlug ?? "";

  /* ── Store visitors ── */
  const { data: dashSummary } = useGetDashboardSummary();

  /* ── Campaign form state ── */
  const [campaignName, setCampaignName] = useState("");
  const [campaignSource, setCampaignSource] = useState("instagram");
  const [customSourceText, setCustomSourceText] = useState("");
  const customSourceRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (campaignSource === "custom") {
      const t = setTimeout(() => {
        customSourceRef.current?.focus();
      }, 300);
      return () => clearTimeout(t);
    }
  }, [campaignSource]);
  const [qrEnabled, setQrEnabled] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  /* ── Campaigns query ── */
  const { data: campaigns = [], isLoading: campaignsLoading, refetch: refetchCampaigns } = useQuery<Campaign[]>({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const res = await fetch("/api/campaigns", { headers: authHeaders() });
      if (!res.ok) return [];
      return res.json();
    },
  });

  /* ── AI Video query ── */
  const { data: globalLinkData } = useQuery({
    queryKey: ["settings", "global-link"],
    queryFn: async () => {
      const token = localStorage.getItem("wmh_token");
      const res = await fetch("/api/settings/global-link", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return { globalLink: null };
      return res.json() as Promise<{ globalLink: string | null }>;
    },
  });
  const globalLink = globalLinkData?.globalLink ?? null;

  /* ── Create campaign mutation ── */
  const createCampaign = useMutation({
    mutationFn: async (data: { campaignName: string; source: string; trackingLink: string; qrEnabled: boolean }) => {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create campaign");
      }
      return res.json();
    },
    onSuccess: () => {
      setCampaignName("");
      setCampaignSource("instagram");
      setQrEnabled(false);
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({ title: "Campaign created!", description: "Your tracking link is ready." });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: err?.message ?? "Failed to create campaign" });
    },
  });

  /* ── Deactivate mutation ── */
  const deactivateCampaign = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/campaigns/${id}/deactivate`, { method: "PATCH", headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to deactivate");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
    onError: () => toast({ variant: "destructive", title: "Failed to deactivate campaign" }),
  });

  /* ── Delete mutation ── */
  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setDeleteConfirmId(null);
      toast({ title: "Campaign deleted" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to delete campaign" }),
  });

  function handleCopyLink(link: string) {
    navigator.clipboard.writeText(link);
    toast({ title: "Link copied to clipboard!" });
  }

  const effectiveSource = campaignSource === "custom"
    ? (customSourceText.trim() || "custom")
    : campaignSource;

  function handleCreateCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!campaignName.trim()) return;
    if (!storeSlug) {
      toast({ variant: "destructive", title: "Store not found. Please check your store setup." });
      return;
    }
    if (campaignSource === "custom" && !customSourceText.trim()) {
      toast({ variant: "destructive", title: "Please enter a custom source type name." });
      return;
    }
    const campaignSlug = slugify(campaignName);
    const trackingLink = buildTrackingLink(storeSlug, effectiveSource, campaignSlug);
    createCampaign.mutate({ campaignName: campaignName.trim(), source: effectiveSource, trackingLink, qrEnabled });
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement>) {
    let val = e.target.value;
    if (e.target.name === "password") val = val.replace(/[^0-9]/g, "");
    setForm((prev) => ({ ...prev, [e.target.name]: val }));
  }

  function validateWhatsApp(digits: string): string | null {
    if (digits.length !== 10) return "WhatsApp number must be exactly 10 digits";
    if (/^0+$/.test(digits)) return "Spam number not allowed, please fill real 🙏";
    if (/^(\d)\1{9}$/.test(digits)) return "Spam number not allowed, please fill real 🙏";
    return null;
  }

  function handleDone(e: React.FormEvent) {
    e.preventDefault();
    const whatsappError = validateWhatsApp(form.whatsapp);
    if (whatsappError) { toast({ variant: "destructive", title: whatsappError }); return; }
    submitRequest.mutate(
      { data: { email: form.email, password: form.password, storeName: form.storeName, whatsapp: `+91${form.whatsapp}` } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getMyStoreRequestsQueryKey() });
          setPageView("main");
          setConfirmOpen(true);
          setForm({ email: "", password: "", storeName: "", whatsapp: "" });
        },
        onError: (err: any) => {
          const reason: string = err?.data?.error ?? err?.data?.message ?? err?.response?.data?.error ?? err?.message?.replace(/^HTTP \d+[^:]*:\s*/i, "") ?? "";
          const isEmailTaken = reason.toLowerCase().includes("already exists") || reason.toLowerCase().includes("email");
          const isSpamWhatsApp = reason.toLowerCase().includes("whatsapp") || reason.toLowerCase().includes("phone") || reason.toLowerCase().includes("spam");
          const title = isEmailTaken ? "Email already exists, please try different 🙏" : isSpamWhatsApp ? "Spam number not allowed, please fill real 🙏" : reason || "Something went wrong, please try again 🙏";
          toast({ variant: "destructive", title });
        },
      }
    );
  }

  const tabItems: { key: Tab; label: string; icon: React.ElementType; count: number; activeClass?: string; showDot?: boolean }[] = [
    { key: "friend", label: "Friend Store", icon: Store, count: pending.length },
    { key: "approved", label: "Approved Store", icon: CheckCircle, count: approved.length, activeClass: "bg-green-600 text-white border-green-600", showDot: approvedTabHasDot },
    { key: "rejected", label: "Rejected Store", icon: XCircle, count: rejected.length, activeClass: "bg-red-600 text-white border-red-600" },
  ];
  const tabData = { friend: pending, approved, rejected };

  /* ── Full-page views ── */
  if (pageView === "choosePlan") {
    return <PricingOverlay onBack={() => setPageView("addFriend")} onSelectPlan={(plan) => { setSelectedPlan(plan); setPageView("addFriend"); }} />;
  }

  if (pageView === "addFriend") {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b bg-background">
          <button onClick={() => { setPageView("main"); setForm({ email: "", password: "", storeName: "", whatsapp: "" }); }} className="p-1.5 rounded-full hover:bg-muted transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-green-600" />
            <span className="font-bold text-base">Add My Friend's Store</span>
          </div>
        </div>
        <form onSubmit={handleDone} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5 max-w-lg mx-auto w-full">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="friend@example.com" value={form.email} onChange={handleFormChange} required />
              <p className="text-xs text-muted-foreground">Friend's email address for store login</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="text" inputMode="numeric" placeholder="Only numbers" value={form.password} onChange={handleFormChange} required />
              <p className="text-xs text-muted-foreground">Only numbers allowed (no letters or emoji)</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="storeName">Store Name</Label>
              <Input id="storeName" name="storeName" placeholder="Friend's store name" value={form.storeName} onChange={handleFormChange} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="whatsapp" className="flex items-center gap-1.5">
                Store Owner WhatsApp Number
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              </Label>
              <div className="flex items-center border border-input rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-ring">
                <span className="px-3 py-2 bg-muted text-sm font-medium text-muted-foreground border-r border-input shrink-0">+91</span>
                <input id="whatsapp" name="whatsapp" type="tel" inputMode="numeric" maxLength={10} placeholder="0000000000"
                  value={form.whatsapp}
                  onChange={(e) => { const val = e.target.value.replace(/\D/g, "").slice(0, 10); setForm((p) => ({ ...p, whatsapp: val })); }}
                  className="flex-1 px-3 py-2 text-sm bg-background outline-none" required />
              </div>
              <p className="text-xs text-muted-foreground">Enter 10-digit mobile number (repeated digits not allowed)</p>
            </div>
            <button type="button" onClick={() => setPageView("choosePlan")}
              className="w-full flex items-center justify-between gap-3 rounded-xl px-5 py-4 font-semibold text-base transition-colors active:opacity-80"
              style={{ background: "linear-gradient(135deg,#f59e0b,#fbbf24)", color: "#fff", boxShadow: "0 2px 12px rgba(251,191,36,0.4)" }}>
              <div className="flex items-center gap-3">
                <Star className="w-5 h-5 fill-white text-white shrink-0" />
                <span>{selectedPlan ? "Change Plan" : "Choose Plan"}</span>
              </div>
              <ChevronRight className="w-5 h-5 shrink-0" />
            </button>
            {selectedPlan && (
              <div className="rounded-xl border p-4 space-y-1" style={{ borderColor: selectedPlan.color + "55", background: selectedPlan.color + "11" }}>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: selectedPlan.color }}>{selectedPlan.badge}</p>
                <p className="font-bold text-sm">{selectedPlan.name}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-extrabold" style={{ color: selectedPlan.color }}>{selectedPlan.price}</span>
                  <span className="text-xs text-muted-foreground">{selectedPlan.period}</span>
                </div>
                <p className="text-xs text-muted-foreground">{selectedPlan.tagline}</p>
              </div>
            )}
          </div>
          <div className="shrink-0 border-t bg-background px-5 py-4 flex gap-3 max-w-lg mx-auto w-full">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { setPageView("main"); setForm({ email: "", password: "", storeName: "", whatsapp: "" }); setSelectedPlan(null); }}>Cancel</Button>
            <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-40"
              disabled={submitRequest.isPending || !form.email || !form.password || !form.storeName || form.whatsapp.length !== 10 || !selectedPlan}>
              {submitRequest.isPending ? "Submitting..." : "Done"}
            </Button>
          </div>
        </form>
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-center justify-center">
                <Video className="w-5 h-5 text-primary" />
                Store Submitted
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                <MapPin className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-800 text-sm">Payment Required for Approval</p>
                  <p className="text-amber-700 text-sm mt-1">The store owner will need to complete a payment to get their store approved on Web Media Hub.</p>
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3">
                <Gift className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-800 text-sm">Your Reward</p>
                  <p className="text-green-700 text-sm mt-1">Once the store is approved, you will receive <span className="font-bold text-green-800">2000 ₹ Web Media Hub Coins</span> added to your account.</p>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-red-800 text-sm">Important — Plan Restriction</p>
                  <p className="text-red-700 text-sm mt-1">This reward is <span className="font-bold underline">not applicable</span> on the <span className="font-bold">₹999/month</span> plan. Reward is only earned when the referred store purchases a higher plan.</p>
                </div>
              </div>
              <Button className="w-full" onClick={() => setConfirmOpen(false)}>Got it</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  /* ── Main Page ── */
  return (
    <div className="space-y-10 pb-16 max-w-4xl mx-auto">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            Marketing & Growth
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Track campaigns, grow your customer base, and earn rewards</p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* SECTION 1: CUSTOMER SOURCE TRACKING               */}
      {/* ═══════════════════════════════════════════════════ */}
      <section className="space-y-6">
        {/* Section header */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Megaphone className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Section 1 — Customer Source Tracking</h2>
            <p className="text-xs text-muted-foreground">Create campaigns, share tracking links, and see where your customers come from</p>
          </div>
        </div>

        {/* Store Visitors Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Store Visitors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Today", val: (dashSummary as any)?.visitors?.today ?? 0, color: "#2874F0", bg: "rgba(40,116,240,0.08)" },
                { label: "This Month", val: (dashSummary as any)?.visitors?.month ?? 0, color: "#7c3aed", bg: "rgba(124,58,237,0.08)" },
                { label: "All Time", val: (dashSummary as any)?.visitors?.all ?? 0, color: "#16a34a", bg: "rgba(22,163,74,0.08)" },
              ].map(({ label, val, color, bg }) => (
                <div key={label} className="flex flex-col items-center justify-center rounded-xl px-3 py-3 gap-1" style={{ background: bg }}>
                  <span className="text-2xl font-extrabold" style={{ color }}>{val.toLocaleString("en-IN")}</span>
                  <span className="text-[11px] font-semibold" style={{ color }}>{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Create Campaign Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-primary" />
              Create New Campaign
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="campaignName">Campaign Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="campaignName"
                    placeholder='e.g. "Summer Sale", "Eid Offer 2026"'
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    required
                  />
                  {campaignName.trim() && (
                    <p className="text-[11px] text-muted-foreground">Slug: <span className="font-mono text-primary">{slugify(campaignName)}</span></p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="source">Source Type <span className="text-destructive">*</span></Label>
                  <Select value={campaignSource} onValueChange={(v) => { setCampaignSource(v); if (v !== "custom") setCustomSourceText(""); }}>
                    <SelectTrigger id="source">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: opt.color }} />
                            {opt.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {campaignSource === "custom" && (
                    <input
                      ref={customSourceRef}
                      type="text"
                      inputMode="text"
                      enterKeyHint="done"
                      placeholder='Type source name, e.g. "YouTube", "Pamphlet"'
                      value={customSourceText}
                      onChange={(e) => setCustomSourceText(e.target.value)}
                      className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  )}
                  {campaignSource === "custom" && customSourceText.trim() && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#0EA5E9" }} />
                      <span className="text-[11px] text-muted-foreground">Source: <span className="font-semibold text-foreground">{customSourceText.trim()}</span></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview tracking link */}
              {storeSlug && campaignName.trim() && (campaignSource !== "custom" || customSourceText.trim()) && (
                <div className="bg-muted rounded-lg px-3 py-2.5 space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Preview Tracking Link</p>
                  <p className="text-xs font-mono text-primary break-all">
                    {buildTrackingLink(storeSlug, effectiveSource, slugify(campaignName))}
                  </p>
                </div>
              )}

              {/* QR Code toggle */}
              <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <QrCode className="w-4 h-4" />
                    Generate QR Code
                  </Label>
                  <p className="text-xs text-muted-foreground">Automatically create a scannable QR for this link</p>
                </div>
                <Switch checked={qrEnabled} onCheckedChange={setQrEnabled} />
              </div>

              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={createCampaign.isPending || !campaignName.trim() || !storeSlug}
              >
                {createCampaign.isPending ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Creating...</>
                ) : (
                  <><PlusCircle className="w-4 h-4 mr-2" />Create Campaign</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Campaign Dashboard */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              All Campaigns
              <Badge variant="secondary" className="text-[11px]">{campaigns.length}</Badge>
            </h3>
            <Button size="sm" variant="ghost" onClick={() => refetchCampaigns()} className="gap-1.5 text-xs">
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
          </div>

          {campaignsLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading campaigns...</span>
            </div>
          ) : campaigns.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="py-12 text-center space-y-2">
                <Megaphone className="w-10 h-10 mx-auto text-muted-foreground/30" />
                <p className="text-muted-foreground font-medium text-sm">No campaigns yet</p>
                <p className="text-xs text-muted-foreground/70">Create your first campaign above to start tracking where customers come from</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {campaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  onCopyLink={handleCopyLink}
                  onDeactivate={(id) => deactivateCampaign.mutate(id)}
                  onDelete={(id) => setDeleteConfirmId(id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Stats summary */}
        {campaigns.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-primary">{campaigns.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Campaigns</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{campaigns.filter((c) => c.isActive).length}</p>
                <p className="text-xs text-muted-foreground mt-1">Active</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-primary">{campaigns.reduce((sum, c) => sum + c.customerCount, 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">Customers Tracked</p>
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground font-medium px-2">Section 2</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* SECTION 2: AI PROMOTIONAL VIDEO                    */}
      {/* ═══════════════════════════════════════════════════ */}
      <section className="space-y-6">
        {/* Section header */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Video className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Section 2 — AI Promotional Video</h2>
            <p className="text-xs text-muted-foreground">Refer friends and earn free AI promotional videos</p>
          </div>
        </div>

        {/* Add Friend CTA */}
        <button
          onClick={() => setPageView("addFriend")}
          className="w-full flex items-center justify-between gap-4 bg-green-600 hover:bg-green-700 active:bg-green-800 transition-colors text-white rounded-xl px-6 py-5 shadow-lg"
        >
          <div className="flex items-center gap-3">
            <PlusCircle className="w-6 h-6 shrink-0" />
            <div className="text-left">
              <p className="font-semibold text-lg leading-tight">Add My Friend's Store</p>
              <p className="text-green-100 text-sm">Refer a store and earn 2000 coins on approval</p>
            </div>
          </div>
          <Store className="w-8 h-8 text-green-200 shrink-0" />
        </button>

        {/* Rewards */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Rewards</p>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Gift className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Your reward</span>
                </div>
                <p className="text-4xl font-bold tracking-tight text-primary leading-none mt-2">{rewardCoins}</p>
                <p className="text-xs text-muted-foreground mt-1.5">Ai promotional video's coin earned</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground font-medium">Per approved store</p>
                <p className="text-3xl font-bold text-green-600 leading-none mt-1">+2000</p>
                <p className="text-xs text-muted-foreground mt-0.5">coin</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Global Link */}
        {globalLink && (
          <div className="rounded-xl border border-primary/20 overflow-hidden">
            <div className="flex items-center px-4 py-2.5 bg-primary/5 border-b border-primary/20">
              <span className="text-sm font-bold text-primary tracking-wide">NexGenStudio</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <LinkIcon className="w-4 h-4 text-primary shrink-0" />
              <a href={globalLink} target="_blank" rel="noopener noreferrer"
                className="flex-1 text-sm text-primary font-medium underline underline-offset-2 truncate">
                {globalLink}
              </a>
              <button onClick={() => { navigator.clipboard.writeText(globalLink); toast({ title: "Link copied!" }); }}
                className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors shrink-0">
                <Copy className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}

        {/* Claim Rewards */}
        <button
          onClick={() => setClaimHelpOpen(true)}
          className="w-full flex items-center justify-between gap-3 bg-green-600 hover:bg-green-700 active:bg-green-800 transition-colors text-white rounded-xl px-5 py-4"
        >
          <div className="flex items-center gap-3">
            <Gift className="w-5 h-5 shrink-0" />
            <span className="font-semibold text-base">How to claim rewards 🎁</span>
          </div>
          <ChevronRight className="w-5 h-5 text-green-200 shrink-0" />
        </button>

        {/* Friends Store */}
        <div>
          <h3 className="text-base font-semibold mb-4">Friends Store</h3>
          <div className="flex gap-2 mb-4">
            {tabItems.map(({ key, label, icon: Icon, count, activeClass, showDot }) => (
              <button
                key={key}
                onClick={() => {
                  setActiveTab(key);
                  if (key === "approved" && approved.length > 0) {
                    const now = new Date().toISOString();
                    localStorage.setItem("wmh_ai_video_approved_tab_seen_at", now);
                    setApprovedTabSeenAt(now);
                  }
                }}
                className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl text-xs font-medium border transition-colors ${
                  activeTab === key
                    ? (activeClass ?? "bg-primary text-primary-foreground border-primary")
                    : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-center leading-tight hidden sm:block">{label}</span>
                <Badge variant="secondary" className="text-[10px] mt-0.5">{count}</Badge>
                {showDot && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 border-2 border-white" />
                  </span>
                )}
              </button>
            ))}
          </div>

          {tabData[activeTab].length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="p-12 text-center space-y-3">
                {activeTab === "friend" && (<>
                  <Store className="w-12 h-12 mx-auto text-muted-foreground/40" />
                  <p className="text-muted-foreground font-medium">No pending store requests</p>
                  <p className="text-sm text-muted-foreground/70">Stores you refer will appear here once submitted</p>
                </>)}
                {activeTab === "approved" && (<>
                  <CheckCircle className="w-12 h-12 mx-auto text-green-400/40" />
                  <p className="text-muted-foreground font-medium">No approved stores yet</p>
                  <p className="text-sm text-muted-foreground/70">Once your referral is approved you'll earn 2000 coins</p>
                </>)}
                {activeTab === "rejected" && (<>
                  <XCircle className="w-12 h-12 mx-auto text-red-400/40" />
                  <p className="text-muted-foreground font-medium">No rejected stores</p>
                </>)}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {tabData[activeTab].map((req) => {
                const isApproved = req.status === "approved";
                return (
                  <Card
                    key={req.id}
                    className={`overflow-hidden ${isApproved ? "cursor-pointer hover:shadow-md transition-shadow border-green-200" : ""}`}
                    onClick={() => isApproved && setSelectedApproved(req)}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        req.status === "approved" ? "bg-green-100" :
                        req.status === "rejected" ? "bg-red-100" : "bg-amber-100"
                      }`}>
                        {req.status === "approved" ? <CheckCircle className="w-5 h-5 text-green-600" /> :
                         req.status === "rejected" ? <XCircle className="w-5 h-5 text-red-600" /> :
                         <Clock className="w-5 h-5 text-amber-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{req.storeName}</p>
                        <p className="text-xs text-muted-foreground">@{req.username} · {req.whatsapp}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(req.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <Badge className={`text-[10px] shrink-0 ${
                        req.status === "approved" ? "bg-green-600 text-white" :
                        req.status === "rejected" ? "bg-red-600 text-white" : "bg-amber-500 text-white"
                      }`}>
                        {req.status === "approved" ? "Approved" : req.status === "rejected" ? "Rejected" : "Pending"}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Approved Store Detail Dialog ── */}
      <Dialog open={!!selectedApproved} onOpenChange={(o) => !o && setSelectedApproved(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedApproved && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  {selectedApproved.storeName}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Username</p>
                    <p className="font-semibold text-sm mt-0.5">@{selectedApproved.username}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">WhatsApp</p>
                    <p className="font-semibold text-sm mt-0.5">{selectedApproved.whatsapp}</p>
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3">
                  <Gift className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-800 text-sm">
                      {selectedApproved.rewardCode === "NO_REWARD_MONTHLY_PLAN" ? "No Reward" : "+2000 Coins Earned"}
                    </p>
                    <p className="text-green-700 text-xs mt-1">
                      {selectedApproved.rewardCode === "NO_REWARD_MONTHLY_PLAN"
                        ? "Reward not applicable on ₹999/month plan"
                        : "Credited to your account"}
                    </p>
                  </div>
                </div>
                <Button className="w-full" onClick={() => setSelectedApproved(null)}>Close</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Claim Help Dialog ── */}
      <Dialog open={claimHelpOpen} onOpenChange={setClaimHelpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-green-600" />
              How to claim your rewards
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2 text-sm text-foreground">
            <div className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">1</span>
              <p>Refer a friend's store using the <strong>Add My Friend's Store</strong> button above.</p>
            </div>
            <div className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">2</span>
              <p>Once the store is approved and the owner makes payment, your coins are credited automatically.</p>
            </div>
            <div className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">3</span>
              <p>Contact <strong>Web Media Hub support</strong> to redeem your coins for a free AI Promotional Video.</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
              ⚠️ Reward is <strong>not applicable</strong> on the ₹999/month plan.
            </div>
            <Button className="w-full" onClick={() => setClaimHelpOpen(false)}>Got it</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ── */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(o) => !o && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Campaign?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone. The campaign and its tracking link will be permanently deleted.</p>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => deleteConfirmId && deleteCampaign.mutate(deleteConfirmId)}
              disabled={deleteCampaign.isPending}
            >
              {deleteCampaign.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
