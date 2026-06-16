import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  Package,
  Tags,
  Store,
  Video,
  Users,
  Shield,
  Bell,
  Menu,
  LogOut,
  CalendarCheck,
  ShoppingBag,
  Heart,
  BellOff,
  SendHorizonal,
  BookOpen,
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
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListNotifications,
  useMarkNotificationsRead,
  useGetStore,
  getListNotificationsQueryKey,
} from "@workspace/api-client-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const queryClient = useQueryClient();
  const [notifOpen, setNotifOpen] = useState(false);

  const { data: store } = useGetStore({ query: { retry: false } });
  const { data: notifications = [] } = useListNotifications();
  const markRead = useMarkNotificationsRead();

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
        { name: "Sales Ledger", href: "/sales-ledger", icon: BookOpen },
        { name: "Products", href: "/products", icon: Package },
        { name: "Dashboard", href: "/", icon: LayoutDashboard },
        { name: "AI Promotional Video", href: "/ai-video", icon: Video },
        { name: "My Store", href: "/my-store", icon: Store },
      ];

  const handleMarkRead = () => {
    if (unreadCount > 0) {
      markRead.mutate();
    }
  };

  const NavLinks = ({ light = false }: { light?: boolean }) => (
    <>
      {navigation.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => setIsMobileMenuOpen(false)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors text-sm ${
              isActive
                ? light
                  ? "bg-primary/10 text-primary font-semibold"
                  : "bg-primary text-primary-foreground font-medium"
                : light
                  ? "text-foreground/60 hover:text-foreground hover:bg-muted"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.name}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border h-screen sticky top-0">
        <div className="p-4 border-b border-sidebar-border h-16 flex items-center">
          <h1 className="font-bold text-lg text-sidebar-foreground truncate">
            {store?.name || "Web Media Hub"}
          </h1>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <NavLinks />
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={logout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-52 p-0 bg-background border-r border-border shadow-xl">
                <div className="px-4 py-4 border-b border-border flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  <h1 className="font-semibold text-sm text-foreground truncate">
                    {store?.name || "Web Media Hub"}
                  </h1>
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
            <h1 className="md:hidden font-bold text-lg truncate">
              {store?.name || "Web Media Hub"}
            </h1>
          </div>

          <div className="flex items-center gap-4">
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
                style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.18)", border: "1px solid hsl(var(--border))" }}
              >
                {/* Header */}
                <div
                  className="flex items-center justify-between px-4 py-3 border-b border-border"
                  style={{ background: "hsl(var(--card))" }}
                >
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-sm tracking-wide">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-primary-foreground bg-primary">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </div>

                {/* Notification list */}
                <div className="max-h-[380px] overflow-y-auto" style={{ background: "hsl(var(--background))" }}>
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
                      <BellOff className="w-8 h-8 opacity-30" />
                      <p className="text-sm">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((n, i) => (
                      <div
                        key={n.id}
                        className={`flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 transition-colors ${
                          !n.read ? "bg-primary/5" : "bg-transparent"
                        }`}
                      >
                        {/* Type icon */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          !n.read ? "bg-primary/10" : "bg-muted"
                        }`}>
                          {notifIcon(n.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`text-xs font-semibold uppercase tracking-wider ${
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
            
            <div className="hidden sm:flex items-center gap-2 border-l border-border pl-4">
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium">{(user as any)?.storeName || user?.username}</span>
                <span className="text-xs text-muted-foreground capitalize">{user?.role.replace("_", " ")}</span>
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
