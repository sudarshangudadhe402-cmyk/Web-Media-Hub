import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  Package,
  Tags,
  Store,
  TrendingUp,
  Users,
  Shield,
  Bell,
  Menu,
  LogOut,
  CalendarCheck,
  ShoppingBag,
  Heart,
  BellOff,
  BookOpen,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListNotifications,
  useMarkNotificationsRead,
  useGetStore,
  useGetDashboardSummary,
  getListNotificationsQueryKey,
} from "@workspace/api-client-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const queryClient = useQueryClient();
  const [notifOpen, setNotifOpen] = useState(false);

  const isAdmin = !!user && user.role !== "super_admin";

  const { data: store } = useGetStore({ query: { retry: false } });
  const { data: notifications = [] } = useListNotifications();
  const markRead = useMarkNotificationsRead();

  const { data: dashSummary } = useGetDashboardSummary({
    query: { enabled: isAdmin, refetchInterval: 30_000 },
  });

  const dashboardHasDot =
    isAdmin &&
    (((dashSummary as any)?.unseenBookings ?? 0) > 0 ||
      ((dashSummary as any)?.unseenLoyaltyCards ?? 0) > 0);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotifOpenChange = (open: boolean) => {
    setNotifOpen(open);
    if (open && unreadCount > 0) {
      markRead.mutate();
    }
    if (!open) {
      queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
    }
  };

  const notifIcon = (type: string) => {
    if (type === "booking") return <CalendarCheck className="w-4 h-4 text-primary" />;
    if (type === "like") return <Heart className="w-4 h-4 text-rose-500" />;
    return <ShoppingBag className="w-4 h-4 text-primary" />;
  };

  const navigation = user?.role === "super_admin"
    ? [
        { name: "Manage Admins", href: "/manage-admins", icon: Users },
        { name: "Admins", href: "/admins", icon: Shield },
      ]
    : [
        { name: "Sales & Ledger", href: "/", icon: BookOpen },
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { name: "Products", href: "/products", icon: Package },
        { name: "Marketing & Growth", href: "/marketing-growth", icon: Zap },
        { name: "My Store", href: "/my-store", icon: Store },
      ];

  const navDots: Record<string, boolean> = {
    "/dashboard": dashboardHasDot,
  };

  const storeName = store?.name || "Web Media Hub";
  const storeInitial = storeName.charAt(0).toUpperCase();

  const NavLinks = ({ light = false }: { light?: boolean }) => (
    <>
      {navigation.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.href;
        const hasDot = navDots[item.href] ?? false;
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => setIsMobileMenuOpen(false)}
            className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              isActive
                ? light
                  ? "bg-primary/10 text-primary font-semibold"
                  : "bg-sidebar-primary/15 text-sidebar-primary font-semibold ring-1 ring-sidebar-primary/20"
                : light
                  ? "text-foreground/55 hover:text-foreground hover:bg-muted"
                  : "text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            }`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${isActive && !light ? "text-sidebar-primary" : ""}`} />
            <span className="flex-1 truncate">{item.name}</span>
            {hasDot && (
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              </span>
            )}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-r border-sidebar-border" style={{ background: "hsl(var(--sidebar))" }}>
        {/* Brand header */}
        <div className="relative h-[60px] flex items-center gap-3 px-4 border-b border-sidebar-border overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ background: "linear-gradient(135deg, hsl(var(--sidebar-primary)) 0%, transparent 60%)" }} />
          <div className="relative z-10 flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm" style={{ background: "hsl(var(--sidebar-primary) / 0.18)", border: "1px solid hsl(var(--sidebar-primary) / 0.3)", color: "hsl(var(--sidebar-primary))" }}>
              {storeInitial}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm leading-tight truncate" style={{ color: "hsl(var(--sidebar-foreground))" }}>{storeName}</p>
              <p className="text-[10px] uppercase tracking-[0.12em] font-semibold" style={{ color: "hsl(var(--sidebar-foreground) / 0.4)" }}>Store Manager</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          <NavLinks />
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 hover:bg-sidebar-accent"
            style={{ color: "hsl(var(--sidebar-foreground) / 0.55)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--sidebar-foreground))")}
            onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--sidebar-foreground) / 0.55)")}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-[60px] border-b border-border sticky top-0 z-10 flex items-center justify-between px-4" style={{ background: "hsl(var(--card) / 0.85)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
          <div className="flex items-center gap-3">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 border-r border-border" style={{ background: "hsl(var(--card))", color: "hsl(var(--foreground))" }}>
                <div className="h-[60px] flex items-center gap-3 px-4 border-b border-border">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs" style={{ background: "hsl(var(--primary) / 0.12)", border: "1px solid hsl(var(--primary) / 0.25)", color: "hsl(var(--primary))" }}>
                    {storeInitial}
                  </div>
                  <p className="font-bold text-sm truncate" style={{ color: "hsl(var(--foreground))" }}>{storeName}</p>
                </div>
                <nav className="px-2 py-3 space-y-0.5">
                  <NavLinks light />
                </nav>
                <div className="absolute bottom-0 left-0 right-0 px-2 py-3 border-t border-border">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted text-sm h-9"
                    onClick={logout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="md:hidden font-bold text-base truncate">{storeName}</h1>
          </div>

          <div className="flex items-center gap-3">
            {user?.role !== "super_admin" && (
              <DropdownMenu open={notifOpen} onOpenChange={handleNotifOpenChange}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-80 p-0 overflow-hidden"
                  style={{ boxShadow: "var(--shadow-xl)", border: "1px solid hsl(var(--border))" }}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border" style={{ background: "hsl(var(--card))" }}>
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-sm tracking-tight">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-primary-foreground bg-primary">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="max-h-[380px] overflow-y-auto" style={{ background: "hsl(var(--background))" }}>
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
                        <BellOff className="w-8 h-8 opacity-30" />
                        <p className="text-sm">No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 transition-colors ${
                            !n.read ? "bg-primary/5" : "bg-transparent"
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            !n.read ? "bg-primary/10" : "bg-muted"
                          }`}>
                            {notifIcon(n.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                                !n.read ? "text-primary" : "text-muted-foreground"
                              }`}>
                                {n.type.replace(/_/g, " ")}
                              </span>
                              {!n.read && (
                                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                              )}
                            </div>
                            <p className={`text-sm leading-snug ${!n.read ? "font-medium text-foreground" : "text-foreground/70"}`}>
                              {n.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(n.createdAt).toLocaleDateString("en-IN", {
                                day: "numeric", month: "short", year: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <div className="hidden sm:flex items-center gap-3 border-l border-border pl-3">
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold leading-tight">{(user as any)?.storeName || user?.username}</span>
                <span className="text-[11px] text-muted-foreground capitalize">{user?.role?.replace("_", " ")}</span>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "hsl(var(--primary) / 0.12)", color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.2)" }}>
                {((user as any)?.storeName || user?.username || "U").charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
