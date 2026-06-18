import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Package, BookOpen, Video, Store,
  Lock, X, Menu, Eye, Plus, Edit2, Trash2,
  ArrowUpRight, ArrowDownRight, Users, ShoppingBag,
  ChevronRight, AlertTriangle, Tag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ── Demo Data ────────────────────────────────────────────────────────────────

const DEMO_STORE_NAME = "Sharma Boutique";

const DEMO_PRODUCTS = [
  { id: 1, name: "Silk Banarasi Saree", category: "Sarees", price: 4500, mrp: 6000, stock: 8, color: "#F5E6D3", likes: 47, tryOnLikes: 23 },
  { id: 2, name: "Embroidered Lehenga Choli", category: "Lehengas", price: 8200, mrp: 11000, stock: 5, color: "#E8D0DC", likes: 89, tryOnLikes: 56 },
  { id: 3, name: "Cotton Anarkali Suit", category: "Suits", price: 2100, mrp: 2800, stock: 14, color: "#D0D8E8", likes: 34, tryOnLikes: 18 },
  { id: 4, name: "Chikankari Kurta", category: "Kurtas", price: 1800, mrp: 2400, stock: 20, color: "#E8E0D0", likes: 28, tryOnLikes: 12 },
  { id: 5, name: "Bridal Sharara Set", category: "Lehengas", price: 12500, mrp: 16000, stock: 3, color: "#F5D5D5", likes: 112, tryOnLikes: 74 },
  { id: 6, name: "Party Wear Gown", category: "Gowns", price: 6800, mrp: 9000, stock: 7, color: "#D5D5F5", likes: 65, tryOnLikes: 41 },
  { id: 7, name: "Casual Palazzo Set", category: "Suits", price: 1450, mrp: 1900, stock: 18, color: "#D5E8D5", likes: 19, tryOnLikes: 9 },
  { id: 8, name: "Designer Dupatta", category: "Accessories", price: 950, mrp: 1400, stock: 30, color: "#E8D5C4", likes: 22, tryOnLikes: 8 },
];

const DEMO_CATEGORIES = [
  { id: 1, name: "Sarees", productCount: 12, color: "#E8A87C" },
  { id: 2, name: "Lehengas", productCount: 8, color: "#C77DAF" },
  { id: 3, name: "Kurtas", productCount: 15, color: "#7B9ED9" },
  { id: 4, name: "Suits", productCount: 7, color: "#F0C060" },
  { id: 5, name: "Gowns", productCount: 5, color: "#7BD9A8" },
  { id: 6, name: "Accessories", productCount: 10, color: "#D97B7B" },
];

const DEMO_BOOKINGS = [
  { id: "BK001", customer: "Priya Sharma", product: "Bridal Sharara Set", amount: 12500, date: "18 Jun 2026", status: "Confirmed" },
  { id: "BK002", customer: "Ananya Mehta", product: "Silk Banarasi Saree", amount: 4500, date: "17 Jun 2026", status: "Delivered" },
  { id: "BK003", customer: "Sneha Patel", product: "Embroidered Lehenga Choli", amount: 8200, date: "17 Jun 2026", status: "Confirmed" },
  { id: "BK004", customer: "Kavya Reddy", product: "Party Wear Gown", amount: 6800, date: "16 Jun 2026", status: "Pending" },
  { id: "BK005", customer: "Ritu Agarwal", product: "Chikankari Kurta", amount: 1800, date: "15 Jun 2026", status: "Delivered" },
];

