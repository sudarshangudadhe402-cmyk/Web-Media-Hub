import { useState } from "react";
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
} from "lucide-react";

type Tab = "friend" | "approved" | "rejected";

export default function AiVideo() {
  const [addStoreOpen, setAddStoreOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("friend");
  const [selectedApproved, setSelectedApproved] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    username: "",
    password: "",
    storeName: "",
    whatsapp: "",
  });

  const submitRequest = useSubmitStoreRequest();
  const { data: myRequests } = useMyStoreRequests();

  const pending = (myRequests ?? []).filter((r) => r.status === "pending");
  const approved = (myRequests ?? []).filter((r) => r.status === "approved");
  const rejected = (myRequests ?? []).filter((r) => r.status === "rejected");
  const rewardCoins = approved.length * 2000;

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
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
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
      { data: { username: form.username, password: form.password, storeName: form.storeName, whatsapp: `+91${form.whatsapp}` } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getMyStoreRequestsQueryKey() });
          setAddStoreOpen(false);
          setConfirmOpen(true);
          setForm({ username: "", password: "", storeName: "", whatsapp: "" });
        },
        onError: (err: any) => {
          const reason: string =
            err?.data?.error ??
            err?.data?.message ??
            err?.response?.data?.error ??
            err?.message?.replace(/^HTTP \d+[^:]*:\s*/i, "") ??
            "";

          const isUsernameTaken = reason.toLowerCase().includes("already exists") || reason.toLowerCase().includes("username");
          const isSpamWhatsApp = reason.toLowerCase().includes("whatsapp") || reason.toLowerCase().includes("phone") || reason.toLowerCase().includes("spam");

          const title = isUsernameTaken
            ? "Username already exists, please try different 🙏"
            : isSpamWhatsApp
            ? "Spam number not allowed, please fill real 🙏"
            : reason || "Something went wrong, please try again 🙏";

          toast({ variant: "destructive", title });
        },
      }
    );
  }

  const tabItems: { key: Tab; label: string; icon: React.ElementType; count: number; activeClass?: string }[] = [
    { key: "friend", label: "Friend Store", icon: Store, count: pending.length },
    { key: "approved", label: "Approved Store", icon: CheckCircle, count: approved.length, activeClass: "bg-green-600 text-white border-green-600" },
    { key: "rejected", label: "Rejected Store", icon: XCircle, count: rejected.length, activeClass: "bg-red-600 text-white border-red-600" },
  ];

  const tabData = { friend: pending, approved, rejected };

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
        onClick={() => setAddStoreOpen(true)}
        className="w-full flex items-center justify-between gap-4 bg-green-600 hover:bg-green-700 active:bg-green-800 transition-colors text-white rounded-xl px-6 py-5 shadow-lg"
      >
        <div className="flex items-center gap-3">
          <PlusCircle className="w-6 h-6 shrink-0" />
          <div className="text-left">
            <p className="font-semibold text-lg leading-tight">Add My Friend's Store</p>
            <p className="text-green-100 text-sm">Refer a store and earn 2000 coins on approval</p>
          </div>
        </div>
        <Store className="w-8 h-8 text-green-200 shrink-0" />
      </button>

      {/* Your Rewards */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Rewards</p>
          <div className="flex items-start gap-4">
            {/* Left */}
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
            {/* Right */}
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground font-medium">Per approved store</p>
              <p className="text-3xl font-bold text-green-600 leading-none mt-1">+2000</p>
              <p className="text-xs text-muted-foreground mt-0.5">coin</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Global Link Row */}
      {globalLink && (
        <div className="flex items-center gap-3 px-4 py-3.5 bg-primary/5 border border-primary/20 rounded-xl">
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
      )}

      {/* Friends Store Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Friends Store</h2>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {tabItems.map(({ key, label, icon: Icon, count, activeClass }) => (
            <button
              key={key}
              data-testid={`tab-${key}`}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl text-xs font-medium border transition-colors ${
                activeTab === key
                  ? (activeClass ?? "bg-primary text-primary-foreground border-primary")
                  : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-center leading-tight hidden sm:block">{label}</span>
              <Badge variant="secondary" className="text-[10px] mt-0.5">{count}</Badge>
            </button>
          ))}
        </div>

        {/* Tab Content */}
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
                  <p className="text-sm text-muted-foreground/70">Once your referral is approved you'll earn 2000 coins</p>
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

              {/* Reward Code + Link */}
              <div className="rounded-xl border border-green-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-green-50 border-b border-green-200">
                  <p className="text-xs font-bold text-green-700 uppercase tracking-widest">Store Rewards</p>
                </div>
                <div className="divide-y divide-border">
                  <div className="flex items-center justify-between px-4 py-3 gap-3">
                    <span className="text-sm text-muted-foreground shrink-0">Reward Code</span>
                    {selectedApproved.rewardCode ? (
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

      {/* Add Friend Store Dialog */}
      <Dialog open={addStoreOpen} onOpenChange={setAddStoreOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="w-5 h-5 text-green-600" />
              Add My Friend's Store
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDone} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" placeholder="Friend's username" value={form.username} onChange={handleFormChange} required data-testid="friend-username" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" placeholder="Friend's password" value={form.password} onChange={handleFormChange} required data-testid="friend-password" />
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
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setAddStoreOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white" disabled={submitRequest.isPending}>
                {submitRequest.isPending ? "Submitting..." : "Done"}
              </Button>
            </div>
          </form>
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
          <div className="space-y-4 pt-2">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
              <MapPin className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800 text-sm">Payment Required for Approval</p>
                <p className="text-amber-700 text-sm mt-1">
                  The store owner will need to complete a payment to get their store approved on Web Media Hub.
                </p>
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3">
              <Gift className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-800 text-sm">Your Reward</p>
                <p className="text-green-700 text-sm mt-1">
                  Once the store is approved, you will receive{" "}
                  <span className="font-bold text-green-800">2000 free NGS Coins</span> added to your account.
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
