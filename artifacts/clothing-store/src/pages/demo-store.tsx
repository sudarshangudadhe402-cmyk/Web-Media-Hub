import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Package, BookOpen, Video, Store,
  Lock, X, Menu, ChevronRight, AlertTriangle,
  CreditCard, CalendarCheck, ChevronLeft, ShoppingBag,
  MessageCircle, Heart, TrendingDown, Tags, Plus,
  Search, CheckCircle2, BookMarked, CheckCheck,
  TrendingUp, CheckCircle, Clock, Users,
  Download, Printer, BookOpen as BookOpenIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

// ── Types ────────────────────────────────────────────────────────────────────
type PageKey = "dashboard" | "products" | "sales-ledger" | "ai-video" | "my-store";
type DashView = "summary" | "bookings" | "detail";

// ── Demo Data ────────────────────────────────────────────────────────────────

const DEMO_SUMMARY = {
  storeName: "Sharma Boutique",
  totalProducts: 47,
  activeBookings: 5,
  unseenBookings: 2,
  categoryCounts: { Top: 15, Bottom: 7, "Full Outfit": 12, Functional: 13 },
  visitors: { today: 23, month: 342, all: 1847 },
};

const DEMO_BOOKINGS = [
  {
    id: "bk1", productName: "Silk Banarasi Saree",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80",
    customerName: "Priya Sharma", customerPhone: "9876543210",
    customerAddress: "14, Rose Garden, Lucknow, UP",
    selectedSize: "M", loyaltyCardApplied: false, seenByAdmin: false,
    createdAt: "2026-06-18T09:15:00Z", discountPrice: 4500, actualPrice: 6000,
    productType: "Top", functionCategory: "Sarees",
  },
  {
    id: "bk2", productName: "Bridal Sharara Set",
    image: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&q=80",
    customerName: "Ananya Mehta", customerPhone: "8765432109",
    customerAddress: "7, Shanti Nagar, Jaipur, RJ",
    selectedSize: "L", loyaltyCardApplied: false, seenByAdmin: true,
    createdAt: "2026-06-17T14:30:00Z", discountPrice: 12500, actualPrice: 16000,
    productType: "Full Outfit", functionCategory: "Lehengas",
  },
  {
    id: "bk3", productName: "Embroidered Lehenga Choli",
    image: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400&q=80",
    customerName: "Kavya Reddy", customerPhone: "7654321098",
    customerAddress: "22, MG Road, Hyderabad, TS",
    selectedSize: "XL", loyaltyCardApplied: true, seenByAdmin: true,
    createdAt: "2026-06-17T11:00:00Z", discountPrice: 8200, actualPrice: 11000,
    productType: "Full Outfit", functionCategory: "Lehengas",
  },
  {
    id: "bk4", productName: "Party Wear Gown",
    image: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=400&q=80",
    customerName: "Sneha Patel", customerPhone: "6543210987",
    customerAddress: "9, Navrangpura, Ahmedabad, GJ",
    selectedSize: "M", loyaltyCardApplied: false, seenByAdmin: true,
    createdAt: "2026-06-16T16:45:00Z", discountPrice: 6800, actualPrice: 9000,
    productType: "Full Outfit", functionCategory: "Gowns",
  },
  {
    id: "bk5", productName: "Cotton Anarkali Suit",
    image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400&q=80",
    customerName: "Ritu Agarwal", customerPhone: "5432109876",
    customerAddress: "3, Civil Lines, Delhi, DL",
    selectedSize: "S", loyaltyCardApplied: false, seenByAdmin: true,
    createdAt: "2026-06-15T10:20:00Z", discountPrice: 2100, actualPrice: 2800,
    productType: "Full Outfit", functionCategory: "Suits",
  },
];