const DEMO_LEDGER = [
  { id: 1, date: "18 Jun 2026", description: "Bridal Sharara Sale — Priya Sharma", type: "income" as const, amount: 12500, category: "Sales" },
  { id: 2, date: "17 Jun 2026", description: "Stock Purchase — New Arrival Sarees", type: "expense" as const, amount: 25000, category: "Stock" },
  { id: 3, date: "17 Jun 2026", description: "Silk Banarasi Saree Sale", type: "income" as const, amount: 4500, category: "Sales" },
  { id: 4, date: "16 Jun 2026", description: "Lehenga Choli Sale — Ananya Mehta", type: "income" as const, amount: 8200, category: "Sales" },
  { id: 5, date: "15 Jun 2026", description: "Shop Rent — June 2026", type: "expense" as const, amount: 8000, category: "Rent" },
  { id: 6, date: "14 Jun 2026", description: "Bulk Kurta Order — 5 pcs", type: "income" as const, amount: 9000, category: "Sales" },
  { id: 7, date: "13 Jun 2026", description: "Staff Salary — June 2026", type: "expense" as const, amount: 12000, category: "Staff" },
  { id: 8, date: "12 Jun 2026", description: "Party Wear Gown Sale", type: "income" as const, amount: 6800, category: "Sales" },
  { id: 9, date: "11 Jun 2026", description: "Packaging Material Purchase", type: "expense" as const, amount: 2500, category: "Supplies" },
  { id: 10, date: "10 Jun 2026", description: "Anarkali Suit Sale — 2 pcs", type: "income" as const, amount: 4200, category: "Sales" },
  { id: 11, date: "09 Jun 2026", description: "Electricity Bill", type: "expense" as const, amount: 3200, category: "Utilities" },
  { id: 12, date: "08 Jun 2026", description: "Designer Dupatta Sale — 3 pcs", type: "income" as const, amount: 2850, category: "Sales" },
];

type PageKey = "dashboard" | "products" | "sales-ledger" | "ai-video" | "my-store";

const NAV_ITEMS: { key: PageKey; label: string; icon: React.ElementType; locked?: boolean }[] = [
  { key: "sales-ledger", label: "Sales Ledger", icon: BookOpen },
  { key: "products", label: "Products", icon: Package },
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "ai-video", label: "AI Promotional Video", icon: Video, locked: true },
  { key: "my-store", label: "My Store", icon: Store, locked: true },
];

// ── Block Popup ──────────────────────────────────────────────────────────────

function BlockPopup({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.88, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.88, opacity: 0, y: 16 }}
        transition={{ type: "spring", damping: 22, stiffness: 260 }}
        className="bg-white rounded-2xl p-7 max-w-sm w-full shadow-2xl text-center space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
          style={{ background: "linear-gradient(135deg,#f3ebff,#e8d5ff)" }}
        >
          <Lock className="w-8 h-8" style={{ color: "#7B4FA6" }} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Demo Store</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            This is a demo store for exploring, create your own for your data 🙏
          </p>
        </div>
        <div className="flex gap-3 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Close
          </Button>
          <Link href="/create-store">
            <Button className="flex-1 text-white" style={{ background: "#7B4FA6" }}>
              Create My Store
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────

