import { useState, useEffect } from "react";
import { Link } from "wouter";
import PricingOverlay, { type SelectedPlan } from "@/components/pricing-overlay";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  useSubmitStoreRequest,
  useMyStoreRequests,
  getMyStoreRequestsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
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
  Phone,
  Link as LinkIcon,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

type Tab = "friend" | "approved" | "rejected";
type PageView = "main" | "addFriend" | "choosePlan";

export default function AiVideo() {
  const [pageView, setPageView] = useState<PageView>("main");
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("friend");
  const [selectedApproved, setSelectedApproved] = useState<any>(null);
  const [approvedTabSeenAt, setApprovedTabSeenAt] = useState<string | null>(() =>
    localStorage.getItem("wmh_ai_video_approved_tab_seen_at")
  );
  const [claimHelpOpen, setClaimHelpOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    email: "",
    password: "",
    storeName: "",
    whatsapp: "",
  });

  const submitRequest = useSubmitStoreRequest();
  const { data: myRequests } = useMyStoreRequests();

  const pending = (myRequests ?? []).filter((r) => r.status === "pending");
  const approved = (myRequests ?? []).filter((r) => r.status === "approved");
  const rejected = (myRequests ?? []).filter((r) => r.status === "rejected");
  const rewardCoins = approved.filter((r) => r.rewardCode && r.rewardCode !== "NO_REWARD_MONTHLY_PLAN").length * 1000;

  const approvedTabHasDot =
    approved.length > 0 &&
    (!approvedTabSeenAt ||
      approved.some(
        (r) => new Date((r as any).updatedAt ?? r.createdAt) > new Date(approvedTabSeenAt!)
      ));

  useEffect(() => {
    if (activeTab === "approved" && approved.length > 0) {
      const now = new Date().toISOString();
      localStorage.setItem("wmh_ai_video_approved_tab_seen_at", now);
      setApprovedTabSeenAt(now);
    }
  }, [activeTab, approved.length]);

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
    if (whatsappError) {
      toast({ variant: "destructive", title: whatsappError });
      return;
    }

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
          const reason: string =
            err?.data?.error ??
            err?.data?.message ??
            err?.response?.data?.error ??
            err?.message?.replace(/^HTTP \d+[^:]*:\s*/i, "") ??
            "";

          const isEmailTaken = reason.toLowerCase().includes("already exists") || reason.toLowerCase().includes("email");
          const isSpamWhatsApp = reason.toLowerCase().includes("whatsapp") || reason.toLowerCase().includes("phone") || reason.toLowerCase().includes("spam");

          const title = isEmailTaken
            ? "Email already exists, please try different 🙏"
            : isSpamWhatsApp
            ? "Spam number not allowed, please fill real 🙏"
            : reason || "Something went wrong, please try again 🙏";

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

  /* ── Pricing Overlay ── */
  if (pageView === "choosePlan") {
    return <PricingOverlay onBack={() => setPageView("addFriend")} onSelectPlan={(plan) => { setSelectedPlan(plan); setPageView("addFriend"); }} />;
  }

  /* ── Full-page Add Friend Store ── */
  if (pageView === "addFriend") {
    return (
      <div className="h-screen flex flex-col bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b bg-background">
          <button
            onClick={() => { setPageView("main"); setForm({ username: "", password: "", storeName: "", whatsapp: "" }); }}
            className="p-1.5 rounded-full hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-green-600" />
            <span className="font-bold text-base">Add My Friend's Store</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleDone} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5 max-w-lg mx-auto w-full">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="friend@example.com" value={form.email} onChange={handleFormChange} required data-testid="friend-email" />
            <p className="text-xs text-muted-foreground">Friend's email address for store login</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="text" inputMode="numeric" placeholder="Only numbers" value={form.password} onChange={handleFormChange} required data-testid="friend-password" />
            <p className="text-xs text-muted-foreground">Only numbers allowed (no letters or emoji)</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="storeName">Store Name</Label>
            <Input id="storeName" name="storeName" placeholder="Friend's store name" value={form.storeName} onChange={handleFormChange} required data-testid="friend-store-name" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="whatsapp" className="flex items-center gap-1.5">
              Store Owner WhatsApp Number
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            </Label>
            <div className="flex items-center border border-input rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-ring">
              <span className="px-3 py-2 bg-muted text-sm font-medium text-muted-foreground border-r border-input shrink-0">
                +91
              </span>
              <input
                id="whatsapp"
                name="whatsapp"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="0000000000"
                value={form.whatsapp}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setForm((p) => ({ ...p, whatsapp: val }));
                }}
                className="flex-1 px-3 py-2 text-sm bg-background outline-none"
                required
                data-testid="friend-whatsapp"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Enter 10-digit mobile number (repeated digits like 9999999999 not allowed)
            </p>
          </div>

          {/* Choose Plan button */}
          <button
            type="button"
            onClick={() => setPageView("choosePlan")}
            className="w-full flex items-center justify-between gap-3 rounded-xl px-5 py-4 font-semibold text-base transition-colors active:opacity-80"
            style={{ background: "linear-gradient(135deg,#f59e0b,#fbbf24)", color: "#fff", boxShadow: "0 2px 12px rgba(251,191,36,0.4)" }}
          >
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 fill-white text-white shrink-0" />
              <span>{selectedPlan ? "Change Plan" : "Choose Plan"}</span>
            </div>
            <ChevronRight className="w-5 h-5 shrink-0" />
          </button>

          {/* Selected Plan Card */}
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

          </div>{/* end scrollable content */}
          <div className="shrink-0 border-t bg-background px-5 py-4 flex gap-3 max-w-lg mx-auto w-full">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => { setPageView("main"); setForm({ email: "", password: "", storeName: "", whatsapp: "" }); setSelectedPlan(null); }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-40"
              disabled={submitRequest.isPending || !form.email || !form.password || !form.storeName || form.whatsapp.length !== 10 || !selectedPlan}
            >
              {submitRequest.isPending ? "Submitting..." : "Done"}
            </Button>
          </div>
        </form>

        {/* Confirmation Popup */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-center justify-center">
                <Video className="w-5 h-5 text-primary" />
                Store Submitted
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              {/* Point 1 — Payment */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                <MapPin className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-800 text-sm">Payment Required for Approval</p>
                  <p className="text-amber-700 text-sm mt-1">
                    The store owner will need to complete a payment to get their store approved on Web Media Hub.
                  </p>
                </div>
              </div>
              {/* Point 2 — Reward */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3">
                <Gift className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-800 text-sm">Your Reward</p>
                  <p className="text-green-700 text-sm mt-1">
                    Once the store is approved, you will receive{" "}
                    <span className="font-bold text-green-800">1000 ₹ Web Media Hub Coins</span> added to your account.
                  </p>
                </div>
              </div>
              {/* Point 3 — Not applicable on ₹999 plan */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-red-800 text-sm">Important — Plan Restriction</p>
                  <p className="text-red-700 text-sm mt-1">
                    This reward is <span className="font-bold underline">not applicable</span> on the{" "}
                    <span className="font-bold">₹999/month</span> plan. Reward is only earned when the referred store purchases a higher plan.
                  </p>
                </div>
              </div>
              <Button className="w-full" onClick={() => setConfirmOpen(false)} data-testid="confirm-close-btn">Got it</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  /* ── Main Page ── */
  return (
    <div className="space-y-8 pb-12 max-w-4xl mx-auto">

      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Promotional Video</h1>
        <p className="text-muted-foreground text-sm mt-1">Refer friends and earn free AI promotional videos</p>
      </div>

      {/* Add My Friend's Store — Green CTA */}
      <button
        data-testid="add-friend-store-btn"
        onClick={() => setPageView("addFriend")}
        className="w-full flex items-center justify-between gap-4 bg-green-600 hover:bg-green-700 active:bg-green-800 transition-colors text-white rounded-xl px-6 py-5 shadow-lg"
      >
        <div className="flex items-center gap-3">
          <PlusCircle className="w-6 h-6 shrink-0" />
          <div className="text-left">
            <p className="font-semibold text-lg leading-tight">Add My Friend's Store</p>
            <p className="text-green-100 text-sm">Refer a store and earn 1000 coins on approval</p>
          </div>
        </div>
        <Store className="w-8 h-8 text-green-200 shrink-0" />
      </button>

      {/* Your Rewards */}
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

      {/* Global Link Row */}
      {globalLink && (
        <div className="rounded-xl border border-primary/20 overflow-hidden">
          <div className="flex items-center px-4 py-2.5 bg-primary/5 border-b border-primary/20">
            <span className="text-sm font-bold text-primary tracking-wide">NexGenStudio</span>
            <span className="text-xs text-muted-foreground ml-2">(3D Model & product on Model's generator)</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <LinkIcon className="w-4 h-4 text-primary shrink-0" />
            <a
              href={globalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-sm text-primary font-medium underline underline-offset-2 truncate"
            >
              {globalLink}
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(globalLink);
                toast({ title: "Link copied!" });
              }}
              className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors shrink-0"
            >
              <Copy className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* How to Claim Rewards */}
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

      {/* Friends Store Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Friends Store</h2>

        <div className="flex gap-2 mb-4">
          {tabItems.map(({ key, label, icon: Icon, count, activeClass, showDot }) => (
            <button
              key={key}
              data-testid={`tab-${key}`}
              onClick={() => setActiveTab(key)}
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
              {activeTab === "friend" && (
                <>
                  <Store className="w-12 h-12 mx-auto text-muted-foreground/40" />
                  <p className="text-muted-foreground font-medium">No pending store requests</p>
                  <p className="text-sm text-muted-foreground/70">Stores you refer will appear here once submitted</p>
                </>
              )}
              {activeTab === "approved" && (
                <>
                  <CheckCircle className="w-12 h-12 mx-auto text-green-400/40" />
                  <p className="text-muted-foreground font-medium">No approved stores yet</p>
                  <p className="text-sm text-muted-foreground/70">Once your referral is approved you'll earn 1000 coins</p>
                </>
              )}
              {activeTab === "rejected" && (
                <>
                  <XCircle className="w-12 h-12 mx-auto text-red-400/40" />
                  <p className="text-muted-foreground font-medium">No rejected stores</p>
                </>
              )}
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
                    <Badge
                      className={`text-[10px] shrink-0 ${
                        req.status === "approved" ? "bg-green-600 text-white" :
                        req.status === "rejected" ? "bg-red-600 text-white" :
                        "bg-amber-500 text-white"
                      }`}
                    >
                      {req.status === "approved" ? "Approved" : req.status === "rejected" ? "Rejected" : "Pending"}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Approved Store Detail Dialog */}
      <Dialog open={!!selectedApproved} onOpenChange={(open) => { if (!open) setSelectedApproved(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              {selectedApproved?.storeName}
            </DialogTitle>
          </DialogHeader>
          {selectedApproved && (
            <div className="space-y-4 pt-1">
              <div className="rounded-xl border overflow-hidden bg-muted/40">
                <div className="px-4 py-2.5 bg-muted border-b">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Submitted Information</p>
                </div>
                <div className="divide-y divide-border">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5" /> Store Name
                    </span>
                    <span className="text-sm font-semibold">{selectedApproved.storeName}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> WhatsApp
                    </span>
                    <span className="text-sm font-medium">
                      +91 {selectedApproved.whatsapp.replace(/^\+?91/, "").trim()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-muted-foreground">Approved on</span>
                    <span className="text-sm font-medium text-green-600">
                      {new Date(selectedApproved.updatedAt ?? selectedApproved.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-green-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-green-50 border-b border-green-200">
                  <p className="text-xs font-bold text-green-700 uppercase tracking-widest">Store Rewards</p>
                </div>
                <div className="divide-y divide-border">
                  <div className="flex items-center justify-between px-4 py-3 gap-3">
                    <span className="text-sm text-muted-foreground shrink-0">Reward Code</span>
                    {selectedApproved.rewardCode === "NO_REWARD_MONTHLY_PLAN" ? (
                      <span className="text-xs text-red-600 font-medium text-right max-w-[220px] leading-snug">
                        No reward available on the Starting Monthly Plan. To earn a reward, please submit the request with a higher plan.
                      </span>
                    ) : selectedApproved.rewardCode ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-bold tracking-[0.15em] text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-md select-all">
                          {selectedApproved.rewardCode}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(selectedApproved.rewardCode);
                            toast({ title: "Reward code copied ✅" });
                          }}
                          className="w-7 h-7 rounded-full bg-green-100 hover:bg-green-200 flex items-center justify-center text-green-700 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm font-mono text-muted-foreground/40">— — — — —</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 gap-3">
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5 shrink-0">
                      <LinkIcon className="w-3.5 h-3.5" /> NexGenStudio link
                    </span>
                    {globalLink ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(globalLink);
                            toast({ title: "Link copied!" });
                          }}
                          className="w-7 h-7 rounded-full bg-green-100 hover:bg-green-200 flex items-center justify-center text-green-700 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => window.open(globalLink, "_blank")}
                          className="w-7 h-7 rounded-full bg-green-100 hover:bg-green-200 flex items-center justify-center text-green-700 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground/40 italic text-right">
                        Coming soon...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Popup */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-center justify-center">
              <Video className="w-5 h-5 text-primary" />
              Store Submitted
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {/* Point 1 — Payment */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
              <MapPin className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800 text-sm">Payment Required for Approval</p>
                <p className="text-amber-700 text-sm mt-1">
                  The store owner will need to complete a payment to get their store approved on Web Media Hub.
                </p>
              </div>
            </div>
            {/* Point 2 — Reward */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3">
              <Gift className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-800 text-sm">Your Reward</p>
                <p className="text-green-700 text-sm mt-1">
                  Once the store is approved, you will receive{" "}
                  <span className="font-bold text-green-800">1000 ₹ Web Media Hub Coins</span> added to your account.
                </p>
              </div>
            </div>
            {/* Point 3 — Applicable on all plans */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0 mt-1" />
              <div>
                <p className="font-semibold text-green-800 text-sm">Valid on All Plans 🎉</p>
                <p className="text-green-700 text-sm mt-1">
                  This reward is applicable on <span className="font-bold underline">every plan</span>.
                  Every approved referral earns you <span className="font-bold">1000 ₹ Web Media Hub Coins</span> — no restrictions!
                </p>
              </div>
            </div>
            <Button className="w-full" onClick={() => setConfirmOpen(false)} data-testid="confirm-close-btn">Got it</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* How to Claim Rewards Dialog */}
      <Dialog open={claimHelpOpen} onOpenChange={setClaimHelpOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 justify-center text-green-700">
              <Gift className="w-5 h-5" />
              How to claim your rewards ( coins ) 🎁
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 space-y-3 pt-2 pr-1">
            {[
              "Go to approved friends section and click on the approved Admin",
              "Copy the reward code from Store reward section",
              "Open NexGenStudio site from Store reward section or reward section down side link / Copy the link and past on Google and open NexGenStudio site",
              "Open the NexGenStudio site and click on coin section",
              "Past code in Claim reward code section and click on Claim",
              "Your coin added in your NexGenStudio account",
              "Choose videos from catagory and make & download your store video",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <div className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <p className="text-sm text-green-900 leading-relaxed">{step}</p>
              </div>
            ))}

            {/* Red dot — Plan restriction note */}
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <span className="w-3 h-3 rounded-full bg-red-500 shrink-0 mt-1" />
              <p className="text-sm text-red-800 leading-relaxed">
                <span className="font-bold">Note:</span> This reward is{" "}
                <span className="font-bold underline">not applicable</span> on the{" "}
                <span className="font-bold">any plan</span>. All referrals who get approved will earn you 1000 ₹ Web Media Hub Coins reward.
              </p>
            </div>
          </div>
          <div className="pt-3">
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={() => setClaimHelpOpen(false)}>
              Got it ✅
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
