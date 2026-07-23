import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  MapPin, Clock, CalendarDays, MessageCircle, Heart, ShoppingBag,
  ChevronLeft, X, Camera, Loader2, RefreshCw,
  CheckCircle2, TrendingDown, Download, Share2,
  AlertCircle, Edit2, Trash2, Box, ShoppingCart, Star,
} from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";

import BottomNavbar, { TabType } from "@/components/store/BottomNavbar";
import HomeTab, { AdminCategory } from "@/components/store/HomeTab";
import ShopTab from "@/components/store/ShopTab";
import MyBookingTab from "@/components/store/MyBookingTab";
import CartTab from "@/components/store/CartTab";
import ProfileTab, { type CustomerAccountInfo } from "@/components/store/ProfileTab";
import { IndiaMap } from "@/components/india-map";

interface PublicProduct {
  id: string;
  name: string;
  description: string | null;
  images: string[];
  modelUrl?: string | null;
  discountPrice: number;
  actualPrice: number;
  productType: string;
  functionCategory: string | null;
  sizes: string[];
  age: string | null;
  gender: string | null;
  likeCount: number;
  tryOnLikeCount: number;
  averageRating: number;
  recentLikeCount: number;
  recentTryOnCount: number;
}

interface PublicStoreData {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
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
}

interface ReviewItem {
  id: string;
  customerId: string;
  customerName: string;
  text: string;
  rating: number;
  likeCount: number;
  likes: string[];
  createdAt: string;
  updatedAt: string;
}

type ViewType = "browse" | "product" | "tryon" | "booking";

function discount(p: PublicProduct) {
  return p.actualPrice > p.discountPrice
    ? Math.round(((p.actualPrice - p.discountPrice) / p.actualPrice) * 100)
    : 0;
}

