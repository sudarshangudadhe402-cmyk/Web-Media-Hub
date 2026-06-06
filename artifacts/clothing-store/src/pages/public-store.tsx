import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  MapPin, Clock, CalendarDays, MessageCircle, Heart, ShoppingBag,
  ChevronLeft, Search, X, Camera, Loader2, BookMarked, RefreshCw,
  CheckCircle2, Phone,
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

  const photoInputRef = useRef<HTMLInputElement>(null);

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
            myBookings.map((bk) => (
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
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-1" />
              </div>
            ))
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
                  value={bookingForm.whatsapp}
                  onChange={(e) => setBookingForm((f) => ({ ...f, whatsapp: e.target.value }))}
                  placeholder="10-digit WhatsApp number"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
                />
              </div>
              <button
                onClick={submitBooking}
                disabled={bookingLoading || !bookingForm.name || !bookingForm.whatsapp}
                className="w-full bg-rose-500 hover:bg-rose-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {bookingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Book Product
              </button>
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
              <button
                onClick={() => {
                  const idx = (selectedProduct.images.indexOf(selectedProduct.images[imgIndex]) + 1) % selectedProduct.images.length;
                  setImgIndex(idx);
                }}
                className="absolute bottom-2 right-2 text-[10px] bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded-full flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Change Clothes
              </button>
            </div>

            {/* Customer photo */}
            <div className="flex-1 relative bg-[#111] border-b border-white/10 min-h-[180px]">
              <div className="absolute top-2 left-2 text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full z-10">
                Your Photo
              </div>
              {customerPhoto ? (
                <img src={customerPhoto} className="w-full h-full object-contain" style={{ maxHeight: "220px" }} />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 min-h-[160px]">
                  <Camera className="w-8 h-8 text-white/30" />
                  <p className="text-xs text-white/40">Upload your photo</p>
                </div>
              )}
              <button
                onClick={() => photoInputRef.current?.click()}
                className="absolute bottom-2 right-2 text-[10px] bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded-full flex items-center gap-1"
              >
                <Camera className="w-3 h-3" /> Change Photo
              </button>
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
            <div className="absolute top-16 right-2 text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full">
              AI Result
            </div>
            {tryOnLoading && (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
                <p className="text-sm text-white/50">Generating try-on...</p>
              </div>
            )}
            {!tryOnLoading && tryOnResult && (
              <img src={tryOnResult} className="w-full h-full object-contain max-h-[460px]" />
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

    return (
      <div className="min-h-screen bg-white flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 flex items-center gap-3 px-4 py-3">
          <button onClick={goBack} className="p-1.5 rounded-full hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-semibold text-gray-900 line-clamp-1 flex-1">{selectedProduct.name}</span>
          <button
            onClick={(e) => handleLike(selectedProduct.id, e)}
            className={`p-1.5 rounded-full transition-all ${
              likedProducts.has(selectedProduct.id)
                ? "bg-rose-50 text-rose-500"
                : "hover:bg-gray-100 text-gray-400"
            }`}
          >
            <Heart className={`w-5 h-5 ${likedProducts.has(selectedProduct.id) ? "fill-current" : ""}`} />
          </button>
        </div>

        {/* Scrollable content with bottom padding for fixed bar */}
        <div className="flex-1 overflow-y-auto pb-24">
          {/* Product Images */}
          <div className="relative bg-gray-50" style={{ height: "55vw", maxHeight: "380px", minHeight: "220px" }}>
            {selectedProduct.images.length > 0 ? (
              <img
                src={selectedProduct.images[imgIndex]}
                className="w-full h-full object-contain"
                alt={selectedProduct.name}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ShoppingBag className="w-16 h-16 text-gray-200" />
              </div>
            )}
            {pDiscount > 0 && (
              <span className="absolute top-3 left-3 bg-rose-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
                -{pDiscount}% OFF
              </span>
            )}
            {selectedProduct.images.length > 1 && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                {selectedProduct.images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all ${i === imgIndex ? "bg-rose-500 w-4" : "bg-gray-300"}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          {selectedProduct.images.length > 1 && (
            <div className="flex gap-2 px-4 py-2 overflow-x-auto border-b border-gray-100">
              {selectedProduct.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setImgIndex(i)}
                  className={`flex-shrink-0 w-14 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    i === imgIndex ? "border-rose-500" : "border-gray-100"
                  }`}
                >
                  <img src={img} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Product Info */}
          <div className="px-4 pt-4 pb-2 space-y-4">
            {/* Sizes */}
            {selectedProduct.sizes.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Available Sizes</p>
                <div className="flex flex-wrap gap-2">
                  {selectedProduct.sizes.map((s) => (
                    <span key={s} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Age */}
            {selectedProduct.age && (
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Age Group</p>
                <p className="text-sm text-gray-700">{selectedProduct.age}</p>
              </div>
            )}

            {/* Price — Flipkart style */}
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-gray-900">
                ₹{selectedProduct.discountPrice.toLocaleString()}
              </span>
              {pDiscount > 0 && (
                <>
                  <span className="text-sm text-gray-400 line-through">
                    ₹{selectedProduct.actualPrice.toLocaleString()}
                  </span>
                  <span className="text-sm font-bold text-green-600">{pDiscount}% off</span>
                </>
              )}
            </div>

            {/* Product type / category badge */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs bg-violet-50 text-violet-700 font-medium px-2.5 py-1 rounded-full">
                {selectedProduct.productType}
              </span>
              {selectedProduct.functionCategory && (
                <span className="text-xs bg-amber-50 text-amber-700 font-medium px-2.5 py-1 rounded-full">
                  {selectedProduct.functionCategory}
                </span>
              )}
            </div>

            {/* Description */}
            {selectedProduct.description && (
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Description</p>
                <p className="text-sm text-gray-600 leading-relaxed">{selectedProduct.description}</p>
              </div>
            )}

            {/* WhatsApp */}
            {productWaLink && (
              <a
                href={productWaLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-[#25D366] text-white font-semibold py-3 px-4 rounded-xl w-full justify-center text-sm"
              >
                <MessageCircle className="w-4 h-4" />
                Ask on WhatsApp
              </a>
            )}

            {/* Likes */}
            <div className="flex items-center gap-1.5 text-sm text-gray-400">
              <Heart className="w-4 h-4 text-rose-400 fill-current" />
              <span>{likeCounts[selectedProduct.id] ?? selectedProduct.likeCount} people liked this</span>
            </div>
          </div>

          {/* More products */}
          {data.products.filter((p) => p.id !== selectedProduct.id).length > 0 && (
            <div className="px-4 pt-4 border-t border-gray-100 mt-2">
              <p className="text-sm font-bold text-gray-700 mb-3">More Products</p>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {data.products
                  .filter((p) => p.id !== selectedProduct.id)
                  .slice(0, 10)
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedProduct(p); setImgIndex(0); }}
                      className="flex-shrink-0 w-28 text-left"
                    >
                      <div className="w-28 h-32 rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                        {p.images[0] ? (
                          <img src={p.images[0]} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="w-6 h-6 text-gray-200" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-700 font-medium mt-1 line-clamp-1">{p.name}</p>
                      <p className="text-xs font-bold text-gray-900">₹{p.discountPrice.toLocaleString()}</p>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Fixed bottom bar — like Flipkart */}
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-100 flex gap-0 shadow-lg">
          <button
            onClick={openTryOn}
            className="flex-1 py-3.5 flex flex-col items-center gap-0.5 bg-violet-600 text-white font-bold text-xs hover:bg-violet-700 transition-colors"
          >
            <Camera className="w-5 h-5" />
            Virtual Try-On
          </button>
          <button
            onClick={openBooking}
            className="flex-1 py-3.5 flex flex-col items-center gap-0.5 bg-rose-500 text-white font-bold text-xs hover:bg-rose-600 transition-colors"
          >
            <BookMarked className="w-5 h-5" />
            Book Product
          </button>
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
          className="relative flex-shrink-0 flex flex-col items-center gap-0.5 bg-rose-50 text-rose-600 px-3 py-2 rounded-xl text-[11px] font-bold border border-rose-100"
        >
          <BookMarked className="w-4 h-4" />
          <span>My Bookings</span>
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
      <div className="flex-1 p-3">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ShoppingBag className="w-12 h-12 text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">
              {search ? `No products found for "${search}"` : "No products in this category"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((p) => {
              const pDis = discount(p);
              const liked = likedProducts.has(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => openProduct(p)}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-left group active:scale-[0.98] transition-transform"
                >
                  <div className="relative aspect-[3/4] bg-gray-50 overflow-hidden">
                    {p.images[0] ? (
                      <img
                        src={p.images[0]}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-gray-200" />
                      </div>
                    )}
                    {pDis > 0 && (
                      <span className="absolute top-2 left-2 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        -{pDis}%
                      </span>
                    )}
                    <button
                      onClick={(e) => handleLike(p.id, e)}
                      className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow transition-all ${
                        liked ? "bg-rose-500 text-white" : "bg-white/90 text-gray-400 hover:text-rose-500"
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${liked ? "fill-current" : ""}`} />
                    </button>
                  </div>
                  <div className="p-2.5 space-y-1">
                    <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-tight">{p.name}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold text-gray-900">₹{p.discountPrice.toLocaleString()}</span>
                      {pDis > 0 && (
                        <span className="text-[10px] text-gray-400 line-through">
                          ₹{p.actualPrice.toLocaleString()}
                        </span>
                      )}
                    </div>
                    {p.sizes.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {p.sizes.slice(0, 3).map((s) => (
                          <span key={s} className="text-[9px] border border-gray-200 rounded px-1 py-0.5 text-gray-500">
                            {s}
                          </span>
                        ))}
                        {p.sizes.length > 3 && (
                          <span className="text-[9px] text-gray-400">+{p.sizes.length - 3}</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-[10px] text-gray-400">
                      <Heart className="w-2.5 h-2.5 text-rose-300 fill-current" />
                      <span>{likeCounts[p.id] ?? p.likeCount}</span>
                    </div>
                  </div>
                </button>
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
