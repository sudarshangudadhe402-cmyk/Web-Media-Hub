import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QRCodeCanvas } from "qrcode.react";
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
  useGetStore,
  useGetDashboardSummary,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import {
  TrendingUp,
  Video,
  PlusCircle,
  MapPin,
  CheckCircle,
  Gift,
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
  Eye,
  X,
  Share2,
  Clock,
} from "lucide-react";

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
  visitCount: number;    // visitors from this campaign (with or without account)
  accountCount: number;  // customers who opened an account from this campaign
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

function CampaignRow({ campaign, onClick }: { campaign: Campaign; onClick: () => void }) {
  const src = SOURCE_OPTIONS.find((s) => s.value === campaign.source);
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-5 bg-card border rounded-xl hover:bg-accent/40 active:bg-accent/60 transition-colors text-left"
    >
      <span
        className="w-3 h-3 rounded-full shrink-0"
        style={{ background: sourceColor(campaign.source) }}
      />
      <span
        className="text-xs font-semibold px-2.5 py-1 rounded-full text-white shrink-0"
        style={{ background: sourceColor(campaign.source) }}
      >
        {src?.label ?? campaign.source}
      </span>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold truncate block">{campaign.campaignName}</span>
        <span className="text-xs text-muted-foreground mt-0.5 block">
          {campaign.visitCount ?? 0} visitors · {campaign.accountCount ?? 0} accounts
        </span>
      </div>
      {!campaign.isActive && (
        <Badge variant="secondary" className="text-[10px] shrink-0">Inactive</Badge>
      )}
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  );
}

