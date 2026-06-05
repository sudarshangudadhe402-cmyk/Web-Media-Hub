import { useGetDashboardSummary, useIgnoreBooking, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Package, Tags, CalendarCheck, MessageCircle, X } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary();
  const [_, setLocation] = useLocation();
  const ignoreBooking = useIgnoreBooking();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(160deg, #0f1c38 0%, #162040 60%, #1a2550 100%)" }}>
        <p className="text-white/60 text-sm">Loading dashboard...</p>
      </div>
    );
  }

  if (!summary) return null;

  const handleIgnore = (id: string) => {
    ignoreBooking.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Booking ignored" });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      }
    });
  };

  const handleWhatsApp = (phone: string, product: string) => {
    const message = encodeURIComponent(`Hello! Regarding your booking for ${product}...`);
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };

  const categoryTotal = Object.values(summary.categoryCounts ?? {}).reduce((a, b) => a + b, 0);

  return (
    <div
      className="min-h-screen -m-4 md:-m-6 p-4 md:p-6 space-y-5"
      style={{ background: "linear-gradient(160deg, #0f1c38 0%, #162040 60%, #1a2550 100%)" }}
    >
      {/* Title */}
      <h1
        className="text-3xl font-bold tracking-tight"
        style={{ color: "#c9a84c", fontFamily: "serif" }}
      >
        Dashboard
      </h1>

      {/* Top Stats Row — Total Products & Categories (small) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Products */}
        <div
          className="rounded-2xl p-4 flex flex-col gap-3 cursor-pointer active:scale-95 transition-transform"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(12px)" }}
          onClick={() => setLocation("/products")}
        >
          <div className="flex items-center justify-between">
            <span className="text-white/70 text-xs font-medium">Total Products</span>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}
            >
              <Package className="w-4 h-4 text-white/70" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white">{summary.totalProducts}</div>
          <div className="h-[2px] rounded-full w-2/3" style={{ background: "rgba(201,168,76,0.5)" }} />
        </div>

        {/* Categories (compact) */}
        <div
          className="rounded-2xl p-4 flex flex-col gap-3"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(12px)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-white/70 text-xs font-medium">Categories</span>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}
            >
              <Tags className="w-4 h-4 text-white/70" />
            </div>
          </div>
          <div className="text-white/90 text-sm font-medium">Top: {summary.categoryCounts.Top}</div>
          <div className="h-[2px] rounded-full w-1/2" style={{ background: "rgba(201,168,76,0.5)" }} />
        </div>
      </div>

      {/* Categories Full Detail Card */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-white/70 text-xs font-medium">Categories</span>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}
          >
            <Tags className="w-4 h-4 text-white/70" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          {[
            ["Top", summary.categoryCounts.Top],
            ["Bottom", summary.categoryCounts.Bottom],
            ["Full Outfit", summary.categoryCounts["Full Outfit"]],
            ["Functional", summary.categoryCounts.Functional],
          ].map(([label, count]) => (
            <div key={String(label)}>
              <div className="flex justify-between text-sm text-white/80 mb-1">
                <span>{label}:</span>
                <span className="font-semibold">{count}</span>
              </div>
              <div className="h-[2px] rounded-full w-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: categoryTotal > 0 ? `${(Number(count) / categoryTotal) * 100}%` : "0%",
                    background: "rgba(201,168,76,0.7)",
                    minWidth: Number(count) > 0 ? "8%" : "0%",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Bookings */}
      <div
        className="rounded-2xl p-4 relative overflow-hidden"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(12px)" }}
      >
        {/* Glow */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-24 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(100,140,255,0.25) 0%, transparent 70%)", filter: "blur(10px)" }}
        />
        <div className="flex items-center justify-between mb-2 relative z-10">
          <span className="text-white/70 text-xs font-medium">Active Bookings</span>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}
          >
            <CalendarCheck className="w-4 h-4 text-white/70" />
          </div>
        </div>
        <div className="text-3xl font-bold text-white relative z-10">{summary.activeBookings}</div>
      </div>

      {/* Recent Bookings */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white/90 tracking-tight">Recent Bookings</h2>

        {summary.recentBookings && summary.recentBookings.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {summary.recentBookings.map((booking) => (
              <div
                key={booking.id}
                className="rounded-2xl overflow-hidden"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(12px)" }}
              >
                {/* Image */}
                <div className="h-32 relative bg-black/20">
                  {booking.product?.images?.[0] ? (
                    <img
                      src={booking.product.images[0]}
                      alt={booking.product.name}
                      className="w-full h-full object-cover opacity-90"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/30 text-sm">
                      No image
                    </div>
                  )}
                  <span
                    className="absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}
                  >
                    Size: {booking.selectedSize}
                  </span>
                </div>

                {/* Info */}
                <div className="p-4 space-y-1">
                  <p className="text-white text-sm font-semibold line-clamp-1">{booking.product?.name}</p>
                  <p className="text-white/70 text-xs font-medium">{booking.customerName}</p>
                  <p className="text-white/50 text-xs">{booking.customerPhone}</p>
                  <p className="text-white/40 text-xs truncate">{booking.customerAddress}</p>
                </div>

                {/* Actions */}
                <div className="px-4 pb-4 flex gap-2">
                  <button
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold text-white transition-opacity active:opacity-70"
                    style={{ background: "#25D366" }}
                    onClick={() => handleWhatsApp(booking.customerPhone, booking.product?.name ?? "")}
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </button>
                  <button
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-opacity active:opacity-70 disabled:opacity-40"
                    style={{ background: "rgba(255,80,80,0.15)", border: "1px solid rgba(255,80,80,0.3)" }}
                    onClick={() => handleIgnore(booking.id)}
                    disabled={ignoreBooking.isPending}
                  >
                    <X className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="rounded-2xl p-10 flex flex-col items-center justify-center gap-3"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(12px)" }}
          >
            <CalendarCheck className="w-12 h-12 text-white/20" />
            <p className="text-white/40 text-sm">No active bookings</p>
          </div>
        )}
      </div>
    </div>
  );
}
