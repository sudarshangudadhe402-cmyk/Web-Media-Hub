import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  useListAdmins,
  useCreateAdmin,
  useListStoreRequests,
  useApproveStoreRequest,
  useRejectStoreRequest,
  getListAdminsQueryKey,
  getListStoreRequestsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Shield,
  UserPlus,
  Store,
  CheckCircle,
  XCircle,
  MessageCircle,
  Clock,
  Link as LinkIcon,
  Copy,
  Trash2,
  ExternalLink,
  Pencil,
  Star,
  ChevronRight,
  ChevronLeft,
  Phone,
  Search,
  X,
  Mail,
  RefreshCw,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import PricingOverlay, { type SelectedPlan } from "@/components/pricing-overlay";

const TOKEN_KEY = "wmh_super_token";
type StoreTab = "pending" | "approved" | "rejected";

export default function ManageAdmins() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: admins } = useListAdmins();
  const createAdmin = useCreateAdmin();

  const { data: allRequests, isLoading: reqLoading } = useListStoreRequests();
  const approveRequest = useApproveStoreRequest();
  const rejectRequest = useRejectStoreRequest();

  const [pageView, setPageView] = useState<"main" | "addAdmin" | "choosePlan">("main");
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | null>(null);
  const [form, setForm] = useState({ email: "", password: "", adminNumber: "" });
  const [otpStep, setOtpStep] = useState<"form" | "otp">("form");
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);
  const [activeTab, setActiveTab] = useState<StoreTab>("pending");
  const [selectedRequest, setSelectedRequest] = useState<NonNullable<typeof allRequests>[number] | null>(null);
  const [requestDetailOpen, setRequestDetailOpen] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [storeSearchQuery, setStoreSearchQuery] = useState("");
  const [pendingTabSeenAt, setPendingTabSeenAt] = useState<string | null>(() =>
    localStorage.getItem("wmh_sa_pending_tab_seen_at")
  );

  // OTP resend countdown
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  function authFetchAdmin(url: string, options?: RequestInit) {
    const token = sessionStorage.getItem(TOKEN_KEY);
    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options?.headers ?? {}),
      },
    });
  }

  async function handleSendCreationOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast({ variant: "destructive", title: "Required", description: "Email and password are required" });
      return;
    }
    setOtpLoading(true);
    setOtpError("");
    try {
      const res = await authFetchAdmin("/api/admins/send-creation-otp", {
        method: "POST",
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || "Failed to send OTP");
        return;
      }
      setOtpStep("otp");
      setOtpCode("");
      setResendCountdown(30);
      toast({ title: "OTP Sent!", description: `A 6-digit code was sent to ${form.email}` });
    } catch {
      setOtpError("Connection error. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleResendCreationOtp() {
    if (resendCountdown > 0) return;
    setOtpLoading(true);
    setOtpError("");
    try {
      const res = await authFetchAdmin("/api/admins/send-creation-otp", {
        method: "POST",
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      if (!res.ok) { setOtpError(data.error || "Failed to resend OTP"); return; }
      setResendCountdown(30);
      setOtpCode("");
      toast({ title: "OTP Resent!" });
    } catch {
      setOtpError("Connection error.");
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleVerifyAndCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      setOtpError("Please enter the 6-digit OTP");
      return;
    }
    setOtpLoading(true);
    setOtpError("");
    try {
      const verifyRes = await authFetchAdmin("/api/admins/verify-creation-otp", {
        method: "POST",
        body: JSON.stringify({ email: form.email, otp: otpCode }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setOtpError(verifyData.error || "OTP verification failed");
        setOtpLoading(false);
        return;
      }
      // OTP verified — now create admin
      createAdmin.mutate(
        { data: {
          email: form.email,
          password: form.password,
          adminNumber: form.adminNumber,
          planKey: selectedPlan?.planKey ?? "",
          planName: selectedPlan?.name ?? "",
          planPrice: selectedPlan?.price ?? "",
          planPeriod: selectedPlan?.period ?? "",
          planBadge: selectedPlan?.badge ?? "",
          planColor: selectedPlan?.color ?? "",
          couponCode: selectedPlan?.couponCode ?? "",
        } },
        {
          onSuccess: () => {
            toast({ title: "Admin created successfully" });
            queryClient.invalidateQueries({ queryKey: getListAdminsQueryKey() });
            setForm({ email: "", password: "", adminNumber: "" });
            setOtpStep("form");
            setOtpCode("");
            setPageView("main");
          },
          onError: (err: any) => {
            const msg = err?.data?.error || err?.message || "Failed to create admin";
            toast({ variant: "destructive", title: "Failed", description: msg });
          },
        }
      );
    } catch {
      setOtpError("Connection error. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createAdmin.mutate(
      { data: {
        email: form.email,
        password: form.password,
        adminNumber: form.adminNumber,
        planKey: selectedPlan?.planKey ?? "",
        planName: selectedPlan?.name ?? "",
        planPrice: selectedPlan?.price ?? "",
        planPeriod: selectedPlan?.period ?? "",
        planBadge: selectedPlan?.badge ?? "",
        planColor: selectedPlan?.color ?? "",
        couponCode: selectedPlan?.couponCode ?? "",
      } },
      {
        onSuccess: () => {
          toast({ title: "Admin created successfully" });
          queryClient.invalidateQueries({ queryKey: getListAdminsQueryKey() });
          setForm({ email: "", password: "", adminNumber: "" });
          setPageView("main");
        },
        onError: (err: any) => {
          const msg = err?.data?.error || err?.message || "Failed to create admin";
          const lc = msg.toLowerCase();
          const isEmailConflict = lc.includes("email already exists") || lc.includes("email is already");
          const isMobileConflict = lc.includes("mobile") || lc.includes("number already exists") || lc.includes("admin number");
          const isInvalidEmail = lc.includes("valid email");
          toast({
            variant: "destructive",
            title: isEmailConflict ? "Email already exists" : isMobileConflict ? "Mobile number already exists" : isInvalidEmail ? "Invalid Email" : "Failed",
            description: isEmailConflict
              ? "This email is already registered with another admin"
              : isMobileConflict
              ? "This mobile number is already registered with another admin"
              : isInvalidEmail
              ? "Please enter a valid email address"
              : msg,
          });
        },
      }
    );
  }

  function authFetch(url: string, options?: RequestInit) {
    const token = sessionStorage.getItem(TOKEN_KEY);
    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options?.headers ?? {}),
      },
    });
  }

  const { data: globalLinkData, refetch: refetchGlobalLink } = useQuery({
    queryKey: ["settings", "global-link"],
    queryFn: async () => {
      const res = await authFetch("/api/settings/global-link");
      if (!res.ok) return { globalLink: null };
      return res.json() as Promise<{ globalLink: string | null }>;
    },
  });
  const globalLink = globalLinkData?.globalLink ?? null;

  const saveGlobalLink = useMutation({
    mutationFn: async (link: string) => {
      const res = await authFetch("/api/settings/global-link", {
        method: "PUT",
        body: JSON.stringify({ globalLink: link }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Global link saved ✅" });
      refetchGlobalLink();
      setIsEditingLink(false);
      setLinkInput("");
    },
    onError: () => toast({ variant: "destructive", title: "Failed to save link" }),
  });

  const deleteGlobalLink = useMutation({
    mutationFn: async () => {
      const res = await authFetch("/api/settings/global-link", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Global link removed" });
      refetchGlobalLink();
      setIsEditingLink(false);
      setLinkInput("");
    },
    onError: () => toast({ variant: "destructive", title: "Failed to remove link" }),
  });

  const requestUsernameExists = !!(
    selectedRequest &&
    admins?.some((a) => (a as any).email === (selectedRequest as any).email)
  );

  const pending = (allRequests ?? []).filter((r) => r.status === "pending");
  const approved = (allRequests ?? []).filter((r) => r.status === "approved");
  const rejected = (allRequests ?? []).filter((r) => r.status === "rejected");

  const pendingTabHasDot =
    pending.length > 0 &&
    (!pendingTabSeenAt ||
      pending.some((r) => new Date(r.createdAt) > new Date(pendingTabSeenAt!)));

  const q = storeSearchQuery.trim().toLowerCase();
  const filteredTabData: Record<StoreTab, typeof pending> = {
    pending: q ? pending.filter((r) => r.storeName.toLowerCase().includes(q) || (r as any).email?.toLowerCase().includes(q)) : pending,
    approved: q ? approved.filter((r) => r.storeName.toLowerCase().includes(q) || (r as any).email?.toLowerCase().includes(q)) : approved,
    rejected: q ? rejected.filter((r) => r.storeName.toLowerCase().includes(q) || (r as any).email?.toLowerCase().includes(q)) : rejected,
  };

  useEffect(() => {
    if (!q) return;
    if (filteredTabData[activeTab].length > 0) return;
    const order: StoreTab[] = ["pending", "approved", "rejected"];
    const match = order.find((t) => filteredTabData[t].length > 0);
    if (match) setActiveTab(match);
  }, [q]);

  useEffect(() => {
    if (activeTab === "pending" && pending.length > 0) {
      const now = new Date().toISOString();
      localStorage.setItem("wmh_sa_pending_tab_seen_at", now);
      setPendingTabSeenAt(now);
    }
  }, [activeTab, pending.length]);

  function openWhatsApp(number: string) {
    window.open(`https://wa.me/${number.replace(/\D/g, "")}`, "_blank");
  }

  function sendApprovalWhatsApp(req: NonNullable<typeof allRequests>[number]) {
    const loginLink = window.location.origin;
    const msg = encodeURIComponent(
      `Congratulations 🎉 Your store is approved\n\nNow build your store strong & increases your sells\n\nStore login page : ${loginLink}\nEmail: ${(req as any).email}\nPassword: (use the password you set)`
    );
    const phone = req.whatsapp.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  }

  function sendRejectionWhatsApp(req: NonNullable<typeof allRequests>[number]) {
    const msg = encodeURIComponent(
      `Bad luck 😓 your store is not approved\n\nPlease try it again and claim apportunity of\nBuild your store to brand & increases sells 10x 📈`
    );
    const phone = req.whatsapp.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  }

  function handleApprove(id: string, req: NonNullable<typeof allRequests>[number]) {
    approveRequest.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Store approved ✅" });
          queryClient.invalidateQueries({ queryKey: getListStoreRequestsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListAdminsQueryKey() });
          setRequestDetailOpen(false);
          sendApprovalWhatsApp(req);
        },
        onError: (err: any) => {
          const msg = err?.data?.error || err?.message || "Failed to approve";
          const isUsernameConflict = msg.toLowerCase().includes("already exists") || msg.toLowerCase().includes("username");
          toast({
            variant: "destructive",
            title: isUsernameConflict ? "Username already exists" : "Failed to approve",
            description: isUsernameConflict ? "Please try a different username for this store request" : msg,
          });
        },
      }
    );
  }

  function handleReject(id: string, req: NonNullable<typeof allRequests>[number]) {
    rejectRequest.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Store rejected" });
          queryClient.invalidateQueries({ queryKey: getListStoreRequestsQueryKey() });
          setRequestDetailOpen(false);
          sendRejectionWhatsApp(req);
        },
        onError: () => toast({ title: "Failed to reject", variant: "destructive" }),
      }
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manage Admins</h1>
        <p className="text-muted-foreground text-sm mt-1">Create admins, review store requests and manage global settings</p>
      </div>

      {/* ── Add Admin CTA ── */}
      <button
        onClick={() => setPageView("addAdmin")}
        className="w-full flex items-center justify-between gap-4 bg-green-600 hover:bg-green-700 active:bg-green-800 transition-colors text-white rounded-xl px-6 py-5 shadow-lg"
      >
        <div className="flex items-center gap-3">
          <UserPlus className="w-6 h-6 shrink-0" />
          <div className="text-left">
            <p className="font-semibold text-lg leading-tight">Add Admin</p>
            <p className="text-green-100 text-sm">Create a new admin account</p>
          </div>
        </div>
        <Shield className="w-8 h-8 text-green-200 shrink-0" />
      </button>

      {/* ── Global Link Section ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <LinkIcon className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Global Link</h2>
        </div>

        {globalLink && !isEditingLink ? (
          <Card className="border-primary/20">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-2">
                <LinkIcon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <a
                  href={globalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-sm text-primary font-medium underline underline-offset-2 break-all"
                >
                  {globalLink}
                </a>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="flex-1 gap-1.5"
                  onClick={() => { navigator.clipboard.writeText(globalLink); toast({ title: "Link copied!" }); }}>
                  <Copy className="w-3.5 h-3.5" /> Copy
                </Button>
                <Button size="sm" variant="outline" className="flex-1 gap-1.5"
                  onClick={() => window.open(globalLink, "_blank")}>
                  <ExternalLink className="w-3.5 h-3.5" /> Open
                </Button>
                <Button size="sm" variant="outline" className="flex-1 gap-1.5"
                  onClick={() => { setLinkInput(globalLink); setIsEditingLink(true); }}>
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => deleteGlobalLink.mutate()} disabled={deleteGlobalLink.isPending}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed border-2">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                {isEditingLink ? "Update the global link:" : "Paste a link to show on all admin pages:"}
              </p>
              <div className="flex gap-2">
                <Input
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  placeholder="https://example.com/..."
                  className="flex-1"
                />
                <Button
                  onClick={() => { const t = linkInput.trim(); if (!t) return; saveGlobalLink.mutate(t); }}
                  disabled={saveGlobalLink.isPending || !linkInput.trim()}
                  className="bg-primary text-primary-foreground"
                >
                  {saveGlobalLink.isPending ? "Saving..." : isEditingLink ? "Update" : "Save"}
                </Button>
                {isEditingLink && (
                  <Button variant="outline" onClick={() => { setIsEditingLink(false); setLinkInput(""); }}>
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Store Approval Section ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Store className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Store Approval Requests</h2>
          {pending.length > 0 && (
            <Badge className="bg-amber-500 text-white">{pending.length} pending</Badge>
          )}
        </div>

        <div className="space-y-4">
          {/* Tab buttons */}
          <div className="flex gap-2">
            {(
              [
                { key: "pending" as StoreTab, label: "Pending", icon: Clock, count: q ? filteredTabData.pending.length : pending.length, activeClass: "bg-amber-500 text-white border-amber-500", showDot: pendingTabHasDot },
                { key: "approved" as StoreTab, label: "Approved", icon: CheckCircle, count: q ? filteredTabData.approved.length : approved.length, activeClass: "bg-green-600 text-white border-green-600", showDot: false },
                { key: "rejected" as StoreTab, label: "Rejected", icon: XCircle, count: q ? filteredTabData.rejected.length : rejected.length, activeClass: "bg-red-600 text-white border-red-600", showDot: false },
              ]
            ).map(({ key, label, icon: Icon, count, activeClass, showDot }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl text-xs font-medium border transition-colors ${
                  activeTab === key ? activeClass : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-center leading-tight">{label}</span>
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

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search store by name or email..."
              value={storeSearchQuery}
              onChange={(e) => setStoreSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {storeSearchQuery && (
              <button
                type="button"
                onClick={() => setStoreSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Results */}
          {reqLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : filteredTabData[activeTab].length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="py-12 text-center space-y-2">
                {q ? (
                  <>
                    <Search className="w-10 h-10 mx-auto text-muted-foreground/30" />
                    <p className="text-muted-foreground font-medium">No stores found</p>
                    <p className="text-sm text-muted-foreground/60">No match for "{storeSearchQuery.trim()}"</p>
                    <button
                      onClick={() => setStoreSearchQuery("")}
                      className="text-xs text-primary underline underline-offset-2 mt-1"
                    >
                      Clear search
                    </button>
                  </>
                ) : (
                  <>
                    {activeTab === "pending" && <><Clock className="w-10 h-10 mx-auto text-muted-foreground/30" /><p className="text-muted-foreground font-medium">No pending store requests</p><p className="text-sm text-muted-foreground/60">Store approval requests will appear here</p></>}
                    {activeTab === "approved" && <><CheckCircle className="w-10 h-10 mx-auto text-green-400/40" /><p className="text-muted-foreground font-medium">No approved stores yet</p></>}
                    {activeTab === "rejected" && <><XCircle className="w-10 h-10 mx-auto text-red-400/40" /><p className="text-muted-foreground font-medium">No rejected stores</p></>}
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredTabData[activeTab].map((req) => (
                <button
                  key={req.id}
                  onClick={() => { setSelectedRequest(req); setRequestDetailOpen(true); }}
                  className="w-full text-left"
                >
                  <Card className="hover:border-primary/40 transition-colors cursor-pointer">
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
                        <p className="font-semibold truncate">{req.storeName}</p>
                        <p className="text-sm text-muted-foreground">{(req as any).email}</p>
                        <p className="text-xs text-muted-foreground/60 mt-0.5">
                          {new Date(req.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Admin — Full Page (rendered above main when active) */}
      {pageView === "addAdmin" && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b bg-background">
            <button
              onClick={() => {
                if (otpStep === "otp") { setOtpStep("form"); setOtpCode(""); setOtpError(""); }
                else { setPageView("main"); setForm({ email: "", password: "", adminNumber: "" }); setSelectedPlan(null); setOtpStep("form"); setOtpCode(""); setOtpError(""); }
              }}
              className="p-1.5 rounded-full hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-green-600" />
              <span className="font-bold text-base">{otpStep === "otp" ? "Verify Email OTP" : "Add New Admin"}</span>
            </div>
          </div>

          {/* Step 1 — Details Form */}
          {otpStep === "form" && (
            <form onSubmit={handleSendCreationOtp} className="flex-1 flex flex-col p-5 gap-5 max-w-lg mx-auto w-full overflow-y-auto">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="admin@example.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
                <p className="text-xs text-muted-foreground">Enter a valid email address (this will be used to login)</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Only numbers (e.g. 123456)"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value.replace(/[^0-9]/g, "") }))}
                  required
                />
                <p className="text-xs text-muted-foreground">Only numbers allowed (no letters or emoji)</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Admin Number
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground font-medium shrink-0">+91</span>
                  <Input
                    placeholder="10-digit number"
                    value={form.adminNumber}
                    onChange={(e) => setForm((f) => ({ ...f, adminNumber: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                    maxLength={10}
                  />
                </div>
              </div>

              {/* Choose Plan */}
              <button
                type="button"
                className="w-full flex items-center justify-between gap-3 rounded-xl px-5 py-4 font-semibold text-base transition-colors active:opacity-80"
                style={{ background: "linear-gradient(135deg,#f59e0b,#fbbf24)", color: "#fff", boxShadow: "0 2px 12px rgba(251,191,36,0.4)" }}
                onClick={() => setPageView("choosePlan")}
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

              {otpError && (
                <div className="rounded-xl px-4 py-3 text-sm font-medium bg-red-50 border border-red-200 text-red-600">
                  {otpError}
                </div>
              )}

              <div className="flex gap-3 mt-auto pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setPageView("main"); setForm({ email: "", password: "", adminNumber: "" }); setSelectedPlan(null); setOtpStep("form"); setOtpCode(""); setOtpError(""); }}
                >
                  Cancel
                </Button>
              <Button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-40"
                disabled={otpLoading || !form.email || !form.password}
              >
                {otpLoading ? (
                  <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Sending...</span>
                ) : (
                  <span className="flex items-center gap-2"><Mail className="w-4 h-4" /> Send OTP to Email</span>
                )}
              </Button>
            </div>
          </form>
          )}

          {/* Step 2 — OTP Verification */}
          {otpStep === "otp" && (
            <form onSubmit={handleVerifyAndCreate} className="flex-1 flex flex-col p-5 gap-5 max-w-lg mx-auto w-full overflow-y-auto">
              {/* Info card */}
              <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-4 flex items-start gap-3">
                <Mail className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-800">OTP sent to email</p>
                  <p className="text-xs text-green-700 mt-0.5 break-all">{form.email}</p>
                  <p className="text-xs text-green-600 mt-1">Check inbox (and spam folder). Valid for 10 minutes.</p>
                </div>
              </div>

              {/* OTP input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Enter 6-Digit OTP</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="_ _ _ _ _ _"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setOtpError(""); }}
                  className="text-center tracking-[0.5em] text-xl font-bold"
                  autoFocus
                />
              </div>

              {otpError && (
                <div className="rounded-xl px-4 py-3 text-sm font-medium bg-red-50 border border-red-200 text-red-600">
                  {otpError}
                </div>
              )}

              {/* Resend */}
              <div className="text-center">
                {resendCountdown > 0 ? (
                  <p className="text-xs text-muted-foreground">Resend OTP in {resendCountdown}s</p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendCreationOtp}
                    disabled={otpLoading}
                    className="text-xs font-medium text-green-600 underline underline-offset-2 disabled:opacity-40"
                  >
                    {otpLoading ? "Sending..." : "Resend OTP"}
                  </button>
                )}
              </div>

              <div className="flex gap-3 mt-auto pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setOtpStep("form"); setOtpCode(""); setOtpError(""); }}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-40"
                  disabled={otpLoading || otpCode.length !== 6 || createAdmin.isPending}
                >
                  {otpLoading || createAdmin.isPending ? (
                    <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Verifying...</span>
                  ) : "Verify & Create Admin"}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Pricing Overlay */}
      {pageView === "choosePlan" && (
        <PricingOverlay onBack={() => setPageView("addAdmin")} onSelectPlan={(plan) => { setSelectedPlan(plan); setPageView("addAdmin"); }} />
      )}

      {/* Store Request Detail Dialog */}
      <Dialog open={requestDetailOpen} onOpenChange={setRequestDetailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" />
              Store Approval Request
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-5 pt-2">
              <div className="bg-muted rounded-xl divide-y divide-border">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Store Name</span>
                  <span className="text-sm font-semibold">{selectedRequest.storeName}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="text-sm font-medium">{(selectedRequest as any).email}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Plan</span>
                  <div className="text-right">
                    <span className="text-sm font-semibold">
                      {(selectedRequest as any).planName ?? (selectedRequest as any).plan ?? "—"}
                    </span>
                    {(selectedRequest as any).planPrice && (
                      <p className="text-xs text-muted-foreground">{(selectedRequest as any).planPrice}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Password</span>
                  <span className="text-sm font-medium font-mono">••••••••</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    WhatsApp <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      +91 {selectedRequest.whatsapp.replace(/^\+?91/, "").trim()}
                    </span>
                    <button
                      onClick={() => {
                        if (selectedRequest.status === "approved") sendApprovalWhatsApp(selectedRequest);
                        else if (selectedRequest.status === "rejected") sendRejectionWhatsApp(selectedRequest);
                        else openWhatsApp(selectedRequest.whatsapp);
                      }}
                      className="w-7 h-7 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-white transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge className={
                    selectedRequest.status === "approved" ? "bg-green-600 text-white" :
                    selectedRequest.status === "rejected" ? "bg-red-600 text-white" :
                    "bg-amber-500 text-white"
                  }>
                    {selectedRequest.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Submitted</span>
                  <span className="text-sm font-medium">
                    {new Date(selectedRequest.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
                {(selectedRequest as any).rewardCode && (
                  <div className="flex items-center justify-between px-4 py-3 gap-3">
                    <span className="text-sm text-muted-foreground shrink-0">Reward Code</span>
                    {(selectedRequest as any).rewardCode === "NO_REWARD_MONTHLY_PLAN" ? (
                      <span className="text-xs font-medium text-right leading-snug text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg max-w-[220px]">
                        This admin chose monthly plan, reward Not set on this plan
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-bold tracking-widest text-green-700 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-lg">
                          {(selectedRequest as any).rewardCode}
                        </span>
                        <button
                          onClick={() => navigator.clipboard.writeText((selectedRequest as any).rewardCode)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="Copy reward code"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Referred By Section */}
              {((selectedRequest as any).referrerStoreName || (selectedRequest as any).referrerEmail) && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/60 dark:bg-blue-900/10 dark:border-blue-800 overflow-hidden">
                  <div className="px-4 py-2 border-b border-blue-200 dark:border-blue-800 flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Referred by Admin</span>
                  </div>
                  <div className="divide-y divide-blue-100 dark:divide-blue-800/50">
                    {(selectedRequest as any).referrerStoreName && (
                      <div className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5" /> Store Name
                        </span>
                        <span className="text-sm font-semibold">{(selectedRequest as any).referrerStoreName}</span>
                      </div>
                    )}
                    {(selectedRequest as any).referrerPhone && (
                      <div className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5" /> Mobile
                        </span>
                        <span className="text-sm font-medium">+91 {(selectedRequest as any).referrerPhone}</span>
                      </div>
                    )}
                    {(selectedRequest as any).referrerEmail && (
                      <div className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-sm text-muted-foreground">Email</span>
                        <span className="text-sm font-medium">{(selectedRequest as any).referrerEmail}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedRequest.status === "pending" && (
                <div className="flex gap-3">
                  {!requestUsernameExists ? (
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2"
                      onClick={() => handleApprove(selectedRequest.id, selectedRequest)}
                      disabled={approveRequest.isPending}
                    >
                      <CheckCircle className="w-4 h-4" />
                      {approveRequest.isPending ? "Approving..." : "Approve"}
                    </Button>
                  ) : (
                    <div className="flex-1 flex flex-col gap-1">
                      <Button className="w-full bg-green-600 hover:bg-green-700 text-white gap-2 opacity-50" disabled>
                        <CheckCircle className="w-4 h-4" /> Approve
                      </Button>
                      <p className="text-xs text-amber-600 text-center">Username already taken</p>
                    </div>
                  )}
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-2"
                    onClick={() => handleReject(selectedRequest.id, selectedRequest)}
                    disabled={rejectRequest.isPending}
                  >
                    <XCircle className="w-4 h-4" />
                    {rejectRequest.isPending ? "Rejecting..." : "Reject"}
                  </Button>
                </div>
              )}

              {selectedRequest.status !== "pending" && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-1.5 text-green-600 border-green-200 hover:bg-green-50"
                    onClick={() => sendApprovalWhatsApp(selectedRequest)}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Send WhatsApp
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
