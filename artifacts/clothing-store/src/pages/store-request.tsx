import { useState } from "react";
import {
  useSubmitStoreRequest,
  useMyStoreRequests,
  getMyStoreRequestsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SendHorizonal,
  Clock,
  CheckCircle,
  XCircle,
  Store,
  User,
  Lock,
  Copy,
  Link as LinkIcon,
  Phone,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import PlanSelector, { type PlanId } from "@/components/plan-selector";

export default function StoreRequest() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const submitRequest = useSubmitStoreRequest();
  const { data: myRequests, isLoading } = useMyStoreRequests();

  const [selectedReq, setSelectedReq] = useState<typeof myRequests extends (infer T)[] | undefined ? T : never | null>(null as any);

  const [form, setForm] = useState({
    storeName: "",
    username: "",
    password: "",
    adminNumber: "",
    whatsapp: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);

  function validateWhatsApp(digits: string): string | null {
    if (digits.length !== 10) return "WhatsApp number must be exactly 10 digits";
    if (/^0+$/.test(digits)) return "Spam WhatsApp number not allowed, please fill real 🙏";
    if (/^(\d)\1{9}$/.test(digits)) return "Spam WhatsApp number not allowed, please fill real 🙏";
    return null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const whatsappError = validateWhatsApp(form.whatsapp);
    if (whatsappError) {
      toast({ variant: "destructive", title: whatsappError });
      return;
    }

    submitRequest.mutate(
      {
        data: {
          storeName: form.storeName,
          username: form.username,
          password: form.password,
          adminNumber: form.adminNumber || undefined,
          whatsapp: `+91${form.whatsapp}`,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Request submitted ✅", description: "Your store request has been sent to the super-admin for approval." });
          queryClient.invalidateQueries({ queryKey: getMyStoreRequestsQueryKey() });
          setForm({ storeName: "", username: "", password: "", adminNumber: "", whatsapp: "" });
          setSelectedPlan(null);
        },
        onError: (err: any) => {
          // Try every possible path the ApiError might put the message
          const reason: string =
            err?.data?.error ??
            err?.data?.message ??
            err?.response?.data?.error ??
            // err.message is "HTTP 400 Bad Request: <actual reason>" — strip the prefix
            err?.message?.replace(/^HTTP \d+[^:]*:\s*/i, "") ??
            "";

          const isUsernameTaken = reason.toLowerCase().includes("already exists");
          const isSpamWhatsApp = reason.toLowerCase().includes("whatsapp") || reason.toLowerCase().includes("phone");

          const title = isUsernameTaken
            ? "Username already exists, please try different 🙏"
            : isSpamWhatsApp
            ? "Spam WhatsApp number not allowed, please fill real 🙏"
            : reason || "Something went wrong, please try again 🙏";

          toast({ variant: "destructive", title });
        },
      }
    );
  }

  const statusConfig = {
    pending:  { label: "Pending",  icon: Clock,         cls: "bg-amber-500 text-white" },
    approved: { label: "Approved", icon: CheckCircle,   cls: "bg-green-600 text-white" },
    rejected: { label: "Rejected", icon: XCircle,       cls: "bg-red-600 text-white" },
  };

  return (
    <div className="space-y-8 max-w-lg mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Store Request</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Submit your store details — super-admin will review and approve
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Store Name */}
        <div className="space-y-1.5">
          <Label htmlFor="storeName" className="flex items-center gap-1.5">
            <Store className="w-4 h-4 text-muted-foreground" />
            Store Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="storeName"
            placeholder="e.g. Fashion Zone"
            value={form.storeName}
            onChange={(e) => setForm((p) => ({ ...p, storeName: e.target.value }))}
            required
          />
        </div>

        {/* Username */}
        <div className="space-y-1.5">
          <Label htmlFor="req-username" className="flex items-center gap-1.5">
            <User className="w-4 h-4 text-muted-foreground" />
            Username <span className="text-destructive">*</span>
          </Label>
          <Input
            id="req-username"
            placeholder="e.g. fashion_zone"
            value={form.username}
            onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
            required
          />
          <p className="text-xs text-muted-foreground">This will be your admin login username</p>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="req-password" className="flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-muted-foreground" />
            Password <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="req-password"
              type={showPass ? "text" : "password"}
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              required
              className="pr-16"
            />
            <button
              type="button"
              onClick={() => setShowPass((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              {showPass ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {/* Admin Number */}
        <div className="space-y-1.5">
          <Label htmlFor="req-admin-number" className="flex items-center gap-1.5">
            <Phone className="w-4 h-4 text-muted-foreground" />
            Admin Number
          </Label>
          <div className="flex items-center border border-input rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-ring">
            <span className="px-3 py-2 bg-muted text-sm font-medium text-muted-foreground border-r border-input shrink-0">
              +91
            </span>
            <input
              id="req-admin-number"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="9876543210"
              value={form.adminNumber}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                setForm((p) => ({ ...p, adminNumber: val }));
              }}
              className="flex-1 px-3 py-2 text-sm bg-background outline-none"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Your mobile number (10 digits, optional)
          </p>
        </div>

        {/* WhatsApp */}
        <div className="space-y-1.5">
          <Label htmlFor="req-whatsapp">
            WhatsApp Number <span className="text-destructive">*</span>
          </Label>
          <div className="flex items-center border border-input rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-ring">
            <span className="px-3 py-2 bg-muted text-sm font-medium text-muted-foreground border-r border-input shrink-0">
              +91
            </span>
            <input
              id="req-whatsapp"
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
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Enter 10-digit mobile number (repeated digits like 9999999999 not allowed)
          </p>
        </div>

        {/* Plan Selector */}
        <div className="rounded-2xl bg-[#03020A] border border-white/10 p-4">
          <PlanSelector selected={selectedPlan} onChange={setSelectedPlan} />
        </div>

        <Button
          type="submit"
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-5 disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={submitRequest.isPending || !selectedPlan}
        >
          <SendHorizonal className="w-4 h-4 mr-2" />
          {submitRequest.isPending ? "Submitting..." : !selectedPlan ? "Select a Plan to Continue" : "Submit Request"}
        </Button>
      </form>

      {/* My Requests History */}
      <div>
        <h2 className="text-lg font-semibold mb-3">My Requests</h2>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : !myRequests || myRequests.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-10 text-center text-muted-foreground">
              <SendHorizonal className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No requests submitted yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {myRequests.map((req) => {
              const cfg = statusConfig[req.status];
              const Icon = cfg.icon;
              const isApproved = req.status === "approved";
              return (
                <Card
                  key={req.id}
                  className={isApproved ? "cursor-pointer hover:shadow-md transition-shadow border-green-200" : ""}
                  onClick={() => isApproved && setSelectedReq(req)}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      req.status === "approved" ? "bg-green-100" :
                      req.status === "rejected" ? "bg-red-100" : "bg-amber-100"
                    }`}>
                      <Icon className={`w-4 h-4 ${
                        req.status === "approved" ? "text-green-600" :
                        req.status === "rejected" ? "text-red-600" : "text-amber-600"
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{req.storeName}</p>
                      <p className="text-xs text-muted-foreground">@{req.username}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={cfg.cls + " text-[10px]"}>{cfg.label}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(req.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Approved request detail dialog */}
      <Dialog open={!!selectedReq} onOpenChange={(open) => { if (!open) setSelectedReq(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              {selectedReq?.storeName}
            </DialogTitle>
          </DialogHeader>

          {selectedReq && (
            <div className="space-y-4 pt-1">
              {/* Submitted info */}
              <div className="rounded-xl border overflow-hidden bg-muted/40">
                <div className="px-4 py-2.5 bg-muted border-b">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Submitted Information</p>
                </div>
                <div className="divide-y divide-border">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5" /> Store Name
                    </span>
                    <span className="text-sm font-semibold">{selectedReq.storeName}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> Username
                    </span>
                    <span className="text-sm font-medium">@{selectedReq.username}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> WhatsApp
                    </span>
                    <span className="text-sm font-medium">
                      +91 {selectedReq.whatsapp.replace(/^\+?91/, "").trim()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-muted-foreground">Approved on</span>
                    <span className="text-sm font-medium text-green-600">
                      {new Date(selectedReq.updatedAt ?? selectedReq.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reward Code + Link section */}
              <div className="rounded-xl border border-green-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-green-50 border-b border-green-200">
                  <p className="text-xs font-bold text-green-700 uppercase tracking-widest">Store Rewards</p>
                </div>
                <div className="divide-y divide-border">
                  {/* Reward Code */}
                  <div className="flex items-center justify-between px-4 py-3 gap-3">
                    <span className="text-sm text-muted-foreground shrink-0">Reward Code</span>
                    {(selectedReq as any).rewardCode ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-bold tracking-[0.15em] text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-md select-all">
                          {(selectedReq as any).rewardCode}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText((selectedReq as any).rewardCode);
                            toast({ title: "Reward code copied ✅" });
                          }}
                          className="w-7 h-7 rounded-full bg-green-100 hover:bg-green-200 flex items-center justify-center text-green-700 transition-colors"
                          title="Copy code"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm font-mono text-muted-foreground/40">— — — — —</span>
                    )}
                  </div>

                  {/* Link placeholder */}
                  <div className="flex items-center justify-between px-4 py-3 gap-3">
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5 shrink-0">
                      <LinkIcon className="w-3.5 h-3.5" /> Store Link
                    </span>
                    <span className="text-sm text-muted-foreground/40 italic text-right">
                      Coming soon...
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
