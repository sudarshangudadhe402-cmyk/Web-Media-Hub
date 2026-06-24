import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useListStoreRequests } from "@workspace/api-client-react";
import {
  LogOut,
  Menu,
  Shield,
  Users,
  ShieldCheck,
  FileText,
  TrendingUp,
  Tag,
  BarChart2,
} from "lucide-react";

const SA_MANAGE_SEEN_KEY = "wmh_sa_manage_seen_at";

const navItems = [
  { path: "/manage-admins", name: "Manage Admins", icon: Shield },
  { path: "/admins", name: "Admin History", icon: Users },
  { path: "/pricing-config", name: "Pricing Plans", icon: Tag },
  { path: "/revenue", name: "Revenue & Growth", icon: TrendingUp },
  { path: "/marketing", name: "Growth & Marketing Analytics", icon: BarChart2 },
  { path: "/legal-log", name: "Legal Agreements Log", icon: FileText },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [manageSeenAt, setManageSeenAt] = useState<string | null>(() =>
    localStorage.getItem(SA_MANAGE_SEEN_KEY)
  );

  const { data: allRequests = [] } = useListStoreRequests({
    query: { refetchInterval: 30_000 },
  });
  const pendingRequests = allRequests.filter((r) => r.status === "pending");

  const manageAdminsHasDot =
    pendingRequests.length > 0 &&
    (!manageSeenAt ||
      pendingRequests.some(
        (r) => new Date(r.createdAt) > new Date(manageSeenAt!)
      ));

  useEffect(() => {
    const onManagePage =
      location === "/manage-admins" || location.startsWith("/manage-admins/");
    if (onManagePage) {
      const now = new Date().toISOString();
      localStorage.setItem(SA_MANAGE_SEEN_KEY, now);
      setManageSeenAt(now);
    }
  }, [location]);

  const dotMap: Record<string, boolean> = {
    "/manage-admins": manageAdminsHasDot,
  };

  function NavLinks({ light = false }: { light?: boolean }) {
    return (
      <>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            location === item.path || location.startsWith(item.path + "/");
          const hasDot = dotMap[item.path] ?? false;
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? light
                    ? "bg-primary/10 text-primary font-semibold"
                    : "bg-primary text-primary-foreground font-medium"
                  : light
                    ? "text-foreground/60 hover:text-foreground hover:bg-muted"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.name}</span>
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
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border h-screen sticky top-0">
        <div className="p-4 border-b border-sidebar-border h-16 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-sidebar-foreground/60 shrink-0" />
          <h1 className="font-bold text-base text-sidebar-foreground truncate">
            Mr_Sid_55
          </h1>
        </div>
        <div className="px-4 py-3 border-b border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/40 uppercase tracking-widest font-semibold mb-0.5">Logged in as</p>
          <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.username}</p>
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
                  <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                  <h1 className="font-semibold text-sm text-foreground truncate">Mr_Sid_55</h1>
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
            <h1 className="md:hidden font-bold text-lg truncate">Mr_Sid_55</h1>
          </div>

          <div className="hidden sm:flex items-center gap-2 border-l border-border pl-4">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium">{user?.username}</span>
              <span className="text-xs text-muted-foreground">Mr_Sid_55</span>
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