const DEMO_PRODUCTS = [
  { id: "p1", name: "Silk Banarasi Saree", functionCategory: "Sarees", productType: "Top", discountPrice: 4500, actualPrice: 6000, sizes: ["S", "M", "L", "XL"], gender: "Women", age: "", likeCount: 47, tryOnLikeCount: 23, image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80" },
  { id: "p2", name: "Bridal Sharara Set", functionCategory: "Lehengas", productType: "Full Outfit", discountPrice: 12500, actualPrice: 16000, sizes: ["S", "M", "L"], gender: "Women", age: "", likeCount: 112, tryOnLikeCount: 74, image: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&q=80" },
  { id: "p3", name: "Cotton Anarkali Suit", functionCategory: "Suits", productType: "Full Outfit", discountPrice: 2100, actualPrice: 2800, sizes: ["S", "M", "L", "XL", "XXL"], gender: "Women", age: "", likeCount: 34, tryOnLikeCount: 18, image: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400&q=80" },
  { id: "p4", name: "Chikankari Kurta", functionCategory: "Kurtas", productType: "Top", discountPrice: 1800, actualPrice: 2400, sizes: ["S", "M", "L", "XL"], gender: "Women", age: "", likeCount: 28, tryOnLikeCount: 12, image: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=400&q=80" },
  { id: "p5", name: "Embroidered Lehenga Choli", functionCategory: "Lehengas", productType: "Full Outfit", discountPrice: 8200, actualPrice: 11000, sizes: ["S", "M", "L"], gender: "Women", age: "", likeCount: 89, tryOnLikeCount: 56, image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400&q=80" },
  { id: "p6", name: "Party Wear Gown", functionCategory: "Gowns", productType: "Full Outfit", discountPrice: 6800, actualPrice: 9000, sizes: ["S", "M", "L", "XL"], gender: "Women", age: "", likeCount: 65, tryOnLikeCount: 41, image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&q=80" },
  { id: "p7", name: "Casual Palazzo Set", functionCategory: "Suits", productType: "Bottom", discountPrice: 1450, actualPrice: 1900, sizes: ["S", "M", "L", "XL", "XXL", "XXXL"], gender: "Women", age: "", likeCount: 19, tryOnLikeCount: 9, image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&q=80" },
  { id: "p8", name: "Designer Dupatta", functionCategory: "Accessories", productType: "Top", discountPrice: 950, actualPrice: 1400, sizes: ["Free Size"], gender: "Women", age: "", likeCount: 22, tryOnLikeCount: 8, image: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=400&q=80" },
];

const DEMO_LEDGER_ROWS = [
  { id: "l1", srNo: 1, date: "2026-06-18", customerName: "Priya Sharma", productCost: 12500, paymentStatus: "Paid" as const },
  { id: "l2", srNo: 2, date: "2026-06-17", customerName: "Ananya Mehta", productCost: 4500, paymentStatus: "Paid" as const },
  { id: "l3", srNo: 3, date: "2026-06-17", customerName: "Kavya Reddy", productCost: 8200, paymentStatus: "Paid" as const },
  { id: "l4", srNo: 4, date: "2026-06-16", customerName: "Sneha Singh", productCost: 6800, paymentStatus: "Pending" as const },
  { id: "l5", srNo: 5, date: "2026-06-15", customerName: "Ritu Agarwal", productCost: 1800, paymentStatus: "Paid" as const },
  { id: "l6", srNo: 6, date: "2026-06-14", customerName: "Meera Patel", productCost: 9000, paymentStatus: "Paid" as const },
  { id: "l7", srNo: 7, date: "2026-06-13", customerName: "Divya Sharma", productCost: 2100, paymentStatus: "Pending" as const },
  { id: "l8", srNo: 8, date: "2026-06-12", customerName: "Pooja Mehta", productCost: 4200, paymentStatus: "Paid" as const },
  { id: "l9", srNo: 9, date: "2026-06-11", customerName: "Sita Reddy", productCost: 2850, paymentStatus: "Paid" as const },
  { id: "l10", srNo: 10, date: "2026-06-10", customerName: "Lakshmi Iyer", productCost: 3600, paymentStatus: "Pending" as const },
];

const DEMO_CATEGORIES = ["Sarees", "Lehengas", "Kurtas", "Suits", "Gowns", "Accessories"];

function isoToDisplay(date: string): string {
  const parts = date.split("-");
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatIndian(n: number) {
  return new Intl.NumberFormat("en-IN").format(n);
}

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
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: "linear-gradient(135deg,#f3ebff,#e8d5ff)" }}>
          <Lock className="w-8 h-8" style={{ color: "#7B4FA6" }} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Demo Store</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            This is a demo store for exploring, create your own for your data 🙏
          </p>
        </div>
        <div className="flex gap-3 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
          <Link href="/create-store">
            <Button className="flex-1 text-white" style={{ background: "#7B4FA6" }}>Create My Store</Button>
          </Link>
        </div>
      </motion.div>
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

// ── Dashboard ────────────────────────────────────────────────────────────────

function DemoDashboard({ onBlock }: { onBlock: () => void }) {
  const [dashView, setDashView] = useState<DashView>("summary");
  const [selectedBooking, setSelectedBooking] = useState<typeof DEMO_BOOKINGS[0] | null>(null);
  const [bookingTab, setBookingTab] = useState<"all" | "loyalty" | "completed">("all");

  const visibleBookings = bookingTab === "loyalty"
    ? DEMO_BOOKINGS.filter(b => b.loyaltyCardApplied)
    : bookingTab === "completed" ? []
    : DEMO_BOOKINGS;

  /* ── Booking Detail ── */
  if (dashView === "detail" && selectedBooking) {
    const b = selectedBooking;
    const waText = `Hello ${b.customerName}!\n\nYou have made a booking for the following product:\n\n📦 Product: ${b.productName}\n💰 Price: ₹${b.discountPrice?.toLocaleString()}\n🏷️ Category: ${b.functionCategory}\n\nWould you like to purchase this product? Please reply to confirm your order. 😊`;
    const waLink = `https://wa.me/${b.customerPhone}?text=${encodeURIComponent(waText)}`;

    return (
      <>
        <div className="space-y-4 max-w-lg">
          <div className="flex items-center gap-2">
            <button onClick={() => setDashView("bookings")} className="p-1.5 rounded-full hover:bg-gray-100">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold tracking-tight">Booking Detail</h1>
          </div>
          <Card className="overflow-hidden">
            <div className="h-52 bg-gray-100">
              <img src={b.image} alt={b.productName} className="w-full h-full object-cover object-top" />
            </div>
            <CardContent className="pt-4 space-y-2">
              <h2 className="font-bold text-base leading-snug">{b.productName}</h2>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[11px] bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full font-medium">{b.productType}</span>
                <span className="text-[11px] bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full font-medium">{b.functionCategory}</span>
                <span className="text-[11px] bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full font-medium">Size: {b.selectedSize}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-gray-900">₹{b.discountPrice.toLocaleString()}</span>
                <span className="text-sm text-gray-400 line-through">₹{b.actualPrice.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 text-sm">Customer Details</h3>
                {b.loyaltyCardApplied && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.12)", color: "#16a34a", border: "1px solid rgba(34,197,94,0.3)" }}>🎫 Loyalty Card</span>
                )}
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center gap-3"><span className="text-xs text-gray-400 w-16 shrink-0">Name</span><span className="text-sm font-semibold text-gray-900">{b.customerName}</span></div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-16 shrink-0">Mobile</span>
                  <span className="text-sm font-medium text-gray-900 flex-1">{b.customerPhone}</span>
                  <button onClick={onBlock} className="flex items-center gap-1 bg-[#25D366] text-white text-[11px] font-bold px-3 py-1.5 rounded-full shrink-0">
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </button>
                </div>
                <div className="flex items-start gap-3"><span className="text-xs text-gray-400 w-16 shrink-0">Address</span><span className="text-sm text-gray-700">{b.customerAddress}</span></div>
                <div className="flex items-center gap-3"><span className="text-xs text-gray-400 w-16 shrink-0">Date</span><span className="text-sm text-gray-600">{new Date(b.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span></div>
              </div>
              <div className="bg-[#dcf8c6] rounded-xl p-3 mt-2 border border-green-100">
                <p className="text-[10px] text-green-700 font-bold uppercase tracking-wide mb-1.5">WhatsApp Message Preview</p>
                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{waText}</p>
              </div>
              <button onClick={onBlock} className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white font-bold py-3 rounded-xl text-sm">
                <MessageCircle className="w-4 h-4" /> Send WhatsApp Message
              </button>
            </CardContent>
          </Card>
          <div className="h-20" />
        </div>
        <div className="fixed bottom-0 left-0 right-0 z-30 px-4 py-3 bg-white border-t border-red-100">
          <button onClick={onBlock} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm bg-red-500 text-white">
            <CheckCheck className="w-5 h-5" /> Complete Order
          </button>
        </div>
      </>
    );
  }

  /* ── Booking List ── */
  if (dashView === "bookings") {
    const loyaltyCount = DEMO_BOOKINGS.filter(b => b.loyaltyCardApplied).length;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setDashView("summary")} className="p-1.5 rounded-full hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">Bookings</h1>
        </div>

        <div className="relative rounded-xl p-1 bg-gray-100">
          <div className="absolute top-1 bottom-1 rounded-lg bg-white shadow-sm transition-all" style={{
            width: "calc(33.333% - 4px)",
            left: bookingTab === "all" ? "4px" : bookingTab === "loyalty" ? "calc(33.333%)" : "calc(66.666%)",
            transition: "left 0.3s cubic-bezier(0.4,0,0.2,1)",
          }} />
          <div className="relative flex">
            {([
              { key: "all", label: "All Booking", icon: <BookMarked className="w-3.5 h-3.5" />, count: DEMO_BOOKINGS.length },
              { key: "loyalty", label: "Loyalty Card", icon: <CreditCard className="w-3.5 h-3.5" />, count: loyaltyCount },
              { key: "completed", label: "Complete", icon: <CheckCheck className="w-3.5 h-3.5" />, count: 0 },
            ] as const).map(({ key, label, icon, count }) => (
              <button key={key} onClick={() => setBookingTab(key)}
                className="flex-1 py-2 text-[11px] font-bold z-10 flex flex-col items-center gap-0.5 rounded-lg"
                style={{ color: bookingTab === key ? (key === "completed" ? "#16a34a" : key === "loyalty" ? "#7c3aed" : "#1d4ed8") : "#9ca3af" }}
              >
                {icon}{label}<span className="text-[10px] font-extrabold">({count})</span>
              </button>
            ))}
          </div>
        </div>

        {bookingTab === "completed" ? (
          <Card><CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CheckCheck className="w-12 h-12 mb-4 opacity-20" /><p>No completed orders yet</p>
          </CardContent></Card>
        ) : visibleBookings.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CalendarCheck className="w-12 h-12 mb-4 opacity-20" /><p>No bookings</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {visibleBookings.map((bk) => (
              <div key={bk.id} onClick={() => { setSelectedBooking(bk); setDashView("detail"); }}
                className="bg-white rounded-xl border shadow-sm p-3 flex gap-3 cursor-pointer hover:border-primary/40 active:bg-gray-50 transition-colors"
              >
                <img src={bk.image} className="w-16 h-20 object-cover object-top rounded-lg flex-shrink-0" alt={bk.productName} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm line-clamp-1">{bk.productName}</p>
                  {bk.selectedSize && (
                    <span className="inline-block text-[10px] border border-gray-200 rounded px-1.5 py-0.5 text-gray-500 mt-0.5">Size: {bk.selectedSize}</span>
                  )}
                  <p className="text-xs text-gray-600 mt-1 font-medium">{bk.customerName}</p>
                  <p className="text-xs text-gray-400">{bk.customerPhone}</p>
                  <p className="text-[10px] text-gray-300 mt-1">{new Date(bk.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                  {bk.loyaltyCardApplied && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-1" style={{ background: "rgba(34,197,94,0.12)", color: "#16a34a", border: "1px solid rgba(34,197,94,0.25)" }}>🎫 Loyalty Card</span>
                  )}
                </div>
                <div className="flex-shrink-0 mt-auto pb-0.5 flex flex-col items-center gap-0.5">
                  <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
                    <path d="M1 7L5.5 11.5L13 3" stroke={bk.seenByAdmin ? "#53bdeb" : "#b0b8c1"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M7 7L11.5 11.5L19 3" stroke={bk.seenByAdmin ? "#53bdeb" : "#b0b8c1"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {!bk.seenByAdmin && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ── Summary ── */
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <div className="grid grid-cols-2 gap-3">
        <Card className="cursor-pointer hover:border-primary transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Products</CardTitle>
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-3xl font-extrabold text-gray-900">{DEMO_SUMMARY.totalProducts}</div>
            <div className="grid grid-cols-2 gap-x-2 mt-2">
              {[
                { label: "Top", val: DEMO_SUMMARY.categoryCounts.Top },
                { label: "Bottom", val: DEMO_SUMMARY.categoryCounts.Bottom },
                { label: "Outfit", val: DEMO_SUMMARY.categoryCounts["Full Outfit"] },
                { label: "Func", val: DEMO_SUMMARY.categoryCounts.Functional },
              ].map(({ label, val }) => (
                <div key={label} className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">{label}:</span>
                  <span className="text-[10px] font-bold text-gray-700">{val}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Store Visitors</CardTitle>
            <span className="text-sm">👥</span>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-2">
            {[
              { label: "Today", val: DEMO_SUMMARY.visitors.today, color: "#2874F0", bg: "rgba(40,116,240,0.08)" },
              { label: "This Month", val: DEMO_SUMMARY.visitors.month, color: "#7c3aed", bg: "rgba(124,58,237,0.08)" },
              { label: "All Time", val: DEMO_SUMMARY.visitors.all, color: "#16a34a", bg: "rgba(22,163,74,0.08)" },
            ].map(({ label, val, color, bg }) => (
              <div key={label} className="flex items-center justify-between rounded-lg px-2 py-1" style={{ background: bg }}>
                <span className="text-[11px] font-semibold" style={{ color }}>{label}</span>
                <span className="text-sm font-extrabold" style={{ color }}>{val.toLocaleString("en-IN")}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="cursor-pointer hover:border-primary transition-colors relative overflow-hidden" onClick={() => setDashView("bookings")}>
        <span className="absolute top-2.5 right-2.5 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
        </span>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
          <CalendarCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{DEMO_SUMMARY.activeBookings}</div>
          <p className="text-xs text-rose-500 font-semibold mt-1">{DEMO_SUMMARY.unseenBookings} new bookings</p>
        </CardContent>
      </Card>

      <Card className="cursor-pointer hover:border-green-400 transition-colors border-green-200" onClick={onBlock}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-green-700">Digital Loyalty Card</CardTitle>
          <CreditCard className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Manage loyalty card requests from customers</p>
          <p className="text-xs text-green-600 font-semibold mt-1">Click to manage →</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Products ─────────────────────────────────────────────────────────────────

function DemoProducts({ onBlock }: { onBlock: () => void }) {
  const [filterType, setFilterType] = useState("All");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const products = DEMO_PRODUCTS.filter((p) => {
    const typeMatch = filterType === "All" || p.productType === filterType;
    const catMatch = !filterCategory || p.functionCategory === filterCategory;
    const q = searchQuery.trim().toLowerCase();
    const nameMatch = !q || p.name.toLowerCase().includes(q);
    return typeMatch && catMatch && nameMatch;
  });

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Products</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{products.length} item{products.length !== 1 ? "s" : ""}{filterCategory ? ` · ${filterCategory}` : ""}</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground" onClick={onBlock}>
            <CheckCircle2 className="w-4 h-4" /> Select
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 gap-1.5 border-primary/40 text-primary hover:bg-primary/5" onClick={onBlock}>
            <Tags className="w-4 h-4" /> Add Category
          </Button>
          <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold gap-1.5" onClick={onBlock}>
            <Plus className="w-4 h-4" /> Add Product
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search products by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <button type="button" onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <Tabs value={filterType} onValueChange={(v) => { setFilterType(v); setFilterCategory(null); }}>
        <TabsList>
          <TabsTrigger value="All">All</TabsTrigger>
          {["Top", "Bottom", "Full Outfit"].map((t) => <TabsTrigger key={t} value={t}>{t}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
        {DEMO_CATEGORIES.map((cat) => {
          const active = filterCategory === cat;
          return (
            <button key={cat} onClick={() => setFilterCategory(active ? null : cat)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${active ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-300 hover:border-purple-400"}`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-[2px] bg-gray-200">
        {products.map((product) => {
          const discount = product.actualPrice > product.discountPrice
            ? Math.round(((product.actualPrice - product.discountPrice) / product.actualPrice) * 100)
            : 0;
          return (
            <div key={product.id} className="bg-white cursor-pointer active:opacity-90" onClick={onBlock}>
              <div className="aspect-[3/4] bg-gray-100 relative overflow-hidden">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover object-top" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent pt-6 pb-1.5 px-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Heart className="w-3 h-3 fill-red-400 text-red-400" />
                      <span className="text-white text-[11px] font-semibold">{product.likeCount.toLocaleString("en-IN")}</span>
                      <span className="text-white/70 text-[10px]">likes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px]">🪞</span>
                      <span className="text-white text-[11px] font-semibold">{product.tryOnLikeCount.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-2 pb-3 space-y-0.5">
                {product.functionCategory && (
                  <p className="text-[11px] font-bold text-purple-600 leading-tight uppercase tracking-wide truncate">{product.functionCategory}</p>
                )}
                <p className="text-[12px] text-gray-700 leading-tight line-clamp-2">{product.name}</p>
                <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                  {discount > 0 && (
                    <span className="flex items-center gap-0.5 text-[11px] font-bold text-green-600">
                      <TrendingDown className="w-3 h-3" />{discount}%
                    </span>
                  )}
                  {product.actualPrice > product.discountPrice && (
                    <span className="text-[11px] text-gray-400 line-through">₹{product.actualPrice}</span>
                  )}
                  <span className="text-[13px] font-bold text-gray-900">₹{product.discountPrice}</span>
                </div>
                {product.sizes?.length > 0 && (
                  <div className="pt-1">
                    <p className="text-[10px] font-semibold text-gray-500 mb-0.5">Size</p>
                    <div className="flex flex-wrap gap-1">
                      {product.sizes.slice(0, 4).map((s) => (
                        <span key={s} className="text-[9px] border border-gray-300 rounded px-1.5 py-0.5 text-gray-600 bg-gray-50">{s}</span>
                      ))}
                      {product.sizes.length > 4 && <span className="text-[9px] text-gray-400">+{product.sizes.length - 4}</span>}
                    </div>
                  </div>
                )}
                {product.gender && (
                  <div className="pt-0.5">
                    <span className="text-[9px] bg-blue-50 text-blue-600 border border-blue-200 rounded px-1.5 py-0.5 font-medium">{product.gender}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Sales Ledger ─────────────────────────────────────────────────────────────

function DemoSalesLedger({ onBlock }: { onBlock: () => void }) {
  const [searchQuery, setSearchQuery] = useState("");

  const displayRows = DEMO_LEDGER_ROWS.filter((r) =>
    !searchQuery || r.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSales = DEMO_LEDGER_ROWS.reduce((s, r) => s + r.productCost, 0);
  const paidAmount = DEMO_LEDGER_ROWS.filter(r => r.paymentStatus === "Paid").reduce((s, r) => s + r.productCost, 0);
  const pendingAmount = DEMO_LEDGER_ROWS.filter(r => r.paymentStatus === "Pending").reduce((s, r) => s + r.productCost, 0);
  const totalCustomers = DEMO_LEDGER_ROWS.length;

  const thCls = "border border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider px-3 py-2 whitespace-nowrap";
  const cellCls = "border border-[hsl(var(--border))] text-sm";
  const readCls: React.CSSProperties = { padding: "8px 12px", fontSize: 13, color: "hsl(var(--foreground))", display: "flex", alignItems: "center", minHeight: 36 };

  return (
    <div className="space-y-5 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpenIcon className="w-6 h-6 text-primary" /> Sales Ledger
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Fill row → click ✅ to save · Click ✏️ to edit a saved entry</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onBlock} className="gap-1.5"><Download className="w-4 h-4" /> Export</Button>
          <Button variant="outline" size="sm" onClick={onBlock} className="gap-1.5"><Printer className="w-4 h-4" /> Print</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground font-medium">Total Sales</span></div>
          <p className="text-xl font-bold">₹{formatIndian(totalSales)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-xs text-muted-foreground font-medium">Paid</span></div>
          <p className="text-xl font-bold text-green-600">₹{formatIndian(paidAmount)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Clock className="w-4 h-4 text-amber-600" /><span className="text-xs text-muted-foreground font-medium">Pending</span></div>
          <p className="text-xl font-bold text-amber-600">₹{formatIndian(pendingAmount)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-blue-600" /><span className="text-xs text-muted-foreground font-medium">Customers</span></div>
          <p className="text-xl font-bold text-blue-600">{totalCustomers}</p>
        </CardContent></Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-44">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input placeholder="Search customer name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-9" />
          {searchQuery && <button type="button" onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"><X className="w-4 h-4" /></button>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-green-600 border-green-300 hover:bg-green-50" onClick={onBlock}>
            <Plus className="w-4 h-4" /> Add Row
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <div style={{ maxHeight: "62vh", overflowY: "auto", overscrollBehavior: "contain" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr>
                  <th className={thCls} style={{ position: "sticky", top: 0, zIndex: 10, width: 52, textAlign: "center" }}>Sr No</th>
                  <th className={thCls} style={{ position: "sticky", top: 0, zIndex: 10, width: 140, textAlign: "center" }}>Date</th>
                  <th className={thCls} style={{ position: "sticky", top: 0, zIndex: 10, minWidth: 180, textAlign: "left" }}>Customer Name</th>
                  <th className={thCls} style={{ position: "sticky", top: 0, zIndex: 10, width: 140, textAlign: "left" }}>Product Cost</th>
                  <th className={thCls} style={{ position: "sticky", top: 0, zIndex: 10, width: 130, textAlign: "center" }}>Payment Status</th>
                  <th className={thCls} style={{ position: "sticky", top: 0, zIndex: 10, width: 72, textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: "60px 0", color: "hsl(var(--muted-foreground))", fontSize: 14 }}>No matching records found</td></tr>
                ) : (
                  displayRows.map((row, idx) => {
                    const isPaid = row.paymentStatus === "Paid";
                    const rowBg = idx % 2 === 0 ? "hsl(142 71% 98%)" : "hsl(142 71% 96%)";
                    return (
                      <tr key={row.id} style={{ background: rowBg }}>
                        <td className={cellCls} style={{ textAlign: "center", padding: 0, color: "hsl(var(--muted-foreground))", fontSize: 12, fontFamily: "monospace" }}>
                          <div style={{ padding: "8px 6px" }}>{row.srNo}</div>
                        </td>
                        <td className={cellCls} style={{ padding: 0 }}>
                          <div style={{ ...readCls, justifyContent: "center" }}>{isoToDisplay(row.date)}</div>
                        </td>
                        <td className={cellCls} style={{ padding: 0 }}>
                          <div style={{ ...readCls, fontWeight: 500 }}>{row.customerName}</div>
                        </td>
                        <td className={cellCls} style={{ padding: 0 }}>
                          <div style={readCls}>
                            <span style={{ color: "hsl(var(--muted-foreground))", marginRight: 2, fontSize: 12 }}>₹</span>
                            <span style={{ fontWeight: 600 }}>{formatIndian(row.productCost)}</span>
                          </div>
                        </td>
                        <td className={cellCls} style={{ padding: 0 }}>
                          <div style={{ ...readCls, justifyContent: "center" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: isPaid ? "hsl(142 71% 92%)" : "hsl(38 93% 92%)", color: isPaid ? "hsl(142 71% 30%)" : "hsl(38 93% 35%)" }}>
                              {isPaid ? "✅ Paid" : "⏳ Pending"}
                            </span>
                          </div>
                        </td>
                        <td className={cellCls} style={{ padding: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "4px 6px" }}>
                            <button onClick={onBlock} title="Edit" style={{ width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: "hsl(221 83% 95%)", color: "hsl(221 83% 45%)", border: "none", cursor: "pointer" }}>✏️</button>
                            <button onClick={onBlock} title="Delete" style={{ width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: "hsl(0 84% 96%)", color: "hsl(0 84% 55%)", border: "none", cursor: "pointer" }}>🗑</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
                {/* Total row */}
                <tr style={{ background: "hsl(var(--muted))", fontWeight: 700 }}>
                  <td colSpan={2} className={cellCls} style={{ textAlign: "center", padding: "8px 12px", fontSize: 12 }}>Total</td>
                  <td className={cellCls} style={{ padding: "8px 12px", fontSize: 12 }}>{totalCustomers} Customers</td>
                  <td className={cellCls} style={{ padding: "8px 12px", fontSize: 13, fontWeight: 700 }}>₹{formatIndian(totalSales)}</td>
                  <td colSpan={2} className={cellCls} />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sidebar Nav ───────────────────────────────────────────────────────────────

const NAV_ITEMS: { key: PageKey; label: string; icon: React.ElementType; locked?: boolean }[] = [
  { key: "sales-ledger", label: "Sales Ledger", icon: BookOpen },
  { key: "products", label: "Products", icon: Package },
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "ai-video", label: "AI Promotional Video", icon: Video, locked: true },
  { key: "my-store", label: "My Store", icon: Store, locked: true },
];

function NavContent({ activePage, onNavigate }: { activePage: PageKey; onNavigate: (k: PageKey) => void }) {
  return (
    <>
      <div className="px-4 py-5 border-b border-white/10 shrink-0">
        <p className="font-bold text-sm text-white leading-tight">{DEMO_SUMMARY.storeName}</p>
        <p className="text-[10px] text-white/40 mt-0.5 uppercase tracking-wider">Demo Store</p>
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ key, label, icon: Icon, locked }) => {
          const isActive = activePage === key;
          return (
            <button key={key} onClick={() => onNavigate(key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${isActive ? "bg-white/15 text-white" : "text-white/55 hover:text-white hover:bg-white/10"}`}
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
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/10 transition-all">
            <X className="w-4 h-4 shrink-0" /> Exit Demo
          </button>
        </Link>
      </div>
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

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
      <aside className="hidden lg:flex flex-col w-56 shrink-0 bg-[#1C1C2E]">
        <NavContent activePage={activePage} onNavigate={handleNavigate} />
      </aside>

      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
            <motion.aside key="drawer" initial={{ x: -224 }} animate={{ x: 0 }} exit={{ x: -224 }} transition={{ type: "spring", damping: 26, stiffness: 220 }} className="fixed left-0 top-0 bottom-0 w-56 bg-[#1C1C2E] z-50 flex flex-col lg:hidden">
              <NavContent activePage={activePage} onNavigate={handleNavigate} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b" style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}>
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800 font-medium flex-1 leading-relaxed truncate">
            <strong>Demo Store Only</strong> — This is only a demo store, no information will be changed here 🙏
          </p>
          <Link href="/create-store">
            <button className="text-xs font-bold whitespace-nowrap flex items-center gap-0.5 shrink-0" style={{ color: "#7B4FA6" }}>
              Create Your Store <ChevronRight className="w-3 h-3" />
            </button>
          </Link>
        </div>

        <header className="shrink-0 flex items-center gap-3 px-4 py-3 border-b bg-background">
          <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-muted transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{DEMO_SUMMARY.storeName}</p>
            <p className="text-xs text-muted-foreground">Demo Store</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0" style={{ background: "#F3EBFF", color: "#7B4FA6", border: "1px solid #D4ADFF" }}>
            Demo Mode
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {renderPage()}
        </main>
      </div>

      <AnimatePresence>
        {showBlockPopup && <BlockPopup onClose={() => setShowBlockPopup(false)} />}
      </AnimatePresence>
    </div>
  );
}
