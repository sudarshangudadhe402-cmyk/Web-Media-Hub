import { useState, useEffect } from "react";
import {
  useListAdmins,
  useDeleteAdmin,
  getListAdminsQueryKey,
} from "@workspace/api-client-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Link as LinkIcon,
  Pencil,
  Gift,
  UserCheck,
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
  return Math.floor((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
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

const SOURCE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  ORGANIC:    { bg: "rgba(34,197,94,0.12)",  text: "#16a34a", label: "Organic" },
  REFERRAL:   { bg: "rgba(59,130,246,0.12)", text: "#2563eb", label: "Referral" },
  AMBASSADOR: { bg: "rgba(168,85,247,0.12)", text: "#9333ea", label: "Ambassador" },
  INFLUENCER: { bg: "rgba(249,115,22,0.12)", text: "#ea580c", label: "Influencer" },
  CAMPAIGN:   { bg: "rgba(236,72,153,0.12)", text: "#db2777", label: "Campaign" },
  UTM:        { bg: "rgba(234,179,8,0.12)",  text: "#ca8a04", label: "UTM" },
};

function getSourceStyle(source: string) {
  const key = source.toUpperCase();
  return SOURCE_COLORS[key] ?? { bg: "rgba(107,114,128,0.12)", text: "#6b7280", label: source };
}

interface PricingPlan {
  id: string;
  name: string;
  price: string;
}

const TAB_COLORS = [
  { color: "#2563eb", bg: "rgba(37,99,235,0.10)" },
  { color: "#d97706", bg: "rgba(217,119,6,0.10)" },
  { color: "#16a34a", bg: "rgba(22,163,74,0.10)" },
  { color: "#FF2D2D", bg: "rgba(255,45,45,0.10)" },
  { color: "#9333ea", bg: "rgba(147,51,234,0.10)" },
  { color: "#0891b2", bg: "rgba(8,145,178,0.10)" },
];

export default function Admins() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: admins, isLoading } = useListAdmins();
  const deleteAdmin = useDeleteAdmin();

  const { data: pricingData } = useQuery({
    queryKey: ["pricing-plans"],
    queryFn: async () => {
      const res = await fetch("/api/pricing");
      if (!res.ok) throw new Error("Failed to load plans");
      return res.json() as Promise<{ plans: PricingPlan[] }>;
    },
    staleTime: 30_000,
  });
  const pricingPlans = pricingData?.plans ?? [];

  const [linkInput, setLinkInput] = useState("");
  const [isEditingLink, setIsEditingLink] = useState(false);

  const { data: referralData, isLoading: referralLoading } = useQuery({
    queryKey: ["referral-rewards"],
    queryFn: async () => {
      const res = await authFetch("/api/admins/referral-rewards");
      if (!res.ok) return { referrals: [] };
      return res.json() as Promise<{
        referrals: Array<{
          id: string;
          rewardCode: string;
          date: string;
          referrerUsername: string;
          referrer: { email: string; adminNumber: string; storeName: string; userId: string } | null;
          referredEmail: string;
          referredStoreName: string;
          referredPlan: string;
        }>;
      }>;
    },
    staleTime: 30_000,
  });

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

  const [selectedAdmin, setSelectedAdmin] = useState<NonNullable<typeof admins>[number] | null>(null);
  const [adminDetailOpen, setAdminDetailOpen] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [storeStats, setStoreStats] = useState<{ tryOnCount: number; adsCount: number } | null>(null);

  useEffect(() => {
    if (!selectedAdmin) { setStoreStats(null); return; }
    setStoreStats(null);
    authFetch(`/api/admins/${selectedAdmin.id}/store-stats`)
      .then((r) => r.json())
      .then((d) => setStoreStats(d))
      .catch(() => setStoreStats({ tryOnCount: 0, adsCount: 0 }));
  }, [(selectedAdmin as any)?.id]);

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
  const [planFilter, setPlanFilter] = useState<string>("all");

  const adminCount = admins?.length ?? 0;

  const PLAN_TABS = [
    { id: "all", label: "All", price: null as string | null, color: "#6b7280", bg: "rgba(107,114,128,0.10)" },
    ...pricingPlans.map((plan, i) => {
      const c = TAB_COLORS[i % TAB_COLORS.length];
      return { id: plan.id, label: plan.name, price: plan.price as string | null, color: c.color, bg: c.bg };
    }),
  ];

  function matchesPlan(a: (typeof admins)[number], planId: string) {
    if (planId === "all") return true;
    const plan = pricingPlans.find((p) => p.id === planId);
    if (!plan) return false;
    const planName = ((a as any).planName as string ?? "").trim().toLowerCase();
    return planName === plan.name.trim().toLowerCase();
  }

  const searchTrimmed = storeSearch.trim().toLowerCase();

  const searchFiltered = searchTrimmed
    ? admins?.filter((a) =>
        ((a as any).storeName as string | null)?.toLowerCase().includes(searchTrimmed)
      )
    : admins;

  const filteredAdmins = searchFiltered?.filter((a) => matchesPlan(a, planFilter));

  // Auto-switch: if current tab has 0 results but search is active, find first tab with results
  function handleSearchChange(val: string) {
    setStoreSearch(val);
    if (!val.trim()) return;
    const q = val.trim().toLowerCase();
    const matched = admins?.filter((a) =>
      ((a as any).storeName as string | null)?.toLowerCase().includes(q)
    ) ?? [];
    const countInCurrent = matched.filter((a) => matchesPlan(a, planFilter)).length;
    if (countInCurrent === 0 && matched.length > 0) {
      for (const tab of PLAN_TABS) {
        const countInTab = matched.filter((a) => matchesPlan(a, tab.id)).length;
        if (countInTab > 0) { setPlanFilter(tab.id); break; }
      }
    }
  }

  const activePlanTab = PLAN_TABS.find(t => t.id === planFilter) ?? PLAN_TABS[0];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">

      {/* ── Global Link Section ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <LinkIcon className="w-4 h-4 text-primary" />
          <h2 className="text-base font-semibold">Global Link</h2>
        </div>

        {globalLink && !isEditingLink ? (
          <Card className="border-primary/20">
            <CardContent className="p-3">
              {/* Link row: icon + clickable link + copy button */}
              <div className="flex items-center gap-2">
                <LinkIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                <a
                  href={globalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-sm text-primary font-medium underline underline-offset-2 break-all line-clamp-1"
                >
                  {globalLink}
                </a>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 gap-1 text-xs shrink-0"
                  onClick={() => { navigator.clipboard.writeText(globalLink); toast({ title: "Link copied!" }); }}
                >
                  <Copy className="w-3 h-3" /> Copy
                </Button>
              </div>
              {/* Pencil dropdown: edit or delete */}
              <div className="flex justify-end mt-1.5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem onClick={() => { setLinkInput(globalLink); setIsEditingLink(true); }}>
                      <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600"
                      onClick={() => deleteGlobalLink.mutate()}
                      disabled={deleteGlobalLink.isPending}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed border-2">
            <CardContent className="p-3 space-y-2">
              <p className="text-sm text-muted-foreground">
                {isEditingLink ? "Update the global link:" : "Paste a link to show on all admin pages:"}
              </p>
              <div className="flex gap-2">
                <Input
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  placeholder="https://example.com/..."
                  className="flex-1 h-9"
                />
                <Button
                  onClick={() => { const t = linkInput.trim(); if (!t) return; saveGlobalLink.mutate(t); }}
                  disabled={saveGlobalLink.isPending || !linkInput.trim()}
                  className="bg-primary text-primary-foreground h-9"
                >
                  {saveGlobalLink.isPending ? "Saving..." : isEditingLink ? "Update" : "Save"}
                </Button>
                {isEditingLink && (
                  <Button variant="outline" className="h-9" onClick={() => { setIsEditingLink(false); setLinkInput(""); }}>
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Referral Reward Section ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Gift className="w-4 h-4 text-purple-500" />
          <h2 className="text-base font-semibold">Referral Reward</h2>
          {referralData?.referrals?.length ? (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(168,85,247,0.12)", color: "#9333ea" }}>
              {referralData.referrals.length}
            </span>
          ) : null}
        </div>
        {referralLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : !referralData?.referrals?.length ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Gift className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Abhi tak koi referral nahi hua.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {referralData.referrals.map((r) => (
              <Card key={r.id} className="border-purple-100 bg-gradient-to-br from-purple-50/60 to-white">
                <CardContent className="p-4">
                  {/* Reward code — prominent */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-500">Reward Code</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-extrabold text-base text-purple-700 tracking-widest bg-purple-100 px-3 py-0.5 rounded-lg">
                        {r.rewardCode}
                      </span>
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 w-7 p-0 text-purple-400 hover:text-purple-700"
                        onClick={() => { navigator.clipboard.writeText(r.rewardCode); toast({ title: "Code copied!" }); }}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Referrer admin */}
                    <div className="rounded-lg bg-white border border-purple-100 p-2.5">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-purple-400 mb-1 flex items-center gap-1">
                        <UserCheck className="w-2.5 h-2.5" /> Referrer (Reward milega)
                      </p>
                      <p className="text-xs font-bold text-gray-800 truncate">
                        {r.referrer?.storeName || r.referrerUsername}
                      </p>
                      {r.referrer?.storeName && (
                        <p className="text-[10px] text-muted-foreground truncate">@{r.referrerUsername}</p>
                      )}
                      {r.referrer?.adminNumber && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">📞 {r.referrer.adminNumber}</p>
                      )}
                    </div>

                    {/* Referred (new) admin */}
                    <div className="rounded-lg bg-white border border-purple-100 p-2.5">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-blue-400 mb-1 flex items-center gap-1">
                        <Store className="w-2.5 h-2.5" /> Naya Admin (Refer hua)
                      </p>
                      <p className="text-xs font-bold text-gray-800 truncate">
                        {r.referredStoreName}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{r.referredEmail}</p>
                      {r.referredPlan && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">📦 {r.referredPlan}</p>
                      )}
                    </div>
                  </div>

                  <p className="text-[10px] text-muted-foreground text-right mt-2">{fmtDate(r.date)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Admin List heading ── */}
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-base font-semibold">Admin List</h2>
      </div>

      {/* Store name search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by store name..."
          value={storeSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Plan filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {PLAN_TABS.map((tab) => {
          const isActive = planFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setPlanFilter(tab.id)}
              className="flex-shrink-0 rounded-xl px-3 py-2 text-left transition-all border-2"
              style={{
                borderColor: isActive ? tab.color : "transparent",
                background: isActive ? tab.bg : "rgba(0,0,0,0.03)",
                minWidth: tab.id === "all" ? "56px" : "120px",
              }}
            >
              <p className="text-xs font-bold leading-tight" style={{ color: isActive ? tab.color : "#6b7280" }}>
                {tab.label}
              </p>
              {tab.price && (
                <p className="text-[10px] font-semibold mt-0.5" style={{ color: isActive ? tab.color : "#9ca3af" }}>
                  {tab.price}
                </p>
              )}
            </button>
          );
        })}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5" style={{ color: activePlanTab.color }} />
          <h2 className="text-lg font-semibold">{activePlanTab.id === "all" ? "All Admins" : activePlanTab.label}</h2>
          <Badge className="ml-1" style={{ background: activePlanTab.bg, color: activePlanTab.color, border: "none" }}>{filteredAdmins?.length ?? 0}</Badge>
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
              const displayName = storeName || (admin as any).email || "";
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
            const isLifetime =
              planName?.toLowerCase().includes("lifetime") ||
              planPrice?.includes("15,999") ||
              (planPeriod ? !planPeriod.toLowerCase().includes("month") && !planPeriod.toLowerCase().includes("year") : false);
            const isExpired = !isLifetime && subEnd && days !== null && days <= 0;

            return (
              <div className="space-y-5 pt-2">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl uppercase">
                    {((selectedAdmin as any).email || "?").substring(0, 2)}
                  </div>
                  <div>
                    <p className="font-bold text-lg">{(selectedAdmin as any).email}</p>
                    <Badge variant={selectedAdmin.role === "super_admin" ? "default" : "outline"} className="capitalize text-xs mt-1">
                      {selectedAdmin.role.replace("_", " ")}
                    </Badge>
                  </div>
                </div>

                {/* Plan Card — always show */}
                <div
                  className="rounded-xl border px-4 py-3 space-y-1"
                  style={{
                    borderColor: planColor ? planColor + "55" : "rgba(0,0,0,0.1)",
                    background: planColor ? planColor + "11" : "rgba(0,0,0,0.02)",
                  }}
                >
                  {planBadge ? (
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: planColor || "#888" }}>{planBadge}</p>
                  ) : (
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Plan Info</p>
                  )}
                  <p className="font-bold text-sm">{planName || "No Plan Assigned"}</p>
                  {planPrice ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-extrabold" style={{ color: planColor || undefined }}>{planPrice}</span>
                      {planPeriod && <span className="text-xs text-muted-foreground">{planPeriod}</span>}
                    </div>
                  ) : planName ? null : (
                    <p className="text-xs text-muted-foreground">Contact super admin to assign a plan</p>
                  )}
                </div>

                {/* Subscription Timeline — always show */}
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
                      <span className="text-sm font-semibold">{subStart ? fmtDate(subStart) : "—"}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Subscription End
                      </span>
                      {isLifetime ? (
                        <span className="text-sm font-bold flex items-center gap-1" style={{ color: "#9333ea" }}>∞ Unlimited</span>
                      ) : (
                        <span className={`text-sm font-semibold ${isExpired ? "text-red-500" : ""}`}>{subEnd ? fmtDate(subEnd) : "—"}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-muted-foreground">Days Remaining</span>
                      {isLifetime ? (
                        <span className="text-sm font-bold flex items-center gap-1" style={{ color: "#9333ea" }}>∞ Unlimited</span>
                      ) : days === null ? (
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

                  {/* Renew button — only after subscription expires (non-lifetime) */}
                  {!isLifetime && subEnd && isExpired && (
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

                <div className="bg-muted rounded-xl divide-y divide-border">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-muted-foreground">Email</span>
                    <span className="text-sm font-medium">{(selectedAdmin as any).email || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-muted-foreground">Password</span>
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">🔒 Securely Hashed</span>
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

                {/* ── Virtual Try-On & Ads Stats ── */}
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="flex">
                    {/* Left: Virtual Try-On */}
                    <div className="flex-1 px-4 py-4 flex flex-col items-center gap-1">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center mb-1" style={{ background: "rgba(99,102,241,0.1)" }}>
                        <span className="text-lg">🪞</span>
                      </div>
                      <span className="text-2xl font-extrabold text-gray-900">
                        {storeStats === null ? (
                          <span className="inline-block w-8 h-6 bg-muted animate-pulse rounded" />
                        ) : (
                          storeStats.tryOnCount.toLocaleString("en-IN")
                        )}
                      </span>
                      <span className="text-[11px] font-semibold text-muted-foreground text-center leading-tight">Virtual Try-On</span>
                      <span className="text-[10px] text-muted-foreground/70 text-center">Total on this store</span>
                    </div>

                    {/* Divider */}
                    <div className="w-px bg-border self-stretch my-3" />

                    {/* Right: Ads Run */}
                    <div className="flex-1 px-4 py-4 flex flex-col items-center gap-1">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center mb-1" style={{ background: "rgba(234,179,8,0.1)" }}>
                        <span className="text-lg">📢</span>
                      </div>
                      <span className="text-2xl font-extrabold text-gray-900">
                        {storeStats === null ? (
                          <span className="inline-block w-8 h-6 bg-muted animate-pulse rounded" />
                        ) : (
                          storeStats.adsCount.toLocaleString("en-IN")
                        )}
                      </span>
                      <span className="text-[11px] font-semibold text-muted-foreground text-center leading-tight">Total Ads Run</span>
                      <span className="text-[10px] text-muted-foreground/70 text-center">Campaigns on store</span>
                    </div>
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