function DemoDashboard({ onBlock }: { onBlock: () => void }) {
  const totalIncome = DEMO_LEDGER.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6 max-w-4xl pb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of store performance</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Products", value: "47", icon: Package, color: "#7B4FA6", bg: "#F3EBFF" },
          { label: "Total Bookings", value: "128", icon: ShoppingBag, color: "#2563EB", bg: "#EFF6FF" },
          { label: "Today Visitors", value: "23", icon: Eye, color: "#16A34A", bg: "#F0FDF4" },
          { label: "Total Visitors", value: "1,847", icon: Users, color: "#DC2626", bg: "#FEF2F2" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-medium text-muted-foreground leading-tight">{label}</p>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: bg }}>
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                </div>
              </div>
              <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue + Visitors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-semibold mb-3">Monthly Revenue</p>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-green-600">₹{totalIncome.toLocaleString("en-IN")}</p>
                <p className="text-xs text-muted-foreground mt-1">This month</p>
              </div>
              <div className="flex items-center gap-1 text-green-600 text-sm font-semibold mb-1">
                <ArrowUpRight className="w-4 h-4" />
                +24.2%
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-semibold mb-3">Monthly Visitors</p>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold" style={{ color: "#7B4FA6" }}>342</p>
                <p className="text-xs text-muted-foreground mt-1">This month</p>
              </div>
              <div className="flex items-center gap-1 text-green-600 text-sm font-semibold mb-1">
                <ArrowUpRight className="w-4 h-4" />
                +18.5%
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Chart */}
      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-semibold mb-4">Products by Category</p>
          <div className="space-y-3">
            {DEMO_CATEGORIES.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cat.color }} />
                <p className="text-sm text-muted-foreground w-20 shrink-0">{cat.name}</p>
                <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${(cat.productCount / 15) * 100}%`, background: cat.color }}
                  />
                </div>
                <p className="text-sm font-bold w-5 text-right shrink-0">{cat.productCount}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Bookings */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold">Recent Bookings</p>
            <Badge variant="secondary">{DEMO_BOOKINGS.length} total</Badge>
          </div>
          <div className="divide-y">
            {DEMO_BOOKINGS.map((b) => (
              <div key={b.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{b.customer}</p>
                  <p className="text-xs text-muted-foreground truncate">{b.product} · {b.date}</p>
                </div>
                <div className="shrink-0 text-right ml-3">
                  <p className="text-sm font-bold text-green-600">₹{b.amount.toLocaleString("en-IN")}</p>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      b.status === "Delivered" ? "bg-green-100 text-green-700" :
                      b.status === "Confirmed" ? "bg-blue-100 text-blue-700" :
                      "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {b.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Products ─────────────────────────────────────────────────────────────────

function DemoProducts({ onBlock }: { onBlock: () => void }) {
  return (
    <div className="space-y-6 max-w-4xl pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground text-sm mt-1">Your clothing collection ({DEMO_PRODUCTS.length} items)</p>
        </div>
        <Button
          className="gap-2 text-white"
          style={{ background: "#7B4FA6" }}
          onClick={onBlock}
        >
          <Plus className="w-4 h-4" /> Add Product
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {DEMO_PRODUCTS.map((product) => (
          <Card key={product.id} className="overflow-hidden group">
            <div
              className="h-44 flex flex-col items-center justify-center relative"
              style={{ background: product.color }}
            >
              <span className="text-5xl mb-1 select-none">👗</span>
              <Badge variant="secondary" className="text-[10px]">{product.category}</Badge>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={onBlock}
                  className="w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center"
                >
                  <Edit2 className="w-3 h-3 text-gray-600" />
                </button>
                <button
                  onClick={onBlock}
                  className="w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center"
                >
                  <Trash2 className="w-3 h-3 text-red-500" />
                </button>
              </div>
            </div>
            <CardContent className="p-3">
              <p className="font-semibold text-sm leading-tight mb-0.5">{product.name}</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <p className="font-bold" style={{ color: "#7B4FA6" }}>₹{product.price.toLocaleString("en-IN")}</p>
                <p className="text-xs text-muted-foreground line-through">₹{product.mrp.toLocaleString("en-IN")}</p>
              </div>
              <div className="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
                <span>Stock: <strong>{product.stock}</strong></span>
                <span>❤️ {product.likes}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Sales Ledger ─────────────────────────────────────────────────────────────

function DemoSalesLedger({ onBlock }: { onBlock: () => void }) {
  const totalIncome = DEMO_LEDGER.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
  const totalExpense = DEMO_LEDGER.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);
  const netProfit = totalIncome - totalExpense;

  return (
    <div className="space-y-6 max-w-3xl pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales Ledger</h1>
          <p className="text-muted-foreground text-sm mt-1">Track income and expenses</p>
        </div>
        <Button
          className="gap-2 text-white"
          style={{ background: "#7B4FA6" }}
          onClick={onBlock}
        >
          <Plus className="w-4 h-4" /> Add Entry
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4 text-center">
            <p className="text-[11px] font-medium text-muted-foreground mb-1">Total Income</p>
            <p className="text-xl font-bold text-green-600">₹{totalIncome.toLocaleString("en-IN")}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-4 text-center">
            <p className="text-[11px] font-medium text-muted-foreground mb-1">Total Expense</p>
            <p className="text-xl font-bold text-red-600">₹{totalExpense.toLocaleString("en-IN")}</p>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="p-4 text-center">
            <p className="text-[11px] font-medium text-muted-foreground mb-1">Net Profit</p>
            <p className={`text-xl font-bold ${netProfit >= 0 ? "text-purple-700" : "text-red-600"}`}>
              ₹{Math.abs(netProfit).toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Entries */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {DEMO_LEDGER.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-3.5 group hover:bg-muted/30 transition-colors">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    entry.type === "income" ? "bg-green-100" : "bg-red-100"
                  }`}
                >
                  {entry.type === "income"
                    ? <ArrowUpRight className="w-4 h-4 text-green-600" />
                    : <ArrowDownRight className="w-4 h-4 text-red-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.description}</p>
                  <p className="text-xs text-muted-foreground">{entry.category} · {entry.date}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-sm font-bold ${entry.type === "income" ? "text-green-600" : "text-red-600"}`}>
                    {entry.type === "income" ? "+" : "−"}₹{entry.amount.toLocaleString("en-IN")}
                  </p>
                  <button
                    onClick={onBlock}
                    className="text-[10px] text-muted-foreground/50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Locked Page ───────────────────────────────────────────────────────────────

function LockedPage({ title, icon: Icon }: { title: string; icon: React.ElementType }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] text-center space-y-5 px-4">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
          <Icon className="w-11 h-11 text-muted-foreground/40" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-amber-100 border-2 border-white flex items-center justify-center">
          <Lock className="w-4 h-4 text-amber-600" />
        </div>
      </div>
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-muted-foreground text-sm mt-2 max-w-xs leading-relaxed">
          This page is locked in the demo store.<br />
          Create your own store to access all features.
        </p>
      </div>
      <Link href="/create-store">
        <Button className="gap-2 text-white mt-2" style={{ background: "#7B4FA6" }}>
          Create My Store <ChevronRight className="w-4 h-4" />
        </Button>
      </Link>
    </div>
  );
}

// ── Sidebar Nav Content ───────────────────────────────────────────────────────

function NavContent({
  activePage,
  onNavigate,
}: {
  activePage: PageKey;
  onNavigate: (key: PageKey) => void;
}) {
  return (
    <>
      <div className="px-4 py-5 border-b border-white/10 shrink-0">
        <p className="font-bold text-sm text-white leading-tight">{DEMO_STORE_NAME}</p>
        <p className="text-[10px] text-white/40 mt-0.5 uppercase tracking-wider">Demo Store</p>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ key, label, icon: Icon, locked }) => {
          const isActive = activePage === key;
          return (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                isActive
                  ? "bg-white/15 text-white"
                  : "text-white/55 hover:text-white hover:bg-white/8"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 truncate">{label}</span>
              {locked && <Lock className="w-3 h-3 shrink-0 text-amber-400/70" />}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10 shrink-0">
        <Link href="/login">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/8 transition-all">
            <X className="w-4 h-4 shrink-0" />
            Exit Demo
          </button>
        </Link>
      </div>
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function DemoStore() {
  const [activePage, setActivePage] = useState<PageKey>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showBlockPopup, setShowBlockPopup] = useState(false);

  const handleBlock = () => setShowBlockPopup(true);

  const handleNavigate = (key: PageKey) => {
    setActivePage(key);
    setMobileMenuOpen(false);
  };

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":    return <DemoDashboard onBlock={handleBlock} />;
      case "products":     return <DemoProducts onBlock={handleBlock} />;
      case "sales-ledger": return <DemoSalesLedger onBlock={handleBlock} />;
      case "ai-video":     return <LockedPage title="AI Promotional Video" icon={Video} />;
      case "my-store":     return <LockedPage title="My Store" icon={Store} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 bg-[#1C1C2E]">
        <NavContent activePage={activePage} onNavigate={handleNavigate} />
      </aside>

      {/* ── Mobile Sidebar Overlay ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              key="drawer"
              initial={{ x: -224 }} animate={{ x: 0 }} exit={{ x: -224 }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
              className="fixed left-0 top-0 bottom-0 w-56 bg-[#1C1C2E] z-50 flex flex-col lg:hidden"
            >
              <NavContent activePage={activePage} onNavigate={handleNavigate} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Demo Banner */}
        <div
          className="shrink-0 flex items-center gap-2 px-4 py-2 border-b"
          style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800 font-medium flex-1 leading-relaxed truncate">
            <strong>Demo Store Only</strong> — This is only a demo store, no information will be changed here 🙏
          </p>
          <Link href="/create-store">
            <button
              className="text-xs font-bold whitespace-nowrap flex items-center gap-0.5 shrink-0"
              style={{ color: "#7B4FA6" }}
            >
              Create Your Store <ChevronRight className="w-3 h-3" />
            </button>
          </Link>
        </div>

        {/* Topbar */}
        <header className="shrink-0 flex items-center gap-3 px-4 py-3 border-b bg-background">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{DEMO_STORE_NAME}</p>
            <p className="text-xs text-muted-foreground">Demo Store</p>
          </div>
          <Badge
            className="text-xs shrink-0"
            style={{ background: "#F3EBFF", color: "#7B4FA6", border: "1px solid #D4ADFF" }}
          >
            Demo Mode
          </Badge>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {renderPage()}
        </main>
      </div>

      {/* Block Popup */}
      <AnimatePresence>
        {showBlockPopup && <BlockPopup onClose={() => setShowBlockPopup(false)} />}
      </AnimatePresence>
    </div>
  );
}
