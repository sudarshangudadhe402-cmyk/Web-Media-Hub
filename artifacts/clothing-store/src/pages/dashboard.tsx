import { useGetDashboardSummary, useIgnoreBooking, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Tags, CalendarCheck, MessageCircle, X, ShoppingBag } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORY_COLORS = [
  "bg-purple-100 text-purple-700 border-purple-200",
  "bg-pink-100 text-pink-700 border-pink-200",
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-green-100 text-green-700 border-green-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-red-100 text-red-700 border-red-200",
  "bg-indigo-100 text-indigo-700 border-indigo-200",
  "bg-teal-100 text-teal-700 border-teal-200",
  "bg-orange-100 text-orange-700 border-orange-200",
  "bg-cyan-100 text-cyan-700 border-cyan-200",
];

export default function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary();
  const [_, setLocation] = useLocation();
  const ignoreBooking = useIgnoreBooking();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const funcCounts = summary?.functionCategoryCounts ?? {};
  const funcEntries = Object.entries(funcCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6 pb-10">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      {/* ── Top Stats ── */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => setLocation("/products")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold text-primary">{summary?.totalProducts ?? 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold text-primary">{summary?.activeBookings ?? 0}</div>
            )}
          </CardContent>
        </Card>

        {/* Product Type Breakdown */}
        <Card className="col-span-2 md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">By Type</CardTitle>
            <Tags className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-1.5">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-4 w-full" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                {[
                  ["Top", summary?.categoryCounts.Top],
                  ["Bottom", summary?.categoryCounts.Bottom],
                  ["Full Outfit", summary?.categoryCounts["Full Outfit"]],
                  ["Functional", summary?.categoryCounts.Functional],
                ].map(([label, count]) => (
                  <div key={label as string} className="flex items-center justify-between">
                    <span className="text-muted-foreground truncate">{label}</span>
                    <span className="font-semibold ml-2">{count ?? 0}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Category Product Counts ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ShoppingBag className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Categories</h2>
          <span className="text-sm text-muted-foreground">— products per category</span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : funcEntries.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-10 text-center text-muted-foreground">
              <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No categories found</p>
              <p className="text-sm mt-1">Products mein category add karo yahan dikhega</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {funcEntries.map(([name, count], idx) => {
              const colorClass = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
              const maxCount = funcEntries[0]?.[1] ?? 1;
              const barWidth = Math.max(8, Math.round((count / maxCount) * 100));
              return (
                <button
                  key={name}
                  onClick={() => setLocation("/products")}
                  className={`rounded-xl border p-4 text-left transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.99] ${colorClass}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm leading-tight line-clamp-2">{name}</p>
                    <span className="text-2xl font-bold tabular-nums shrink-0">{count}</span>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-black/10">
                    <div
                      className="h-1.5 rounded-full bg-current opacity-50 transition-all"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs opacity-60">
                    {count === 1 ? "1 product" : `${count} products`}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Recent Bookings ── */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Recent Bookings</h2>
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
          </div>
        ) : summary?.recentBookings && summary.recentBookings.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {summary.recentBookings.map((booking) => (
              <Card key={booking.id} className="overflow-hidden">
                <div className="flex h-32 bg-muted relative">
                  {booking.product?.images?.[0] ? (
                    <img
                      src={booking.product.images[0]}
                      alt={booking.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Package className="w-8 h-8 opacity-20" />
                    </div>
                  )}
                  <Badge className="absolute top-2 right-2 backdrop-blur-md bg-background/70 text-foreground border">
                    Size: {booking.selectedSize}
                  </Badge>
                </div>
                <CardContent className="p-4 space-y-1">
                  <p className="font-semibold text-sm line-clamp-1">{booking.product?.name}</p>
                  <p className="font-medium text-sm">{booking.customerName}</p>
                  <p className="text-sm text-muted-foreground">{booking.customerPhone}</p>
                  <p className="text-xs text-muted-foreground truncate">{booking.customerAddress}</p>
                  <div className="flex gap-2 pt-2">
                    <Button
                      className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white h-8 text-xs"
                      onClick={() => handleWhatsApp(booking.customerPhone, booking.product?.name ?? "")}
                    >
                      <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                      WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 text-destructive shrink-0"
                      onClick={() => handleIgnore(booking.id)}
                      disabled={ignoreBooking.isPending}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <CalendarCheck className="w-12 h-12 mb-4 opacity-20" />
              <p>No active bookings</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