function CampaignDetail({ campaign, storeSlug, onBack, onCopyLink, onToggle, onDelete }: {
  campaign: Campaign;
  storeSlug: string;
  onBack: () => void;
  onCopyLink: (link: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [showQr, setShowQr] = useState(false);
  const src = SOURCE_OPTIONS.find((s) => s.value === campaign.source);
  // Always rebuild with current origin so the link works even if the domain changed
  const liveTrackingLink = storeSlug
    ? buildTrackingLink(storeSlug, campaign.source, campaign.campaignSlug)
    : campaign.trackingLink;

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        All Campaigns
      </button>

      <Card className="overflow-hidden">
        <div className="h-1.5 w-full" style={{ background: sourceColor(campaign.source) }} />
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base truncate">{campaign.campaignName}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
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
            <Badge
              className={`shrink-0 text-xs ${campaign.isActive ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}
              variant="outline"
            >
              {campaign.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col items-center bg-blue-50 rounded-xl py-3 gap-1">
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-blue-500" />
                <span className="text-xl font-extrabold text-blue-600">{campaign.visitCount ?? 0}</span>
              </div>
              <span className="text-[11px] text-blue-400 font-semibold">Customer Visit Count</span>
            </div>
            <div className="flex flex-col items-center bg-primary/5 rounded-xl py-3 gap-1">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-xl font-extrabold text-primary">{campaign.accountCount ?? 0}</span>
              </div>
              <span className="text-[11px] text-primary/60 font-semibold">Account Count</span>
            </div>
          </div>

          {/* Tracking Link */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Tracking Link</p>
            <div className="bg-muted rounded-lg px-3 py-2.5 flex items-center gap-2">
              <LinkIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground truncate flex-1 font-mono">{liveTrackingLink}</span>
              <button
                onClick={() => onCopyLink(liveTrackingLink)}
                className="p-1 hover:bg-background rounded transition-colors shrink-0"
              >
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
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
                  <CampaignQrDownload link={liveTrackingLink} name={campaign.campaignSlug} />
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <Button
              size="sm"
              variant="outline"
              className={`flex-1 gap-1.5 text-xs ${campaign.isActive ? "text-amber-600 border-amber-300 hover:bg-amber-50" : "text-green-600 border-green-300 hover:bg-green-50"}`}
              onClick={() => onToggle(campaign.id)}
            >
              <Power className="w-3 h-3" />
              {campaign.isActive ? "Deactivate" : "Activate"}
            </Button>
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
        </CardContent>
      </Card>
    </div>
  );
}

export default function MarketingGrowth() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  /* ── AI Video state ── */
  const [claimHelpOpen, setClaimHelpOpen] = useState(false);

  /* ── My Referrals ── */
  const myReferrals: any[] = [];

  const rewardCoins = myReferrals.filter(
    (r) => r.status === "approved" && r.rewardCode && r.rewardCode !== "NO_REWARD_MONTHLY_PLAN"
  ).length * 1000;

  const referralLink = user?.username
    ? `${window.location.origin}/create-store?ref=${encodeURIComponent(user.username)}`
    : "";

  function copyReferralLink() {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    toast({ title: "Referral link copied!" });
  }

  function shareViaWhatsApp() {
    const msg = encodeURIComponent(
      `Join Web Media Hub and create your own fashion store! 🛍️\n\nClick here to get started:\n${referralLink}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  }

  function shareViaTelegram() {
    const msg = encodeURIComponent("Join Web Media Hub and create your own fashion store! 🛍️");
    const url = encodeURIComponent(referralLink);
    window.open(`https://t.me/share/url?url=${url}&text=${msg}`, "_blank");
  }

  function shareNative() {
    if (navigator.share) {
      navigator.share({
        title: "Web Media Hub",
        text: "Join Web Media Hub and create your own fashion store! 🛍️",
        url: referralLink,
      }).catch(() => {});
    } else {
      copyReferralLink();
    }
  }

  /* ── Store data for tracking links ── */
  const { data: store } = useGetStore({ query: { retry: false } });
  const storeSlug = (store as any)?.publicSlug ?? "";

  /* ── Store visitors ── */
  const { data: dashSummary } = useGetDashboardSummary();

  /* ── Campaign form state ── */
  const [showCreateForm, setShowCreateForm] = useState(false);
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
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

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

  /* ── Toggle (activate / deactivate) mutation ── */
  const toggleCampaign = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/campaigns/${id}/toggle`, { method: "PATCH", headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to toggle");
      return res.json() as Promise<{ isActive: boolean }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({ title: data.isActive ? "Campaign activated!" : "Campaign deactivated" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update campaign status" }),
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
      setSelectedCampaignId(null);
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

  /* ── Full-page views removed (replaced by referral link system) ── */

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

        {/* Create Campaign — button to toggle form */}
        {!showCreateForm ? (
          <Button
            className="w-full gap-2 py-6 text-base font-semibold"
            onClick={() => setShowCreateForm(true)}
          >
            <PlusCircle className="w-5 h-5" />
            Create New Campaign
          </Button>
        ) : (
          <Card className="border-primary/40">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-primary" />
                Create New Campaign
              </CardTitle>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setCampaignName("");
                  setCampaignSource("instagram");
                  setCustomSourceText("");
                  setQrEnabled(false);
                }}
                className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { handleCreateCampaign(e); setShowCreateForm(false); }} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="campaignName">Campaign Name <span className="text-destructive">*</span></Label>
                    <Input
                      id="campaignName"
                      placeholder='e.g. "Summer Sale", "Eid Offer 2026"'
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      required
                      autoFocus
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

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    className="flex-1 sm:flex-none"
                    disabled={createCampaign.isPending || !campaignName.trim() || !storeSlug}
                  >
                    {createCampaign.isPending ? (
                      <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Creating...</>
                    ) : (
                      <><PlusCircle className="w-4 h-4 mr-2" />Create Campaign</>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      setCampaignName("");
                      setCampaignSource("instagram");
                      setCustomSourceText("");
                      setQrEnabled(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

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
          ) : selectedCampaignId ? (
            (() => {
              const selected = campaigns.find((c) => c.id === selectedCampaignId);
              if (!selected) { setSelectedCampaignId(null); return null; }
              return (
                <CampaignDetail
                  campaign={selected}
                  storeSlug={storeSlug}
                  onBack={() => setSelectedCampaignId(null)}
                  onCopyLink={handleCopyLink}
                  onToggle={(id) => toggleCampaign.mutate(id)}
                  onDelete={(id) => setDeleteConfirmId(id)}
                />
              );
            })()
          ) : (
            <div className="flex flex-col gap-2">
              {campaigns.map((campaign) => (
                <CampaignRow
                  key={campaign.id}
                  campaign={campaign}
                  onClick={() => setSelectedCampaignId(campaign.id)}
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
                <p className="text-2xl font-bold text-primary">{campaigns.reduce((sum, c) => sum + (c.visitCount ?? 0), 0)}</p>
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

        {/* Referral Link Card */}
        <Card className="border-2 border-green-200 overflow-hidden">
          <div className="px-5 pt-4 pb-2">
            <div className="flex items-center gap-2 mb-3">
              <Share2 className="w-5 h-5 text-green-600" />
              <p className="font-bold text-base">Your Referral Link</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Share this link with your friends. When they create a store using your link, you earn coins!
            </p>
            <div className="bg-muted rounded-xl px-3 py-2.5 flex items-center gap-2 mb-3">
              <LinkIcon className="w-4 h-4 text-primary shrink-0" />
              <span className="flex-1 text-xs font-mono text-muted-foreground truncate">
                {referralLink || "Loading your link..."}
              </span>
              <button
                onClick={copyReferralLink}
                disabled={!referralLink}
                className="shrink-0 p-1.5 rounded-lg hover:bg-background transition-colors disabled:opacity-40"
                title="Copy link"
              >
                <Copy className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={shareViaWhatsApp}
                disabled={!referralLink}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-40"
                style={{ background: "#25D366" }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488z"/></svg>
                WhatsApp
              </button>
              <button
                onClick={shareViaTelegram}
                disabled={!referralLink}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-40"
                style={{ background: "#0088cc" }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                Telegram
              </button>
              <button
                onClick={shareNative}
                disabled={!referralLink}
                className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold border transition-colors hover:bg-muted/60 disabled:opacity-40"
              >
                <Share2 className="w-4 h-4" />
                More
              </button>
            </div>
          </div>
          <div className="px-5 py-2.5 bg-amber-50 border-t border-amber-100 text-xs text-amber-700 font-medium">
            💡 Friend creates store via your link → store gets approved → you earn <strong>1000 coins</strong>!
          </div>
        </Card>

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
                <p className="text-3xl font-bold text-green-600 leading-none mt-1">+1000</p>
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
              <span className="text-xs text-muted-foreground ml-2">(3D Model &amp; products on Model's generator + AI Promotional Video)</span>
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

        {/* My Referrals History */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              My Referrals
              <Badge variant="secondary" className="text-[11px]">{myReferrals.length}</Badge>
            </h3>
          </div>

          {myReferrals.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="p-12 text-center space-y-3">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/30" />
                <p className="text-muted-foreground font-medium">No referrals yet</p>
                <p className="text-sm text-muted-foreground/70">
                  Share your referral link above. When a friend creates a store using your link, they'll appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {myReferrals.map((req: any) => (
                <Card key={req.id || req._id} className="overflow-hidden">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      req.status === "approved" ? "bg-green-100" :
                      req.status === "rejected" ? "bg-red-100" : "bg-amber-100"
                    }`}>
                      {req.status === "approved" ? <CheckCircle className="w-5 h-5 text-green-600" /> :
                       req.status === "rejected" ? <X className="w-5 h-5 text-red-600" /> :
                       <Clock className="w-5 h-5 text-amber-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{req.storeName}</p>
                      <p className="text-xs text-muted-foreground truncate">{req.email}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(req.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge className={`text-[10px] ${
                        req.status === "approved" ? "bg-green-600 text-white" :
                        req.status === "rejected" ? "bg-red-600 text-white" : "bg-amber-500 text-white"
                      }`}>
                        {req.status === "approved" ? "Approved" : req.status === "rejected" ? "Rejected" : "Pending"}
                      </Badge>
                      {req.status === "approved" && req.rewardCode && req.rewardCode !== "NO_REWARD_MONTHLY_PLAN" && (
                        <span className="text-[10px] font-bold text-green-600">+1000 coins 🎉</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

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
              <p>Copy your <strong>referral link</strong> from above and share it with your friend via WhatsApp or Telegram.</p>
            </div>
            <div className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">2</span>
              <p>Your friend clicks the link, fills in their store details, and submits their store request.</p>
            </div>
            <div className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">3</span>
              <p>Once the store is approved and the owner makes payment, <strong>1000 coins</strong> are credited to your account automatically.</p>
            </div>
            <div className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">4</span>
              <p>Contact <strong>Web Media Hub support</strong> to redeem your coins for a free AI Promotional Video.</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
              ⚠️ Reward is <strong>not applicable</strong> on the starter/trial plan.
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
