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
import { useQueryClient } from "@tanstack/react-query";
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
} from "lucide-react";

type Tab = "friend" | "approved" | "rejected";

export default function AiVideo() {
  const [addStoreOpen, setAddStoreOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("friend");
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
  const rewardVideos = approved.length * 20;

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleDone(e: React.FormEvent) {
    e.preventDefault();
    submitRequest.mutate(
      { data: { username: form.username, password: form.password, storeName: form.storeName, whatsapp: form.whatsapp } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getMyStoreRequestsQueryKey() });
          setAddStoreOpen(false);
          setConfirmOpen(true);
          setForm({ username: "", password: "", storeName: "", whatsapp: "" });
        },
        onError: () => {
          toast({ title: "Failed to submit store request", variant: "destructive" });
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
            <p className="text-green-100 text-sm">Refer a store and earn 20 AI videos on approval</p>
          </div>
        </div>
        <Store className="w-8 h-8 text-green-200 shrink-0" />
      </button>

      {/* Your Rewards Video */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Gift className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground font-medium">Your Rewards</p>
            <p className="text-4xl font-bold tracking-tight text-primary">{rewardVideos}</p>
            <p className="text-sm text-muted-foreground mt-1">AI Promotional Videos earned</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-muted-foreground">Per approved store</p>
            <p className="text-2xl font-bold text-green-600">+20</p>
            <p className="text-xs text-muted-foreground">videos</p>
          </div>
        </CardContent>
      </Card>

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
                  <p className="text-sm text-muted-foreground/70">Once your referral is approved you'll earn 20 videos</p>
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
            {tabData[activeTab].map((req) => (
              <Card key={req.id} className="overflow-hidden">
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
            ))}
          </div>
        )}
      </div>

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
              <Input id="whatsapp" name="whatsapp" type="tel" placeholder="+91 00000 00000" value={form.whatsapp} onChange={handleFormChange} required data-testid="friend-whatsapp" />
              <p className="text-xs text-muted-foreground">Required for store approval process</p>
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
                  <span className="font-bold text-green-800">20 free AI Promotional Videos</span> added to your account.
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
