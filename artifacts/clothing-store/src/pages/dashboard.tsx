import { useGetDashboardSummary, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarCheck, MessageCircle, ChevronLeft, ShoppingBag, BookMarked, CheckCheck, Search, User } from "lucide-react";
import { useLocation } from "wouter";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";

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
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
}

interface CustomerAccountItem {
  id: string;
  mobileNumber: string;
  password: string;
  createdAt: string;
}

type View = "summary" | "bookings" | "detail" | "customeraccounts" | "chat";

export default function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary();
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("summary");
  const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(null);
  const [customerAccounts, setCustomerAccounts] = useState<CustomerAccountItem[] | null>(null);
  const [customerAccountsLoading, setCustomerAccountsLoading] = useState(false);
  const [caSearch, setCaSearch] = useState("");
  const [adminBookingTab, setAdminBookingTab] = useState<"all" | "completed">("all");
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
    if (view !== "customeraccounts") return;
    setCustomerAccountsLoading(true);
    const token = localStorage.getItem("wmh_token");
    fetch("/api/customer-accounts", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.ok ? r.json() : [])
      .then(d => setCustomerAccounts(d))
      .catch(() => {})
      .finally(() => setCustomerAccountsLoading(false));
  }, [view]);

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

  /* ── CHAT (blank placeholder) ── */
  if (view === "chat") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setView("summary")} className="p-1.5 rounded-full hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">Customer's Chat</h1>
        </div>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: "rgba(168,85,247,0.1)" }}>
            <MessageCircle className="w-10 h-10 text-purple-400" />
          </div>
          <div>
            <p className="text-base font-bold text-gray-900">Coming Soon</p>
            <p className="text-xs text-gray-400 mt-1">Chat feature will be available here</p>
          </div>
        </div>
      </div>
    );
  }

  /* ── BOOKING LIST ── */
  if (view === "bookings") {
    const visibleBookings =
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

        {/* 2-tab filter */}
        <div className="relative rounded-xl p-1 bg-gray-100">
          <div
            className="absolute top-1 bottom-1 rounded-lg bg-white shadow-sm transition-all"
            style={{
              width: "calc(50% - 4px)",
              left: adminBookingTab === "all" ? "4px" : "calc(50%)",
              transition: "left 0.3s cubic-bezier(0.4,0,0.2,1)",
            }}
          />
          <div className="relative flex">
            {([
              { key: "all" as const, label: "All Bookings", icon: <BookMarked className="w-3.5 h-3.5" />, count: bookings?.length ?? 0 },
              { key: "completed" as const, label: "Completed", icon: <CheckCheck className="w-3.5 h-3.5" />, count: completedBookings.length },
            ]).map(({ key, label, icon, count }) => (
              <button
                key={key}
                onClick={() => setAdminBookingTab(key)}
                className="flex-1 py-2 text-[11px] font-bold z-10 flex flex-col items-center gap-0.5 rounded-lg"
                style={{ color: adminBookingTab === key ? (key === "completed" ? "#16a34a" : "#1d4ed8") : "#9ca3af" }}
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

  /* ── CUSTOMER ACCOUNTS VIEW ── */
  if (view === "customeraccounts") {
    const searchQ = caSearch.trim().toLowerCase();
    const visibleAccounts = (customerAccounts ?? []).filter(a =>
      !searchQ || a.mobileNumber.includes(searchQ)
    );

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setView("summary")} className="p-1.5 rounded-full hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">Customer Accounts</h1>
        </div>

        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border-2 bg-white"
          style={{ borderColor: caSearch ? "#2563eb" : "#e5e7eb" }}>
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: caSearch ? "#2563eb" : "#9ca3af" }} />
          <input
            type="text"
            value={caSearch}
            onChange={e => setCaSearch(e.target.value)}
            placeholder="Search by mobile number"
            className="flex-1 text-sm text-gray-800 placeholder-gray-400 focus:outline-none bg-transparent"
          />
          {caSearch && (
            <button onClick={() => setCaSearch("")} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {customerAccountsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-xl border border-gray-100 p-4 bg-white">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2 mb-2" />
                <div className="h-3 bg-gray-100 rounded animate-pulse w-1/3" />
              </div>
            ))}
          </div>
        ) : visibleAccounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
            <User className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm font-medium">{caSearch ? `No accounts matching "${caSearch}"` : "No customer accounts yet"}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleAccounts.map((acc) => (
              <div key={acc.id} className="rounded-xl border border-gray-100 bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(37,99,235,0.08)" }}>
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-900 text-sm">{acc.mobileNumber}</p>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(37,99,235,0.08)", color: "#2563eb" }}>Active</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-400">Password: <span className="font-bold text-gray-700">{acc.password}</span></span>
                    </div>
                    <p className="text-[10px] text-gray-300 mt-0.5">
                      Joined {new Date(acc.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <a
                    href={`https://wa.me/${acc.mobileNumber.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex-shrink-0"
                    style={{ background: "#25D366", color: "white" }}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </a>
                </div>
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

      {/* Row 1: Total Products + Total Categories — split card */}
      <Card className="overflow-hidden">
        <div className="flex divide-x divide-gray-100">
          {/* Left: Total Products */}
          <button
            className="flex-1 text-left px-4 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
            onClick={() => setLocation("/products")}
          >
            <p className="text-[11px] text-muted-foreground mb-1">Total Products</p>
            <div className="text-3xl font-extrabold text-gray-900">{summary.totalProducts}</div>
          </button>

          {/* Right: Total Categories */}
          <button
            className="flex-1 text-left px-4 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
            onClick={() => setLocation("/categories")}
          >
            <p className="text-[11px] text-muted-foreground mb-1">Total Categories</p>
            <div className="text-3xl font-extrabold text-gray-900">{(summary as any).totalCategories ?? 0}</div>
          </button>
        </div>
      </Card>

      {/* Row 2: Active Bookings */}
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

      {/* Customer's Chat section */}
      <Card
        className="cursor-pointer hover:border-purple-400 transition-colors border-purple-200"
        onClick={() => setView("chat")}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-purple-700">Customer's Chat</CardTitle>
          <MessageCircle className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">Chat with your customers</p>
            <p className="text-xs text-purple-600 font-semibold">Click to open →</p>
          </div>
        </CardContent>
      </Card>

      {/* Customer Accounts section */}
      <Card
        className="relative cursor-pointer hover:border-blue-400 transition-colors border-blue-200"
        onClick={() => setView("customeraccounts")}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-blue-700">Customer Accounts</CardTitle>
          <User className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-3xl font-extrabold text-gray-900">{(summary as any).customerAccountCount ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-0.5">Registered customers</p>
            </div>
            <p className="text-xs text-blue-600 font-semibold">Click to manage →</p>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
