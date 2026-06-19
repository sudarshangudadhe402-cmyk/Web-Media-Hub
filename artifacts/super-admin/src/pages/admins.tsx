import { useState } from "react";
import {
  useListAdmins,
  useDeleteAdmin,
  getListAdminsQueryKey,
} from "@workspace/api-client-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  Users,
  ChevronRight,
  Eye,
  EyeOff,
  Trash2,
  Phone,
  Store,
  Copy,
  ExternalLink,
  Search,
  CalendarDays,
  Clock,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

const TOKEN_KEY = "wmh_super_token";

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

function getDaysRemaining(endDateStr: string | null | undefined): number | null {
  if (!endDateStr) return null;
  const end = new Date(endDateStr);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function SubscriptionBadge({ endDate, planPeriod }: { endDate: string | null | undefined; planPeriod?: string }) {
  const isLifetime = !planPeriod?.toLowerCase().includes("month") && !planPeriod?.toLowerCase().includes("year");
  if (isLifetime) {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(168,85,247,0.12)", color: "#9333ea" }}>
        Lifetime ∞
      </span>
    );
  }
  const days = getDaysRemaining(endDate);
  if (days === null) return null;
  if (days <= 0) {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1" style={{ background: "rgba(239,68,68,0.12)", color: "#dc2626" }}>
        <AlertTriangle className="w-2.5 h-2.5" /> Expired
      </span>
    );
  }
  if (days <= 5) {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(234,179,8,0.15)", color: "#ca8a04" }}>
        {days}d left ⚠️
      </span>
    );
  }
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(34,197,94,0.12)", color: "#16a34a" }}>
      {days}d left
    </span>
  );
}

