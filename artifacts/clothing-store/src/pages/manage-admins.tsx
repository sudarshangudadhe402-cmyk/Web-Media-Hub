import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Users,
  Star,
  ChevronRight,
  Store,
  CheckCircle,
  XCircle,
  MessageCircle,
  Eye,
  EyeOff,
  Clock,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type StoreTab = "pending" | "approved" | "rejected";

export default function ManageAdmins() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: admins, isLoading } = useListAdmins();
  const createAdmin = useCreateAdmin();

  // Store requests — fetched from MongoDB
  const { data: allRequests, isLoading: reqLoading } = useListStoreRequests();
  const approveRequest = useApproveStoreRequest();
  const rejectRequest = useRejectStoreRequest();

  const [addOpen, setAddOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<(typeof admins extends (infer T)[] | undefined ? T : never) | null>(null);
  const [adminDetailOpen, setAdminDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<StoreTab>("pending");
  const [selectedRequest, setSelectedRequest] = useState<NonNullable<typeof allRequests>[number] | null>(null);
  const [requestDetailOpen, setRequestDetailOpen] = useState(false);
  const [adminActive, setAdminActive] = useState<Record<string, boolean>>({});
  const [showPass, setShowPass] = useState(false);

  const [form, setForm] = useState({ username: "", password: "", whatsapp: "" });

  const requestUsernameExists = !!(
    selectedRequest &&
    admins?.some((a) => a.username === selectedRequest.username)
  );

  const pending = (allRequests ?? []).filter((r) => r.status === "pending");
  const approved = (allRequests ?? []).filter((r) => r.status === "approved");
  const rejected = (allRequests ?? []).filter((r) => r.status === "rejected");
  const tabData: Record<StoreTab, typeof pending> = { pending, approved, rejected };

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (form.whatsapp) {
      const digits = form.whatsapp.replace(/\D/g, "");
      if (digits.length !== 10 || /^0+$/.test(digits) || /^(\d)\1{9}$/.test(digits)) {
        toast({ variant: "destructive", title: "Invalid WhatsApp number", description: "Please enter a valid 10-digit Indian mobile number" });
        return;
      }
    }
    createAdmin.mutate(
      { data: { username: form.username, password: form.password } },
      {
        onSuccess: () => {
          toast({ title: "Admin created successfully" });
          queryClient.invalidateQueries({ queryKey: getListAdminsQueryKey() });
          setForm({ username: "", password: "", whatsapp: "" });
          setAddOpen(false);
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.error || err?.message || "Failed to create admin";
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

  function openAdminDetail(admin: NonNullable<typeof admins>[number]) {
    setSelectedAdmin(admin);
    setAdminDetailOpen(true);
    setShowPass(false);
  }

  function openWhatsApp(number: string, storeName: string) {
    const msg = encodeURIComponent(
      `You want to approve your store?\n\nStore Information:\nStore Name: ${storeName}\n\nCan I send you information about store benefits or purchasing discount?`
    );
    window.open(`https://wa.me/${number.replace(/\D/g, "")}?text=${msg}`, "_blank");
  }

  function handleApprove(id: string) {
    approveRequest.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Store approved ✅ Admin account created" });
          queryClient.invalidateQueries({ queryKey: getListStoreRequestsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListAdminsQueryKey() });
          setRequestDetailOpen(false);
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

  function handleReject(id: string) {
    rejectRequest.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Store rejected" });
          queryClient.invalidateQueries({ queryKey: getListStoreRequestsQueryKey() });
          setRequestDetailOpen(false);
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

  const adminCount = admins?.length ?? 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manage Admins</h1>
        <p className="text-muted-foreground text-sm mt-1">Create and manage admin accounts</p>
      </div>

      {/* Add Admin — Green CTA */}
      <button
        data-testid="add-admin-btn"
        onClick={() => setAddOpen(true)}
        className="w-full flex items-center justify-between gap-4 bg-green-600 hover:bg-green-700 active:bg-green-800 transition-colors text-white rounded-xl px-6 py-5 shadow-lg"
      >
        <div className="flex items-center gap-3">
          <UserPlus className="w-6 h-6 shrink-0" />
          <div className="text-left">
            <p className="font-semibold text-lg leading-tight">Add Admin</p>
            <p className="text-green-100 text-sm">Create a new admin account for your store</p>
          </div>
        </div>
        <Shield className="w-8 h-8 text-green-200 shrink-0" />
      </button>

      {/* Admins List */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Admins</h2>
          <Badge className="ml-1">{adminCount}</Badge>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : adminCount === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Shield className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>No admins yet. Add one above.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {admins?.map((admin) => {
              const isActive = adminActive[admin.id] !== false;
              return (
                <button
                  key={admin.id}
                  data-testid={`admin-row-${admin.id}`}
                  onClick={() => openAdminDetail(admin)}
                  className="w-full text-left"
                >
                  <Card className="hover:border-primary/40 transition-colors cursor-pointer">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold uppercase shrink-0">
                        {admin.username.substring(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold truncate">{admin.username}</span>
                          {admin.id === user?.id && (
                            <Badge variant="secondary" className="text-[10px]">You</Badge>
                          )}
                          <Badge variant={admin.role === "super_admin" ? "default" : "outline"} className="capitalize text-[10px]">
                            {admin.role.replace("_", " ")}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs font-medium ${isActive ? "text-green-600" : "text-muted-foreground"}`}>
                            {isActive ? "Active" : "Inactive"}
                          </span>
                          {admin.createdAt && (
                            <span className="text-xs text-muted-foreground">
                              · Added {new Date(admin.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>
        )}
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

        {/* Tabs */}
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

        {/* Tab Content */}
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

      {/* Add Admin Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-green-600" />
              Add Admin
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" placeholder="admin_username" value={form.username} onChange={handleFormChange} required data-testid="new-admin-username" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" placeholder="••••••••" value={form.password} onChange={handleFormChange} required data-testid="new-admin-password" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="whatsapp" className="flex items-center gap-1.5">
                Store Owner WhatsApp Number
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              </Label>
              <div className="flex items-center border border-input rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-ring">
                <span className="px-3 py-2 bg-muted text-sm font-medium text-muted-foreground border-r border-input shrink-0">+91</span>
                <input
                  id="whatsapp"
                  name="whatsapp"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="9876543210"
                  value={form.whatsapp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setForm((p) => ({ ...p, whatsapp: val }));
                  }}
                  className="flex-1 px-3 py-2 text-sm bg-background outline-none"
                  data-testid="new-admin-whatsapp"
                />
              </div>
              <p className="text-xs text-muted-foreground">Enter 10-digit mobile number (e.g. 9876543210)</p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white" disabled={createAdmin.isPending}>
                {createAdmin.isPending ? "Creating..." : "Create Admin"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Admin Detail Dialog */}
      <Dialog open={adminDetailOpen} onOpenChange={setAdminDetailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Admin Information
            </DialogTitle>
          </DialogHeader>
          {selectedAdmin && (
            <div className="space-y-5 pt-2">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl uppercase">
                  {selectedAdmin.username.substring(0, 2)}
                </div>
                <div>
                  <p className="font-bold text-lg">{selectedAdmin.username}</p>
                  <Badge variant={selectedAdmin.role === "super_admin" ? "default" : "outline"} className="capitalize text-xs mt-1">
                    {selectedAdmin.role.replace("_", " ")}
                  </Badge>
                </div>
              </div>
              <div className="bg-muted rounded-xl divide-y divide-border">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Username</span>
                  <span className="text-sm font-medium">{selectedAdmin.username}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Password</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium font-mono">
                      {showPass
                        ? (selectedAdmin.plainPassword || "—")
                        : "••••••••"}
                    </span>
                    <button onClick={() => setShowPass((p) => !p)} className="text-muted-foreground hover:text-foreground">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Added</span>
                  <span className="text-sm font-medium">
                    {selectedAdmin.createdAt ? new Date(selectedAdmin.createdAt).toLocaleDateString() : "—"}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between bg-muted rounded-xl px-4 py-3">
                <div>
                  <p className="font-medium text-sm">Active Admin</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(adminActive[selectedAdmin.id] !== false) ? "Admin is currently active" : "Admin is currently inactive"}
                  </p>
                </div>
                <Switch
                  checked={adminActive[selectedAdmin.id] !== false}
                  onCheckedChange={(val) => setAdminActive((p) => ({ ...p, [selectedAdmin.id]: val }))}
                  data-testid="admin-active-toggle"
                />
              </div>
            </div>
          )}
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
                    WhatsApp <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      +91 {selectedRequest.whatsapp.replace(/^\+?91/, "").trim()}
                    </span>
                    <button
                      onClick={() => openWhatsApp(selectedRequest.whatsapp, selectedRequest.storeName)}
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

              {selectedRequest.status === "pending" && (
                <div className="space-y-3">
                  {requestUsernameExists && (
                    <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3">
                      <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                      <p className="text-sm text-destructive font-medium">
                        Username <span className="font-bold">@{selectedRequest.username}</span> already exists — this request cannot be approved. Ask the applicant to resubmit with a different username.
                      </p>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => handleApprove(selectedRequest.id)}
                      disabled={approveRequest.isPending || requestUsernameExists}
                      data-testid="approve-store-btn"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {approveRequest.isPending ? "Approving..." : "Approve Store"}
                    </Button>
                    <Button
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => handleReject(selectedRequest.id)}
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