export default function PublicStore() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const source = sp.get("source");
    const campaign = sp.get("campaign");
    if (source || campaign) {
      localStorage.setItem(`wmh_tracking_${slug}`, JSON.stringify({ source: source ?? null, campaign: campaign ?? null }));
      // Track the visit immediately — count every visitor who arrives via a campaign link
      if (source && campaign && slug) {
        fetch("/api/public/campaigns/track-visit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storeSlug: slug, source, campaign }),
        }).catch(() => {});
      }
    }
  }, [slug]);

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
  const [tryOnProducts, setTryOnProducts] = useState<Set<string>>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(`wmh_tryons_${slug}`) || "{}") as Record<string, number>;
      return new Set(Object.keys(raw));
    } catch { return new Set(); }
  });
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [tryOnLikeCounts, setTryOnLikeCounts] = useState<Record<string, number>>({});

  const [customerPhoto, setCustomerPhoto] = useState<string | null>(null);
  const [tryOnResult, setTryOnResult] = useState<string | null>(null);
  const [tryOnLoading, setTryOnLoading] = useState(false);
  const [lastCountedPhoto, setLastCountedPhoto] = useState<string | null>(null);

  const [show3DUnavailable, setShow3DUnavailable] = useState(false);
  const [viewing3D, setViewing3D] = useState<PublicProduct | null>(null);
  const [showLoginRequired, setShowLoginRequired] = useState(false);
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
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [tryOnBookingImage, setTryOnBookingImage] = useState<string | null>(null);

  const [myBookings, setMyBookings] = useState<SavedBooking[]>(() => {
    try { return JSON.parse(localStorage.getItem(`wmh_bookings_${slug}`) || "[]"); }
    catch { return []; }
  });
  const [seenStatus, setSeenStatus] = useState<Record<string, boolean>>({});
  const [completedStatus, setCompletedStatus] = useState<Record<string, boolean>>({});

  const [customerAccount, setCustomerAccount] = useState<CustomerAccountInfo | null>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(`wmh_account_${slug}`) || "null");
      return parsed ? { ...parsed, cart: parsed.cart ?? [] } : null;
    }
    catch { return null; }
  });

  // Re-sync cart from the server so it stays consistent across devices
  useEffect(() => {
    if (!customerAccount?.id) return;
    const ac = new AbortController();
    fetch(`/api/public/cart/${customerAccount.id}`, { signal: ac.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (!d) return;
        setCustomerAccount((prev) => {
          if (!prev) return prev;
          const acc = { ...prev, cart: d.cart ?? [] };
          localStorage.setItem(`wmh_account_${slug}`, JSON.stringify(acc));
          return acc;
        });
      })
      .catch((err) => { if (err.name !== "AbortError") console.error("Cart sync failed:", err); });
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerAccount?.id]);
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [signInLoading, setSignInLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [showAccountFieldsPopup, setShowAccountFieldsPopup] = useState(false);

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewBoxOpen, setReviewBoxOpen] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHoverRating, setReviewHoverRating] = useState(0);
  const [reviewPosting, setReviewPosting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editReviewText, setEditReviewText] = useState("");
  const [editReviewRating, setEditReviewRating] = useState(0);
  const [editReviewHoverRating, setEditReviewHoverRating] = useState(0);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const [storeInactive, setStoreInactive] = useState(false);

  const { data, isLoading, error } = useQuery<PublicStoreData>({
    queryKey: ["public-store", slug],
    queryFn: async () => {
      const res = await fetch(`/api/public/store/${slug}`);
      if (res.status === 410) {
        const body = await res.json().catch(() => ({}));
        if (body?.code === "STORE_INACTIVE") {
          setStoreInactive(true);
          throw new Error("STORE_INACTIVE");
        }
      }
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
    if (view === "product" && selectedProduct && data?.id) {
      setReviews([]);
      setReviewBoxOpen(false);
      setReviewText("");
      setReviewError(null);
      setEditingReviewId(null);
      setReviewsLoading(true);
      fetch(`/api/public/reviews/${selectedProduct.id}?storeId=${data.id}`)
        .then(r => r.ok ? r.json() : [])
        .then(d => setReviews(d))
        .catch(() => {})
        .finally(() => setReviewsLoading(false));
    }
  }, [selectedProduct?.id, view, data?.id]);

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

  async function handleAddToCart(productId: string) {
    if (!customerAccount) {
      setShowLoginRequired(true);
      return;
    }
    const inCart = customerAccount.cart?.includes(productId);
    try {
      const res = inCart
        ? await fetch(`/api/public/cart/${customerAccount.id}/${productId}`, { method: "DELETE" })
        : await fetch("/api/public/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ customerId: customerAccount.id, productId }),
          });
      if (res.ok) {
        const d = await res.json();
        const acc: CustomerAccountInfo = { ...customerAccount, cart: d.cart ?? [] };
        setCustomerAccount(acc);
        localStorage.setItem(`wmh_account_${slug}`, JSON.stringify(acc));
      }
    } catch {}
  }

  function openProduct(product: PublicProduct) {
    setPreviousProductId(null);
    setSelectedProduct(product);
    setImgIndex(0);
    // Reset try-on + booking state so previous product's data never bleeds through
    setCustomerPhoto(null);
    setTryOnResult(null);
    setLastCountedPhoto(null);
    setBookingSuccess(false);
    setBookingError(null);
    setSelectedSize(product.sizes[0] ?? "");
    setView("product");
  }

  function goBack() {
    if (view === "tryon" || view === "booking") setView("product");
    else { setView("browse"); setSelectedProduct(null); }
  }

  function openTryOn() {
    setCustomerPhoto(null); setTryOnResult(null); setView("tryon");
  }

  function openBooking() {
    setTryOnBookingImage(null);
    // Do NOT reset bookingForm — preserve saved customer data (name, city, whatsapp)
    setSelectedSize(selectedProduct?.sizes[0] ?? "");
    setBookingSuccess(false);
    setBookingError(null); // Clear any previous booking error
    setView("booking");
  }

  function openTryOnBooking() {
    setTryOnBookingImage(tryOnResult);
    // Do NOT reset bookingForm — preserve saved customer data
    setSelectedSize(selectedProduct?.sizes[0] ?? "");
    setBookingSuccess(false);
    setBookingError(null); // Clear any previous booking error
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

  async function handleSendOtp(name: string, email: string, password: string, purpose: "signup" | "signin") {
    setOtpLoading(true);
    setOtpError(null);
    setSignUpError(null);
    setSignInError(null);
    try {
      const res = await fetch("/api/public/customer-account/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeSlug: slug, name: name || undefined, email, password, purpose }),
      });
      const d = await res.json();
      if (!res.ok) { setOtpError(d.error || "Failed to send OTP"); throw new Error(d.error); }
    } catch (err: any) {
      setOtpError(err.message || "Failed to send OTP");
      throw err;
    } finally { setOtpLoading(false); }
  }

  async function handleAccountSignUp(name: string, email: string, password: string, otp: string) {
    setSignUpLoading(true);
    setSignUpError(null);
    try {
      const trackingRaw = localStorage.getItem(`wmh_tracking_${slug}`);
      const tracking = trackingRaw ? (() => { try { return JSON.parse(trackingRaw); } catch { return {}; } })() : {};
      const res = await fetch("/api/public/customer-account/verify-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeSlug: slug, name, email, password, otp, source: tracking.source ?? undefined, campaign: tracking.campaign ?? undefined }),
      });
      const d = await res.json();
      if (!res.ok) { setSignUpError(d.error || "Verification failed"); return; }
      const acc: CustomerAccountInfo = { id: d.id, name: d.name, email: d.email, cart: d.cart ?? [], createdAt: d.createdAt };
      setCustomerAccount(acc);
      localStorage.setItem(`wmh_account_${slug}`, JSON.stringify(acc));
      setSignUpError(null);
    } catch { setSignUpError("Something went wrong. Please try again."); }
    finally { setSignUpLoading(false); }
  }

  async function handleAccountSignIn(email: string, password: string, otp: string) {
    setSignInLoading(true);
    setSignInError(null);
    try {
      const res = await fetch("/api/public/customer-account/verify-signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeSlug: slug, email, password, otp }),
      });
      const d = await res.json();
      if (!res.ok) { setSignInError(d.error || "Verification failed"); return; }
      const acc: CustomerAccountInfo = { id: d.id, name: d.name, email: d.email, cart: d.cart ?? [], createdAt: d.createdAt };
      setCustomerAccount(acc);
      localStorage.setItem(`wmh_account_${slug}`, JSON.stringify(acc));
      setSignInError(null);
    } catch { setSignInError("Something went wrong. Please try again."); }
    finally { setSignInLoading(false); }
  }

  function handleAccountLogout() {
    setCustomerAccount(null);
    localStorage.removeItem(`wmh_account_${slug}`);
    setSignUpError(null);
    setSignInError(null);
    setOtpError(null);
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
          // Record try-on in localStorage and state
          try {
            const tryOnKey = `wmh_tryons_${slug}`;
            const raw = JSON.parse(localStorage.getItem(tryOnKey) || "{}") as Record<string, number>;
            raw[selectedProduct.id] = Date.now();
            localStorage.setItem(tryOnKey, JSON.stringify(raw));
            setTryOnProducts((prev) => new Set([...prev, selectedProduct.id]));
          } catch {}
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
    // Bug fix: guard against submitting without a size when the product requires one
    if (selectedProduct.sizes.length > 0 && !selectedSize) {
      setBookingError("Please select a size before booking.");
      return;
    }
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
        };
        const updated = [saved, ...myBookings];
        setMyBookings(updated);
        localStorage.setItem(`wmh_bookings_${slug}`, JSON.stringify(updated));
        localStorage.setItem(`wmh_customer_${slug}`, JSON.stringify({
          name: bookingForm.name,
          whatsapp: bookingForm.whatsapp,
          city: bookingForm.city,
          savedAt: Date.now(),
        }));
        setBookingSuccess(true);
      } else {
        const errData = await res.json().catch(() => ({}));
        const msg = (errData as any)?.error || "Booking failed. Please try again.";
        setBookingError(msg);
      }
    } catch {
      setBookingError("Something went wrong. Please try again.");
    }
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

  /* ── Store Inactive ── */
  if (storeInactive) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6" style={{ background: "#ffffff" }}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5" style={{ background: "#FFF7ED" }}>
          <AlertCircle className="w-10 h-10" style={{ color: "#F97316" }} />
        </div>
        <h1 className="text-xl font-black text-gray-900 mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          Store Temporarily Unavailable
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
          This store is currently inactive. Please check back later or contact the store owner directly.
        </p>
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
              {bookingError && (
                <p className="text-sm text-red-500 text-center font-medium">{bookingError}</p>
              )}
              <button onClick={() => { setBookingError(null); submitBooking(); }} disabled={!canBook} className="w-full font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm" style={{ background: canBook ? "#000000" : "#e5e7eb", color: canBook ? "#ffffff" : "#9ca3af", fontFamily: "'Montserrat', sans-serif" }}>
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

          <div className="px-4 pt-3 flex justify-end">
            <button
              onClick={() => handleAddToCart(selectedProduct.id)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-sm active:scale-95 transition-transform"
              style={
                customerAccount?.cart?.includes(selectedProduct.id)
                  ? { background: "#ecfdf5", color: "#16a34a", border: "1.5px solid #86efac" }
                  : { background: "#000000", color: "#ffffff" }
              }
            >
              <ShoppingCart className="w-4 h-4" />
              {customerAccount?.cart?.includes(selectedProduct.id) ? "Added to Cart" : "Add to Cart"}
            </button>
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
          {/* ── Reviews Section ───────────────────────────────────────────── */}
          <div className="border-t" style={{ borderColor: "#f0f0f0" }}>
            <div className="px-4 pt-4 pb-2 flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black text-gray-900" style={{ fontFamily: "'Montserrat', sans-serif" }}>Customer Reviews</span>
              {reviews.length > 0 && (
                <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{reviews.length}</span>
              )}
              {reviews.length > 0 && (() => {
                const avg = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
                return (
                  <div className="flex items-center gap-1 ml-auto">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-3.5 h-3.5 ${avg >= s ? "fill-amber-400 text-amber-400" : avg >= s - 0.5 ? "fill-amber-200 text-amber-300" : "text-gray-200"}`} />
                    ))}
                    <span className="text-xs font-bold text-gray-700 ml-0.5">{avg.toFixed(1)}</span>
                  </div>
                );
              })()}
            </div>

            <div className="px-4 pb-3">
              {!customerAccount ? (
                <p className="text-xs text-gray-400 text-center py-2 bg-gray-50 rounded-xl">Login to your account to write a review</p>
              ) : reviews.find(r => r.customerId === customerAccount.id) ? null : !reviewBoxOpen ? (
                <button
                  onClick={() => { setReviewBoxOpen(true); setReviewRating(0); setReviewHoverRating(0); setReviewText(""); setReviewError(null); }}
                  className="w-full py-2.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
                  style={{ background: "#22c55e", color: "white" }}
                >
                  ✏️ Write Review
                </button>
              ) : (
                <div className="space-y-3 bg-gray-50 rounded-2xl p-3 border" style={{ borderColor: "#e5e7eb" }}>
                  {/* Star rating selector */}
                  <div>
                    <p className="text-xs font-bold text-gray-600 mb-1.5">Your Rating <span className="text-red-500">*</span></p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setReviewRating(s)}
                          onMouseEnter={() => setReviewHoverRating(s)}
                          onMouseLeave={() => setReviewHoverRating(0)}
                          className="p-0.5 transition-transform active:scale-110"
                        >
                          <Star
                            className={`w-7 h-7 transition-colors ${
                              (reviewHoverRating || reviewRating) >= s
                                ? "fill-amber-400 text-amber-400"
                                : "text-gray-300"
                            }`}
                          />
                        </button>
                      ))}
                      {reviewRating > 0 && (
                        <span className="ml-1 text-xs font-semibold text-amber-600">
                          {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][reviewRating]}
                        </span>
                      )}
                    </div>
                  </div>
                  <textarea
                    value={reviewText}
                    onChange={e => setReviewText(e.target.value)}
                    placeholder="Share your experience with this product..."
                    maxLength={500}
                    rows={3}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-400"
                    style={{ borderColor: "#e5e7eb" }}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{reviewText.length}/500</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setReviewBoxOpen(false); setReviewText(""); setReviewRating(0); setReviewHoverRating(0); setReviewError(null); }}
                        className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 border"
                        style={{ borderColor: "#e5e7eb" }}
                      >Cancel</button>
                      <button
                        disabled={reviewPosting || !reviewText.trim() || reviewRating === 0}
                        onClick={async () => {
                          if (!reviewText.trim() || reviewRating === 0 || !customerAccount || !data) return;
                          setReviewPosting(true);
                          setReviewError(null);
                          try {
                            const res = await fetch("/api/public/reviews", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ productId: selectedProduct.id, storeId: data.id, customerId: customerAccount.id, text: reviewText.trim(), rating: reviewRating }),
                            });
                            const json = await res.json();
                            if (!res.ok) { setReviewError(json.error || "Failed to post review"); return; }
                            setReviews(prev => [json, ...prev]);
                            setReviewBoxOpen(false);
                            setReviewText("");
                            setReviewRating(0);
                          } catch { setReviewError("Something went wrong"); }
                          finally { setReviewPosting(false); }
                        }}
                        className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all"
                        style={{ background: reviewPosting || !reviewText.trim() || reviewRating === 0 ? "#86efac" : "#22c55e" }}
                      >
                        {reviewPosting ? "Posting..." : "Post"}
                      </button>
                    </div>
                  </div>
                  {reviewRating === 0 && reviewText.trim().length > 0 && (
                    <p className="text-xs text-amber-600">⭐ Please select a star rating before posting</p>
                  )}
                  {reviewError && <p className="text-xs text-red-500">{reviewError}</p>}
                </div>
              )}
            </div>

            <div className="mx-4 border-t" style={{ borderColor: "#f0f0f0" }} />

            <div className="px-4 py-3 space-y-3">
              {reviewsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : reviews.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No reviews yet. Be the first to review!</p>
              ) : (
                (() => {
                  const myReview = reviews.find(r => r.customerId === customerAccount?.id);
                  const otherReviews = reviews
                    .filter(r => r.customerId !== customerAccount?.id)
                    .sort((a, b) => b.likeCount - a.likeCount);
                  const sorted = [...(myReview ? [myReview] : []), ...otherReviews];
                  return sorted.map(review => {
                    const isOwn = review.customerId === customerAccount?.id;
                    const isLiked = customerAccount ? review.likes.includes(customerAccount.id) : false;
                    const isEditing = editingReviewId === review.id;
                    return (
                      <div key={review.id} className="rounded-2xl p-3 space-y-2" style={{ background: isOwn ? "#f0fdf4" : "#fafafa", border: isOwn ? "1px solid #bbf7d0" : "1px solid #f3f4f6" }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0" style={{ background: isOwn ? "#22c55e" : "#9ca3af" }}>
                              {review.customerName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-800">
                                {review.customerName}
                                {isOwn && <span className="ml-1 text-green-600 font-semibold">(You)</span>}
                              </p>
                              <p className="text-[10px] text-gray-400">
                                {new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                {review.updatedAt !== review.createdAt && " · edited"}
                              </p>
                            </div>
                          </div>
                          {review.rating > 0 && (
                            <div className="flex items-center gap-0.5">
                              {[1,2,3,4,5].map(s => (
                                <Star key={s} className={`w-3 h-3 ${review.rating >= s ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                              ))}
                            </div>
                          )}
                          {isOwn && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => { setEditingReviewId(review.id); setEditReviewText(review.text); setEditReviewRating(review.rating || 0); setEditReviewHoverRating(0); }}
                                className="p-1.5 rounded-full hover:bg-green-100 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                              </button>
                              <button
                                onClick={async () => {
                                  if (!customerAccount) return;
                                  const res = await fetch(`/api/public/reviews/${review.id}`, {
                                    method: "DELETE",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ customerId: customerAccount.id }),
                                  });
                                  if (res.ok) setReviews(prev => prev.filter(r => r.id !== review.id));
                                }}
                                className="p-1.5 rounded-full hover:bg-red-100 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              </button>
                            </div>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="space-y-2">
                            {/* Edit rating selector */}
                            <div>
                              <p className="text-xs font-bold text-gray-600 mb-1">Rating <span className="text-red-500">*</span></p>
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => setEditReviewRating(s)}
                                    onMouseEnter={() => setEditReviewHoverRating(s)}
                                    onMouseLeave={() => setEditReviewHoverRating(0)}
                                    className="p-0.5 transition-transform active:scale-110"
                                  >
                                    <Star
                                      className={`w-6 h-6 transition-colors ${
                                        (editReviewHoverRating || editReviewRating) >= s
                                          ? "fill-amber-400 text-amber-400"
                                          : "text-gray-300"
                                      }`}
                                    />
                                  </button>
                                ))}
                              </div>
                            </div>
                            <textarea
                              value={editReviewText}
                              onChange={e => setEditReviewText(e.target.value)}
                              maxLength={500}
                              rows={3}
                              className="w-full rounded-xl border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-400"
                              style={{ borderColor: "#e5e7eb" }}
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => { setEditingReviewId(null); setEditReviewRating(0); setEditReviewHoverRating(0); }}
                                className="px-3 py-1.5 text-xs rounded-lg border text-gray-500"
                                style={{ borderColor: "#e5e7eb" }}
                              >Cancel</button>
                              <button
                                disabled={!editReviewText.trim() || editReviewRating === 0}
                                onClick={async () => {
                                  if (!editReviewText.trim() || editReviewRating === 0 || !customerAccount) return;
                                  const res = await fetch(`/api/public/reviews/${review.id}`, {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ customerId: customerAccount.id, text: editReviewText.trim(), rating: editReviewRating }),
                                  });
                                  if (res.ok) {
                                    const json = await res.json();
                                    setReviews(prev => prev.map(r => r.id === review.id ? { ...r, text: json.text, rating: json.rating, updatedAt: json.updatedAt } : r));
                                    setEditingReviewId(null);
                                    setEditReviewRating(0);
                                  }
                                }}
                                className="px-3 py-1.5 text-xs rounded-lg font-bold text-white"
                                style={{ background: !editReviewText.trim() || editReviewRating === 0 ? "#86efac" : "#22c55e" }}
                              >Save</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-700 leading-relaxed">{review.text}</p>
                        )}

                        {!isOwn && (
                          <button
                            onClick={async () => {
                              if (!customerAccount) return;
                              const res = await fetch(`/api/public/reviews/${review.id}/like`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ customerId: customerAccount.id }),
                              });
                              if (res.ok) {
                                const json = await res.json();
                                setReviews(prev => prev.map(r => r.id === review.id ? {
                                  ...r,
                                  likeCount: json.likeCount,
                                  likes: json.liked
                                    ? [...r.likes, customerAccount.id]
                                    : r.likes.filter(id => id !== customerAccount.id),
                                } : r));
                              }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all"
                            style={{ background: isLiked ? "rgba(239,68,68,0.08)" : "#f3f4f6", color: isLiked ? "#ef4444" : "#6b7280" }}
                          >
                            <Heart className={`w-3 h-3 ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
                            {review.likeCount > 0 ? `${review.likeCount} Helpful` : "Helpful"}
                          </button>
                        )}
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </div>
          {/* ──────────────────────────────────────────────────────────────── */}

          <div className="pb-28" />
        </div>

        <div className="shrink-0 z-20 border-t px-4 py-3 space-y-2" style={{ background: "#ffffff", borderColor: "#f0f0f0" }}>
          <div className="flex gap-2">
            <button onClick={openTryOn} className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl font-bold text-sm transition-colors border-2" style={{ background: "transparent", borderColor: "#000", color: "#000", fontFamily: "'Poppins', sans-serif" }}>
              <Camera className="w-4 h-4" />
              Virtual Try-On
            </button>
            <button
              className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl font-bold text-sm transition-colors border-2"
              style={selectedProduct.modelUrl
                ? { background: "transparent", borderColor: "#7c3aed", color: "#7c3aed", fontFamily: "'Poppins', sans-serif" }
                : { background: "transparent", borderColor: "#d1d5db", color: "#9ca3af", fontFamily: "'Poppins', sans-serif" }}
              onClick={() => { if (selectedProduct.modelUrl) setViewing3D(selectedProduct); else setShow3DUnavailable(true); }}
            >
              <Box className="w-4 h-4" />
              3D Model
            </button>
          </div>
          <button onClick={openBooking} className="w-full flex items-center justify-center gap-1.5 py-3.5 rounded-2xl font-black text-sm transition-colors" style={{ background: "#000000", color: "white", fontFamily: "'Montserrat', sans-serif" }}>
            Book at ₹{selectedProduct.discountPrice.toLocaleString()}
          </button>
        </div>

        {/* 3D Not Available popup */}
        {show3DUnavailable && (
          <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShow3DUnavailable(false)}>
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative w-full rounded-t-3xl px-6 pt-6 pb-12 text-center" style={{ background: "#ffffff" }} onClick={(e) => e.stopPropagation()}>
              <div className="w-12 h-1 rounded-full bg-gray-200 mx-auto mb-5" />
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#f3f0ff" }}>
                <Box className="w-8 h-8" style={{ color: "#7c3aed" }} />
              </div>
              <p className="font-black text-lg text-gray-900 mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>3D Model Not Available</p>
              <p className="text-sm text-gray-500 mb-6">This product doesn't have a 3D model yet. Check back later!</p>
              <button className="w-full py-3.5 rounded-2xl font-bold text-sm" style={{ background: "#000000", color: "white" }} onClick={() => setShow3DUnavailable(false)}>Got it</button>
            </div>
          </div>
        )}

        {/* Login Required popup (Add to Cart while logged out) */}
        {showLoginRequired && (
          <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowLoginRequired(false)}>
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative w-full rounded-t-3xl px-6 pt-6 pb-12 text-center" style={{ background: "#ffffff" }} onClick={(e) => e.stopPropagation()}>
              <div className="w-12 h-1 rounded-full bg-gray-200 mx-auto mb-5" />
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#f3f0ff" }}>
                <ShoppingCart className="w-8 h-8" style={{ color: "#7c3aed" }} />
              </div>
              <p className="font-black text-lg text-gray-900 mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>Login Required</p>
              <p className="text-sm text-gray-500 mb-6">Please login or create an account to add products to your cart.</p>
              <button
                className="w-full py-3.5 rounded-2xl font-bold text-sm"
                style={{ background: "#000000", color: "white" }}
                onClick={() => { setShowLoginRequired(false); setView("browse"); setSelectedProduct(null); setTab("profile"); }}
              >
                Go to Profile
              </button>
            </div>
          </div>
        )}

        {/* 3D Model Viewer */}
        {viewing3D && (
          <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.92)" }}>
            <div className="flex items-center justify-between px-4 pt-10 pb-3">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-white text-sm font-bold leading-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>{viewing3D.name}</p>
                  <p className="text-purple-300 text-[11px]">3D Model Viewer</p>
                </div>
              </div>
              <button onClick={() => setViewing3D(null)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.12)" }}>
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center px-4">
              <model-viewer
                src={viewing3D.modelUrl!}
                alt={viewing3D.name}
                auto-rotate="true"
                camera-controls="true"
                shadow-intensity="1"
                exposure="1"
                style={{ width: "100%", height: "420px", background: "transparent", borderRadius: "20px" }}
              />
            </div>
            <div className="px-4 pb-10 pt-2 text-center">
              <p className="text-gray-400 text-[12px]">👆 Drag to rotate &nbsp;·&nbsp; Pinch to zoom</p>
            </div>
          </div>
        )}
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
          <>
            {data.latitude !== null && data.longitude !== null && (
              <div className="mx-4 mt-4 rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm">
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Visit the store</p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5">{data.address || "India store location"}</p>
                  </div>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${data.latitude},${data.longitude}&travelmode=driving`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-xl bg-green-600 px-3 py-2 text-xs font-bold text-white"
                  >
                    Open in Google Maps
                  </a>
                </div>
                <IndiaMap
                  center={[data.longitude, data.latitude]}
                  zoom={15}
                  markers={[{
                    id: data.id,
                    lat: data.latitude,
                    lng: data.longitude,
                    title: data.name,
                    description: data.address ?? undefined,
                    color: "#16a34a",
                  }]}
                  interactive
                  showNavigation={false}
                  className="h-44 w-full rounded-none"
                />
              </div>
            )}
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
          </>
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
            onTryOn={(p) => {
              setSelectedProduct(p);
              setCustomerPhoto(null);
              setTryOnResult(null);
              setView("tryon");
            }}
          />
        )}
        {tab === "mybookings" && (
          <MyBookingTab
            myBookings={myBookings}
            seenStatus={seenStatus}
            completedStatus={completedStatus}
            storeSlug={slug}
            storeName={data?.name ?? ""}
            customerAccount={customerAccount}
            onNeedLogin={() => setTab("profile")}
          />
        )}
        {tab === "cart" && (
          customerAccount ? (
            <CartTab
              products={data.products}
              cartProductIds={new Set(customerAccount.cart ?? [])}
              onProductClick={openProduct}
              onRemove={handleAddToCart}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center pb-24 px-6 text-center" style={{ background: "#ffffff" }}>
              <div className="w-24 h-24 rounded-full flex items-center justify-center mb-5" style={{ background: "#f8f8f8" }}>
                <ShoppingCart className="w-10 h-10 text-gray-200" />
              </div>
              <h2 className="text-lg font-black text-gray-900 mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                Login to view your Cart
              </h2>
              <p className="text-sm text-gray-400 leading-relaxed max-w-xs mb-5">
                Your cart is linked to your account so it stays in sync everywhere you sign in.
              </p>
              <button
                onClick={() => setTab("profile")}
                className="px-6 py-3 rounded-2xl font-bold text-sm"
                style={{ background: "#000000", color: "white" }}
              >
                Go to Profile
              </button>
            </div>
          )
        )}
        {tab === "profile" && (
          <ProfileTab
            data={data}
            customerAccount={customerAccount}
            onSignUp={handleAccountSignUp}
            onSignIn={handleAccountSignIn}
            onLogout={handleAccountLogout}
            onSendOtp={handleSendOtp}
            signUpLoading={signUpLoading}
            signInLoading={signInLoading}
            otpLoading={otpLoading}
            signUpError={signUpError}
            signInError={signInError}
            otpError={otpError}
          />
        )}
      </div>

      <BottomNavbar
        activeTab={tab}
        onTabChange={(newTab) => { setTab(newTab); setShopInitCategory("all"); }}
        bookingCount={myBookings.filter(b => !completedStatus[b.id]).length}
        cartCount={customerAccount?.cart?.length ?? 0}
      />

      {/* Login Required popup (Add to Cart while logged out) */}
      {showLoginRequired && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowLoginRequired(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full rounded-t-3xl px-6 pt-6 pb-12 text-center" style={{ background: "#ffffff" }} onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-1 rounded-full bg-gray-200 mx-auto mb-5" />
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#f3f0ff" }}>
              <ShoppingCart className="w-8 h-8" style={{ color: "#7c3aed" }} />
            </div>
            <p className="font-black text-lg text-gray-900 mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>Login Required</p>
            <p className="text-sm text-gray-500 mb-6">Please login or create an account to add products to your cart.</p>
            <button
              className="w-full py-3.5 rounded-2xl font-bold text-sm"
              style={{ background: "#000000", color: "white" }}
              onClick={() => { setShowLoginRequired(false); setView("browse"); setSelectedProduct(null); setTab("profile"); }}
            >
              Go to Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
