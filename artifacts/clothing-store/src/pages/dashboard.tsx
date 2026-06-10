import { useGetDashboardSummary, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Tags, CalendarCheck, MessageCircle, ChevronLeft, ShoppingBag, CreditCard, CheckCircle, X, Clock } from "lucide-react";
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

  async function approveLoyaltyCard(card: LoyaltyCardItem, adminWhatsapp: string) {
    const token = localStorage.getItem("wmh_token");
    const res = await fetch(`/api/loyalty-cards/${card.id}/approve`, {
      method: "PATCH",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const msg = `Congratulations 🎉 Your Loyalty card is approved`;
      const waLink = `https://wa.me/${card.mobileNumber.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
      window.open(waLink, "_blank");
      const t = localStorage.getItem("wmh_token");
      fetch("/api/loyalty-cards", { headers: t ? { Authorization: `Bearer ${t}` } : {} })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setLoyaltyCards(d); })
        .catch(() => {});
    }
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
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setView("summary")} className="p-1.5 rounded-full hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">Active Bookings</h1>
        </div>

        {bookingsLoading ? (
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
        ) : !bookings?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CalendarCheck className="w-12 h-12 mb-4 opacity-20" />
              <p>No active bookings</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {bookings.map((bk) => (
              <div
                key={bk.id}
                onClick={() => { setSelectedBooking(bk); setView("detail"); }}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex gap-3 cursor-pointer hover:border-primary/40 transition-colors active:bg-gray-50"
              >
                {(bk.tryOnImage || bk.product?.images?.[0]) ? (
                  <img src={bk.tryOnImage || bk.product!.images[0]} className="w-16 h-20 object-cover rounded-lg flex-shrink-0" />
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
                </div>
                <div className="flex-shrink-0 mt-auto pb-0.5 flex flex-col items-center gap-0.5">
                  <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
                    <path d="M1 7L5.5 11.5L13 3" stroke={bk.seenByAdmin ? "#53bdeb" : "#b0b8c1"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 7L11.5 11.5L19 3" stroke={bk.seenByAdmin ? "#53bdeb" : "#b0b8c1"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {!bk.seenByAdmin && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  )}
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
                src={selectedBooking.tryOnImage || p!.images[0]}
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
      </div>
    );
  }

  /* ── LOYALTY CARDS VIEW ── */
  if (view === "loyaltycards") {
    const tabs: { key: "requested" | "approved" | "rejected"; label: string; icon: ReactNode }[] = [
      { key: "requested", label: "Requested", icon: <Clock className="w-3.5 h-3.5" /> },
      { key: "approved", label: "Approved", icon: <CheckCircle className="w-3.5 h-3.5" /> },
      { key: "rejected", label: "Rejected", icon: <X className="w-3.5 h-3.5" /> },
    ];
    const currentCards = loyaltyCards?.[loyaltyTab] ?? [];

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setView("summary")} className="p-1.5 rounded-full hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">Digital Loyalty Cards</h1>
        </div>

        {/* 3 tabs */}
        <div className="grid grid-cols-3 gap-2">
          {tabs.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setLoyaltyTab(key)}
              className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-xs font-bold transition-all ${
                loyaltyTab === key
                  ? key === "approved" ? "border-green-500 bg-green-50 text-green-700"
                    : key === "rejected" ? "border-red-400 bg-red-50 text-red-600"
                    : "border-primary bg-primary/5 text-primary"
                  : "border-gray-200 bg-white text-gray-500"
              }`}
            >
              {icon}
              {label}
              <span className={`text-base font-extrabold ${loyaltyTab === key ? "" : "text-gray-700"}`}>
                {loyaltyCards?.[key]?.length ?? 0}
              </span>
            </button>
          ))}
        </div>

        {loyaltyCardsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
              </div>
            ))}
          </div>
        ) : currentCards.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CreditCard className="w-12 h-12 mb-4 opacity-20" />
              <p>No {loyaltyTab} loyalty cards</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {currentCards.map((card) => (
              <div key={card.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-gray-900">{card.customerName}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{card.mobileNumber}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Password: {card.password}</p>
                  </div>
                  <div className="text-right text-[11px] text-gray-400">
                    <p>Requested</p>
                    <p className="font-medium text-gray-600">
                      {new Date(card.requestedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    {card.approvedAt && (
                      <>
                        <p className="mt-1 text-green-600">Approved</p>
                        <p className="font-medium text-green-600">
                          {new Date(card.approvedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </>
                    )}
                    {card.rejectedAt && (
                      <>
                        <p className="mt-1 text-red-500">Rejected</p>
                        <p className="font-medium text-red-500">
                          {new Date(card.rejectedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {loyaltyTab === "requested" && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => approveLoyaltyCard(card, "")}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-500 text-white text-sm font-bold hover:bg-green-600 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => rejectLoyaltyCard(card)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                )}

                {loyaltyTab === "approved" && (
                  <a
                    href={`https://wa.me/${card.mobileNumber.replace(/\D/g, "")}?text=${encodeURIComponent("Congratulations 🎉 Your Loyalty card is approved")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-bold"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Send WhatsApp
                  </a>
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
