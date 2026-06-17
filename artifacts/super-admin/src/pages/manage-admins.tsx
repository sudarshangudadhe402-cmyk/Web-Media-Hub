import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  useListAdmins,
  useCreateAdmin,
  getListAdminsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Shield,
  UserPlus,
  Link as LinkIcon,
  Copy,
  Trash2,
  ExternalLink,
  Pencil,
  Star,
  ChevronRight,
  ChevronLeft,
  Phone,
} from "lucide-react";

import PricingOverlay, { type SelectedPlan } from "@/components/pricing-overlay";

const TOKEN_KEY = "wmh_super_token";

export default function ManageAdmins() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: admins } = useListAdmins();
  const createAdmin = useCreateAdmin();

  const [pageView, setPageView] = useState<"main" | "addAdmin" | "choosePlan">("main");
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | null>(null);
  const [form, setForm] = useState({ email: "", password: "", adminNumber: "" });
  const [linkInput, setLinkInput] = useState("");
  const [isEditingLink, setIsEditingLink] = useState(false);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createAdmin.mutate(
      { data: {
        email: form.email,
        password: form.password,
        adminNumber: form.adminNumber,
        planName: selectedPlan?.name ?? "",
        planPrice: selectedPlan?.price ?? "",
        planPeriod: selectedPlan?.period ?? "",
        planBadge: selectedPlan?.badge ?? "",
        planColor: selectedPlan?.color ?? "",
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manage Admins</h1>
        <p className="text-muted-foreground text-sm mt-1">Create admins and manage global settings</p>
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

      {/* Add Admin — Full Page (rendered above main when active) */}
      {pageView === "addAdmin" && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b bg-background">
            <button
              onClick={() => { setPageView("main"); setForm({ email: "", password: "", adminNumber: "" }); }}
              className="p-1.5 rounded-full hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-green-600" />
              <span className="font-bold text-base">Add New Admin</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleCreate} className="flex-1 flex flex-col p-5 gap-5 max-w-lg mx-auto w-full overflow-y-auto">
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

            <div className="flex gap-3 mt-auto pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => { setPageView("main"); setForm({ email: "", password: "", adminNumber: "" }); setSelectedPlan(null); }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-40"
                disabled={createAdmin.isPending || !form.email || !form.password || form.adminNumber.length !== 10 || !selectedPlan}
              >
                {createAdmin.isPending ? "Creating..." : "Create Admin"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Pricing Overlay */}
      {pageView === "choosePlan" && (
        <PricingOverlay onBack={() => setPageView("addAdmin")} onSelectPlan={(plan) => { setSelectedPlan(plan); setPageView("addAdmin"); }} />
      )}

    </div>
  );
}
