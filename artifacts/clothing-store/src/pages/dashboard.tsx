import { useGetDashboardSummary, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Tags, CalendarCheck, MessageCircle, ChevronLeft, ShoppingBag } from "lucide-react";
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
  createdAt: string;
}

type View = "summary" | "bookings" | "detail";

export default function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary();
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("summary");
  const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(null);

  const { data: bookings, isLoading: bookingsLoading } = useQuery<AdminBooking[]>({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      const res = await fetch("/api/bookings", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: view === "bookings" || view === "detail",
  });

  useEffect(() => {
    if (view !== "detail" || !selectedBooking) return;
    fetch(`/api/bookings/${selectedBooking.id}/seen`, { method: "PATCH", credentials: "include" })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      })
      .catch(() => {});
  }, [view, selectedBooking?.id]);

  if (isLoading) return <div className="p-6">Loading dashboard...</div>;
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
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
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
                {bk.product?.images?.[0] ? (
                  <img src={bk.product.images[0]} className="w-16 h-20 object-cover rounded-lg flex-shrink-0" />
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
          {p?.images?.[0] && (
            <div className="h-52 bg-gray-100">
              <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
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
            <h3 className="font-semibold text-gray-800 text-sm">Customer Details</h3>
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
    </div>
  );
}