export default function Admins() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: admins, isLoading } = useListAdmins();
  const deleteAdmin = useDeleteAdmin();

  const [selectedAdmin, setSelectedAdmin] = useState<NonNullable<typeof admins>[number] | null>(null);
  const [adminDetailOpen, setAdminDetailOpen] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await authFetch(`/api/admins/${id}/toggle-active`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: (_, { isActive }) => {
      toast({ title: isActive ? "Admin activated ✅" : "Admin deactivated 🔴" });
      queryClient.invalidateQueries({ queryKey: getListAdminsQueryKey() });
      if (selectedAdmin) {
        setSelectedAdmin((prev) => prev ? { ...prev, isActive } as any : prev);
      }
      if (isActive && selectedAdmin) {
        const phone = (selectedAdmin as any).adminNumber as string | undefined;
        if (phone && phone.trim()) {
          const cleanPhone = `91${phone.replace(/\D/g, "")}`;
          const msg = `Hello! 👋\n\nThis is *Web Media Hub*.\n\nWe're glad to inform you that your store has been *reactivated* and is now live again. We truly hope you won't let it go inactive again.\n\nWe are always here, standing by your side to help grow your business — and we hope you'll continue to stand with us too. Your trust and support mean everything to us. 🙏\n\n— *Team Web Media Hub*`;
          const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
          window.open(waLink, "_blank");
        }
      }
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update admin status" }),
  });

  const toggleMultiDevice = useMutation({
    mutationFn: async ({ id, multiDeviceAllowed }: { id: string; multiDeviceAllowed: boolean }) => {
      const res = await authFetch(`/api/admins/${id}/multi-device`, {
        method: "PATCH",
        body: JSON.stringify({ multiDeviceAllowed }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: (_, { multiDeviceAllowed }) => {
      toast({ title: multiDeviceAllowed ? "Multi-device login enabled ✅" : "Single device only — multi-device disabled" });
      queryClient.invalidateQueries({ queryKey: getListAdminsQueryKey() });
      if (selectedAdmin) {
        setSelectedAdmin((prev) => prev ? { ...prev, multiDeviceAllowed } as any : prev);
      }
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update multi-device setting" }),
  });

  const renewSubscription = useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/api/admins/${id}/renew-subscription`, { method: "PATCH" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error ?? "Failed to renew");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Subscription renewed ✅ New period started from today" });
      queryClient.invalidateQueries({ queryKey: getListAdminsQueryKey() });
      if (selectedAdmin) {
        setSelectedAdmin((prev) => prev ? {
          ...prev,
          subscriptionStartDate: data.subscriptionStartDate,
          subscriptionEndDate: data.subscriptionEndDate,
          isActive: true,
        } as any : prev);
      }
    },
    onError: (err: Error) => toast({ variant: "destructive", title: err.message }),
  });

  function openAdminDetail(admin: NonNullable<typeof admins>[number]) {
    setSelectedAdmin(admin);
    setAdminDetailOpen(true);
    setShowPass(false);
  }

  function handleDelete(id: string) {
    deleteAdmin.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Admin deleted" });
          queryClient.invalidateQueries({ queryKey: getListAdminsQueryKey() });
          setAdminDetailOpen(false);
          setDeleteConfirmId(null);
        },
        onError: () => toast({ variant: "destructive", title: "Failed to delete admin" }),
      }
    );
  }

  function getStoreUrl(slug: string | null | undefined) {
    if (!slug) return null;
    const origin = window.location.origin;
    return `${origin}/store/${slug}`;
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast({ title: "Link copied!" });
  }

  const [storeSearch, setStoreSearch] = useState("");
  const adminCount = admins?.length ?? 0;

  const filteredAdmins = storeSearch.trim()
    ? admins?.filter((a) =>
        ((a as any).storeName as string | null)
          ?.toLowerCase()
          .includes(storeSearch.trim().toLowerCase())
      )
    : admins;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin History</h1>
        <p className="text-muted-foreground text-sm mt-1">All admin accounts created so far</p>
      </div>

      {/* Store name search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by store name..."
          value={storeSearch}
          onChange={(e) => setStoreSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">All Admins</h2>
          <Badge className="ml-1">{filteredAdmins?.length ?? 0}</Badge>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : adminCount === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Shield className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>No admins yet. Add one from Manage Admins.</p>
            </CardContent>
          </Card>
        ) : filteredAdmins?.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Store className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>No stores found matching "<strong>{storeSearch}</strong>"</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredAdmins?.map((admin) => {
              const isActive = (admin as any).isActive !== false;
              const storeName = (admin as any).storeName as string | null;
              const displayName = storeName || (admin as any).email || admin.username;
              const planName = (admin as any).planName as string;
              const planColor = (admin as any).planColor as string;
              const planPeriod = (admin as any).planPeriod as string;
              const endDate = (admin as any).subscriptionEndDate as string | null;
              const storeCreatedAt = (admin as any).storeCreatedAt as string | null;
              const days = getDaysRemaining(endDate);
              return (
                <button key={admin.id} onClick={() => openAdminDetail(admin)} className="w-full text-left">
                  <Card className="hover:border-primary/40 transition-colors cursor-pointer">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold uppercase shrink-0">
                        {displayName.substring(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Row 1: name + badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold truncate">{displayName}</span>
                          <Badge variant={admin.role === "super_admin" ? "default" : "outline"} className="capitalize text-[10px]">
                            {admin.role.replace("_", " ")}
                          </Badge>
                          {!isActive && (
                            <Badge variant="destructive" className="text-[10px]">Inactive</Badge>
                          )}
                          <SubscriptionBadge endDate={endDate} planPeriod={planPeriod} />
                        </div>

                        {/* Row 2: plan + dates */}
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {planName && (
                            <span className="text-[11px] font-medium px-1.5 py-0.5 rounded" style={{ background: planColor ? planColor + "18" : "rgba(0,0,0,0.06)", color: planColor || "inherit" }}>
                              {planName}
                            </span>
                          )}
                          {storeCreatedAt && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <CalendarDays className="w-3 h-3" />
                              Store: {fmtDate(storeCreatedAt)}
                            </span>
                          )}
                          {endDate && days !== null && (
                            <span className={`text-xs flex items-center gap-1 ${days <= 0 ? "text-red-500" : days <= 5 ? "text-yellow-600" : "text-muted-foreground"}`}>
                              <Clock className="w-3 h-3" />
                              {days <= 0 ? "Subscription expired" : `Ends ${fmtDate(endDate)}`}
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

      {/* Admin Detail Dialog */}
      <Dialog open={adminDetailOpen} onOpenChange={setAdminDetailOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Admin Information
            </DialogTitle>
          </DialogHeader>
          {selectedAdmin && (() => {
            const isActive = (selectedAdmin as any).isActive !== false;
            const storeSlug = (selectedAdmin as any).storeSlug as string | null;
            const storeName = (selectedAdmin as any).storeName as string | null;
            const storeUrl = getStoreUrl(storeSlug);
            const planName = (selectedAdmin as any).planName as string;
            const planPrice = (selectedAdmin as any).planPrice as string;
            const planPeriod = (selectedAdmin as any).planPeriod as string;
            const planBadge = (selectedAdmin as any).planBadge as string;
            const planColor = (selectedAdmin as any).planColor as string;
            const subStart = (selectedAdmin as any).subscriptionStartDate as string | null;
            const subEnd = (selectedAdmin as any).subscriptionEndDate as string | null;
            const storeCreatedAt = (selectedAdmin as any).storeCreatedAt as string | null;
            const days = getDaysRemaining(subEnd);
            const isLifetime = planPeriod && !planPeriod.toLowerCase().includes("month") && !planPeriod.toLowerCase().includes("year");
            const isExpired = subEnd && days !== null && days <= 0;

            return (
              <div className="space-y-5 pt-2">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl uppercase">
                    {((selectedAdmin as any).email || selectedAdmin.username || "?").substring(0, 2)}
                  </div>
                  <div>
                    <p className="font-bold text-lg">{(selectedAdmin as any).email || selectedAdmin.username}</p>
                    <Badge variant={selectedAdmin.role === "super_admin" ? "default" : "outline"} className="capitalize text-xs mt-1">
                      {selectedAdmin.role.replace("_", " ")}
                    </Badge>
                  </div>
                </div>

                {/* Plan Card */}
                {planName && (
                  <div
                    className="rounded-xl border px-4 py-3 space-y-1"
                    style={{ borderColor: planColor ? planColor + "55" : undefined, background: planColor ? planColor + "11" : undefined }}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: planColor || "#888" }}>{planBadge}</p>
                    <p className="font-bold text-sm">{planName}</p>
                    {planPrice && (
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-extrabold" style={{ color: planColor || undefined }}>{planPrice}</span>
                        {planPeriod && <span className="text-xs text-muted-foreground">{planPeriod}</span>}
                      </div>
                    )}
                  </div>
                )}

                {/* Subscription Timeline */}
                {!isLifetime && planName && (
                  <div className="rounded-xl border overflow-hidden">
                    <div className="bg-muted/50 px-4 py-2 border-b">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subscription Timeline</p>
                    </div>
                    <div className="divide-y divide-border">
                      {storeCreatedAt && (
                        <div className="flex items-center justify-between px-4 py-3">
                          <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                            <Store className="w-3.5 h-3.5" /> Store Registered
                          </span>
                          <span className="text-sm font-semibold">{fmtDate(storeCreatedAt)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5" /> Subscription Start
                        </span>
                        <span className="text-sm font-semibold">{fmtDate(subStart)}</span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> Subscription End
                        </span>
                        <span className={`text-sm font-semibold ${isExpired ? "text-red-500" : ""}`}>{fmtDate(subEnd)}</span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-sm text-muted-foreground">Days Remaining</span>
                        {days === null ? (
                          <span className="text-sm font-semibold text-muted-foreground">—</span>
                        ) : days <= 0 ? (
                          <span className="text-sm font-bold text-red-500 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> Expired
                          </span>
                        ) : (
                          <span className={`text-sm font-bold flex items-center gap-1 ${days <= 5 ? "text-yellow-600" : "text-green-600"}`}>
                            <CheckCircle2 className="w-3.5 h-3.5" /> {days} days
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Renew button — only after subscription expires */}
                    {subEnd && isExpired && (
                      <div className="px-4 py-3 border-t bg-muted/30">
                        <Button
                          size="sm"
                          className="w-full gap-2"
                          style={{ background: planColor || undefined }}
                          disabled={renewSubscription.isPending}
                          onClick={() => renewSubscription.mutate(selectedAdmin.id)}
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${renewSubscription.isPending ? "animate-spin" : ""}`} />
                          {renewSubscription.isPending ? "Renewing..." : "Reactivate & Renew Subscription"}
                        </Button>
                        <p className="text-[10px] text-muted-foreground text-center mt-1.5">
                          Renewal resets the subscription period from today. New analysis period begins.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Lifetime badge */}
                {isLifetime && planName && (
                  <div className="rounded-xl border px-4 py-3 flex items-center gap-3" style={{ background: "rgba(168,85,247,0.07)", borderColor: "rgba(168,85,247,0.25)" }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(168,85,247,0.15)" }}>
                      <CheckCircle2 className="w-4 h-4" style={{ color: "#9333ea" }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "#9333ea" }}>Lifetime Access</p>
                      <p className="text-xs text-muted-foreground">No renewal needed — access never expires</p>
                    </div>
                  </div>
                )}

                <div className="bg-muted rounded-xl divide-y divide-border">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-muted-foreground">Email</span>
                    <span className="text-sm font-medium">{(selectedAdmin as any).email || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-muted-foreground">Password</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium font-mono">
                        {showPass ? ((selectedAdmin as any).plainPassword || "—") : "••••••••"}
                      </span>
                      <button onClick={() => setShowPass((p) => !p)} className="text-muted-foreground hover:text-foreground">
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> Admin Number
                    </span>
                    <span className="text-sm font-medium">
                      {(selectedAdmin as any).adminNumber ? `+91 ${(selectedAdmin as any).adminNumber}` : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-muted-foreground">Added</span>
                    <span className="text-sm font-medium">{fmtDate(selectedAdmin.createdAt)}</span>
                  </div>

                  {/* Store Link Row */}
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Store className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Store Link</span>
                    </div>
                    {storeUrl ? (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-foreground break-all bg-background rounded-lg px-3 py-2 border border-border">
                          {storeUrl}
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1 gap-1.5 h-8 text-xs" onClick={() => copyToClipboard(storeUrl)}>
                            <Copy className="w-3.5 h-3.5" /> Copy Link
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 gap-1.5 h-8 text-xs" onClick={() => window.open(storeUrl, "_blank")}>
                            <ExternalLink className="w-3.5 h-3.5" /> Open Store
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No store created yet</p>
                    )}
                  </div>
                </div>

                {/* Active Toggle */}
                <div className="flex items-center justify-between bg-muted rounded-xl px-4 py-3">
                  <div>
                    <p className="font-medium text-sm">Active Admin</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isActive ? "Admin can login and access the platform" : "Admin is blocked from logging in"}
                    </p>
                  </div>
                  <Switch
                    checked={isActive}
                    disabled={toggleActive.isPending}
                    onCheckedChange={(val) => {
                      if (selectedAdmin.role === "super_admin") return;
                      toggleActive.mutate({ id: selectedAdmin.id, isActive: val });
                    }}
                  />
                </div>

                {/* Multi-Device Toggle */}
                {selectedAdmin.role !== "super_admin" && (() => {
                  const multiDevice = (selectedAdmin as any).multiDeviceAllowed === true;
                  return (
                    <div className="flex items-center justify-between bg-muted rounded-xl px-4 py-3">
                      <div>
                        <p className="font-medium text-sm">Multi-Device Login</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {multiDevice ? "Admin can login from multiple devices simultaneously" : "Only 1 device allowed — new login kicks out old session"}
                        </p>
                      </div>
                      <Switch
                        checked={multiDevice}
                        disabled={toggleMultiDevice.isPending}
                        onCheckedChange={(val) => toggleMultiDevice.mutate({ id: selectedAdmin.id, multiDeviceAllowed: val })}
                      />
                    </div>
                  );
                })()}

                {selectedAdmin.role !== "super_admin" && (
                  deleteConfirmId === selectedAdmin.id ? (
                    <div className="space-y-2">
                      <p className="text-sm text-destructive font-medium text-center">Are you sure you want to delete this admin?</p>
                      <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
                        <Button
                          className="flex-1 bg-destructive hover:bg-destructive/90 text-white"
                          onClick={() => handleDelete(selectedAdmin.id)}
                          disabled={deleteAdmin.isPending}
                        >
                          {deleteAdmin.isPending ? "Deleting..." : "Yes, Delete"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => setDeleteConfirmId(selectedAdmin.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Admin
                    </Button>
                  )
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
