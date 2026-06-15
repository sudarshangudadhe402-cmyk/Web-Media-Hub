import { useGetDashboardSummary, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Tags, CalendarCheck, MessageCircle, ChevronLeft, ShoppingBag, CreditCard, CheckCircle, X, Clock, BookMarked, CheckCheck, Search } from "lucide-react";
import { useLocation } from "wouter";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useState, useEffect, type ReactNode } from "react";

interface AdminBooking {
  id: string;
  product: {
    id: string;
    name: string;
    images: string[];
    discountPrice: number;
    actualPrice: number;
    functionCategory: string | null;
    productType: string;
    sizes: string[];
  } | null;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  selectedSize: string;
  ignored: boolean;
  seenByAdmin: boolean;
  tryOnImage: string | null;
  loyaltyCardApplied: boolean;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
}

interface LoyaltyCardItem {
  id: string;
  customerName: string;
  mobileNumber: string;
  password: string;
  status: string;
  requestedAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
}

type View = "summary" | "bookings" | "detail" | "loyaltycards";

export default function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary();
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("summary");
  const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(null);
  const [loyaltyCards, setLoyaltyCards] = useState<{ requested: LoyaltyCardItem[]; approved: LoyaltyCardItem[]; rejected: LoyaltyCardItem[] } | null>(null);
  const [loyaltyCardsLoading, setLoyaltyCardsLoading] = useState(false);
  const [loyaltyTab, setLoyaltyTab] = useState<"requested" | "approved" | "rejected">("requested");
  const [lcSearch, setLcSearch] = useState("");
  const [adminBookingTab, setAdminBookingTab] = useState<"all" | "loyalty" | "completed">("all");
  const [completedBookings, setCompletedBookings] = useState<AdminBooking[]>([]);
  const [completedBookingsLoading, setCompletedBookingsLoading] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeLoading, setCompleteLoading] = useState(false);

  const { data: bookings, isLoading: bookingsLoading } = useQuery<AdminBooking[]>({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      const token = localStorage.getItem("wmh_token");
      const res = await fetch("/api/bookings", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: view === "bookings" || view === "detail",
  });

  useEffect(() => {
    if (view !== "detail" || !selectedBooking) return;
    const token = localStorage.getItem("wmh_token");
    fetch(`/api/bookings/${selectedBooking.id}/seen`, {
      method: "PATCH",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      })
      .catch(() => {});
  }, [view, selectedBooking?.id]);

  useEffect(() => {
    if (view !== "loyaltycards") return;
    setLoyaltyCardsLoading(true);
    const token = localStorage.getItem("wmh_token");
    fetch("/api/loyalty-cards", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setLoyaltyCards(d); })
      .catch(() => {})
      .finally(() => setLoyaltyCardsLoading(false));
  }, [view]);

  useEffect(() => {
    if (!lcSearch.trim() || !loyaltyCards || view !== "loyaltycards") return;
    const q = lcSearch.trim().toLowerCase();
    const matches = (tab: "requested" | "approved" | "rejected") =>
      (loyaltyCards[tab] ?? []).some(c =>
        c.customerName.toLowerCase().includes(q) || c.mobileNumber.includes(q)
      );
    if (!matches(loyaltyTab)) {
      const found = (["requested", "approved", "rejected"] as const).find(
        t => t !== loyaltyTab && matches(t)
      );
      if (found) setLoyaltyTab(found);
    }
  }, [lcSearch, loyaltyCards]);

  async function approveLoyaltyCard(card: LoyaltyCardItem, adminWhatsapp: string) {
    const token = localStorage.getItem("wmh_token");
    const res = await fetch(`/api/loyalty-cards/${card.id}/approve`, {
      method: "PATCH",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const msg = `Congratulations 🎉 Your Loyalty card is approved , Team ${summary?.storeName ?? ""}`.trim();
      const waLink = `https://wa.me/${card.mobileNumber.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
      window.open(waLink, "_blank");
      const t = localStorage.getItem("wmh_token");
      fetch("/api/loyalty-cards", { headers: t ? { Authorization: `Bearer ${t}` } : {} })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setLoyaltyCards(d); })
        .catch(() => {});
    }
  }

  useEffect(() => {
    if (adminBookingTab !== "completed" || view !== "bookings") return;
    setCompletedBookingsLoading(true);
    const token = localStorage.getItem("wmh_token");
    fetch("/api/bookings/completed", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.ok ? r.json() : [])
      .then(d => setCompletedBookings(d))
      .catch(() => {})
      .finally(() => setCompletedBookingsLoading(false));
  }, [adminBookingTab, view]);

  async function completeOrder(id: string) {
    setCompleteLoading(true);
    const token = localStorage.getItem("wmh_token");
    const res = await fetch(`/api/bookings/${id}/complete`, {
      method: "PATCH",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      setShowCompleteModal(false);
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      setView("bookings");
      setAdminBookingTab("completed");
    }
    setCompleteLoading(false);
  }

  async function rejectLoyaltyCard(card: LoyaltyCardItem) {
    const token = localStorage.getItem("wmh_token");
    const res = await fetch(`/api/loyalty-cards/${card.id}/reject`, {
      method: "PATCH",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const t = localStorage.getItem("wmh_token");
      fetch("/api/loyalty-cards", { headers: t ? { Authorization: `Bearer ${t}` } : {} })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setLoyaltyCards(d); })
        .catch(() => {});
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-40" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  if (!summary) return null;

  const unseenCount = (summary as any).unseenBookings ?? 0;

  /* ── BOOKING LIST ── */
  if (view === "bookings") {
    const loyaltyTabCount = bookings?.filter(b => b.loyaltyCardApplied).length ?? 0;
    const visibleBookings =
      adminBookingTab === "loyalty" ? (bookings ?? []).filter(b => b.loyaltyCardApplied) :
      adminBookingTab === "completed" ? completedBookings :
      (bookings ?? []);
    const isLoading2 = adminBookingTab === "completed" ? completedBookingsLoading : bookingsLoading;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setView("summary")} className="p-1.5 rounded-full hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">Bookings</h1>
        </div>

        {/* 3-tab filter */}
        <div className="relative rounded-xl p-1 bg-gray-100">
          <div
            className="absolute top-1 bottom-1 rounded-lg bg-white shadow-sm transition-all"
            style={{
              width: "calc(33.333% - 4px)",
              left: adminBookingTab === "all" ? "4px" : adminBookingTab === "loyalty" ? "calc(33.333%)" : "calc(66.666%)",
              transition: "left 0.3s cubic-bezier(0.4,0,0.2,1)",
            }}
          />
          <div className="relative flex">
            {([
              { key: "all", label: "All Booking", icon: <BookMarked className="w-3.5 h-3.5" />, count: bookings?.length ?? 0 },
              { key: "loyalty", label: "Loyalty Card", icon: <CreditCard className="w-3.5 h-3.5" />, count: loyaltyTabCount },
              { key: "completed", label: "Complete", icon: <CheckCheck className="w-3.5 h-3.5" />, count: completedBookings.length },
            ] as const).map(({ key, label, icon, count }) => (
              <button
                key={key}
                onClick={() => setAdminBookingTab(key)}
                className="flex-1 py-2 text-[11px] font-bold z-10 flex flex-col items-center gap-0.5 rounded-lg"
                style={{ color: adminBookingTab === key ? (key === "completed" ? "#16a34a" : key === "loyalty" ? "#7c3aed" : "#1d4ed8") : "#9ca3af" }}
              >
                {icon}
                {label}
                <span className="text-[10px] font-extrabold">({count})</span>
              </button>
            ))}
          </div>
        </div>

        {isLoading2 ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex gap-3">
                <Skeleton className="w-16 h-20 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : !visibleBookings.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              {adminBookingTab === "completed"
                ? <><CheckCheck className="w-12 h-12 mb-4 opacity-20" /><p>No completed orders yet</p></>
                : <><CalendarCheck className="w-12 h-12 mb-4 opacity-20" /><p>No bookings</p></>
              }
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {visibleBookings.map((bk) => (
              <div
                key={bk.id}
                onClick={() => { if (adminBookingTab !== "completed") { setSelectedBooking(bk); setView("detail"); } }}
                className={`bg-white rounded-xl border shadow-sm p-3 flex gap-3 transition-colors ${adminBookingTab !== "completed" ? "cursor-pointer hover:border-primary/40 active:bg-gray-50" : "border-green-100"}`}
              >
                {(bk.tryOnImage || bk.product?.images?.[0]) ? (
                  <img src={bk.tryOnImage || bk.product?.images?.[0]} className="w-16 h-20 object-cover rounded-lg flex-shrink-0" />
                ) : (
                  <div className="w-16 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ShoppingBag className="w-6 h-6 text-gray-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm line-clamp-1">{bk.product?.name ?? "Product"}</p>
                  {bk.selectedSize && (
                    <span className="inline-block text-[10px] border border-gray-200 rounded px-1.5 py-0.5 text-gray-500 mt-0.5">
                      Size: {bk.selectedSize}
                    </span>
                  )}
                  <p className="text-xs text-gray-600 mt-1 font-medium">{bk.customerName}</p>
                  <p className="text-xs text-gray-400">{bk.customerPhone}</p>
                  <p className="text-[10px] text-gray-300 mt-1">
                    {new Date(bk.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  {bk.loyaltyCardApplied && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-1" style={{ background: "rgba(34,197,94,0.12)", color: "#16a34a", border: "1px solid rgba(34,197,94,0.25)" }}>
                      🎫 Loyalty Card
                    </span>
                  )}
                  {bk.completed && bk.completedAt && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-1" style={{ background: "rgba(34,197,94,0.1)", color: "#15803d", border: "1px solid rgba(34,197,94,0.3)" }}>
                      ✅ Completed · {new Date(bk.completedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  )}
                </div>
                <div className="flex-shrink-0 mt-auto pb-0.5 flex flex-col items-center gap-0.5">
                  {bk.completed
                    ? <CheckCheck className="w-5 h-5 text-green-500" />
                    : <>
                        <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
                          <path d="M1 7L5.5 11.5L13 3" stroke={bk.seenByAdmin ? "#53bdeb" : "#b0b8c1"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M7 7L11.5 11.5L19 3" stroke={bk.seenByAdmin ? "#53bdeb" : "#b0b8c1"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {!bk.seenByAdmin && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                      </>
                  }
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ── BOOKING DETAIL ── */
  if (view === "detail" && selectedBooking) {
    const p = selectedBooking.product;
    const category = p?.functionCategory ?? p?.productType ?? "N/A";
    const waText = `Hello ${selectedBooking.customerName}!\n\nYou have made a booking for the following product:\n\n📦 Product: ${p?.name ?? "N/A"}\n💰 Price: ₹${p?.discountPrice?.toLocaleString() ?? "N/A"}\n🏷️ Category: ${category}\n\nWould you like to purchase this product? Please reply to confirm your order. 😊`;
    const waLink = `https://wa.me/${selectedBooking.customerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(waText)}`;

    return (
      <>
      <div className="space-y-4 max-w-lg">
        <div className="flex items-center gap-2">
          <button onClick={() => setView("bookings")} className="p-1.5 rounded-full hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">Booking Detail</h1>
        </div>

        {/* Product */}
        <Card className="overflow-hidden">
          {(selectedBooking.tryOnImage || p?.images?.[0]) && (
            <div className="h-52 bg-gray-100">
              <img
                src={selectedBooking.tryOnImage || p?.images?.[0]}
                alt={p?.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <CardContent className="pt-4 space-y-2">
            <h2 className="font-bold text-base leading-snug">{p?.name}</h2>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[11px] bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full font-medium">
                {p?.productType}
              </span>
              {p?.functionCategory && (
                <span className="text-[11px] bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full font-medium">
                  {p.functionCategory}
                </span>
              )}
              {selectedBooking.selectedSize && (
                <span className="text-[11px] bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                  Size: {selectedBooking.selectedSize}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-gray-900">₹{p?.discountPrice?.toLocaleString()}</span>
              {p && p.actualPrice > p.discountPrice && (
                <span className="text-sm text-gray-400 line-through">₹{p.actualPrice.toLocaleString()}</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Customer */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 text-sm">Customer Details</h3>
              {selectedBooking.tryOnImage && (
                <span className="text-[11px] bg-red-50 text-red-600 border border-red-300 px-2 py-0.5 rounded-full font-bold">
                  🪞 Virtual Try-On
                </span>
              )}
              {selectedBooking.loyaltyCardApplied && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full ml-1" style={{ background: "rgba(34,197,94,0.12)", color: "#16a34a", border: "1px solid rgba(34,197,94,0.3)" }}>
                  🎫 Loyalty Card
                </span>
              )}
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-16 shrink-0">Name</span>
                <span className="text-sm font-semibold text-gray-900">{selectedBooking.customerName}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-16 shrink-0">Mobile</span>
                <span className="text-sm font-medium text-gray-900 flex-1">{selectedBooking.customerPhone}</span>
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 bg-[#25D366] text-white text-[11px] font-bold px-3 py-1.5 rounded-full shrink-0"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  WhatsApp
                </a>
              </div>
              {selectedBooking.customerAddress && (
                <div className="flex items-start gap-3">
                  <span className="text-xs text-gray-400 w-16 shrink-0">Address</span>
                  <span className="text-sm text-gray-700">{selectedBooking.customerAddress}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-16 shrink-0">Date</span>
                <span className="text-sm text-gray-600">
                  {new Date(selectedBooking.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>
            </div>

            {/* Message preview */}
            <div className="bg-[#dcf8c6] rounded-xl p-3 mt-2 border border-green-100">
              <p className="text-[10px] text-green-700 font-bold uppercase tracking-wide mb-1.5">WhatsApp Message Preview</p>
              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{waText}</p>
            </div>

            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-3 rounded-xl text-sm"
            >
              <MessageCircle className="w-4 h-4" />
              Send WhatsApp Message
            </a>
          </CardContent>
        </Card>

        {/* Extra spacing so sticky button doesn't overlap last card */}
        <div className="h-20" />
      </div>

      {/* Sticky Complete Order button */}
      <div className="fixed bottom-0 left-0 right-0 z-30 px-4 py-3 bg-white border-t border-red-100">
        <button
          onClick={() => setShowCompleteModal(true)}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm bg-red-500 hover:bg-red-600 active:bg-red-700 text-white transition-colors"
        >
          <CheckCheck className="w-5 h-5" />
          Complete Order
        </button>
      </div>

      {/* Confirm Complete Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCompleteModal(false)}>
          <div
            className="w-full max-w-lg bg-white rounded-t-3xl p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center mb-1">
              <div className="w-10 h-1.5 rounded-full bg-gray-200" />
            </div>
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-green-50 border-2 border-green-200 mx-auto">
              <CheckCheck className="w-7 h-7 text-green-600" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-gray-900">Complete This Order?</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Have you completed this order?<br />
                Did the customer buy this product from your store?
              </p>
              <p className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3">
                If you have completed this order, click on <strong>Done</strong>. This booking will be removed from Active Bookings and moved to Complete Orders.
              </p>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => completeOrder(selectedBooking!.id)}
                disabled={completeLoading}
                className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-sm transition-colors disabled:opacity-60"
              >
                {completeLoading ? "Processing…" : "✅ Done"}
              </button>
            </div>
          </div>
        </div>
      )}
      </>
    );
  }

  /* ── LOYALTY CARDS VIEW ── */
  if (view === "loyaltycards") {
    const tabs: { key: "requested" | "approved" | "rejected"; label: string; icon: ReactNode }[] = [
      { key: "requested", label: "Requested", icon: <Clock className="w-3.5 h-3.5" /> },
      { key: "approved", label: "Approved", icon: <CheckCircle className="w-3.5 h-3.5" /> },
      { key: "rejected", label: "Rejected", icon: <X className="w-3.5 h-3.5" /> },
    ];
    const allCurrentCards = loyaltyCards?.[loyaltyTab] ?? [];
    const searchQ = lcSearch.trim().toLowerCase();
    const currentCards = searchQ
      ? allCurrentCards.filter(c =>
          c.customerName.toLowerCase().includes(searchQ) ||
          c.mobileNumber.includes(searchQ)
        )
      : allCurrentCards;

    const notFoundAnywhere = searchQ && loyaltyCards
      ? !(["requested", "approved", "rejected"] as const).some(tab =>
          (loyaltyCards[tab] ?? []).some(c =>
            c.customerName.toLowerCase().includes(searchQ) || c.mobileNumber.includes(searchQ)
          )
        )
      : false;

    const tabLabel = (tab: string) =>
      tab === "approved" ? "Approved ✅" : tab === "rejected" ? "Rejected ❌" : "Pending ⏳";
    const statusColor = (tab: string) =>
      tab === "approved" ? "#16a34a" : tab === "rejected" ? "#ef4444" : "#2563eb";
    const statusBg = (tab: string) =>
      tab === "approved" ? "rgba(34,197,94,0.1)" : tab === "rejected" ? "rgba(239,68,68,0.1)" : "rgba(37,99,235,0.08)";

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setView("summary")} className="p-1.5 rounded-full hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">Digital Loyalty Cards</h1>
        </div>

        {/* Top loyalty card image — no background wrapper, just the image */}
        <img
          src="/loyalty-card-original.png"
          alt="Web Media Hub Loyalty Card"
          className="w-full object-contain rounded-2xl"
          style={{ display: "block" }}
        />

        {/* 3 tabs */}
        <div className="grid grid-cols-3 gap-2">
          {tabs.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => { setLoyaltyTab(key); setLcSearch(""); }}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                loyaltyTab === key
                  ? key === "approved" ? "border-green-500 bg-green-50 text-green-700"
                    : key === "rejected" ? "border-red-400 bg-red-50 text-red-600"
                    : "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-400"
              }`}
            >
              {icon}
              {label}
              <span className="text-sm font-extrabold">{loyaltyCards?.[key]?.length ?? 0}</span>
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border-2 bg-white"
          style={{ borderColor: lcSearch ? "#2563eb" : "#e5e7eb" }}>
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: lcSearch ? "#2563eb" : "#9ca3af" }} />
          <input
            type="text"
            value={lcSearch}
            onChange={e => setLcSearch(e.target.value)}
            placeholder="Search by name or number — across all sections"
            className="flex-1 text-sm text-gray-800 placeholder-gray-400 focus:outline-none bg-transparent"
          />
          {lcSearch && (
            <button onClick={() => setLcSearch("")} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Auto-switch banner */}
        {searchQ && currentCards.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: statusBg(loyaltyTab), color: statusColor(loyaltyTab) }}>
            <Search className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Card found in: <strong>{tabLabel(loyaltyTab)}</strong> section</span>
          </div>
        )}

        {/* Not found anywhere banner */}
        {notFoundAnywhere && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-red-50 text-red-500">
            <X className="w-3.5 h-3.5 flex-shrink-0" />
            <span>No card found in any section — please check the name or number</span>
          </div>
        )}

        {loyaltyCardsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-xl border border-gray-100 p-3 flex gap-3 bg-white">
                <div className="w-24 h-14 bg-gray-100 rounded-lg animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : currentCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400">
            <Search className="w-10 h-10 mb-2 opacity-20" />
            <p className="text-sm font-medium">
              {searchQ ? `No results for "${searchQ}"` : `No ${loyaltyTab} loyalty cards`}
            </p>
            {searchQ && <p className="text-xs mt-1 opacity-70">Try a different name or number</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {currentCards.map((card) => (
              <div key={card.id} className="rounded-xl border border-gray-100 overflow-hidden" style={{ background: "transparent" }}>
                {/* Compact row: mini card image + info side by side */}
                <div className="flex gap-2.5 p-2">
                  {/* Mini loyalty card image — no background */}
                  <img
                    src="/loyalty-card-original.png"
                    alt="LC"
                    className="w-28 h-16 object-cover rounded-lg flex-shrink-0"
                    style={{ objectPosition: "center" }}
                  />
                  {/* Info */}
                  <div className="flex-1 min-w-0 py-0.5">
                    <div className="flex items-start justify-between gap-1">
                      <p className="font-bold text-gray-900 text-sm leading-tight truncate">{card.customerName}</p>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: statusBg(loyaltyTab), color: statusColor(loyaltyTab) }}>
                        {loyaltyTab === "approved" ? "✅ Active" : loyaltyTab === "rejected" ? "❌ Rejected" : "⏳ Pending"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{card.mobileNumber}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] text-gray-400">
                        {new Date(card.requestedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                      </p>
                      {card.approvedAt && (
                        <p className="text-[10px] text-green-600">
                          · Approved {new Date(card.approvedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </p>
                      )}
                      {card.rejectedAt && (
                        <p className="text-[10px] text-red-500">
                          · Rejected {new Date(card.rejectedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action buttons — compact */}
                {loyaltyTab === "requested" && (
                  <div className="flex gap-1.5 px-2 pb-2">
                    <button
                      onClick={() => approveLoyaltyCard(card, "")}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-green-500 text-white text-xs font-bold hover:bg-green-600 transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Approve
                    </button>
                    <button
                      onClick={() => rejectLoyaltyCard(card)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                )}

                {loyaltyTab === "approved" && (
                  <div className="px-2 pb-2">
                    <a
                      href={`https://wa.me/${card.mobileNumber.replace(/\D/g, "")}?text=${encodeURIComponent(`Congratulations 🎉 Your Loyalty card is approved , Team ${summary?.storeName ?? ""}`.trim())}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-[#25D366] text-white text-xs font-bold"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Send WhatsApp
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ── SUMMARY (default) ── */
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setLocation("/products")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalProducts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Tags className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Top: {summary.categoryCounts.Top}</div>
              <div>Bottom: {summary.categoryCounts.Bottom}</div>
              <div>Full Outfit: {summary.categoryCounts["Full Outfit"]}</div>
              <div>Functional: {summary.categoryCounts.Functional}</div>
            </div>
          </CardContent>
        </Card>

        {/* Active Bookings — with pulsing dot for new unseen */}
        <Card
          className="cursor-pointer hover:border-primary transition-colors relative overflow-hidden"
          onClick={() => setView("bookings")}
        >
          {unseenCount > 0 && (
            <span className="absolute top-2.5 right-2.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
            </span>
          )}
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.activeBookings}</div>
            {unseenCount > 0 ? (
              <p className="text-xs text-rose-500 font-semibold mt-1">{unseenCount} new booking{unseenCount > 1 ? "s" : ""}</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">Click to view all</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Digital Loyalty Card section */}
      <Card
        className="cursor-pointer hover:border-green-400 transition-colors border-green-200"
        onClick={() => { setLoyaltyTab("requested"); setView("loyaltycards"); }}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-green-700">Digital Loyalty Card</CardTitle>
          <CreditCard className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Manage loyalty card requests from customers</p>
          <p className="text-xs text-green-600 font-semibold mt-1">Click to manage →</p>
        </CardContent>
      </Card>
    </div>
  );
}
