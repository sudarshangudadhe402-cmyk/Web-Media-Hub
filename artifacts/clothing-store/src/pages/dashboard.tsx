import { useGetDashboardSummary, useIgnoreBooking, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package, Tags, CalendarCheck, MessageCircle, X } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { useEffect } from "react";

export default function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary();
  const [_, setLocation] = useLocation();
  const ignoreBooking = useIgnoreBooking();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  /* Auto-mark all visible bookings as seen when admin views dashboard */
  useEffect(() => {
    if (!summary?.recentBookings) return;
    summary.recentBookings.forEach((booking) => {
      if (!(booking as any).seenByAdmin) {
        fetch(`/api/bookings/${booking.id}/seen`, { method: "PATCH", credentials: "include" })
          .catch(() => {});
      }
    });
  }, [summary?.recentBookings]);

  if (isLoading) {
    return <div>Loading dashboard...</div>;
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.activeBookings}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Recent Bookings</h2>
        {summary.recentBookings && summary.recentBookings.length > 0 ? (
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
                      No image
                    </div>
                  )}
                  <Badge className="absolute top-2 right-2 backdrop-blur-md bg-background/50 text-foreground">
                    Size: {booking.selectedSize}
                  </Badge>
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base line-clamp-1">{booking.product?.name}</CardTitle>
                  <CardDescription>
                    <div className="font-medium text-foreground">{booking.customerName}</div>
                    <div>{booking.customerPhone}</div>
                    <div className="truncate text-xs">{booking.customerAddress}</div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 flex gap-2">
                  <Button
                    className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white"
                    onClick={() => handleWhatsApp(booking.customerPhone, booking.product?.name ?? "")}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-destructive"
                    onClick={() => handleIgnore(booking.id)}
                    disabled={ignoreBooking.isPending}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <CalendarCheck className="w-12 h-12 mb-4 opacity-20" />
              <p>No active bookings</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
