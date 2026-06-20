import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  MapPin, Clock, CalendarDays, MessageCircle, Heart, ShoppingBag,
  ChevronLeft, X, Camera, Loader2, RefreshCw,
  CheckCircle2, TrendingDown, Download, Share2,
  CreditCard, CheckCircle, AlertCircle,
} from "lucide-react";
import { LoyaltyCardVisual } from "@/components/loyalty-card-visual";
import { useState, useRef, useEffect, useMemo } from "react";

import BottomNavbar, { TabType } from "@/components/store/BottomNavbar";
import HomeTab, { AdminCategory } from "@/components/store/HomeTab";
import ShopTab from "@/components/store/ShopTab";
import MyBookingTab from "@/components/store/MyBookingTab";
import WishlistTab from "@/components/store/WishlistTab";
import ProfileTab from "@/components/store/ProfileTab";

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
  categories: AdminCategory[];
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

type ViewType = "browse" | "product" | "tryon" | "booking" | "loyaltycard" | "loyaltycardapply";

function discount(p: PublicProduct) {
  return p.actualPrice > p.discountPrice
    ? Math.round(((p.actualPrice - p.discountPrice) / p.actualPrice) * 100)
    : 0;
}

export default function PublicStore() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [tab, setTab] = useState<TabType>("home");
  const [view, setView] = useState<ViewType>("browse");
  const [selectedAdminCategory, setSelectedAdminCategory] = useState<AdminCategory | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<PublicProduct | null>(null);
  const [previousProductId, setPreviousProductId] = useState<string | null>(null);
  const [imgIndex, setImgIndex] = useState(0);

  const [shopInitCategory, setShopInitCategory] = useState("all");

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
  const [lastCountedPhoto, setLastCountedPhoto] = useState<string | null>(null);

  const [bookingForm, setBookingForm] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`wmh_customer_${slug}`) || "null");
      if (saved && saved.name) return { name: saved.name || "", city: saved.city || "", whatsapp: saved.whatsapp || "" };
    } catch {}
    return { name: "", city: "", whatsapp: "" };
  });
  const [selectedSize, setSelectedSize] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [tryOnBookingImage, setTryOnBookingImage] = useState<string | null>(null);

  const [myBookings, setMyBookings] = useState<SavedBooking[]>(() => {
    try { return JSON.parse(localStorage.getItem(`wmh_bookings_${slug}`) || "[]"); }
    catch { return []; }
  });
  const [seenStatus, setSeenStatus] = useState<Record<string, boolean>>({});
  const [completedStatus, setCompletedStatus] = useState<Record<string, boolean>>({});

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
  const [useAccountCard, setUseAccountCard] = useState(false);
  const [loyaltyApplied, setLoyaltyApplied] = useState(false);
  const [loyaltyAppliedCardId, setLoyaltyAppliedCardId] = useState<string | null>(null);

  type LoyaltySlot = { status: "empty" | "pending" | "completed"; bookingId?: string; productName?: string; isCarryOver?: boolean };
  const [loyaltySlots, setLoyaltySlots] = useState<LoyaltySlot[]>([]);
  const [loyaltySlotsLoading, setLoyaltySlotsLoading] = useState(false);
  const [cardRefreshNotif, setCardRefreshNotif] = useState(false);

  const [lcTab, setLcTab] = useState<"registration" | "login">("registration");
  const [lcLoginForm, setLcLoginForm] = useState({ name: "", password: "" });
  const [lcLoginLoading, setLcLoginLoading] = useState(false);
  const [lcLoginError, setLcLoginError] = useState<string | null>(null);
  const [lcLoginAttempts, setLcLoginAttempts] = useState(0);
  const [lcForgotVisible, setLcForgotVisible] = useState(false);
  const [lcForgotForm, setLcForgotForm] = useState({ name: "", mobile: "", password: "" });
  const [lcForgotLoading, setLcForgotLoading] = useState(false);
  const [lcForgotError, setLcForgotError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!slug || !data) return;
    fetch(`/api/public/store/${slug}/visit`, { method: "POST" }).catch(() => {});
  }, [slug, !!data]);

  useEffect(() => {
    if (tab !== "mybookings" || myBookings.length === 0) return;
    myBookings.forEach((bk) => {
      fetch(`/api/public/booking-status/${bk.id}`)
        .then((r) => r.ok ? r.json() : null)
        .then((d) => {
          if (d) {
            setSeenStatus((prev) => ({ ...prev, [bk.id]: d.seenByAdmin }));
            setCompletedStatus((prev) => ({ ...prev, [bk.id]: d.completed ?? false }));
          }
        })
        .catch(() => {});
    });
  }, [tab]);

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
  }, [view, tab]);

  function fetchLoyaltySlots(cardId: string) {
    setLoyaltySlotsLoading(true);
    fetch(`/api/public/loyalty-card/slots/${cardId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setLoyaltySlots(d.slots ?? []); })
      .catch(() => {})
      .finally(() => setLoyaltySlotsLoading(false));
  }

  useEffect(() => {
    if (view === "loyaltycard" && loyaltyCardInfo?.id && loyaltyCardInfo.status === "approved") {
      fetchLoyaltySlots(loyaltyCardInfo.id);
    }
  }, [view, loyaltyCardInfo?.id, loyaltyCardInfo?.status]);

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
    else if (view === "loyaltycard") { setView("browse"); setTab("mybookings"); }
    else if (view === "tryon" || view === "booking") setView("product");
    else { setView("browse"); setSelectedProduct(null); }
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
    e.target.value = "";
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

  async function lcLoginSubmit() {
    const { name, password } = lcLoginForm;
    if (!name.trim() || !password) return;
    setLcLoginLoading(true);
    setLcLoginError(null);
    try {
      const res = await fetch("/api/public/loyalty-card/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeSlug: slug, customerName: name.trim(), password }),
      });
      const d = await res.json();
      if (!res.ok) {
        const attempts = lcLoginAttempts + 1;
        setLcLoginAttempts(attempts);
        setLcLoginError(d.error || "Wrong name or password");
        if (attempts >= 3) setLcForgotVisible(true);
        return;
      }
      const info: LoyaltyCardInfo = { id: d.id, name: d.customerName, mobile: d.mobileNumber, status: d.status };
      setLoyaltyCardInfo(info);
      localStorage.setItem(`wmh_loyalty_${slug}`, JSON.stringify(info));
      setLcLoginAttempts(0);
      setLcForgotVisible(false);
    } catch { setLcLoginError("Something went wrong. Please try again."); }
    finally { setLcLoginLoading(false); }
  }

  async function lcRecoverSubmit() {
    const { name, mobile, password } = lcForgotForm;
    if (!name.trim() || !mobile || !password) return;
    setLcForgotLoading(true);
    setLcForgotError(null);
    try {
      const res = await fetch("/api/public/loyalty-card/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeSlug: slug, customerName: name.trim(), mobileNumber: mobile, password }),
      });
      const d = await res.json();
      if (!res.ok) { setLcForgotError(d.error || "Details not found"); return; }
      const info: LoyaltyCardInfo = { id: d.id, name: d.customerName, mobile: d.mobileNumber, status: d.status };
      setLoyaltyCardInfo(info);
      localStorage.setItem(`wmh_loyalty_${slug}`, JSON.stringify(info));
      setLcForgotVisible(false);
    } catch { setLcForgotError("Something went wrong. Please try again."); }
    finally { setLcForgotLoading(false); }
  }

  async function verifyAndApplyLoyaltyCard() {
    if (useAccountCard && loyaltyCardInfo) {
      setLoyaltyApplied(true);
      setLoyaltyAppliedCardId(loyaltyCardInfo.id);
      setView("booking");
      return;
    }
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
      const isNewPhoto = customerPhoto !== lastCountedPhoto;
      if (isNewPhoto) {
        const res = await fetch(`/api/public/products/${selectedProduct.id}/tryon`, { method: "POST" });
        if (res.ok) {
          const d = await res.json();
          setTryOnLikeCounts((prev) => ({ ...prev, [selectedProduct.id]: d.tryOnLikeCount }));
          setLastCountedPhoto(customerPhoto);
        }
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
            const bannerSrc = data?.bannerImage ?? "";
            const doFinish = () => {
              setTryOnResult(canvas.toDataURL("image/jpeg", 0.88));
              resolve();
            };
            if (bannerSrc) {
              const bImg = new Image();
              bImg.crossOrigin = "anonymous";
              bImg.onload = () => {
                const bW = 96, bH = 48;
                const bX = 400 - bW - 8;
                const bY = 500 - bH - 8;
                ctx.fillStyle = "rgba(0,0,0,0.45)";
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(bX - 3, bY - 3, bW + 6, bH + 6, 7);
                else ctx.rect(bX - 3, bY - 3, bW + 6, bH + 6);
                ctx.fill();
                ctx.drawImage(bImg, bX, bY, bW, bH);
                doFinish();
              };
              bImg.onerror = doFinish;
              bImg.src = bannerSrc;
            } else {
              doFinish();
            }
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
        const appliedCardId = loyaltyAppliedCardId;
        setLoyaltyApplied(false);
        setLoyaltyAppliedCardId(null);
        const updated = [saved, ...myBookings];
        setMyBookings(updated);
        localStorage.setItem(`wmh_bookings_${slug}`, JSON.stringify(updated));
        localStorage.setItem(`wmh_customer_${slug}`, JSON.stringify({
          name: bookingForm.name,
          whatsapp: bookingForm.whatsapp,
          city: bookingForm.city,
          savedAt: Date.now(),
        }));
        if (bk.cardRefreshed) {
          setCardRefreshNotif(true);
          if (appliedCardId) fetchLoyaltySlots(appliedCardId);
          setTimeout(() => setCardRefreshNotif(false), 6000);
        } else if (appliedCardId) {
          fetchLoyaltySlots(appliedCardId);
        }
        setBookingSuccess(true);
      }
    } catch {}
    finally { setBookingLoading(false); }
  }

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ background: "#ffffff" }}>
        {/* Header skeleton */}
        <div className="px-4 pt-6 pb-4 text-center">
          <div className="h-7 w-40 rounded-xl mx-auto mb-2" style={{ background: "#f0f0f0", animation: "skeletonPulse 1.4s ease-in-out infinite" }} />
        </div>
        {/* Search skeleton */}
        <div className="px-4 pb-4">
          <div className="h-14 rounded-2xl w-full" style={{ background: "#f0f0f0", animation: "skeletonPulse 1.4s ease-in-out infinite" }} />
        </div>
        {/* Banner skeleton */}
        <div className="px-4 pb-5">
          <div className="h-56 rounded-3xl w-full" style={{ background: "#f0f0f0", animation: "skeletonPulse 1.4s ease-in-out infinite" }} />
        </div>
        {/* Product grid skeleton */}
        <div className="px-4">
          <div className="h-5 w-32 rounded-lg mb-3" style={{ background: "#f0f0f0", animation: "skeletonPulse 1.4s ease-in-out infinite" }} />
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="rounded-2xl overflow-hidden">
                <div className="w-full" style={{ aspectRatio: "3/4", background: "#f0f0f0", animation: "skeletonPulse 1.4s ease-in-out infinite", animationDelay: `${i * 0.1}s` }} />
                <div className="pt-2 space-y-1.5">
                  <div className="h-3 rounded-lg w-3/4" style={{ background: "#f0f0f0", animation: "skeletonPulse 1.4s ease-in-out infinite" }} />
                  <div className="h-4 rounded-lg w-1/2" style={{ background: "#f0f0f0", animation: "skeletonPulse 1.4s ease-in-out infinite" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <style>{`
          @keyframes skeletonPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.45; }
          }
        `}</style>
      </div>
    );
  }

  /* ── Error ── */
  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4" style={{ background: "#ffffff" }}>
        <ShoppingBag className="w-16 h-16 mb-4 text-gray-200" />
        <h1 className="text-xl font-black text-gray-900" style={{ fontFamily: "'Montserrat', sans-serif" }}>Store not found</h1>
        <p className="text-gray-400 mt-2 text-sm">This link may be invalid or the store may have been removed.</p>
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

    const lcLoginValid =
      lcLoginForm.name.trim().length >= 2 &&
      /^\d{10}$/.test(lcLoginForm.password) &&
      !lcLoginLoading;

    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#f8f8f8", fontFamily: "'Inter', sans-serif" }}>
        <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b" style={{ background: "#ffffff", borderColor: "#f0f0f0" }}>
          <button
            onClick={() => {
              setView("browse");
              setTab("mybookings");
              setLcTab("registration");
              setLcLoginForm({ name: "", password: "" });
              setLcLoginError(null);
              setLcLoginAttempts(0);
              setLcForgotVisible(false);
            }}
            className="p-1.5 rounded-full hover:bg-gray-100"
          >
            <ChevronLeft className="w-5 h-5 text-gray-900" />
          </button>
          <span className="font-black text-gray-900" style={{ fontFamily: "'Montserrat', sans-serif" }}>Loyalty Card</span>
        </div>

        <div className="flex-1 p-4 overflow-hidden">
          {loyaltyCardInfo ? (
            <div className="flex flex-col items-center">
              <div className="w-full mb-6" style={{ borderRadius: 20, border: loyaltyCardInfo.status === "approved" ? "2px solid rgba(34,197,94,0.45)" : "1px solid #f0f0f0" }}>
                <LoyaltyCardVisual storeName={data.name} address={data.address} phone={data.whatsappNumber} />
              </div>

              {loyaltyCardInfo.status === "approved" ? (
                <div className="w-full flex flex-col gap-4">
                  {cardRefreshNotif && (
                    <div className="w-full rounded-2xl px-4 py-3 flex items-center gap-3 animate-pulse" style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)", boxShadow: "0 4px 20px rgba(34,197,94,0.4)" }}>
                      <span className="text-2xl">🎉</span>
                      <div>
                        <p className="text-white font-bold text-sm">Card is Refreshed!</p>
                        <p className="text-green-100 text-xs">Your loyalty card has been renewed. New cycle started!</p>
                      </div>
                    </div>
                  )}
                  <div className="w-full rounded-2xl p-4" style={{ background: "#fff", border: "1px solid rgba(34,197,94,0.2)" }}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-bold text-gray-800" style={{ fontFamily: "'Montserrat', sans-serif" }}>Booking Progress</p>
                      <div className="flex items-center gap-3 text-[10px] text-gray-400">
                        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-yellow-400" />Pending</span>
                        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-green-500" />Done</span>
                        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-gray-200" />Empty</span>
                      </div>
                    </div>
                    {loyaltySlotsLoading ? (
                      <div className="grid grid-cols-5 gap-3">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div key={i} className="flex flex-col items-center gap-1">
                            <div className="w-10 h-10 rounded-full animate-pulse bg-gray-200" />
                            <span className="text-[9px] text-gray-300">{i + 1}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-5 gap-3">
                        {(loyaltySlots.length === 10 ? loyaltySlots : Array.from({ length: 10 }).map((_, i) => loyaltySlots[i] ?? { status: "empty" as const })).map((slot, i) => (
                          <div key={i} className="flex flex-col items-center gap-1">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                              style={{
                                background: slot.status === "completed" ? "#22c55e" : slot.status === "pending" ? "#fbbf24" : "#e5e7eb",
                                border: slot.status === "completed" ? "2.5px solid #16a34a" : slot.status === "pending" ? "2.5px solid #d97706" : "2px solid #d1d5db",
                                boxShadow: slot.status === "completed" ? "0 2px 8px rgba(34,197,94,0.35)" : slot.status === "pending" ? "0 2px 8px rgba(251,191,36,0.4)" : "none",
                              }}
                            >
                              {slot.status === "completed" && <svg width="16" height="12" viewBox="0 0 16 12" fill="none"><path d="M1.5 6L6 10.5L14.5 1.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                              {slot.status === "pending" && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="3" fill="white" /></svg>}
                            </div>
                            <span className="text-[9px] font-semibold" style={{ color: slot.status === "empty" ? "#d1d5db" : slot.status === "completed" ? "#16a34a" : "#d97706" }}>{i + 1}</span>
                            {slot.isCarryOver && <span className="text-[8px] text-orange-400 font-bold leading-none">carry</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex justify-between items-center">
                      <p className="text-[10px] text-gray-400">{loyaltySlots.filter(s => s.status === "completed").length} completed · {loyaltySlots.filter(s => s.status === "pending").length} pending</p>
                      <p className="text-[10px] font-bold text-green-500">{loyaltySlots.filter(s => s.status !== "empty").length}/10</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center text-center gap-1 py-2">
                    <p className="text-sm font-semibold text-gray-500">Name: {loyaltyCardInfo.name}</p>
                    <p className="text-xs text-gray-400">{loyaltyCardInfo.mobile}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center gap-3 py-4">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-gray-50">
                    <CreditCard className="w-10 h-10 text-gray-300" />
                  </div>
                  <p className="text-base font-bold text-gray-900" style={{ fontFamily: "'Montserrat', sans-serif" }}>Request Submitted</p>
                  <p className="text-xs text-gray-400 px-4 text-center">Your Loyalty Card request is submitted, please wait for approval by admin</p>
                </div>
              )}

              <button
                onClick={() => {
                  setLoyaltyCardInfo(null);
                  localStorage.removeItem(`wmh_loyalty_${slug}`);
                  setLcTab("login");
                }}
                className="mt-6 text-xs text-gray-400 underline"
              >
                Switch account
              </button>
            </div>
          ) : (
            <>
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="w-5 h-5 text-black" />
                  <p className="font-black text-gray-900 text-base" style={{ fontFamily: "'Montserrat', sans-serif" }}>Digital Loyalty Card</p>
                </div>
                <div style={{ borderRadius: 20, border: "1px solid #f0f0f0", overflow: "hidden" }}>
                  <LoyaltyCardVisual storeName={data.name} address={data.address} phone={data.whatsappNumber} />
                </div>
              </div>

              <div className="relative rounded-2xl p-1 mb-5" style={{ background: "#f5f5f5" }}>
                <div
                  className="absolute top-1 bottom-1 rounded-xl transition-all"
                  style={{
                    width: "calc(50% - 4px)",
                    left: lcTab === "registration" ? "4px" : "calc(50%)",
                    background: "#000000",
                    transition: "left 0.35s cubic-bezier(0.4,0,0.2,1)",
                  }}
                />
                <div className="relative flex">
                  <button onClick={() => { setLcTab("registration"); setLcLoginError(null); }} className="flex-1 py-3 text-sm font-bold z-10 transition-colors rounded-xl" style={{ color: lcTab === "registration" ? "#fff" : "rgba(0,0,0,0.45)", fontFamily: "'Montserrat', sans-serif" }}>
                    Registration
                  </button>
                  <button onClick={() => { setLcTab("login"); setLoyaltyCardError(null); }} className="flex-1 py-3 text-sm font-bold z-10 transition-colors rounded-xl" style={{ color: lcTab === "login" ? "#fff" : "rgba(0,0,0,0.45)", fontFamily: "'Montserrat', sans-serif" }}>
                    Login
                  </button>
                </div>
              </div>

              <div style={{ overflow: "hidden" }}>
                <div style={{ display: "flex", width: "200%", transform: `translateX(${lcTab === "registration" ? "0%" : "-50%"})`, transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)" }}>
                  <div style={{ width: "50%", paddingRight: "8px" }}>
                    <div className="space-y-4">
                      {loyaltyCardError && (
                        <div className="flex items-start gap-2 rounded-xl px-3 py-2.5" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}>
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                          <p className="text-xs text-red-500">{loyaltyCardError}</p>
                        </div>
                      )}
                      {[
                        { label: "Customer Name *", key: "name" as const, type: "text", placeholder: "Enter your real name", hint: "Real name only — fake names not allowed" },
                      ].map(({ label, key, type, placeholder, hint }) => (
                        <div key={key}>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
                          <input type={type} value={loyaltyCardForm[key]} onChange={(e) => setLoyaltyCardForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} className="w-full rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none border" style={{ background: "#ffffff", borderColor: "#e8e8e8" }} />
                          {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
                        </div>
                      ))}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Mobile Number *</label>
                        <input type="tel" inputMode="numeric" maxLength={10} value={loyaltyCardForm.mobile} onChange={(e) => setLoyaltyCardForm(f => ({ ...f, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) }))} placeholder="10-digit mobile number" className="w-full rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none border" style={{ background: "#ffffff", borderColor: "#e8e8e8" }} />
                        <p className="text-[10px] text-gray-400 mt-1">Repeated & spam numbers not allowed</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Password *</label>
                        <input type="password" inputMode="numeric" maxLength={10} value={loyaltyCardForm.password} onChange={(e) => setLoyaltyCardForm(f => ({ ...f, password: e.target.value.replace(/\D/g, "").slice(0, 10) }))} placeholder="10-digit numeric password" className="w-full rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none border" style={{ background: "#ffffff", borderColor: "#e8e8e8" }} />
                        <p className="text-[10px] text-gray-400 mt-1">Must be exactly 10 digits</p>
                      </div>
                      <button onClick={submitLoyaltyCardRequest} disabled={!lcFormValid} className="w-full font-bold py-4 rounded-2xl text-sm flex items-center justify-center gap-2 transition-all" style={{ background: lcFormValid ? "#000000" : "#e5e7eb", color: lcFormValid ? "white" : "#9ca3af", fontFamily: "'Montserrat', sans-serif" }}>
                        {loyaltyCardLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Request Card
                      </button>
                    </div>
                  </div>

                  <div style={{ width: "50%", paddingLeft: "8px" }}>
                    <div className="space-y-4">
                      {lcLoginError && (
                        <div className="flex items-start gap-2 rounded-xl px-3 py-2.5" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}>
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                          <p className="text-xs text-red-500">{lcLoginError}</p>
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Name or Number *</label>
                        <input type="text" inputMode="text" value={lcLoginForm.name} onChange={(e) => setLcLoginForm(f => ({ ...f, name: e.target.value }))} placeholder="Enter name or 10-digit mobile" className="w-full rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none border" style={{ background: "#ffffff", borderColor: "#e8e8e8" }} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Password *</label>
                        <input type="password" inputMode="numeric" maxLength={10} value={lcLoginForm.password} onChange={(e) => setLcLoginForm(f => ({ ...f, password: e.target.value.replace(/\D/g, "").slice(0, 10) }))} placeholder="10-digit password" className="w-full rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none border" style={{ background: "#ffffff", borderColor: "#e8e8e8" }} />
                      </div>
                      <button onClick={lcLoginSubmit} disabled={!lcLoginValid} className="w-full font-bold py-4 rounded-2xl text-sm flex items-center justify-center gap-2 transition-all" style={{ background: lcLoginValid ? "#000000" : "#e5e7eb", color: lcLoginValid ? "white" : "#9ca3af", fontFamily: "'Montserrat', sans-serif" }}>
                        {lcLoginLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Login
                      </button>
                      {waLink && (
                        <a href={`${waLink}?text=${encodeURIComponent(`Hay team ${data.name}\n\nI unfortunately lost my loyalty card password , please find & sent me my loyalty card password\n\nName : ${lcLoginForm.name.trim() || "fill this"}\nMobile number: fill this\n\nPlease find my loyalty card In your account and sent me my loyalty card password`)}`} target="_blank" rel="noopener noreferrer" className="block w-full text-center text-xs py-2.5 rounded-xl font-semibold" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}>
                          Forgot Password?
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════
     LOYALTY CARD APPLY VIEW
  ═══════════════════════════════════════ */
  if (view === "loyaltycardapply" && selectedProduct) {
    const hasAccountCard = !!loyaltyCardInfo;
    const formDisabled = useAccountCard && hasAccountCard;
    const lcApplyValid = formDisabled ? true : loyaltyApplyForm.name.trim().length >= 2 && /^\d{10}$/.test(loyaltyApplyForm.mobile) && /^\d{10}$/.test(loyaltyApplyForm.password) && !loyaltyApplyLoading;

    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#f8f8f8", fontFamily: "'Inter', sans-serif" }}>
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b" style={{ background: "#ffffff", borderColor: "#f0f0f0" }}>
          <button onClick={() => setView("booking")} className="p-1.5 rounded-full hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5 text-gray-900" />
          </button>
          <span className="font-black text-gray-900" style={{ fontFamily: "'Montserrat', sans-serif" }}>Add to Loyalty Card</span>
        </div>
        <div className="flex-1 p-4 space-y-4">
          {hasAccountCard && (
            <button onClick={() => setUseAccountCard(v => !v)} className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all" style={{ background: useAccountCard ? "rgba(34,197,94,0.08)" : "#ffffff", border: useAccountCard ? "2px solid #22c55e" : "2px solid #f0f0f0" }}>
              <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-all" style={{ background: useAccountCard ? "#22c55e" : "#f0f0f0", border: useAccountCard ? "2px solid #22c55e" : "2px solid #e0e0e0" }}>
                {useAccountCard && <svg width="13" height="10" viewBox="0 0 13 10" fill="none"><path d="M1 5L4.5 8.5L12 1" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold" style={{ color: useAccountCard ? "#16a34a" : "#374151" }}>Loyalty card save in account</p>
                <p className="text-xs mt-0.5" style={{ color: useAccountCard ? "#22c55e" : "#9ca3af" }}>{useAccountCard ? `✅ Using: ${loyaltyCardInfo!.name} · ${loyaltyCardInfo!.mobile}` : "Tick to use your saved loyalty card"}</p>
              </div>
              <CreditCard className="w-5 h-5 flex-shrink-0" style={{ color: useAccountCard ? "#22c55e" : "#d1d5db" }} />
            </button>
          )}
          <div className="rounded-xl px-4 py-3 text-sm text-gray-500" style={{ background: "#ffffff", border: "1px solid #f0f0f0" }}>
            {formDisabled ? "Your saved loyalty card will be used for this booking." : "Enter your Loyalty Card details to link this product booking."}
          </div>
          {loyaltyApplyError && !formDisabled && (
            <div className="flex items-start gap-2 rounded-xl px-3 py-2.5" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
              <p className="text-sm font-semibold text-red-500">{loyaltyApplyError}</p>
            </div>
          )}
          <div style={{ opacity: formDisabled ? 0.35 : 1, pointerEvents: formDisabled ? "none" : "auto", transition: "opacity 0.2s" }}>
            <div className="space-y-4">
              {[
                { label: "Name", key: "name" as const, type: "text", placeholder: "Your loyalty card name" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
                  <input type={type} value={loyaltyApplyForm[key]} onChange={(e) => setLoyaltyApplyForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} className="w-full rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none border" style={{ background: "#ffffff", borderColor: "#e8e8e8" }} disabled={formDisabled} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Mobile Number</label>
                <input type="tel" inputMode="numeric" maxLength={10} value={loyaltyApplyForm.mobile} onChange={(e) => setLoyaltyApplyForm(f => ({ ...f, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) }))} placeholder="10-digit mobile number" className="w-full rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none border" style={{ background: "#ffffff", borderColor: "#e8e8e8" }} disabled={formDisabled} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Password</label>
                <input type="password" inputMode="numeric" maxLength={10} value={loyaltyApplyForm.password} onChange={(e) => setLoyaltyApplyForm(f => ({ ...f, password: e.target.value.replace(/\D/g, "").slice(0, 10) }))} placeholder="10-digit loyalty card password" className="w-full rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none border" style={{ background: "#ffffff", borderColor: "#e8e8e8" }} disabled={formDisabled} />
              </div>
            </div>
          </div>
          <button onClick={verifyAndApplyLoyaltyCard} disabled={!lcApplyValid} className="w-full font-bold py-4 rounded-2xl text-sm flex items-center justify-center gap-2 transition-all" style={{ background: lcApplyValid ? "#22c55e" : "#e5e7eb", color: lcApplyValid ? "white" : "#9ca3af", fontFamily: "'Montserrat', sans-serif" }}>
            {loyaltyApplyLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {formDisabled ? "Use This Card" : "Done"}
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
      <div className="min-h-screen flex flex-col" style={{ background: "#f8f8f8", fontFamily: "'Inter', sans-serif" }}>
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b" style={{ background: "#ffffff", borderColor: "#f0f0f0" }}>
          <button onClick={goBack} className="p-1.5 rounded-full hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5 text-gray-900" />
          </button>
          <span className="font-black text-gray-900" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            {tryOnBookingImage ? "Book This Look" : "Book Product"}
          </span>
        </div>
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="rounded-2xl p-3.5 flex gap-3 mb-5" style={{ background: "#ffffff", border: "1px solid #f0f0f0" }}>
            {(tryOnBookingImage ?? selectedProduct.images[0]) ? (
              <img src={tryOnBookingImage ?? selectedProduct.images[0]} className="w-16 h-20 object-cover rounded-xl flex-shrink-0" />
            ) : (
              <div className="w-16 h-20 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-50">
                <ShoppingBag className="w-6 h-6 text-gray-300" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-sm line-clamp-2 mb-0.5" style={{ fontFamily: "'Poppins', sans-serif" }}>{selectedProduct.name}</p>
              {tryOnBookingImage && <span className="inline-block text-[10px] px-2 py-0.5 rounded-full font-bold bg-black text-white mb-1">Virtual Try-On</span>}
              <p className="text-base font-black text-gray-900">₹{selectedProduct.discountPrice.toLocaleString()}</p>
              {discount(selectedProduct) > 0 && <p className="text-xs text-gray-400 line-through">₹{selectedProduct.actualPrice.toLocaleString()}</p>}
            </div>
          </div>

          {loyaltyApplied ? (
            <div className="flex items-center gap-2 rounded-2xl px-4 py-3 mb-4" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)" }}>
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              <p className="text-sm font-semibold text-green-600">Product added to Loyalty Card</p>
            </div>
          ) : (
            <button onClick={() => { setLoyaltyApplyForm({ name: "", mobile: "", password: "" }); setLoyaltyApplyError(null); setUseAccountCard(false); setView("loyaltycardapply"); }} className="w-full flex items-center justify-center gap-2 mb-4 py-3.5 rounded-2xl text-sm font-bold border-2 transition-colors" style={{ borderColor: "#22c55e", color: "#22c55e", background: "transparent" }}>
              <CreditCard className="w-4 h-4" />
              Add to Loyalty Card
            </button>
          )}

          {selectedProduct.sizes.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Select Size</p>
              <div className="flex flex-wrap gap-2">
                {selectedProduct.sizes.map((s) => (
                  <button key={s} onClick={() => setSelectedSize(s)} className="px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all" style={selectedSize === s ? { background: "#000000", color: "white", borderColor: "#000000" } : { background: "transparent", color: "#757575", borderColor: "#e8e8e8" }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!bookingSuccess ? (
            <div className="space-y-4">
              {[
                { label: "Your Name *", key: "name" as const, type: "text", placeholder: "Enter your full name" },
                { label: "City / Village", key: "city" as const, type: "text", placeholder: "Your city or village" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
                  <input type={type} value={bookingForm[key]} onChange={(e) => setBookingForm((f) => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} className="w-full rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none border" style={{ background: "#ffffff", borderColor: "#e8e8e8" }} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">WhatsApp Number *</label>
                <input type="tel" inputMode="numeric" maxLength={10} value={bookingForm.whatsapp} onChange={(e) => { const digits = e.target.value.replace(/\D/g, "").slice(0, 10); setBookingForm((f) => ({ ...f, whatsapp: digits })); }} placeholder="10-digit WhatsApp number" className="w-full rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none border" style={{ background: "#ffffff", borderColor: bookingForm.whatsapp.length > 0 && !isValidPhone(bookingForm.whatsapp) ? "#ef4444" : "#e8e8e8" }} />
                {bookingForm.whatsapp.length > 0 && !isValidPhone(bookingForm.whatsapp) && (
                  <p className="text-xs mt-1 text-red-500">{bookingForm.whatsapp.length < 10 ? "Enter 10-digit number" : "Invalid number"}</p>
                )}
              </div>
              <button onClick={submitBooking} disabled={!canBook} className="w-full font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm" style={{ background: canBook ? "#000000" : "#e5e7eb", color: canBook ? "#ffffff" : "#9ca3af", fontFamily: "'Montserrat', sans-serif" }}>
                {bookingLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Book Product
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="w-16 h-16 mb-4 text-black" />
              <h3 className="text-xl font-black text-gray-900 mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>Booking Confirmed!</h3>
              <p className="text-sm text-gray-500 mb-6">Your booking for <strong className="text-gray-900">{selectedProduct.name}</strong> has been received.</p>
              <button onClick={() => { setView("browse"); setTab("mybookings"); }} className="text-sm font-bold underline text-black">
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
      <div className="min-h-screen flex flex-col" style={{ background: "#f8f8f8", fontFamily: "'Inter', sans-serif" }}>
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b" style={{ background: "#ffffff", borderColor: "#f0f0f0" }}>
          <button onClick={goBack} className="p-1.5 rounded-full hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-sm truncate" style={{ fontFamily: "'Montserrat', sans-serif" }}>{selectedProduct.name}</span>
          <span className="ml-auto shrink-0 text-[10px] px-2 py-0.5 rounded-full border font-bold" style={{ borderColor: "#e8e8e8", color: "#555", background: "#f5f5f5" }}>AI Powered</span>
        </div>
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          <div className="flex-1 flex flex-col border-r" style={{ borderColor: "#f0f0f0" }}>
            <div className="flex-1 relative border-b" style={{ background: "#ffffff", borderColor: "#f0f0f0" }}>
              <div className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Product</div>
              {selectedProduct.images[0] ? <img src={selectedProduct.images[0]} className="w-full h-full object-contain" style={{ maxHeight: "220px" }} /> : <div className="w-full h-40 flex items-center justify-center"><ShoppingBag className="w-10 h-10 text-gray-200" /></div>}
            </div>
            <div className="flex-1 relative border-b min-h-[180px]" style={{ background: "#f8f8f8", borderColor: "#f0f0f0", cursor: !customerPhoto ? "pointer" : undefined }} onClick={!customerPhoto ? () => photoInputRef.current?.click() : undefined}>
              <div className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Your Photo</div>
              {customerPhoto ? (
                <>
                  <img src={customerPhoto} className="w-full h-full object-contain" style={{ maxHeight: "220px" }} />
                  <button onClick={() => photoInputRef.current?.click()} className="absolute bottom-2 right-2 text-[10px] px-2 py-1 rounded-full flex items-center gap-1 bg-gray-100 text-gray-600">
                    <Camera className="w-3 h-3" /> Change
                  </button>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 min-h-[160px]">
                  <Camera className="w-8 h-8 text-gray-300" />
                  <p className="text-xs text-gray-400">Tap to upload your photo</p>
                </div>
              )}
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>
            <div className="p-3">
              <button onClick={generateTryOn} disabled={!customerPhoto || tryOnLoading} className="w-full font-black py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm" style={{ background: customerPhoto && !tryOnLoading ? "#000000" : "#e5e7eb", color: customerPhoto && !tryOnLoading ? "white" : "#9ca3af", fontFamily: "'Montserrat', sans-serif" }}>
                {tryOnLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {tryOnLoading ? "Generating..." : "Generate Try-On"}
              </button>
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]" style={{ background: "#f0f0f0" }}>
            {tryOnLoading && <div className="flex flex-col items-center gap-3"><Loader2 className="w-10 h-10 animate-spin text-black" /><p className="text-sm text-gray-400">Generating try-on...</p></div>}
            {!tryOnLoading && tryOnResult && (
              <div className="flex flex-col items-center w-full">
                <img src={tryOnResult} className="w-full object-contain max-h-[420px]" />
                <div className="flex gap-3 mt-3 px-4 w-full">
                  {[{ fn: saveTryOnImage, icon: Download, label: "Save" }, { fn: shareTryOnImage, icon: Share2, label: "Share" }].map(({ fn, icon: Icon, label }) => (
                    <button key={label} onClick={fn} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-semibold" style={{ background: "#ffffff", color: "#555" }}>
                      <Icon className="w-4 h-4" />{label}
                    </button>
                  ))}
                </div>
                <div className="px-4 w-full mt-2">
                  <button onClick={openTryOnBooking} className="w-full flex items-center justify-center gap-2 font-black py-3.5 rounded-2xl text-sm" style={{ background: "#000000", color: "white", fontFamily: "'Montserrat', sans-serif" }}>
                    Book This Look
                  </button>
                </div>
              </div>
            )}
            {!tryOnLoading && !tryOnResult && (
              <div className="flex flex-col items-center gap-3 px-6 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white">
                  <Camera className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-sm text-gray-400">AI result will appear here</p>
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
      <div key={selectedProduct.id} className="fixed inset-0 z-50 flex flex-col" style={{ background: "#ffffff", fontFamily: "'Inter', sans-serif" }}>
        <div className="flex items-center gap-2 px-3 py-3 sticky top-0 z-20 border-b" style={{ background: "#ffffff", borderColor: "#f0f0f0" }}>
          <button onClick={goBack} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-900" />
          </button>
          <h2 className="font-bold text-sm line-clamp-1 flex-1 text-gray-900" style={{ fontFamily: "'Poppins', sans-serif" }}>{selectedProduct.name}</h2>
          <button onClick={(e) => handleLike(selectedProduct.id, e)} className="p-1.5 rounded-full transition-all" style={{ background: likedProducts.has(selectedProduct.id) ? "rgba(239,68,68,0.1)" : "transparent" }}>
            <Heart className={`w-5 h-5 ${likedProducts.has(selectedProduct.id) ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="relative bg-white" style={{ background: "#f8f8f8" }}>
            <div ref={carouselRef} className="flex overflow-x-auto" style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none" }} onScroll={(e) => { const idx = Math.round((e.target as HTMLDivElement).scrollLeft / (e.target as HTMLDivElement).clientWidth); setImgIndex(idx); }}>
              {selectedProduct.images.length > 0 ? selectedProduct.images.map((img, i) => (
                <div key={i} className="shrink-0 w-full flex items-center justify-center" style={{ scrollSnapAlign: "start", aspectRatio: "3/4", background: "#f8f8f8" }}>
                  <img src={img} alt={`${selectedProduct.name} ${i + 1}`} className="w-full h-full object-contain" />
                </div>
              )) : (
                <div className="w-full flex items-center justify-center" style={{ aspectRatio: "3/4", background: "#f8f8f8" }}>
                  <ShoppingBag className="w-14 h-14 text-gray-200" />
                </div>
              )}
            </div>
            {selectedProduct.images.length > 1 && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                {selectedProduct.images.map((_, i) => (
                  <div key={i} className="transition-all rounded-full" style={{ width: imgIndex === i ? 16 : 6, height: 6, background: imgIndex === i ? "#000000" : "#d0d0d0" }} />
                ))}
              </div>
            )}
          </div>

          <div className="px-4 pt-4 pb-3">
            <h1 className="text-lg font-black text-gray-900 leading-tight mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>{selectedProduct.name}</h1>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl font-black text-gray-900">₹{selectedProduct.discountPrice.toLocaleString()}</span>
              {pDiscount > 0 && <>
                <span className="text-sm text-gray-400 line-through">₹{selectedProduct.actualPrice.toLocaleString()}</span>
                <span className="text-sm font-black text-green-500">{pDiscount}% OFF</span>
              </>}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <div className="flex items-center gap-1.5 text-sm text-gray-400">
                <Heart className="w-3.5 h-3.5 text-red-400 fill-current" />
                <span>{(likeCounts[selectedProduct.id] ?? selectedProduct.likeCount).toLocaleString("en-IN")} liked</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-gray-400">
                <Camera className="w-3.5 h-3.5 text-blue-400" />
                <span>{(tryOnLikeCounts[selectedProduct.id] ?? selectedProduct.tryOnLikeCount).toLocaleString("en-IN")} Virtual Try-On</span>
              </div>
            </div>
          </div>

          {selectedProduct.sizes.length > 0 && (
            <div className="px-4 py-4 border-t" style={{ borderColor: "#f0f0f0" }}>
              <p className="text-[11px] font-black text-gray-400 mb-3 tracking-widest uppercase">Available Sizes</p>
              <div className="flex flex-wrap gap-2">
                {selectedProduct.sizes.map((s) => (
                  <span key={s} className="px-4 py-1.5 rounded-xl text-sm font-semibold border" style={{ background: "transparent", borderColor: "#e8e8e8", color: "#555" }}>{s}</span>
                ))}
              </div>
            </div>
          )}

          {selectedProduct.description && (
            <div className="px-4 py-4 border-t" style={{ borderColor: "#f0f0f0" }}>
              <p className="text-[11px] font-black text-gray-400 mb-2 tracking-widest uppercase">Description</p>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{selectedProduct.description}</p>
            </div>
          )}

          {productWaLink && (
            <div className="px-4 py-3 border-t" style={{ borderColor: "#f0f0f0" }}>
              <a href={productWaLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-bold py-3 px-4 rounded-2xl w-full justify-center text-sm" style={{ background: "#25D366", color: "white" }}>
                <MessageCircle className="w-4 h-4" />Ask on WhatsApp
              </a>
            </div>
          )}

          {relatedProducts.length > 0 && (
            <div className="pb-4 border-t" style={{ borderColor: "#f0f0f0" }}>
              <div className="flex items-center justify-between px-4 pt-4 pb-3">
                <span className="text-sm font-black text-gray-900" style={{ fontFamily: "'Montserrat', sans-serif" }}>More Like This</span>
              </div>
              <div className="flex gap-3 overflow-x-auto px-4 pb-1" style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none" }}>
                {relatedProducts.slice(0, 10).map((p) => {
                  const disc = discount(p);
                  return (
                    <div key={p.id} className="shrink-0 cursor-pointer active:scale-[0.97] transition-transform" style={{ width: 130, scrollSnapAlign: "start" }} onClick={() => { setPreviousProductId(selectedProduct.id); setSelectedProduct(p); setImgIndex(0); carouselRef.current?.scrollTo({ left: 0 }); }}>
                      <div className="rounded-2xl overflow-hidden relative" style={{ aspectRatio: "3/4", background: "#f5f5f5" }}>
                        {p.images[0] ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-8 h-8 text-gray-200" /></div>}
                        {disc > 0 && <span className="absolute bottom-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#000", color: "white" }}>{disc}% OFF</span>}
                      </div>
                      <div className="mt-1.5 space-y-0.5">
                        <p className="text-[11px] font-semibold text-gray-700 line-clamp-2 leading-tight">{p.name}</p>
                        <p className="text-[12px] font-black text-gray-900">₹{p.discountPrice.toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="pb-28" />
        </div>

        <div className="shrink-0 z-20 border-t px-4 py-3" style={{ background: "#ffffff", borderColor: "#f0f0f0" }}>
          <div className="flex gap-3">
            <button onClick={openTryOn} className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-colors border-2" style={{ background: "transparent", borderColor: "#000", color: "#000", fontFamily: "'Poppins', sans-serif" }}>
              <Camera className="w-4 h-4" />
              Virtual Try-On
            </button>
            <button onClick={openBooking} className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-2xl font-black text-sm transition-colors" style={{ background: "#000000", color: "white", fontFamily: "'Montserrat', sans-serif" }}>
              Book at ₹{selectedProduct.discountPrice.toLocaleString()}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════
     MAIN BROWSE VIEW (with tabs)
  ═══════════════════════════════════════ */
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#ffffff", fontFamily: "'Inter', sans-serif" }}>
      <div className="flex-1 flex flex-col overflow-hidden" style={{ paddingBottom: 64 }}>
        {tab === "home" && !selectedAdminCategory && (
          <HomeTab
            storeName={data.name}
            products={data.products}
            categories={data.categories ?? []}
            likedProducts={likedProducts}
            likeCounts={likeCounts}
            onProductClick={openProduct}
            onLike={handleLike}
            onViewAll={() => setTab("shop")}
            onCategoryOpen={(cat) => setSelectedAdminCategory(cat)}
            onTryOnClick={() => {
              if (data.products.length > 0) {
                openProduct(data.products[0]);
              }
            }}
          />
        )}
        {tab === "home" && selectedAdminCategory && (() => {
          const catProducts = data.products.filter(p => p.functionCategory === selectedAdminCategory.name);
          return (
            <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#fff" }}>
              {/* Top bar */}
              <div className="flex items-center gap-3 px-4 pt-5 pb-3 border-b border-gray-100">
                <button
                  onClick={() => setSelectedAdminCategory(null)}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                  style={{ background: "#f5f5f5" }}
                >
                  <ChevronLeft className="w-5 h-5 text-gray-700" />
                </button>
                <div className="flex-1 min-w-0">
                  <h2 className="font-black text-gray-900 text-lg leading-tight truncate" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    {selectedAdminCategory.name}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">{catProducts.length} product{catProducts.length !== 1 ? "s" : ""}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {/* Description — top 1/8 of view */}
                {selectedAdminCategory.description && (
                  <div className="px-4 py-4" style={{ minHeight: "12.5vh", background: "#fafafa", borderBottom: "1px solid #f0f0f0" }}>
                    <p className="text-sm text-gray-600 leading-relaxed">{selectedAdminCategory.description}</p>
                  </div>
                )}

                {/* Products — new on top (API already returns sorted by createdAt -1) */}
                {catProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-gray-300">
                    <ShoppingBag className="w-14 h-14 mb-3" />
                    <p className="text-sm font-medium text-gray-400">No products in this category yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 p-4">
                    {catProducts.map((p) => {
                      const disc = discount(p);
                      const liked = likedProducts.has(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => openProduct(p)}
                          className="rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
                          style={{ background: "#f8f8f8" }}
                        >
                          <div className="relative" style={{ aspectRatio: "3/4", background: "#f0f0f0" }}>
                            {p.images[0] ? (
                              <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ShoppingBag className="w-8 h-8 text-gray-200" />
                              </div>
                            )}
                            {disc > 0 && (
                              <span className="absolute top-2 left-2 text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: "#000", color: "#fff" }}>
                                {disc}% OFF
                              </span>
                            )}
                            <button
                              className="absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-md active:scale-90 transition-transform"
                              style={{ background: liked ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.95)" }}
                              onClick={(e) => { e.stopPropagation(); handleLike(p.id, e); }}
                            >
                              <Heart className={`w-4 h-4 ${liked ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
                            </button>
                          </div>
                          <div className="px-3 pt-2.5 pb-3">
                            <p className="text-[12px] font-semibold text-gray-900 line-clamp-2 leading-tight mb-1">
                              {p.name}
                            </p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[14px] font-black text-gray-900">₹{p.discountPrice.toLocaleString()}</span>
                              {disc > 0 && (
                                <>
                                  <span className="text-[11px] text-gray-400 line-through">₹{p.actualPrice.toLocaleString()}</span>
                                  <span className="text-[10px] font-bold text-green-500">{disc}% OFF</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="pb-24" />
              </div>
            </div>
          );
        })()}
        {tab === "shop" && (
          <ShopTab
            products={data.products}
            categories={categories}
            likedProducts={likedProducts}
            likeCounts={likeCounts}
            initialCategory={shopInitCategory}
            onProductClick={openProduct}
            onLike={handleLike}
          />
        )}
        {tab === "mybookings" && (
          <MyBookingTab
            myBookings={myBookings}
            seenStatus={seenStatus}
            completedStatus={completedStatus}
            loyaltyCardInfo={loyaltyCardInfo}
            onOpenLoyaltyCard={() => { setLoyaltyCardError(null); setView("loyaltycard"); }}
          />
        )}
        {tab === "wishlist" && (
          <WishlistTab
            products={data.products}
            likedProducts={likedProducts}
            likeCounts={likeCounts}
            onProductClick={openProduct}
            onUnlike={handleLike}
          />
        )}
        {tab === "profile" && (
          <ProfileTab data={data} />
        )}
      </div>

      <BottomNavbar
        activeTab={tab}
        onTabChange={(newTab) => { setTab(newTab); setShopInitCategory("all"); }}
        bookingCount={myBookings.filter(b => !completedStatus[b.id]).length}
        wishlistCount={likedProducts.size}
      />
    </div>
  );
}
