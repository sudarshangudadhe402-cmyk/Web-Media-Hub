import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  MapPin, Clock, CalendarDays, MessageCircle, Heart, ShoppingBag,
  ChevronLeft, Search, X, Camera, Loader2, BookMarked, RefreshCw,
  CheckCircle2, TrendingDown, ShoppingCart, Download, Share2, SlidersHorizontal,
  CreditCard, CheckCircle, AlertCircle,
} from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";

interface PublicProduct {
  id: string;
  name: string;
  description: string | null;
  images: string[];
  discountPrice: number;
  actualPrice: number;
  productType: string;
  functionCategory: string | null;
  sizes: string[];
  age: string | null;
  gender: string | null;
  likeCount: number;
  tryOnLikeCount: number;
  recentLikeCount: number;
  recentTryOnCount: number;
}

interface PublicStoreData {
  id: string;
  name: string;
  address: string | null;
  whatsappNumber: string | null;
  openingTime: string | null;
  openDays: string | null;
  bannerImage: string | null;
  description: string | null;
  publicSlug: string;
  products: PublicProduct[];
}

interface SavedBooking {
  id: string;
  productName: string;
  productImage: string;
  tryOnImage?: string;
  customerName: string;
  city: string;
  whatsapp: string;
  selectedSize: string;
  bookedAt: string;
  addedToLoyaltyCard?: boolean;
}

interface LoyaltyCardInfo {
  id: string;
  name: string;
  mobile: string;
  status: "requested" | "approved" | "rejected";
}

type ViewType = "store" | "product" | "tryon" | "booking" | "mybookings" | "loyaltycard" | "loyaltycardapply";

function discount(p: PublicProduct) {
  return p.actualPrice > p.discountPrice
    ? Math.round(((p.actualPrice - p.discountPrice) / p.actualPrice) * 100)
    : 0;
}

/* ── Shared gold divider ── */
const GoldDivider = () => (
  <div className="flex items-center gap-2 my-1">
    <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, #D4AF37, transparent)" }} />
  </div>
);

