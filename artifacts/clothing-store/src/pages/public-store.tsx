import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  MapPin, Clock, CalendarDays, MessageCircle, Heart, ShoppingBag,
  ChevronLeft, Search, X, Camera, Loader2, BookMarked, RefreshCw,
  CheckCircle2, Phone, TrendingDown, ShoppingCart, Download, Share2,
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
  customerName: string;
  city: string;
  whatsapp: string;
  selectedSize: string;
  bookedAt: string;
}

type ViewType = "store" | "product" | "tryon" | "booking" | "mybookings";

function discount(p: PublicProduct) {
  return p.actualPrice > p.discountPrice
    ? Math.round(((p.actualPrice - p.discountPrice) / p.actualPrice) * 100)
    : 0;
}

export default function PublicStore() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [view, setView] = useState<ViewType>("store");
  const [selectedProduct, setSelectedProduct] = useState<PublicProduct | null>(null);
  const [imgIndex, setImgIndex] = useState(0);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const [likedProducts, setLikedProducts] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});

  const [customerPhoto, setCustomerPhoto] = useState<string | null>(null);
  const [tryOnResult, setTryOnResult] = useState<string | null>(null);
  const [tryOnLoading, setTryOnLoading] = useState(false);

  const [bookingForm, setBookingForm] = useState({ name: "", city: "", whatsapp: "" });
  const [selectedSize, setSelectedSize] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const [myBookings, setMyBookings] = useState<SavedBooking[]>(() => {
    try { return JSON.parse(localStorage.getItem(`wmh_bookings_${slug}`) || "[]"); }
    catch { return []; }
  });
  const [seenStatus, setSeenStatus] = useState<Record<string, boolean>>({});

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
      data.products.forEach((p) => { counts[p.id] = p.likeCount; });
      setLikeCounts(counts);
    }
  }, [data]);

  /* Fetch seen-by-admin status for each booking when My Bookings opens */
  useEffect(() => {
    if (view !== "mybookings" || myBookings.length === 0) return;
    myBookings.forEach((bk) => {
      fetch(`/api/public/booking-status/${bk.id}`)
        .then((r) => r.ok ? r.json() : null)
        .then((d) => {
          if (d) setSeenStatus((prev) => ({ ...prev, [bk.id]: d.seenByAdmin }));
        })
        .catch(() => {});
    });
  }, [view]);

  const categories = useMemo(() => {
    if (!data) return [];
    const types: string[] = [];
    const funcCats: string[] = [];
    const seenTypes = new Set<string>();
    const seenFunc = new Set<string>();
    data.products.forEach((p) => {
      if (p.productType !== "Functional" && !seenTypes.has(p.productType)) {
        seenTypes.add(p.productType);
        types.push(p.productType);
      }
      if (p.functionCategory && !seenFunc.has(p.functionCategory)) {
        seenFunc.add(p.functionCategory);
        funcCats.push(p.functionCategory);
      }
    });
    return [...types, ...funcCats];
  }, [data]);

  const filteredProducts = useMemo(() => {
    if (!data) return [];
    let list = data.products;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
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
    return list;
  }, [data, search, activeCategory]);

  async function handleLike(productId: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    if (likedProducts.has(productId)) return;
    try {
      const res = await fetch(`/api/products/${productId}/like`, { method: "POST" });
      if (res.ok) {
        const d = await res.json();
        setLikeCounts((prev) => ({ ...prev, [productId]: d.likeCount }));
        setLikedProducts((prev) => new Set([...prev, productId]));
      }
    } catch {}
  }

  function openProduct(product: PublicProduct) {
    setSelectedProduct(product);
    setImgIndex(0);
    setView("product");
  }

  function goBack() {
    if (view === "tryon" || view === "booking") setView("product");
    else { setView("store"); setSelectedProduct(null); }
  }

  function openTryOn() {
    setCustomerPhoto(null);
    setTryOnResult(null);
    setView("tryon");
  }

  function openBooking() {
    setBookingForm({ name: "", city: "", whatsapp: "" });
    setSelectedSize(selectedProduct?.sizes[0] ?? "");
    setBookingSuccess(false);
    setView("booking");
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCustomerPhoto(ev.target?.result as string);
      setTryOnResult(null);
    };
    reader.readAsDataURL(file);
  }

  function saveTryOnImage() {
    if (!tryOnResult) return;
    const a = document.createElement("a");
    a.href = tryOnResult;
    a.download = "virtual-try-on.jpg";
    a.click();
  }

  async function shareTryOnImage() {
    if (!tryOnResult) return;
    try {
      const res = await fetch(tryOnResult);
      const blob = await res.blob();
      const file = new File([blob], "virtual-try-on.jpg", { type: "image/jpeg" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Virtual Try-On",
          text: `Check out my virtual try-on for ${selectedProduct?.name}!`,
        });
      } else {
        saveTryOnImage();
      }
    } catch {}
  }

  async function generateTryOn() {
    if (!customerPhoto || !selectedProduct) return;
    setTryOnLoading(true);
    setTryOnResult(null);
    try {
      await fetch(`/api/public/products/${selectedProduct.id}/tryon`, { method: "POST" });
      await new Promise<void>((resolve) => {
        const canvas = document.createElement("canvas");
        canvas.width = 400;
        canvas.height = 500;
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
            ctx.fillStyle = "rgba(0,0,0,0.4)";
            ctx.fillRect(0, 462, 400, 38);
            ctx.fillStyle = "white";
            ctx.font = "bold 12px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("AI Virtual Try-On • Web Media Hub", 200, 484);
            setTryOnResult(canvas.toDataURL("image/jpeg", 0.88));
            resolve();
          };
          clothImg.onload = finish;
          clothImg.onerror = finish;
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
          selectedSize: selectedSize,
        }),
      });
      if (res.ok) {
        const bk = await res.json();
        const saved: SavedBooking = {
          id: bk.id,
          productName: selectedProduct.name,
          productImage: selectedProduct.images[0] ?? "",
          customerName: bookingForm.name,
          city: bookingForm.city,
          whatsapp: bookingForm.whatsapp,
          selectedSize,
          bookedAt: new Date().toISOString(),
        };
        const updated = [saved, ...myBookings];
        setMyBookings(updated);
        localStorage.setItem(`wmh_bookings_${slug}`, JSON.stringify(updated));
        setBookingSuccess(true);
      }
    } catch {}
    finally { setBookingLoading(false); }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="h-36 bg-gradient-to-br from-violet-600 to-rose-500 animate-pulse" />
        <div className="p-4 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-5 bg-gray-200 rounded animate-pulse" style={{ width: `${80 - i * 10}%` }} />
          ))}
          <div className="grid grid-cols-2 gap-3 mt-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
        <ShoppingBag className="w-16 h-16 text-gray-200 mb-4" />
        <h1 className="text-xl font-bold text-gray-700">Store not found</h1>
        <p className="text-gray-400 mt-2 text-sm">This link may be invalid or the store may have been removed.</p>
      </div>
    );
  }

  const waLink = data.whatsappNumber
    ? `https://wa.me/${data.whatsappNumber.replace(/\D/g, "")}`
    : null;

  /* ─────────────────── MY BOOKINGS VIEW ─────────────────── */
  if (view === "mybookings") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 flex items-center gap-3 px-4 py-3">
          <button onClick={() => setView("store")} className="p-1.5 rounded-full hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-gray-900">My Bookings</span>
        </div>
        <div className="flex-1 p-4 space-y-3">
          {myBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <BookMarked className="w-12 h-12 text-gray-200 mb-3" />
              <p className="text-gray-400 text-sm">No bookings yet</p>
            </div>
          ) : (
            myBookings.map((bk) => {
              const seen = seenStatus[bk.id] ?? false;
              return (
                <div key={bk.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex gap-3">
                  {bk.productImage ? (
                    <img src={bk.productImage} className="w-16 h-20 object-cover rounded-lg flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <ShoppingBag className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm line-clamp-1">{bk.productName}</p>
                    {bk.selectedSize && (
                      <span className="inline-block text-[10px] border border-gray-200 rounded px-1.5 py-0.5 text-gray-500 mt-1">
                        Size: {bk.selectedSize}
                      </span>
                    )}
                    <p className="text-xs text-gray-500 mt-1">{bk.customerName} · {bk.city}</p>
                    <p className="text-xs text-gray-400">{bk.whatsapp}</p>
                    <p className="text-[10px] text-gray-300 mt-1">
                      {new Date(bk.bookedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  {/* Double tick — gray=not seen, blue=seen by admin */}
                  <div className="flex-shrink-0 mt-auto pb-0.5">
                    <svg width="22" height="14" viewBox="0 0 22 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      {/* First tick (back) */}
                      <path d="M1 7L5.5 11.5L13 3" stroke={seen ? "#53bdeb" : "#b0b8c1"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      {/* Second tick (front, offset right) */}
                      <path d="M7 7L11.5 11.5L19 3" stroke={seen ? "#53bdeb" : "#b0b8c1"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <p className="text-[9px] text-center mt-0.5" style={{ color: seen ? "#53bdeb" : "#b0b8c1" }}>
                      {seen ? "Seen" : "Sent"}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  /* ─────────────────── BOOKING FORM VIEW ─────────────────── */
  if (view === "booking" && selectedProduct) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 flex items-center gap-3 px-4 py-3">
          <button onClick={goBack} className="p-1.5 rounded-full hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-gray-900">Book Product</span>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          {/* Product preview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex gap-3 mb-6">
            {selectedProduct.images[0] ? (
              <img src={selectedProduct.images[0]} className="w-16 h-20 object-cover rounded-lg flex-shrink-0" />
            ) : (
              <div className="w-16 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-6 h-6 text-gray-300" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm line-clamp-2">{selectedProduct.name}</p>
              <p className="text-base font-bold text-gray-900 mt-1">₹{selectedProduct.discountPrice.toLocaleString()}</p>
              {discount(selectedProduct) > 0 && (
                <p className="text-xs text-gray-400 line-through">₹{selectedProduct.actualPrice.toLocaleString()}</p>
              )}
            </div>
          </div>

          {/* Size selector */}
          {selectedProduct.sizes.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Select Size</p>
              <div className="flex flex-wrap gap-2">
                {selectedProduct.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      selectedSize === s
                        ? "bg-rose-500 text-white border-rose-500"
                        : "bg-white text-gray-700 border-gray-200 hover:border-rose-300"
                    }`}
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
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Your Name *</label>
                <input
                  type="text"
                  value={bookingForm.name}
                  onChange={(e) => setBookingForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Enter your full name"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">City / Village</label>
                <input
                  type="text"
                  value={bookingForm.city}
                  onChange={(e) => setBookingForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="Your city or village"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">WhatsApp Number *</label>
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
                  className={`w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 bg-white ${
                    bookingForm.whatsapp.length > 0 && (() => {
                      const w = bookingForm.whatsapp;
                      if (w.length < 10) return true;
                      if (/^(\d)\1{9}$/.test(w)) return true;
                      return false;
                    })()
                      ? "border-red-400 focus:ring-red-300"
                      : "border-gray-200 focus:ring-rose-300"
                  }`}
                />
                {bookingForm.whatsapp.length > 0 && (() => {
                  const w = bookingForm.whatsapp;
                  if (w.length < 10) return (
                    <p className="text-[11px] text-red-500 mt-1">
                      {10 - w.length} more digit{10 - w.length !== 1 ? "s" : ""} needed
                    </p>
                  );
                  if (/^(\d)\1{9}$/.test(w)) return (
                    <p className="text-[11px] text-red-500 mt-1">
                      Repeated number not allowed (e.g. {w[0].repeat(10)})
                    </p>
                  );
                  return (
                    <p className="text-[11px] text-green-600 mt-1">✓ Valid number</p>
                  );
                })()}
              </div>
              {(() => {
                const w = bookingForm.whatsapp;
                const isValidPhone = w.length === 10 && !/^(\d)\1{9}$/.test(w);
                const canBook = !bookingLoading && !!bookingForm.name && isValidPhone;
                return (
                  <button
                    onClick={submitBooking}
                    disabled={!canBook}
                    className="w-full bg-rose-500 hover:bg-rose-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {bookingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Book Product
                  </button>
                );
              })()}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Booking Confirmed!</h3>
              <p className="text-sm text-gray-500 mb-6">
                Your booking for <strong>{selectedProduct.name}</strong> has been received. The store owner will contact you soon.
              </p>
              <button
                onClick={() => setView("mybookings")}
                className="text-sm text-rose-500 font-semibold underline"
              >
                View My Bookings
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ─────────────────── VIRTUAL TRY-ON VIEW ─────────────────── */
  if (view === "tryon" && selectedProduct) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex flex-col text-white">
        <div className="sticky top-0 z-10 bg-[#0f0f0f] border-b border-white/10 flex items-center gap-3 px-4 py-3">
          <button onClick={goBack} className="p-1.5 rounded-full hover:bg-white/10">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-bold">Virtual Try-On</span>
          <span className="ml-auto text-[10px] text-white/40 bg-white/10 px-2 py-0.5 rounded-full">AI Powered</span>
        </div>

        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          {/* Left panel */}
          <div className="flex-1 flex flex-col border-r border-white/10">
            {/* Product image */}
            <div className="flex-1 relative bg-[#1a1a1a] border-b border-white/10">
              <div className="absolute top-2 left-2 text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full z-10">
                Product
              </div>
              {selectedProduct.images[0] ? (
                <img
                  src={selectedProduct.images[0]}
                  className="w-full h-full object-contain"
                  style={{ maxHeight: "220px" }}
                />
              ) : (
                <div className="w-full h-40 flex items-center justify-center">
                  <ShoppingBag className="w-10 h-10 text-white/20" />
                </div>
              )}
            </div>

            {/* Customer photo */}
            <div
              className="flex-1 relative bg-[#111] border-b border-white/10 min-h-[180px]"
              onClick={!customerPhoto ? () => photoInputRef.current?.click() : undefined}
              style={!customerPhoto ? { cursor: "pointer" } : undefined}
            >
              <div className="absolute top-2 left-2 text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full z-10">
                Your Photo
              </div>
              {customerPhoto ? (
                <>
                  <img src={customerPhoto} className="w-full h-full object-contain" style={{ maxHeight: "220px" }} />
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    className="absolute bottom-2 right-2 text-[10px] bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded-full flex items-center gap-1"
                  >
                    <Camera className="w-3 h-3" /> Change Photo
                  </button>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 min-h-[160px]">
                  <Camera className="w-8 h-8 text-white/30" />
                  <p className="text-xs text-white/40">Tap anywhere to upload your photo</p>
                </div>
              )}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>

            {/* Generate button */}
            <div className="p-3">
              <button
                onClick={generateTryOn}
                disabled={!customerPhoto || tryOnLoading}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-white/10 disabled:text-white/30 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
              >
                {tryOnLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {tryOnLoading ? "Generating..." : "Generate Try-On"}
              </button>
              {!customerPhoto && (
                <p className="text-[10px] text-white/30 text-center mt-1">Upload your photo first</p>
              )}
            </div>
          </div>

          {/* Right panel — AI Result */}
          <div className="flex-1 bg-[#0d0d0d] flex flex-col items-center justify-center min-h-[300px]">
            {tryOnLoading && (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
                <p className="text-sm text-white/50">Generating try-on...</p>
              </div>
            )}
            {!tryOnLoading && tryOnResult && (
              <div className="flex flex-col items-center w-full">
                <img src={tryOnResult} className="w-full object-contain max-h-[420px]" />
                <div className="flex gap-3 mt-3 px-4 w-full">
                  <button
                    onClick={saveTryOnImage}
                    className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    onClick={shareTryOnImage}
                    className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                </div>
              </div>
            )}
            {!tryOnLoading && !tryOnResult && (
              <div className="flex flex-col items-center gap-3 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
                  <Camera className="w-7 h-7 text-white/20" />
                </div>
                <p className="text-sm text-white/40">AI result will appear here</p>
                <p className="text-[10px] text-white/20">Upload your photo and tap Generate</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────────── PRODUCT DETAIL VIEW ─────────────────── */
  if (view === "product" && selectedProduct) {
    const pDiscount = discount(selectedProduct);
    const productWaLink = waLink
      ? `${waLink}?text=${encodeURIComponent(`Hi! I'm interested in "${selectedProduct.name}" (₹${selectedProduct.discountPrice}). Can you help me?`)}`
      : null;
    const relatedProducts = data.products.filter(
      (p) => p.id !== selectedProduct.id && p.productType === selectedProduct.productType
    );

    return (
      <div className="min-h-screen bg-[#f4f4f4] flex flex-col">

        {/* ── Sticky top bar ── */}
        <div className="flex items-center gap-2 px-3 py-2 bg-white border-b sticky top-0 z-20 shadow-sm">
          <button onClick={goBack} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h2 className="font-semibold text-sm line-clamp-1 flex-1 text-gray-800">{selectedProduct.name}</h2>
          <button
            onClick={(e) => handleLike(selectedProduct.id, e)}
            className={`p-1.5 rounded-full transition-all ${
              likedProducts.has(selectedProduct.id) ? "bg-rose-50 text-rose-500" : "hover:bg-gray-100 text-gray-400"
            }`}
          >
            <Heart className={`w-5 h-5 ${likedProducts.has(selectedProduct.id) ? "fill-current" : ""}`} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto pb-24">

          {/* Swipeable image carousel */}
          <div className="relative bg-white">
            <div
              ref={carouselRef}
              className="flex overflow-x-auto"
              style={{ scrollSnapType: "x mandatory", scrollBehavior: "smooth" }}
              onScroll={(e) => {
                const el = e.currentTarget;
                const idx = Math.round(el.scrollLeft / el.clientWidth);
                setImgIndex(idx);
              }}
            >
              {(selectedProduct.images.length > 0 ? selectedProduct.images : [null]).map((img, i) => (
                <div
                  key={i}
                  className="shrink-0 w-full bg-white"
                  style={{ scrollSnapAlign: "start", aspectRatio: "3/4", maxHeight: "48vh" }}
                >
                  {img ? (
                    <img src={img} alt={selectedProduct.name} className="w-full h-full object-contain" draggable={false} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <ShoppingBag className="w-20 h-20 opacity-20" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Discount badge */}
            {pDiscount > 0 && (
              <div className="absolute top-3 left-3 bg-[#ff3e6c] text-white text-[11px] font-bold px-2 py-0.5 rounded-sm">
                {pDiscount}% OFF
              </div>
            )}

            {/* Product type tag */}
            <div className="absolute top-3 right-3 bg-black/50 text-white text-[10px] font-medium px-2 py-0.5 rounded-sm">
              {selectedProduct.productType}
            </div>

            {/* Dot indicators */}
            {selectedProduct.images.length > 1 && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                {selectedProduct.images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      carouselRef.current?.scrollTo({ left: i * (carouselRef.current?.clientWidth ?? 0), behavior: "smooth" });
                      setImgIndex(i);
                    }}
                    className="rounded-full transition-all"
                    style={{
                      width: i === imgIndex ? 20 : 6,
                      height: 6,
                      background: i === imgIndex ? "#ff3e6c" : "rgba(255,255,255,0.7)",
                      border: "1px solid rgba(0,0,0,0.15)",
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Info card ── */}
          <div className="bg-white mt-2 px-4 pt-4 pb-2">
            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="text-[11px] font-semibold bg-[#fff0f5] text-[#ff3e6c] border border-[#ffb3cb] px-2.5 py-0.5 rounded-full">
                {selectedProduct.productType}
              </span>
              {selectedProduct.functionCategory && (
                <span className="text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200 px-2.5 py-0.5 rounded-full">
                  {selectedProduct.functionCategory}
                </span>
              )}
              {selectedProduct.age && (
                <span className="text-[11px] font-medium bg-orange-50 text-orange-600 border border-orange-200 px-2.5 py-0.5 rounded-full">
                  {selectedProduct.age}
                </span>
              )}
              {selectedProduct.gender && (
                <span className="text-[11px] font-medium bg-blue-50 text-blue-600 border border-blue-200 px-2.5 py-0.5 rounded-full">
                  {selectedProduct.gender}
                </span>
              )}
            </div>

            {/* Product name */}
            <h1 className="text-[15px] font-semibold text-gray-900 leading-snug mb-3">{selectedProduct.name}</h1>

            {/* Price row */}
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-[22px] font-extrabold text-gray-900">
                ₹{selectedProduct.discountPrice.toLocaleString()}
              </span>
              {pDiscount > 0 && (
                <>
                  <span className="text-sm text-gray-400 line-through">
                    ₹{selectedProduct.actualPrice.toLocaleString()}
                  </span>
                  <span className="text-sm font-bold text-[#2ecc71]">
                    ↓{pDiscount}% off
                  </span>
                </>
              )}
            </div>

            {/* Likes */}
            <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-1">
              <Heart className="w-4 h-4 text-rose-400 fill-current" />
              <span>{(likeCounts[selectedProduct.id] ?? selectedProduct.likeCount).toLocaleString("en-IN")} people liked this</span>
            </div>
          </div>

          {/* ── Sizes ── */}
          {selectedProduct.sizes.length > 0 && (
            <div className="bg-white mt-2 px-4 py-4">
              <p className="text-[13px] font-bold text-gray-800 mb-3 tracking-wide uppercase">Select Size</p>
              <div className="flex flex-wrap gap-2">
                {selectedProduct.sizes.map((s) => (
                  <span key={s} className="px-4 py-1.5 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Description ── */}
          {selectedProduct.description && (
            <div className="bg-white mt-2 px-4 py-4">
              <p className="text-[13px] font-bold text-gray-800 mb-2 tracking-wide uppercase">Description</p>
              <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-wrap">{selectedProduct.description}</p>
            </div>
          )}

          {/* ── WhatsApp ── */}
          {productWaLink && (
            <div className="bg-white mt-2 px-4 py-3">
              <a
                href={productWaLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-[#25D366] text-white font-semibold py-3 px-4 rounded-xl w-full justify-center text-sm"
              >
                <MessageCircle className="w-4 h-4" />
                Ask on WhatsApp
              </a>
            </div>
          )}

          {/* ── More like this ── */}
          {relatedProducts.length > 0 && (
            <div className="bg-white mt-2 pb-4">
              <div className="flex items-center justify-between px-4 pt-4 pb-3">
                <span className="text-[15px] font-bold text-gray-900">More like this</span>
              </div>
              <div className="flex gap-3 overflow-x-auto px-4 pb-1" style={{ scrollSnapType: "x mandatory" }}>
                {relatedProducts.slice(0, 10).map((p) => {
                  const disc = discount(p);
                  return (
                    <div
                      key={p.id}
                      className="shrink-0 cursor-pointer"
                      style={{ width: 140, scrollSnapAlign: "start" }}
                      onClick={() => { setSelectedProduct(p); setImgIndex(0); carouselRef.current?.scrollTo({ left: 0 }); }}
                    >
                      <div className="rounded-lg overflow-hidden bg-gray-100 relative" style={{ aspectRatio: "3/4" }}>
                        {p.images[0] ? (
                          <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="w-8 h-8 opacity-20" />
                          </div>
                        )}
                        {disc > 0 && (
                          <span className="absolute bottom-1.5 left-1.5 bg-[#ff3e6c] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm">
                            {disc}% OFF
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 space-y-0.5">
                        <p className="text-[11px] font-medium text-gray-800 line-clamp-2 leading-tight">{p.name}</p>
                        {disc > 0 && <p className="text-[10px] font-bold text-[#2ecc71]">{disc}% OFF</p>}
                        <p className="text-[12px] font-bold text-gray-900">₹{p.discountPrice.toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Fixed bottom bar */}
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-100 shadow-xl">
          <div className="flex gap-3 px-4 py-3">
            {/* Left — outlined white button */}
            <button
              onClick={openTryOn}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full border-2 border-gray-300 bg-white text-gray-800 font-bold text-sm active:bg-gray-50 transition-colors"
            >
              <Camera className="w-4 h-4" />
              Virtual Try-On
            </button>
            {/* Right — yellow filled button with price */}
            <button
              onClick={openBooking}
              className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-full bg-[#FFD000] text-gray-900 font-extrabold text-sm active:bg-yellow-400 transition-colors shadow-sm"
            >
              Book at ₹{selectedProduct.discountPrice.toLocaleString()}
            </button>
          </div>
          {/* iOS-style home indicator */}
          <div className="flex justify-center pb-2">
            <div className="w-28 h-1 bg-gray-300 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────────── MAIN STORE VIEW ─────────────────── */
  const openDaySet = new Set(
    (data.openDays ?? "").split(",").map((d) => d.trim()).filter(Boolean)
  );
  const DAY_COLS = [
    ["Sun", "Mon", "Tue", "Wed"],
    ["Thu", "Fri", "Sat"],
  ];
  const DAY_FULL: Record<string, string> = {
    Sun: "Sunday", Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday",
    Thu: "Thursday", Fri: "Friday", Sat: "Saturday",
  };

  return (
    <div className="min-h-screen bg-[#f4f4f4] flex flex-col">
      {/* ── Store Header ── */}
      <div className="bg-white border-b border-gray-100 flex">

        {/* Left — Square banner */}
        <div className="flex-shrink-0 bg-black" style={{ width: "50%", aspectRatio: "1/1" }}>
          {data.bannerImage ? (
            <img
              src={data.bannerImage}
              alt={data.name}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <ShoppingBag className="w-10 h-10 text-gray-300" />
            </div>
          )}
        </div>

        {/* Right — Info */}
        <div className="flex-1 flex flex-col justify-between p-3 overflow-hidden min-w-0">
          {/* Store name */}
          <h1 className="text-sm font-extrabold text-gray-900 leading-tight tracking-tight line-clamp-2 mb-1">
            {data.name}
          </h1>

          {/* Address */}
          {data.address && (
            <div className="flex items-start gap-1 mb-1.5">
              <MapPin className="w-3 h-3 text-rose-500 mt-0.5 shrink-0" />
              <p className="text-[10px] text-gray-600 leading-snug line-clamp-2">{data.address}</p>
            </div>
          )}

          {/* Days grid — 2 columns */}
          {data.openDays && (
            <div className="flex gap-2 mb-1.5">
              {DAY_COLS.map((col, ci) => (
                <div key={ci} className="flex flex-col gap-0.5">
                  {col.map((abbr) => {
                    const full = DAY_FULL[abbr];
                    const isOpen = openDaySet.has(full);
                    return (
                      <span
                        key={abbr}
                        className={`text-[9px] font-semibold leading-tight ${
                          isOpen ? "text-green-600" : "text-gray-300"
                        }`}
                      >
                        {abbr}
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* Timing */}
          {data.openingTime && (
            <div className="flex items-center gap-1 mb-1.5">
              <Clock className="w-3 h-3 text-amber-500 shrink-0" />
              <p className="text-[10px] text-gray-600 leading-tight">{data.openingTime}</p>
            </div>
          )}

          {/* WhatsApp */}
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-white bg-[#25D366] rounded-full px-2.5 py-1 font-semibold self-start"
            >
              <MessageCircle className="w-3 h-3" />
              WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* ── Search + My Bookings ── */}
      <div className="px-3 py-2 bg-white border-b border-gray-100 flex gap-2 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 bg-gray-50"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>
        <button
          onClick={() => setView("mybookings")}
          className="relative flex-shrink-0 flex flex-col items-center gap-0.5 bg-gray-50 text-gray-500 px-3 py-2 rounded-xl text-[11px] font-bold border border-gray-200"
        >
          <ShoppingCart className="w-5 h-5 text-gray-500" />
          <span>Cart</span>
          {myBookings.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
              {myBookings.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Category Tabs ── */}
      <div className="bg-white border-b border-gray-100 overflow-x-auto">
        <div className="flex gap-0 px-3 py-2 min-w-max">
          {["all", ...categories].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold mr-1.5 whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? "bg-rose-500 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat === "all" ? "All" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Products Grid (2 columns) ── */}
      <div className="flex-1">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ShoppingBag className="w-12 h-12 text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">
              {search ? `No products found for "${search}"` : "No products in this category"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-[2px] bg-gray-200">
            {filteredProducts.map((p) => {
              const pDis = discount(p);
              const liked = likedProducts.has(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => openProduct(p)}
                  className="bg-white cursor-pointer active:opacity-90"
                >
                  {/* Image */}
                  <div className="aspect-[3/4] bg-gray-100 relative overflow-hidden">
                    {p.images[0] ? (
                      <img
                        src={p.images[0]}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                    {/* Heart / Like button */}
                    <button
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow-sm active:scale-90 transition-transform"
                      onClick={(e) => { e.stopPropagation(); handleLike(p.id, e); }}
                    >
                      <Heart className={`w-3.5 h-3.5 ${liked ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
                    </button>
                    {/* Like count overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent pt-6 pb-1.5 px-2">
                      <div className="flex items-center gap-1">
                        <Heart className="w-3 h-3 fill-red-400 text-red-400" />
                        <span className="text-white text-[11px] font-semibold">
                          {(likeCounts[p.id] ?? p.likeCount).toLocaleString("en-IN")}
                        </span>
                        <span className="text-white/70 text-[10px]">likes</span>
                      </div>
                    </div>
                  </div>

                  {/* Card info */}
                  <div className="p-2 pb-3 space-y-0.5">
                    {p.functionCategory && (
                      <p className="text-[11px] font-bold text-purple-600 leading-tight uppercase tracking-wide truncate">
                        {p.functionCategory}
                      </p>
                    )}
                    <p className="text-[12px] text-gray-700 leading-tight line-clamp-2">{p.name}</p>

                    {/* Pricing row */}
                    <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                      {pDis > 0 && (
                        <span className="flex items-center gap-0.5 text-[11px] font-bold text-green-600">
                          <TrendingDown className="w-3 h-3" />
                          {pDis}%
                        </span>
                      )}
                      {p.actualPrice > p.discountPrice && (
                        <span className="text-[11px] text-gray-400 line-through">
                          ₹{p.actualPrice.toLocaleString()}
                        </span>
                      )}
                      <span className="text-[13px] font-bold text-gray-900">
                        ₹{p.discountPrice.toLocaleString()}
                      </span>
                    </div>

                    {/* Size */}
                    {p.sizes.length > 0 && (
                      <div className="pt-1">
                        <p className="text-[10px] font-semibold text-gray-500 mb-0.5">Size</p>
                        <div className="flex flex-wrap gap-1">
                          {p.sizes.slice(0, 4).map((s) => (
                            <span key={s} className="text-[9px] border border-gray-300 rounded px-1.5 py-0.5 text-gray-600 bg-gray-50">
                              {s}
                            </span>
                          ))}
                          {p.sizes.length > 4 && (
                            <span className="text-[9px] text-gray-400">+{p.sizes.length - 4}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Age */}
                    {p.age && (
                      <div className="pt-0.5">
                        <p className="text-[10px] font-semibold text-gray-500 mb-0.5">Age</p>
                        <span className="text-[9px] bg-orange-50 text-orange-600 border border-orange-200 rounded px-1.5 py-0.5 font-medium">
                          {p.age}
                        </span>
                      </div>
                    )}

                    {/* Gender */}
                    {p.gender && (
                      <div className="pt-0.5">
                        <p className="text-[10px] font-semibold text-gray-500 mb-0.5">Gender</p>
                        <span className="text-[9px] bg-blue-50 text-blue-600 border border-blue-200 rounded px-1.5 py-0.5 font-medium">
                          {p.gender}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-[11px] text-gray-300 border-t border-gray-100 bg-white">
        Powered by Web Media Hub
      </div>
    </div>
  );
}
