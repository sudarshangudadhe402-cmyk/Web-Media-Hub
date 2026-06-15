import { useState } from "react";
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
  Phone,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", adminNumber: "" });
  const [activeTab, setActiveTab] = useState<StoreTab>("pending");
  const [selectedRequest, setSelectedRequest] = useState<NonNullable<typeof allRequests>[number] | null>(null);
  const [requestDetailOpen, setRequestDetailOpen] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [isEditingLink, setIsEditingLink] = useState(false);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createAdmin.mutate(
      { data: { username: form.username, password: form.password, adminNumber: form.adminNumber } },
      {
        onSuccess: () => {
          toast({ title: "Admin created successfully" });
          queryClient.invalidateQueries({ queryKey: getListAdminsQueryKey() });
          setForm({ username: "", password: "", adminNumber: "" });
          setAddOpen(false);
        },
        onError: (err: any) => {
          const msg = err?.data?.error || err?.message || "Failed to create admin";
          const isUsernameConflict = msg.toLowerCase().includes("already exists") || msg.toLowerCase().includes("username");
          toast({
            variant: "destructive",
            title: isUsernameConflict ? "Username already exists" : "Failed",
            description: isUsernameConflict ? "Please try a different username" : msg,
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
    const loginLink = window.location.origin;
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
        onClick={() => setAddOpen(true)}
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

      {/* Add Admin Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Add New Admin
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Username</label>
              <Input
                placeholder="admin_username"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
              />
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
              onClick={() => window.open("/pricing/", "_blank")}
              className="w-full flex items-center justify-between gap-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 active:opacity-90 transition-all text-black rounded-xl px-5 py-4 font-semibold shadow-md"
            >
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 shrink-0" />
                <span>Choose Plan</span>
              </div>
              <ChevronRight className="w-5 h-5 shrink-0" />
            </button>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setAddOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                disabled={createAdmin.isPending}
              >
                {createAdmin.isPending ? "Creating..." : "Create Admin"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
              </div>

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
