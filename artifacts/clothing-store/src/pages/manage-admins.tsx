import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  useListAdmins,
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
  Phone,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type StoreTab = "pending" | "approved" | "rejected";

export default function ManageAdmins() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: admins } = useListAdmins();

  const { data: allRequests, isLoading: reqLoading } = useListStoreRequests();
  const approveRequest = useApproveStoreRequest();
  const rejectRequest = useRejectStoreRequest();

  const [activeTab, setActiveTab] = useState<StoreTab>("pending");
  const [selectedRequest, setSelectedRequest] = useState<NonNullable<typeof allRequests>[number] | null>(null);
  const [requestDetailOpen, setRequestDetailOpen] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [isEditingLink, setIsEditingLink] = useState(false);

  function authFetch(url: string, options?: RequestInit) {
    const token = localStorage.getItem("wmh_token");
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
    enabled: user?.role === "super_admin",
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
    admins?.some((a) => a.username === selectedRequest.username)
  );

  const pending = (allRequests ?? []).filter((r) => r.status === "pending");
  const approved = (allRequests ?? []).filter((r) => r.status === "approved");
  const rejected = (allRequests ?? []).filter((r) => r.status === "rejected");
  const tabData: Record<StoreTab, typeof pending> = { pending, approved, rejected };

  function openWhatsApp(number: string) {
    window.open(`https://wa.me/${number.replace(/\D/g, "")}`, "_blank");
  }

  function sendApprovalWhatsApp(req: NonNullable<typeof allRequests>[number]) {
    const loginLink = `${window.location.origin}`;
    const msg = encodeURIComponent(
      `Congratulations 🎉 Your store is approved\n\nNow build your store strong & increases your sells\n\nStore login page : ${loginLink}\nUsername: ${req.username}\nPassword: ${req.password}`
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
          const msg = err?.response?.data?.error || err?.message || "Failed to approve";
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

  if (user?.role !== "super_admin") {
    return (
      <div className="p-8 text-center space-y-3">
        <Shield className="w-12 h-12 mx-auto text-destructive" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">Only super admins can access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manage Admins</h1>
        <p className="text-muted-foreground text-sm mt-1">Review store requests and manage global settings</p>
      </div>

      {/* ── Store Approval Section ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Store className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Store Approval Requests</h2>
          {pending.length > 0 && (
            <Badge className="bg-amber-500 text-white ml-1">{pending.length} pending</Badge>
          )}
        </div>

        <div className="flex gap-2 mb-4">
          {(
            [
              { key: "pending" as StoreTab, label: "Pending Approval", icon: Clock, count: pending.length, activeClass: "bg-amber-500 text-white border-amber-500" },
              { key: "approved" as StoreTab, label: "Approved", icon: CheckCircle, count: approved.length, activeClass: "bg-green-600 text-white border-green-600" },
              { key: "rejected" as StoreTab, label: "Rejected", icon: XCircle, count: rejected.length, activeClass: "bg-red-600 text-white border-red-600" },
            ]
          ).map(({ key, label, icon: Icon, count, activeClass }) => (
            <button
              key={key}
              data-testid={`store-tab-${key}`}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl text-xs font-medium border transition-colors ${
                activeTab === key ? activeClass : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-center leading-tight">{label}</span>
              <Badge variant="secondary" className="text-[10px] mt-0.5">{count}</Badge>
            </button>
          ))}
        </div>

        {reqLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : tabData[activeTab].length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-12 text-center space-y-2">
              {activeTab === "pending" && <><Clock className="w-10 h-10 mx-auto text-muted-foreground/30" /><p className="text-muted-foreground font-medium">No pending store requests</p><p className="text-sm text-muted-foreground/60">Store approval requests will appear here</p></>}
              {activeTab === "approved" && <><CheckCircle className="w-10 h-10 mx-auto text-green-400/40" /><p className="text-muted-foreground font-medium">No approved stores yet</p></>}
              {activeTab === "rejected" && <><XCircle className="w-10 h-10 mx-auto text-red-400/40" /><p className="text-muted-foreground font-medium">No rejected stores</p></>}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {tabData[activeTab].map((req) => (
              <button
                key={req.id}
                onClick={() => { setSelectedRequest(req); setRequestDetailOpen(true); }}
                className="w-full text-left"
                data-testid={`store-req-${req.id}`}
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
                      <p className="text-sm text-muted-foreground">@{req.username}</p>
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

      {/* ── Global Link Section ── */}
      {user?.role === "super_admin" && (
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
                  <span className="text-sm text-muted-foreground">Username</span>
                  <span className="text-sm font-medium">{selectedRequest.username}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Password</span>
                  <span className="text-sm font-medium font-mono">••••••••</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> Admin Number
                  </span>
                  <span className="text-sm font-medium">
                    {selectedRequest.adminNumber
                      ? `+91 ${selectedRequest.adminNumber.replace(/^\+?91/, "").trim()}`
                      : "—"}
                  </span>
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
                      data-testid="whatsapp-btn"
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
                {selectedRequest.status !== "pending" && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className={`text-sm font-medium ${selectedRequest.status === "approved" ? "text-green-600" : "text-red-600"}`}>
                      {selectedRequest.status === "approved" ? "Approved on" : "Rejected on"}
                    </span>
                    <span className="text-sm font-semibold">
                      {new Date(selectedRequest.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                )}
              </div>

              {selectedRequest.status === "approved" && (
                <div className="rounded-xl border border-green-200 overflow-hidden">
                  <div className="px-4 py-2.5 bg-green-50 border-b border-green-200">
                    <p className="text-xs font-bold text-green-700 uppercase tracking-widest">Store Owner Info</p>
                  </div>
                  <div className="divide-y divide-border">
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-muted-foreground">Store Name</span>
                      <span className="text-sm font-semibold">{selectedRequest.storeName}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-muted-foreground">WhatsApp</span>
                      <span className="text-sm font-medium">+91 {selectedRequest.whatsapp.replace(/^\+?91/, "").trim()}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-muted-foreground">Reward Code</span>
                      {(selectedRequest as any).rewardCode ? (
                        <span className="text-sm font-mono font-bold tracking-[0.15em] text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-md select-all">
                          {(selectedRequest as any).rewardCode}
                        </span>
                      ) : (
                        <span className="text-sm font-mono tracking-[0.2em] text-muted-foreground/50 bg-muted px-3 py-1 rounded-md border border-dashed">
                          ― ― ― ― ― ― ― ― ― ―
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {selectedRequest.status === "pending" && (
                <div className="space-y-3">
                  {requestUsernameExists && (
                    <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3">
                      <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                      <p className="text-sm text-destructive font-medium">
                        Username <span className="font-bold">@{selectedRequest.username}</span> already exists — this request cannot be approved.
                      </p>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => handleApprove(selectedRequest.id, selectedRequest)}
                      disabled={approveRequest.isPending || requestUsernameExists}
                      data-testid="approve-store-btn"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {approveRequest.isPending ? "Approving..." : "Approve Store"}
                    </Button>
                    <Button
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => handleReject(selectedRequest.id, selectedRequest)}
                      disabled={rejectRequest.isPending}
                      data-testid="reject-store-btn"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      {rejectRequest.isPending ? "Rejecting..." : "Reject Store"}
                    </Button>
                  </div>
                </div>
              )}
              {selectedRequest.status !== "pending" && (
                <p className="text-center text-sm text-muted-foreground">
                  This request has already been <strong>{selectedRequest.status}</strong>.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