export default function PublicStore() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [view, setView] = useState<ViewType>("store");
  const [selectedProduct, setSelectedProduct] = useState<PublicProduct | null>(null);
  const [previousProductId, setPreviousProductId] = useState<string | null>(null);
  const [imgIndex, setImgIndex] = useState(0);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "most-liked" | "most-tried" | "trending">("newest");
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  const [likedProducts, setLikedProducts] = useState<Set<string>>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(`wmh_likes_${slug}`) || "{}") as Record<string, number>;
      const now = Date.now();
      return new Set(Object.entries(raw).filter(([, ts]) => now - ts < 86400000).map(([id]) => id));
    } catch { return new Set(); }
  });
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [tryOnLikeCounts, setTryOnLikeCounts] = useState<Record<string, number>>({});

  const [customerPhoto, setCustomerPhoto] = useState<string | null>(null);
  const [tryOnResult, setTryOnResult] = useState<string | null>(null);
  const [tryOnLoading, setTryOnLoading] = useState(false);

  const [bookingForm, setBookingForm] = useState({ name: "", city: "", whatsapp: "" });
  const [selectedSize, setSelectedSize] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [tryOnBookingImage, setTryOnBookingImage] = useState<string | null>(null);

  const [myBookings, setMyBookings] = useState<SavedBooking[]>(() => {
    try { return JSON.parse(localStorage.getItem(`wmh_bookings_${slug}`) || "[]"); }
    catch { return []; }
  });
  const [seenStatus, setSeenStatus] = useState<Record<string, boolean>>({});

  const [loyaltyCardInfo, setLoyaltyCardInfo] = useState<LoyaltyCardInfo | null>(() => {
    try { return JSON.parse(localStorage.getItem(`wmh_loyalty_${slug}`) || "null"); }
    catch { return null; }
  });
  const [loyaltyCardForm, setLoyaltyCardForm] = useState({ name: "", mobile: "", password: "" });
  const [loyaltyCardLoading, setLoyaltyCardLoading] = useState(false);
  const [loyaltyCardError, setLoyaltyCardError] = useState<string | null>(null);
  const [loyaltyApplyForm, setLoyaltyApplyForm] = useState({ name: "", mobile: "", password: "" });
  const [loyaltyApplyLoading, setLoyaltyApplyLoading] = useState(false);
  const [loyaltyApplyError, setLoyaltyApplyError] = useState<string | null>(null);
  const [loyaltyApplied, setLoyaltyApplied] = useState(false);
  const [loyaltyAppliedCardId, setLoyaltyAppliedCardId] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useQuery<PublicStoreData>({
    queryKey: ["public-store", slug],
    queryFn: async () => {
      const res = await fetch(`/api/public/store/${slug}`);
      if (!res.ok) throw new Error("Store not found");
      return res.json();
    },
    enabled: !!slug,
  });

  useEffect(() => {
    if (data?.products) {
      const counts: Record<string, number> = {};
      const tryCounts: Record<string, number> = {};
      data.products.forEach((p) => {
        counts[p.id] = p.likeCount;
        tryCounts[p.id] = p.tryOnLikeCount ?? 0;
      });
      setLikeCounts(counts);
      setTryOnLikeCounts(tryCounts);
    }
  }, [data]);

  function canActOnProduct(storeKey: string, productId: string): boolean {
    try {
      const raw = JSON.parse(localStorage.getItem(storeKey) || "{}") as Record<string, number>;
      const ts = raw[productId];
      return !ts || Date.now() - ts >= 86400000;
    } catch { return true; }
  }

  function recordActionOnProduct(storeKey: string, productId: string) {
    try {
      const raw = JSON.parse(localStorage.getItem(storeKey) || "{}") as Record<string, number>;
      raw[productId] = Date.now();
      localStorage.setItem(storeKey, JSON.stringify(raw));
    } catch {}
  }

  useEffect(() => {
    if (view !== "mybookings" || myBookings.length === 0) return;
    myBookings.forEach((bk) => {
      fetch(`/api/public/booking-status/${bk.id}`)
        .then((r) => r.ok ? r.json() : null)
        .then((d) => { if (d) setSeenStatus((prev) => ({ ...prev, [bk.id]: d.seenByAdmin })); })
        .catch(() => {});
    });
  }, [view]);

  useEffect(() => {
    if (!loyaltyCardInfo?.id) return;
    fetch(`/api/public/loyalty-card/status/${loyaltyCardInfo.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && d.status !== loyaltyCardInfo.status) {
          const updated = { ...loyaltyCardInfo, status: d.status as LoyaltyCardInfo["status"] };
          setLoyaltyCardInfo(updated);
          localStorage.setItem(`wmh_loyalty_${slug}`, JSON.stringify(updated));
        }
      })
      .catch(() => {});
  }, [view]);

  const categories = useMemo(() => {
    if (!data) return [];
    const types: string[] = [];
    const funcCats: string[] = [];
    const seenTypes = new Set<string>();
    const seenFunc = new Set<string>();
    data.products.forEach((p) => {
      if (p.productType !== "Functional" && !seenTypes.has(p.productType)) {
        seenTypes.add(p.productType); types.push(p.productType);
      }
      if (p.functionCategory && !seenFunc.has(p.functionCategory)) {
        seenFunc.add(p.functionCategory); funcCats.push(p.functionCategory);
      }
    });
    return [...types, ...funcCats];
  }, [data]);

  const filteredProducts = useMemo(() => {
    if (!data) return [];
    let list = [...data.products];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.productType.toLowerCase().includes(q)
      );
    }
    if (activeCategory !== "all") {
      if (["Top", "Bottom", "Full Outfit"].includes(activeCategory)) {
        list = list.filter((p) => p.productType === activeCategory);
      } else {
        list = list.filter((p) => p.functionCategory === activeCategory);
      }
    }
    if (sortBy === "most-liked") {
      list = list.filter((p) => (likeCounts[p.id] ?? p.likeCount) > 0);
      list.sort((a, b) => (likeCounts[b.id] ?? b.likeCount) - (likeCounts[a.id] ?? a.likeCount));
    } else if (sortBy === "most-tried") {
      list = list.filter((p) => (tryOnLikeCounts[p.id] ?? p.tryOnLikeCount) > 0);
      list.sort((a, b) => (tryOnLikeCounts[b.id] ?? b.tryOnLikeCount) - (tryOnLikeCounts[a.id] ?? a.tryOnLikeCount));
    } else if (sortBy === "trending") {
      list = list.filter((p) => p.recentLikeCount > 0 && p.recentTryOnCount > 0);
      list.sort((a, b) => (b.recentLikeCount + b.recentTryOnCount) - (a.recentLikeCount + a.recentTryOnCount));
    }
    return list;
  }, [data, search, activeCategory, sortBy, likeCounts, tryOnLikeCounts]);

  async function handleLike(productId: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    const likeKey = `wmh_likes_${slug}`;
    if (likedProducts.has(productId) || !canActOnProduct(likeKey, productId)) return;
    try {
      const res = await fetch(`/api/public/products/${productId}/like`, { method: "POST" });
      if (res.ok) {
        const d = await res.json();
        setLikeCounts((prev) => ({ ...prev, [productId]: d.likeCount }));
        setLikedProducts((prev) => new Set([...prev, productId]));
        recordActionOnProduct(likeKey, productId);
      }
    } catch {}
  }

  function openProduct(product: PublicProduct) {
    setPreviousProductId(null);
    setSelectedProduct(product);
    setImgIndex(0);
    setView("product");
  }

  function goBack() {
    if (view === "loyaltycardapply") setView("booking");
    else if (view === "loyaltycard") setView("mybookings");
    else if (view === "tryon" || view === "booking") setView("product");
    else { setView("store"); setSelectedProduct(null); }
  }

  function openTryOn() {
    setCustomerPhoto(null); setTryOnResult(null); setView("tryon");
  }

  function openBooking() {
    setTryOnBookingImage(null);
    setBookingForm({ name: "", city: "", whatsapp: "" });
    setSelectedSize(selectedProduct?.sizes[0] ?? "");
    setBookingSuccess(false);
    setLoyaltyApplied(false);
    setLoyaltyAppliedCardId(null);
    setView("booking");
  }

  function openTryOnBooking() {
    setTryOnBookingImage(tryOnResult);
    setBookingForm({ name: "", city: "", whatsapp: "" });
    setSelectedSize(selectedProduct?.sizes[0] ?? "");
    setBookingSuccess(false);
    setLoyaltyApplied(false);
    setLoyaltyAppliedCardId(null);
    setView("booking");
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setCustomerPhoto(ev.target?.result as string); setTryOnResult(null); };
    reader.readAsDataURL(file);
  }

  function saveTryOnImage() {
    if (!tryOnResult) return;
    const a = document.createElement("a"); a.href = tryOnResult; a.download = "virtual-try-on.jpg"; a.click();
  }

  async function shareTryOnImage() {
    if (!tryOnResult) return;
    try {
      const res = await fetch(tryOnResult);
      const blob = await res.blob();
      const file = new File([blob], "virtual-try-on.jpg", { type: "image/jpeg" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Virtual Try-On", text: `Check out my virtual try-on for ${selectedProduct?.name}!` });
      } else { saveTryOnImage(); }
    } catch {}
  }

  async function submitLoyaltyCardRequest() {
    const { name, mobile, password } = loyaltyCardForm;
    if (!name.trim() || !mobile || !password) return;
    setLoyaltyCardLoading(true);
    setLoyaltyCardError(null);
    try {
      const res = await fetch("/api/public/loyalty-card/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeSlug: slug, customerName: name.trim(), mobileNumber: mobile, password }),
      });
      const d = await res.json();
      if (!res.ok) { setLoyaltyCardError(d.error || "Request failed"); return; }
      const info: LoyaltyCardInfo = { id: d.id, name: d.customerName, mobile: d.mobileNumber, status: "requested" };
      setLoyaltyCardInfo(info);
      localStorage.setItem(`wmh_loyalty_${slug}`, JSON.stringify(info));
    } catch { setLoyaltyCardError("Something went wrong. Please try again."); }
    finally { setLoyaltyCardLoading(false); }
  }

  async function verifyAndApplyLoyaltyCard() {
    const { name, mobile, password } = loyaltyApplyForm;
    if (!name.trim() || !mobile || !password) return;
    setLoyaltyApplyLoading(true);
    setLoyaltyApplyError(null);
    try {
      const res = await fetch("/api/public/loyalty-card/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeSlug: slug, customerName: name.trim(), mobileNumber: mobile, password }),
      });
      const d = await res.json();
      if (!res.ok) { setLoyaltyApplyError(d.error || "Loyalty card doesn't exist"); return; }
      setLoyaltyApplied(true);
      setLoyaltyAppliedCardId(d.cardId);
      setView("booking");
    } catch { setLoyaltyApplyError("Something went wrong. Please try again."); }
    finally { setLoyaltyApplyLoading(false); }
  }

  async function generateTryOn() {
    if (!customerPhoto || !selectedProduct) return;
    setTryOnLoading(true); setTryOnResult(null);
    try {
      const res = await fetch(`/api/public/products/${selectedProduct.id}/tryon`, { method: "POST" });
      if (res.ok) {
        const d = await res.json();
        setTryOnLikeCounts((prev) => ({ ...prev, [selectedProduct.id]: d.tryOnLikeCount }));
      }
      await new Promise<void>((resolve) => {
        const canvas = document.createElement("canvas");
        canvas.width = 400; canvas.height = 500;
        const ctx = canvas.getContext("2d")!;
        const cImg = new Image();
        cImg.onload = () => {
          ctx.drawImage(cImg, 0, 0, 400, 500);
          const clothImg = new Image();
          clothImg.crossOrigin = "anonymous";
          const finish = () => {
            ctx.globalAlpha = 0.5;
            ctx.drawImage(clothImg.complete && clothImg.naturalWidth ? clothImg : cImg, 70, 70, 260, 310);
            ctx.globalAlpha = 1;
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.fillRect(0, 462, 400, 38);
            ctx.fillStyle = "#D4AF37";
            ctx.font = "bold 12px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("AI Virtual Try-On • Web Media Hub", 200, 484);
            setTryOnResult(canvas.toDataURL("image/jpeg", 0.88));
            resolve();
          };
          clothImg.onload = finish; clothImg.onerror = finish;
          clothImg.src = selectedProduct.images[0] ?? "";
        };
        cImg.src = customerPhoto;
      });
    } catch {}
    finally { setTryOnLoading(false); }
  }

  async function submitBooking() {
    if (!selectedProduct || !bookingForm.name || !bookingForm.whatsapp) return;
    setBookingLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.id,
          customerName: bookingForm.name,
          customerPhone: bookingForm.whatsapp,
          customerAddress: bookingForm.city,
          selectedSize,
          tryOnImage: tryOnBookingImage || undefined,
          loyaltyCardApplied: loyaltyApplied,
          loyaltyCardId: loyaltyAppliedCardId || undefined,
        }),
      });
      if (res.ok) {
        const bk = await res.json();
        const saved: SavedBooking = {
          id: bk.id,
          productName: selectedProduct.name,
          productImage: selectedProduct.images[0] ?? "",
          tryOnImage: tryOnBookingImage ?? undefined,
          customerName: bookingForm.name,
          city: bookingForm.city,
          whatsapp: bookingForm.whatsapp,
          selectedSize,
          bookedAt: new Date().toISOString(),
          addedToLoyaltyCard: loyaltyApplied,
        };
        setLoyaltyApplied(false);
        setLoyaltyAppliedCardId(null);
        const updated = [saved, ...myBookings];
        setMyBookings(updated);
        localStorage.setItem(`wmh_bookings_${slug}`, JSON.stringify(updated));
        setBookingSuccess(true);
      }
    } catch {}
    finally { setBookingLoading(false); }
  }

  /* ── Loading skeleton ── */
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#0f0f0f", fontFamily: "'Inter', sans-serif" }}>
        <div className="h-36 animate-pulse mx-3 mt-3 rounded-2xl" style={{ background: "#1a1a1a" }} />
        <div className="p-4 space-y-3 mt-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-4 rounded animate-pulse" style={{ background: "#1a1a1a", width: `${80 - i * 10}%` }} />
          ))}
          <div className="grid grid-cols-2 gap-[2px] mt-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse" style={{ background: "#1a1a1a" }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4" style={{ background: "#0f0f0f" }}>
        <ShoppingBag className="w-16 h-16 mb-4" style={{ color: "#D4AF37", opacity: 0.4 }} />
        <h1 className="text-xl font-bold text-white" style={{ fontFamily: "'Montserrat', sans-serif" }}>Store not found</h1>
        <p className="text-white/40 mt-2 text-sm">This link may be invalid or the store may have been removed.</p>
      </div>
    );
  }

  const waLink = data.whatsappNumber
    ? `https://wa.me/${data.whatsappNumber.replace(/\D/g, "")}`
    : null;

  /* ═══════════════════════════════════════
     LOYALTY CARD VIEW
  ═══════════════════════════════════════ */
  if (view === "loyaltycard") {
    const lcFormValid =
      loyaltyCardForm.name.trim().length >= 3 &&
      !/\d/.test(loyaltyCardForm.name) &&
      /^\d{10}$/.test(loyaltyCardForm.mobile) &&
      !/^(\d)\1{9}$/.test(loyaltyCardForm.mobile) &&
      /^\d{10}$/.test(loyaltyCardForm.password) &&
      !loyaltyCardLoading;

    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#0f0f0f", fontFamily: "'Inter', sans-serif" }}>
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b" style={{ background: "#0f0f0f", borderColor: "rgba(212,175,55,0.2)" }}>
          <button onClick={() => setView("mybookings")} className="p-1.5 rounded-full hover:bg-white/10">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <span className="font-bold text-white" style={{ fontFamily: "'Montserrat', sans-serif" }}>Loyalty Card</span>
        </div>

        <div className="flex-1 p-4">
          {/* Card placeholder */}
          <div className="w-full rounded-2xl mb-6 flex items-center justify-center" style={{ background: "#1a1a1a", border: "1px dashed rgba(212,175,55,0.3)", minHeight: "160px" }}>
            <div className="flex flex-col items-center gap-2 py-6">
              <CreditCard className="w-12 h-12" style={{ color: "#D4AF37", opacity: 0.4 }} />
              <p className="text-xs text-white/30">Loyalty Card</p>
            </div>
          </div>

          {loyaltyCardInfo?.status === "approved" ? (
            <div className="flex flex-col items-center text-center gap-3 py-6">
              <CheckCircle className="w-14 h-14" style={{ color: "#22c55e" }} />
              <p className="text-lg font-bold text-white" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                Congratulations 🎉
              </p>
              <p className="text-sm font-semibold" style={{ color: "#22c55e" }}>Your Loyalty card is approved</p>
              <p className="text-xs text-white/40 mt-1">Name: {loyaltyCardInfo.name}</p>
            </div>
          ) : loyaltyCardInfo?.status === "requested" ? (
            <div className="flex flex-col items-center text-center gap-3 py-6">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(234,179,8,0.15)", border: "2px solid rgba(234,179,8,0.4)" }}>
                <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#eab308" }} />
              </div>
              <p className="text-base font-bold text-white" style={{ fontFamily: "'Montserrat', sans-serif" }}>Request Submitted</p>
              <p className="text-xs text-white/40 px-4 text-center">Your Loyalty Card request is submitted , please wait for approved by admin</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#D4AF37" }}>Request Loyalty Card</p>

              {loyaltyCardError && (
                <div className="flex items-start gap-2 rounded-xl px-3 py-2.5" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
                  <p className="text-xs" style={{ color: "#ef4444" }}>{loyaltyCardError}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">Customer Name *</label>
                <input
                  type="text"
                  value={loyaltyCardForm.name}
                  onChange={(e) => setLoyaltyCardForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Enter your real name (no nicknames)"
                  className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none border"
                  style={{ background: "#1a1a1a", borderColor: "rgba(212,175,55,0.2)" }}
                />
                <p className="text-[10px] text-white/30 mt-1">Real name only — fake names not allowed</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">Mobile Number *</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={loyaltyCardForm.mobile}
                  onChange={(e) => setLoyaltyCardForm(f => ({ ...f, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                  placeholder="10-digit mobile number"
                  className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none border"
                  style={{ background: "#1a1a1a", borderColor: "rgba(212,175,55,0.2)" }}
                />
                <p className="text-[10px] text-white/30 mt-1">Repeated & spam numbers not allowed</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">Password *</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={10}
                  value={loyaltyCardForm.password}
                  onChange={(e) => setLoyaltyCardForm(f => ({ ...f, password: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                  placeholder="10-digit numeric password"
                  className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none border"
                  style={{ background: "#1a1a1a", borderColor: "rgba(212,175,55,0.2)" }}
                />
                <p className="text-[10px] text-white/30 mt-1">Must be exactly 10 digits</p>
              </div>

              <button
                onClick={submitLoyaltyCardRequest}
                disabled={!lcFormValid}
                className="w-full font-bold py-4 rounded-2xl text-sm flex items-center justify-center gap-2 transition-all mt-2"
                style={{
                  background: lcFormValid ? "#22c55e" : "#2a2a2a",
                  color: lcFormValid ? "white" : "rgba(255,255,255,0.2)",
                  fontFamily: "'Montserrat', sans-serif",
                }}
              >
                {loyaltyCardLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════
     LOYALTY CARD APPLY VIEW
  ═══════════════════════════════════════ */
  if (view === "loyaltycardapply" && selectedProduct) {
    const lcApplyValid =
      loyaltyApplyForm.name.trim().length >= 2 &&
      /^\d{10}$/.test(loyaltyApplyForm.mobile) &&
      /^\d{10}$/.test(loyaltyApplyForm.password) &&
      !loyaltyApplyLoading;

    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#0f0f0f", fontFamily: "'Inter', sans-serif" }}>
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b" style={{ background: "#0f0f0f", borderColor: "rgba(212,175,55,0.2)" }}>
          <button onClick={() => setView("booking")} className="p-1.5 rounded-full hover:bg-white/10">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <span className="font-bold text-white" style={{ fontFamily: "'Montserrat', sans-serif" }}>Add to Loyalty Card</span>
        </div>

        <div className="flex-1 p-4 space-y-4">
          <div className="rounded-xl px-4 py-3 text-sm text-white/60" style={{ background: "#1a1a1a", border: "1px solid rgba(212,175,55,0.15)" }}>
            Enter your Loyalty Card details to link this product booking.
          </div>

          {loyaltyApplyError && (
            <div className="flex items-start gap-2 rounded-xl px-3 py-2.5" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
              <p className="text-sm font-semibold" style={{ color: "#ef4444" }}>{loyaltyApplyError}</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">Name</label>
            <input
              type="text"
              value={loyaltyApplyForm.name}
              onChange={(e) => setLoyaltyApplyForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Your loyalty card name"
              className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none border"
              style={{ background: "#1a1a1a", borderColor: "rgba(212,175,55,0.2)" }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">Mobile Number</label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={loyaltyApplyForm.mobile}
              onChange={(e) => setLoyaltyApplyForm(f => ({ ...f, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
              placeholder="10-digit mobile number"
              className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none border"
              style={{ background: "#1a1a1a", borderColor: "rgba(212,175,55,0.2)" }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">Password</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={10}
              value={loyaltyApplyForm.password}
              onChange={(e) => setLoyaltyApplyForm(f => ({ ...f, password: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
              placeholder="10-digit loyalty card password"
              className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none border"
              style={{ background: "#1a1a1a", borderColor: "rgba(212,175,55,0.2)" }}
            />
          </div>

          <button
            onClick={verifyAndApplyLoyaltyCard}
            disabled={!lcApplyValid}
            className="w-full font-bold py-4 rounded-2xl text-sm flex items-center justify-center gap-2 transition-all"
            style={{
              background: lcApplyValid ? "#22c55e" : "#2a2a2a",
              color: lcApplyValid ? "white" : "rgba(255,255,255,0.2)",
              fontFamily: "'Montserrat', sans-serif",
            }}
          >
            {loyaltyApplyLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Done
          </button>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════
     MY BOOKINGS VIEW
  ═══════════════════════════════════════ */
  if (view === "mybookings") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#0f0f0f", fontFamily: "'Inter', sans-serif" }}>
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b" style={{ background: "#0f0f0f", borderColor: "rgba(212,175,55,0.2)" }}>
          <button onClick={() => setView("store")} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <span className="font-bold text-white" style={{ fontFamily: "'Montserrat', sans-serif" }}>My Bookings</span>
        </div>
        <div className="flex-1 p-4 space-y-3 pb-24">
          {myBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <BookMarked className="w-12 h-12 mb-3" style={{ color: "#D4AF37", opacity: 0.3 }} />
              <p className="text-white/40 text-sm">No bookings yet</p>
            </div>
          ) : (
            myBookings.map((bk) => {
              const seen = seenStatus[bk.id] ?? false;
              return (
                <div key={bk.id} className="rounded-xl border p-3 flex gap-3" style={{ background: "#1a1a1a", borderColor: "rgba(212,175,55,0.15)" }}>
                  {(bk.tryOnImage || bk.productImage) ? (
                    <img src={bk.tryOnImage || bk.productImage} className="w-16 h-20 object-cover rounded-lg flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-20 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#111" }}>
                      <ShoppingBag className="w-6 h-6 text-white/20" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm line-clamp-1" style={{ fontFamily: "'Poppins', sans-serif" }}>{bk.productName}</p>
                    {bk.selectedSize && (
                      <span className="inline-block text-[10px] rounded px-1.5 py-0.5 mt-1 font-medium" style={{ border: "1px solid rgba(212,175,55,0.3)", color: "#D4AF37", background: "rgba(212,175,55,0.08)" }}>
                        Size: {bk.selectedSize}
                      </span>
                    )}
                    <p className="text-xs text-white/50 mt-1">{bk.customerName} · {bk.city}</p>
                    <p className="text-xs text-white/30">{bk.whatsapp}</p>
                    <p className="text-[10px] text-white/20 mt-1">
                      {new Date(bk.bookedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    {bk.addedToLoyaltyCard && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}>
                        🎫 This product is added in Loyalty Card
                      </span>
                    )}
                  </div>
                  <div className="flex-shrink-0 mt-auto pb-0.5 flex flex-col items-center gap-0.5">
                    <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
                      <path d="M1 7L5.5 11.5L13 3" stroke={seen ? "#53bdeb" : "#555"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M7 7L11.5 11.5L19 3" stroke={seen ? "#53bdeb" : "#555"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <p className="text-[9px] text-center" style={{ color: seen ? "#53bdeb" : "#555" }}>
                      {seen ? "Seen" : "Sent"}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sticky Loyalty Card button */}
        <div className="fixed bottom-0 left-0 right-0 z-30 px-4 py-3 border-t" style={{ background: "#0f0f0f", borderColor: "rgba(34,197,94,0.3)" }}>
          <button
            onClick={() => { setLoyaltyCardError(null); setView("loyaltycard"); }}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-sm transition-colors active:opacity-90"
            style={{ background: "#22c55e", color: "white", fontFamily: "'Montserrat', sans-serif" }}
          >
            <CreditCard className="w-5 h-5" />
            Request Loyalty Card
          </button>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════
     BOOKING FORM VIEW
  ═══════════════════════════════════════ */
  if (view === "booking" && selectedProduct) {
    const isValidPhone = (w: string) => w.length === 10 && !/^(\d)\1{9}$/.test(w);
    const canBook = bookingForm.name.trim().length >= 2 && isValidPhone(bookingForm.whatsapp) && !bookingLoading;

    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#0f0f0f", fontFamily: "'Inter', sans-serif" }}>
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b" style={{ background: "#0f0f0f", borderColor: "rgba(212,175,55,0.2)" }}>
          <button onClick={goBack} className="p-1.5 rounded-full hover:bg-white/10">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <span className="font-bold text-white" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            {tryOnBookingImage ? "Book This Look" : "Book Product"}
          </span>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          {/* Product preview */}
          <div className="rounded-xl border p-3 flex gap-3 mb-6" style={{ background: "#1a1a1a", borderColor: "rgba(212,175,55,0.2)" }}>
            {(tryOnBookingImage ?? selectedProduct.images[0]) ? (
              <img src={tryOnBookingImage ?? selectedProduct.images[0]} className="w-16 h-20 object-cover rounded-lg flex-shrink-0" />
            ) : (
              <div className="w-16 h-20 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#111" }}>
                <ShoppingBag className="w-6 h-6 text-white/20" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm line-clamp-2" style={{ fontFamily: "'Poppins', sans-serif" }}>{selectedProduct.name}</p>
              {tryOnBookingImage && (
                <span className="inline-block text-[10px] px-2 py-0.5 rounded-full mt-0.5 font-medium" style={{ background: "rgba(212,175,55,0.15)", color: "#D4AF37", border: "1px solid rgba(212,175,55,0.3)" }}>
                  Virtual Try-On
                </span>
              )}
              <p className="text-base font-bold text-white mt-1" style={{ fontFamily: "'Inter', sans-serif" }}>₹{selectedProduct.discountPrice.toLocaleString()}</p>
              {discount(selectedProduct) > 0 && (
                <p className="text-xs text-white/30 line-through">₹{selectedProduct.actualPrice.toLocaleString()}</p>
              )}
            </div>
          </div>

          {/* Add to Loyalty Card */}
          {loyaltyApplied ? (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-4" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
              <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#22c55e" }} />
              <p className="text-sm font-semibold" style={{ color: "#22c55e" }}>Product is added to Loyalty Card</p>
            </div>
          ) : (
            <button
              onClick={() => { setLoyaltyApplyForm({ name: "", mobile: "", password: "" }); setLoyaltyApplyError(null); setView("loyaltycardapply"); }}
              className="w-full flex items-center justify-center gap-2 mb-4 py-3 rounded-xl text-sm font-bold border-2 transition-colors"
              style={{ borderColor: "#22c55e", color: "#22c55e", background: "transparent" }}
            >
              <CreditCard className="w-4 h-4" />
              Add to Loyalty Card
            </button>
          )}

          {/* Size selector */}
          {selectedProduct.sizes.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-bold text-white/60 mb-2 uppercase tracking-wider">Select Size</p>
              <div className="flex flex-wrap gap-2">
                {selectedProduct.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold border transition-all"
                    style={selectedSize === s
                      ? { background: "#D4AF37", color: "#0f0f0f", borderColor: "#D4AF37" }
                      : { background: "transparent", color: "rgba(255,255,255,0.6)", borderColor: "rgba(255,255,255,0.2)" }
                    }
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form */}
          {!bookingSuccess ? (
            <div className="space-y-4">
              {[
                { label: "Your Name *", key: "name", type: "text", placeholder: "Enter your full name" },
                { label: "City / Village", key: "city", type: "text", placeholder: "Your city or village" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">{label}</label>
                  <input
                    type={type}
                    value={bookingForm[key as "name" | "city"]}
                    onChange={(e) => setBookingForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none border transition-colors"
                    style={{ background: "#1a1a1a", borderColor: "rgba(212,175,55,0.2)" }}
                    onFocus={(e) => (e.target.style.borderColor = "#D4AF37")}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(212,175,55,0.2)")}
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">WhatsApp Number *</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={bookingForm.whatsapp}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setBookingForm((f) => ({ ...f, whatsapp: digits }));
                  }}
                  placeholder="10-digit WhatsApp number"
                  className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none border transition-colors"
                  style={{
                    background: "#1a1a1a",
                    borderColor: bookingForm.whatsapp.length > 0 && !isValidPhone(bookingForm.whatsapp)
                      ? "#ef4444"
                      : "rgba(212,175,55,0.2)"
                  }}
                />
                {bookingForm.whatsapp.length > 0 && !isValidPhone(bookingForm.whatsapp) && (
                  <p className="text-xs mt-1" style={{ color: "#ef4444" }}>
                    {bookingForm.whatsapp.length < 10 ? "Enter 10-digit number" : "Invalid number"}
                  </p>
                )}
              </div>
              <button
                onClick={submitBooking}
                disabled={!canBook}
                className="w-full font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                style={{
                  background: canBook ? "#D4AF37" : "#2a2a2a",
                  color: canBook ? "#0f0f0f" : "rgba(255,255,255,0.2)",
                  fontFamily: "'Montserrat', sans-serif",
                }}
              >
                {bookingLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Book Product
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="w-16 h-16 mb-4" style={{ color: "#D4AF37" }} />
              <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>Booking Confirmed!</h3>
              <p className="text-sm text-white/50 mb-6">
                Your booking for <strong className="text-white">{selectedProduct.name}</strong> has been received.
              </p>
              <button
                onClick={() => setView("mybookings")}
                className="text-sm font-bold underline"
                style={{ color: "#D4AF37" }}
              >
                View My Bookings
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════
     VIRTUAL TRY-ON VIEW
  ═══════════════════════════════════════ */
  if (view === "tryon" && selectedProduct) {
    return (
      <div className="min-h-screen flex flex-col text-white" style={{ background: "#0f0f0f", fontFamily: "'Inter', sans-serif" }}>
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b" style={{ background: "#0f0f0f", borderColor: "rgba(212,175,55,0.2)" }}>
          <button onClick={goBack} className="p-1.5 rounded-full hover:bg-white/10">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-bold" style={{ fontFamily: "'Montserrat', sans-serif" }}>Virtual Try-On</span>
          <span className="ml-auto text-[10px] text-white/40 px-2 py-0.5 rounded-full border" style={{ borderColor: "rgba(212,175,55,0.3)", color: "#D4AF37" }}>
            AI Powered
          </span>
        </div>

        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          <div className="flex-1 flex flex-col border-r" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            <div className="flex-1 relative border-b" style={{ background: "#1a1a1a", borderColor: "rgba(255,255,255,0.05)" }}>
              <div className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(212,175,55,0.2)", color: "#D4AF37" }}>Product</div>
              {selectedProduct.images[0] ? (
                <img src={selectedProduct.images[0]} className="w-full h-full object-contain" style={{ maxHeight: "220px" }} />
              ) : (
                <div className="w-full h-40 flex items-center justify-center">
                  <ShoppingBag className="w-10 h-10 text-white/20" />
                </div>
              )}
            </div>

            <div
              className="flex-1 relative border-b min-h-[180px]"
              style={{ background: "#111", borderColor: "rgba(255,255,255,0.05)", cursor: !customerPhoto ? "pointer" : undefined }}
              onClick={!customerPhoto ? () => photoInputRef.current?.click() : undefined}
            >
              <div className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(212,175,55,0.2)", color: "#D4AF37" }}>Your Photo</div>
              {customerPhoto ? (
                <>
                  <img src={customerPhoto} className="w-full h-full object-contain" style={{ maxHeight: "220px" }} />
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    className="absolute bottom-2 right-2 text-[10px] px-2 py-1 rounded-full flex items-center gap-1"
                    style={{ background: "rgba(212,175,55,0.2)", color: "#D4AF37" }}
                  >
                    <Camera className="w-3 h-3" /> Change
                  </button>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 min-h-[160px]">
                  <Camera className="w-8 h-8 text-white/20" />
                  <p className="text-xs text-white/30">Tap to upload your photo</p>
                </div>
              )}
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>

            <div className="p-3">
              <button
                onClick={generateTryOn}
                disabled={!customerPhoto || tryOnLoading}
                className="w-full font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                style={{
                  background: customerPhoto && !tryOnLoading ? "#D4AF37" : "#2a2a2a",
                  color: customerPhoto && !tryOnLoading ? "#0f0f0f" : "rgba(255,255,255,0.2)",
                  fontFamily: "'Montserrat', sans-serif",
                }}
              >
                {tryOnLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {tryOnLoading ? "Generating..." : "Generate Try-On"}
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]" style={{ background: "#0d0d0d" }}>
            {tryOnLoading && (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 animate-spin" style={{ color: "#D4AF37" }} />
                <p className="text-sm text-white/40">Generating try-on...</p>
              </div>
            )}
            {!tryOnLoading && tryOnResult && (
              <div className="flex flex-col items-center w-full">
                <img src={tryOnResult} className="w-full object-contain max-h-[420px]" />
                <div className="flex gap-3 mt-3 px-4 w-full">
                  {[{ fn: saveTryOnImage, icon: Download, label: "Save" }, { fn: shareTryOnImage, icon: Share2, label: "Share" }].map(({ fn, icon: Icon, label }) => (
                    <button key={label} onClick={fn} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors" style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.7)" }}>
                      <Icon className="w-4 h-4" />{label}
                    </button>
                  ))}
                </div>
                <div className="px-4 w-full mt-2">
                  <button onClick={openTryOnBooking} className="w-full flex items-center justify-center gap-2 font-bold py-3 rounded-xl text-sm" style={{ background: "#D4AF37", color: "#0f0f0f", fontFamily: "'Montserrat', sans-serif" }}>
                    Book This Look
                  </button>
                </div>
              </div>
            )}
            {!tryOnLoading && !tryOnResult && (
              <div className="flex flex-col items-center gap-3 px-6 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(212,175,55,0.08)" }}>
                  <Camera className="w-7 h-7" style={{ color: "#D4AF37", opacity: 0.3 }} />
                </div>
                <p className="text-sm text-white/30">AI result will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════
     PRODUCT DETAIL VIEW
  ═══════════════════════════════════════ */
  if (view === "product" && selectedProduct) {
    const pDiscount = discount(selectedProduct);
    const productWaLink = waLink
      ? `${waLink}?text=${encodeURIComponent(`Hello ${data.name}!\n\nI'm interested in your product:\n\n📦 ${selectedProduct.name}\n💰 ₹${selectedProduct.discountPrice.toLocaleString()}\n🏷️ ${selectedProduct.productType}\n\nCan you confirm my interest? ☺️`)}`
      : null;
    const relatedProducts = data.products.filter(
      (p) => p.id !== selectedProduct.id && p.id !== previousProductId && p.productType === selectedProduct.productType
    );

    return (
      <div key={selectedProduct.id} className="fixed inset-0 z-50 flex flex-col animate-slide-up-page" style={{ background: "#0f0f0f", fontFamily: "'Inter', sans-serif" }}>

        {/* Top bar */}
        <div className="flex items-center gap-2 px-3 py-2 sticky top-0 z-20 border-b" style={{ background: "#0f0f0f", borderColor: "rgba(212,175,55,0.15)" }}>
          <button onClick={goBack} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h2 className="font-semibold text-sm line-clamp-1 flex-1 text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>{selectedProduct.name}</h2>
          <button
            onClick={(e) => handleLike(selectedProduct.id, e)}
            className="p-1.5 rounded-full transition-all"
            style={{ background: likedProducts.has(selectedProduct.id) ? "rgba(239,68,68,0.15)" : "transparent" }}
          >
            <Heart className={`w-5 h-5 ${likedProducts.has(selectedProduct.id) ? "fill-red-500 text-red-500" : "text-white/40"}`} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* Image carousel */}
          <div className="relative" style={{ background: "#1a1a1a" }}>
            <div
              ref={carouselRef}
              className="flex overflow-x-auto"
              style={{ scrollSnapType: "x mandatory", scrollBehavior: "smooth" }}
              onScroll={(e) => {
                const el = e.currentTarget;
                setImgIndex(Math.round(el.scrollLeft / el.clientWidth));
              }}
            >
              {(selectedProduct.images.length > 0 ? selectedProduct.images : [null]).map((img, i) => (
                <div key={i} className="shrink-0 w-full" style={{ scrollSnapAlign: "start", scrollSnapStop: "always", aspectRatio: "3/4", maxHeight: "48vh", background: "#1a1a1a" }}>
                  {img ? (
                    <img src={img} alt={selectedProduct.name} className="w-full h-full object-contain" draggable={false} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-20 h-20 text-white/10" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Discount badge */}
            {pDiscount > 0 && (
              <div className="absolute top-3 left-3 text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: "#D4AF37", color: "#0f0f0f" }}>
                {pDiscount}% OFF
              </div>
            )}
            <div className="absolute top-3 right-3 text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(0,0,0,0.6)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.1)" }}>
              {selectedProduct.productType}
            </div>

            {/* Dots */}
            {selectedProduct.images.length > 1 && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                {selectedProduct.images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { carouselRef.current?.scrollTo({ left: i * (carouselRef.current?.clientWidth ?? 0), behavior: "smooth" }); setImgIndex(i); }}
                    className="rounded-full transition-all"
                    style={{ width: i === imgIndex ? 20 : 6, height: 6, background: i === imgIndex ? "#D4AF37" : "rgba(255,255,255,0.3)" }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Info card */}
          <div className="mt-[2px] px-4 pt-4 pb-3" style={{ background: "#1a1a1a" }}>
            <div className="flex flex-wrap gap-1.5 mb-3">
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: "rgba(212,175,55,0.15)", color: "#D4AF37", border: "1px solid rgba(212,175,55,0.3)" }}>
                {selectedProduct.productType}
              </span>
              {selectedProduct.functionCategory && (
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  {selectedProduct.functionCategory}
                </span>
              )}
              {selectedProduct.age && (
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full" style={{ background: "rgba(255,165,0,0.1)", color: "rgb(251,146,60)", border: "1px solid rgba(255,165,0,0.2)" }}>
                  {selectedProduct.age}
                </span>
              )}
              {selectedProduct.gender && (
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full" style={{ background: "rgba(96,165,250,0.1)", color: "rgb(96,165,250)", border: "1px solid rgba(96,165,250,0.2)" }}>
                  {selectedProduct.gender}
                </span>
              )}
            </div>

            <h1 className="text-[16px] font-semibold text-white leading-snug mb-3" style={{ fontFamily: "'Poppins', sans-serif" }}>{selectedProduct.name}</h1>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-[24px] font-bold text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
                ₹{selectedProduct.discountPrice.toLocaleString()}
              </span>
              {pDiscount > 0 && (
                <>
                  <span className="text-sm text-white/30 line-through">₹{selectedProduct.actualPrice.toLocaleString()}</span>
                  <span className="text-sm font-bold" style={{ color: "#4ade80" }}>↓{pDiscount}% off</span>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <div className="flex items-center gap-1.5 text-sm text-white/40">
                <Heart className="w-3.5 h-3.5 text-red-400 fill-current" />
                <span>{(likeCounts[selectedProduct.id] ?? selectedProduct.likeCount).toLocaleString("en-IN")} liked</span>
              </div>
              {(tryOnLikeCounts[selectedProduct.id] ?? selectedProduct.tryOnLikeCount) > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-white/40">
                  <span>🪞</span>
                  <span>{(tryOnLikeCounts[selectedProduct.id] ?? selectedProduct.tryOnLikeCount).toLocaleString("en-IN")} tried</span>
                </div>
              )}
            </div>
          </div>

          {/* Sizes */}
          {selectedProduct.sizes.length > 0 && (
            <div className="mt-[2px] px-4 py-4" style={{ background: "#1a1a1a" }}>
              <p className="text-[11px] font-bold text-white/40 mb-3 tracking-widest uppercase">Available Sizes</p>
              <div className="flex flex-wrap gap-2">
                {selectedProduct.sizes.map((s) => (
                  <span key={s} className="px-4 py-1.5 rounded-lg text-sm font-medium border" style={{ background: "transparent", borderColor: "rgba(212,175,55,0.3)", color: "rgba(255,255,255,0.7)" }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {selectedProduct.description && (
            <div className="mt-[2px] px-4 py-4" style={{ background: "#1a1a1a" }}>
              <p className="text-[11px] font-bold text-white/40 mb-2 tracking-widest uppercase">Description</p>
              <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">{selectedProduct.description}</p>
            </div>
          )}

          {/* WhatsApp */}
          {productWaLink && (
            <div className="mt-[2px] px-4 py-3" style={{ background: "#1a1a1a" }}>
              <a
                href={productWaLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 font-semibold py-3 px-4 rounded-xl w-full justify-center text-sm"
                style={{ background: "#25D366", color: "white" }}
              >
                <MessageCircle className="w-4 h-4" />Ask on WhatsApp
              </a>
            </div>
          )}

          {/* More like this */}
          {relatedProducts.length > 0 && (
            <div className="mt-[2px] pb-4" style={{ background: "#1a1a1a" }}>
              <div className="flex items-center justify-between px-4 pt-4 pb-3">
                <span className="text-sm font-bold text-white" style={{ fontFamily: "'Montserrat', sans-serif" }}>More Like This</span>
              </div>
              <div className="flex gap-3 overflow-x-auto px-4 pb-1" style={{ scrollSnapType: "x mandatory" }}>
                {relatedProducts.slice(0, 10).map((p) => {
                  const disc = discount(p);
                  return (
                    <div
                      key={p.id}
                      className="shrink-0 cursor-pointer"
                      style={{ width: 130, scrollSnapAlign: "start" }}
                      onClick={() => { setPreviousProductId(selectedProduct.id); setSelectedProduct(p); setImgIndex(0); carouselRef.current?.scrollTo({ left: 0 }); }}
                    >
                      <div className="rounded-xl overflow-hidden relative" style={{ aspectRatio: "3/4", background: "#111" }}>
                        {p.images[0] ? (
                          <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="w-8 h-8 text-white/10" />
                          </div>
                        )}
                        {disc > 0 && (
                          <span className="absolute bottom-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#D4AF37", color: "#0f0f0f" }}>
                            {disc}% OFF
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 space-y-0.5">
                        <p className="text-[11px] font-medium text-white/70 line-clamp-2 leading-tight">{p.name}</p>
                        <p className="text-[12px] font-bold text-white">₹{p.discountPrice.toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pb-24" />
        </div>

        {/* Fixed bottom bar */}
        <div className="shrink-0 z-20 border-t" style={{ background: "#0f0f0f", borderColor: "rgba(212,175,55,0.15)" }}>
          <div className="flex gap-3 px-4 py-3">
            <button
              onClick={openTryOn}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full font-bold text-sm transition-colors border"
              style={{ background: "transparent", borderColor: "rgba(212,175,55,0.4)", color: "#D4AF37", fontFamily: "'Poppins', sans-serif" }}
            >
              <Camera className="w-4 h-4" />
              Virtual Try-On
            </button>
            <button
              onClick={openBooking}
              className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-full font-bold text-sm transition-colors"
              style={{ background: "#D4AF37", color: "#0f0f0f", fontFamily: "'Montserrat', sans-serif" }}
            >
              Book at ₹{selectedProduct.discountPrice.toLocaleString()}
            </button>
          </div>
          <div className="flex justify-center pb-2">
            <div className="w-28 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════
     MAIN STORE VIEW
  ═══════════════════════════════════════ */
  const openDaySet = new Set((data.openDays ?? "").split(",").map((d) => d.trim()).filter(Boolean));
  const DAY_FULL: Record<string, string> = {
    Sun: "Sunday", Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday",
    Thu: "Thursday", Fri: "Friday", Sat: "Saturday",
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0f0f0f", fontFamily: "'Inter', sans-serif" }}>

      {/* ── Store Header ── */}
      <div className="px-3 pt-3 pb-1">
        <div
          className="relative rounded-2xl overflow-hidden flex items-stretch"
          style={{ background: "linear-gradient(135deg, #111111 0%, #1a1a1a 100%)", minHeight: "130px", border: "1px solid rgba(212,175,55,0.25)" }}
        >
          {/* Gold shimmer line */}
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(to right, transparent, #D4AF37, transparent)" }} />

          {/* Left: Info */}
          <div className="flex-1 flex flex-col justify-center gap-2 px-4 py-4 z-10">
            <h1 className="text-base font-black text-white leading-tight tracking-tight line-clamp-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              {data.name}
            </h1>
            <div className="flex flex-col gap-1">
              {data.address && (
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-3 h-3 mt-0.5 shrink-0" style={{ color: "#D4AF37" }} />
                  <p className="text-[11px] text-white/60 leading-snug line-clamp-2">{data.address}</p>
                </div>
              )}
              {data.openDays && (
                <div className="flex items-center gap-1 flex-wrap">
                  <CalendarDays className="w-3 h-3 shrink-0" style={{ color: "#D4AF37" }} />
                  {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((abbr) => {
                    const isOpen = openDaySet.has(DAY_FULL[abbr]);
                    return (
                      <span key={abbr} className="text-[9px] font-bold px-1 py-0.5 rounded" style={isOpen ? { background: "rgba(212,175,55,0.2)", color: "#D4AF37" } : { color: "rgba(255,255,255,0.2)" }}>
                        {abbr}
                      </span>
                    );
                  })}
                </div>
              )}
              {data.openingTime && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 shrink-0" style={{ color: "#D4AF37" }} />
                  <p className="text-[11px] text-white/60">{data.openingTime}</p>
                </div>
              )}
            </div>
            {waLink && (
              <a href={waLink} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] rounded-full px-3 py-1.5 font-bold self-start"
                style={{ background: "#25D366", color: "white" }}>
                <MessageCircle className="w-3.5 h-3.5" />WhatsApp
              </a>
            )}
          </div>

          {/* Right: Banner */}
          <div className="relative flex-shrink-0 flex items-center justify-center z-10" style={{ width: "42%" }}>
            <div className="absolute inset-2 rounded-xl border" style={{ borderColor: "rgba(212,175,55,0.2)" }} />
            {data.bannerImage ? (
              <img src={data.bannerImage} alt={data.name} className="relative w-full h-full object-cover rounded-xl" style={{ maxHeight: "150px" }} />
            ) : (
              <div className="relative w-full flex items-center justify-center py-8">
                <ShoppingBag className="w-14 h-14" style={{ color: "#D4AF37", opacity: 0.2 }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Search + Cart ── */}
      <div className="px-3 py-2 flex gap-2 items-center border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-9 pr-8 py-2 text-sm rounded-xl focus:outline-none border transition-colors"
            style={{ background: "#1a1a1a", borderColor: "rgba(212,175,55,0.15)", color: "white" }}
            onFocus={(e) => (e.target.style.borderColor = "#D4AF37")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(212,175,55,0.15)")}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-white/30" />
            </button>
          )}
        </div>
        <button
          onClick={() => setView("mybookings")}
          className="relative flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-[11px] font-bold border transition-colors"
          style={{ background: "#1a1a1a", borderColor: "rgba(212,175,55,0.2)", color: "#D4AF37" }}
        >
          <ShoppingCart className="w-5 h-5" />
          <span>Cart</span>
          {myBookings.length > 0 && (
            <span className="absolute -top-1 -right-1 text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold" style={{ background: "#D4AF37", color: "#0f0f0f" }}>
              {myBookings.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Category Tabs ── */}
      <div className="overflow-x-auto border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex gap-0 px-3 py-2 min-w-max">
          {["all", ...categories].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold mr-1.5 whitespace-nowrap transition-all"
              style={activeCategory === cat
                ? { background: "#D4AF37", color: "#0f0f0f" }
                : { background: "#1a1a1a", color: "rgba(255,255,255,0.5)" }
              }
            >
              {cat === "all" ? "All" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Filter row ── */}
      <div className="px-3 py-2 flex items-center justify-between border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <span className="text-[11px] text-white/30">
          {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={() => setShowFilterSheet(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all border"
          style={sortBy !== "newest"
            ? { background: "#D4AF37", color: "#0f0f0f", borderColor: "#D4AF37" }
            : { background: "transparent", color: "rgba(255,255,255,0.5)", borderColor: "rgba(255,255,255,0.15)" }
          }
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          {sortBy === "newest" ? "Filter" : sortBy === "most-liked" ? "❤️ Most Liked" : sortBy === "most-tried" ? "🪞 Most Tried" : "🔥 Trending"}
        </button>
      </div>

      {/* ── Filter sheet ── */}
      {showFilterSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setShowFilterSheet(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <div
            className="relative rounded-t-2xl px-4 pt-4 pb-8 border-t"
            style={{ background: "#1a1a1a", borderColor: "rgba(212,175,55,0.3)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "rgba(212,175,55,0.3)" }} />
            <p className="text-sm font-bold text-white mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>Sort & Filter</p>
            <div className="space-y-2">
              {([
                { key: "newest", label: "Newest", desc: "Latest products first", icon: "🆕" },
                { key: "most-liked", label: "Most Liked", desc: "Most popular products", icon: "❤️" },
                { key: "most-tried", label: "Most Virtual Try-On", desc: "Most virtually tried", icon: "🪞" },
                { key: "trending", label: "Trending", desc: "Hot right now", icon: "🔥" },
              ] as const).map(({ key, label, desc, icon }) => (
                <button
                  key={key}
                  onClick={() => { setSortBy(key); setShowFilterSheet(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left"
                  style={sortBy === key
                    ? { borderColor: "#D4AF37", background: "rgba(212,175,55,0.08)" }
                    : { borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)" }
                  }
                >
                  <span className="text-xl">{icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold" style={{ color: sortBy === key ? "#D4AF37" : "rgba(255,255,255,0.8)" }}>{label}</p>
                    <p className="text-[11px] text-white/30">{desc}</p>
                  </div>
                  {sortBy === key && <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "#D4AF37" }}><div className="w-2 h-2 rounded-full bg-black" /></div>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Products Grid ── */}
      <div className="flex-1">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ShoppingBag className="w-12 h-12 mb-3" style={{ color: "#D4AF37", opacity: 0.2 }} />
            <p className="text-white/30 text-sm">
              {search ? `No products found for "${search}"` : "No products in this category"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-[2px]" style={{ background: "#0f0f0f" }}>
            {filteredProducts.map((p) => {
              const pDis = discount(p);
              const liked = likedProducts.has(p.id);
              const isTrending = p.recentLikeCount > 0 && p.recentTryOnCount > 0;
              return (
                <div
                  key={p.id}
                  onClick={() => openProduct(p)}
                  className="cursor-pointer active:opacity-80 transition-opacity"
                  style={{ background: "#1a1a1a" }}
                >
                  {/* Image */}
                  <div className="aspect-[3/4] relative overflow-hidden" style={{ background: "#111" }}>
                    {p.images[0] ? (
                      <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-white/10" />
                      </div>
                    )}
                    {/* Trending */}
                    {isTrending && (
                      <div className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5" style={{ background: "rgba(0,0,0,0.6)", color: "#D4AF37", border: "1px solid rgba(212,175,55,0.3)" }}>
                        🔥
                      </div>
                    )}
                    {/* Discount overlay badge */}
                    {pDis > 0 && (
                      <div className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#D4AF37", color: "#0f0f0f" }}>
                        {pDis}%
                      </div>
                    )}
                    {/* Heart */}
                    <button
                      className="absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow active:scale-90 transition-transform"
                      style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}
                      onClick={(e) => { e.stopPropagation(); handleLike(p.id, e); }}
                    >
                      <Heart className={`w-3.5 h-3.5 ${liked ? "fill-red-500 text-red-500" : "text-white/50"}`} />
                    </button>
                  </div>

                  {/* Card info — Image + Name + Price + Discount only */}
                  <div className="px-2.5 pt-2 pb-3">
                    <p className="text-[12px] font-semibold text-white leading-tight line-clamp-2 mb-1" style={{ fontFamily: "'Poppins', sans-serif" }}>
                      {p.name}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[13px] font-bold text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
                        ₹{p.discountPrice.toLocaleString()}
                      </span>
                      {pDis > 0 && (
                        <>
                          <span className="text-[10px] text-white/30 line-through">₹{p.actualPrice.toLocaleString()}</span>
                          <span className="text-[10px] font-bold" style={{ color: "#4ade80" }}>↓{pDis}%</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-[11px] border-t" style={{ borderColor: "rgba(212,175,55,0.1)", color: "rgba(212,175,55,0.4)" }}>
        Powered by <span style={{ color: "#D4AF37" }}>Web Media Hub</span>
      </div>
    </div>
  );
}
