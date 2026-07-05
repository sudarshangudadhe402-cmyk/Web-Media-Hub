import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LogOut,
  Menu,
  Users,
  ShieldCheck,
  FileText,
  TrendingUp,
  Tag,
  BarChart2,
} from "lucide-react";

const navItems = [
  { path: "/admins", name: "Admins list", icon: Users },
  { path: "/pricing-config", name: "Pricing Plans", icon: Tag },
  { path: "/revenue", name: "Revenue & Growth", icon: TrendingUp },
  { path: "/marketing", name: "Growth & Marketing", icon: BarChart2 },
  { path: "/legal-log", name: "Legal Agreements", icon: FileText },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  function NavLinks({ light = false }: { light?: boolean }) {
    return (
      <>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            location === item.path || location.startsWith(item.path + "/");
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                active
                  ? light
                    ? "bg-primary/10 text-primary font-semibold"
                    : "bg-sidebar-primary/15 text-sidebar-primary font-semibold ring-1 ring-sidebar-primary/20"
                  : light
                    ? "text-foreground/55 hover:text-foreground hover:bg-muted"
                    : "text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 transition-transform duration-150 ${active && !light ? "text-sidebar-primary" : ""}`} />
              <span className="flex-1 truncate">{item.name}</span>
            </Link>
          );
        })}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-r border-sidebar-border" style={{ background: "hsl(var(--sidebar))" }}>
        {/* Brand header */}
        <div className="relative h-[60px] flex items-center gap-3 px-4 border-b border-sidebar-border overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ background: "linear-gradient(135deg, hsl(var(--sidebar-primary)) 0%, transparent 60%)" }} />
          <div className="relative z-10 flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsl(var(--sidebar-primary) / 0.18)", border: "1px solid hsl(var(--sidebar-primary) / 0.3)" }}>
              <ShieldCheck className="w-4 h-4" style={{ color: "hsl(var(--sidebar-primary))" }} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm leading-tight truncate" style={{ color: "hsl(var(--sidebar-foreground))" }}>Mr_Sid_55</p>
              <p className="text-[10px] uppercase tracking-[0.12em] font-semibold" style={{ color: "hsl(var(--sidebar-foreground) / 0.4)" }}>Super Admin</p>
            </div>
          </div>
        </div>

        {/* User info */}
        <div className="px-4 py-2.5 border-b" style={{ borderColor: "hsl(var(--sidebar-border))", background: "hsl(var(--sidebar-accent) / 0.4)" }}>
          <p className="text-[10px] uppercase tracking-[0.12em] font-semibold mb-0.5" style={{ color: "hsl(var(--sidebar-foreground) / 0.38)" }}>Logged in as</p>
          <p className="text-sm font-medium truncate" style={{ color: "hsl(var(--sidebar-foreground))" }}>{user?.username}</p>
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
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsl(var(--primary) / 0.12)", border: "1px solid hsl(var(--primary) / 0.25)" }}>
                    <ShieldCheck className="w-3.5 h-3.5" style={{ color: "hsl(var(--primary))" }} />
                  </div>
                  <p className="font-bold text-sm truncate" style={{ color: "hsl(var(--foreground))" }}>Mr_Sid_55</p>
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
            <h1 className="md:hidden font-bold text-base truncate">Mr_Sid_55</h1>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-sm font-semibold leading-tight">{user?.username}</span>
              <span className="text-[11px] text-muted-foreground">Super Admin Portal</span>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "hsl(var(--primary) / 0.12)", color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.2)" }}>
              {user?.username?.charAt(0)?.toUpperCase() || "S"}
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
