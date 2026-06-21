import { Search, X, ShoppingBag, Heart, Zap, Camera, CreditCard, BookOpen, ChevronRight, CalendarDays, MapPin, Info } from "lucide-react";
import { useState } from "react";

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

export interface AdminCategory {
  id: string;
  name: string;
  coverImage?: string | null;
  description?: string | null;
}

interface HomeTabProps {
  storeName: string;
  products: PublicProduct[];
  categories: AdminCategory[];
  likedProducts: Set<string>;
  likeCounts: Record<string, number>;
  onProductClick: (product: PublicProduct) => void;
  onLike: (productId: string, e: React.MouseEvent) => void;
  onViewAll: () => void;
  onCategoryOpen: (category: AdminCategory) => void;
  onTryOnClick: () => void;
}

const FEATURES = [
  { icon: Camera, label: "Virtual Try-On", desc: "See before you buy" },
  { icon: BookOpen, label: "Easy Booking", desc: "Book in seconds" },
  { icon: CreditCard, label: "Loyalty Card", desc: "Earn rewards" },
  { icon: ShoppingBag, label: "Digital Catalog", desc: "Browse anytime" },
];

function discountPct(p: PublicProduct) {
  return p.actualPrice > p.discountPrice
    ? Math.round(((p.actualPrice - p.discountPrice) / p.actualPrice) * 100)
    : 0;
}

export default function HomeTab({
  storeName,
  products,
  categories,
  likedProducts,
  likeCounts,
  onProductClick,
  onLike,
  onViewAll,
  onCategoryOpen,
  onTryOnClick,
}: HomeTabProps) {
  const [search, setSearch] = useState("");
  const [arrivalTab, setArrivalTab] = useState<"arrivals" | "trending">("arrivals");

  const newArrivals = products.slice(0, 8);
  const mostTrending = [...products]
    .filter((p) => p.likeCount > 0 && p.tryOnLikeCount > 0)
    .sort((a, b) => (b.recentLikeCount + b.recentTryOnCount) - (a.recentLikeCount + a.recentTryOnCount))
    .slice(0, 10);
  const filteredBySearch = search.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.productType.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  return (
    <div className="flex-1 overflow-y-auto pb-24" style={{ background: "#ffffff" }}>

      {/* ── Header ── */}
      <div className="px-4 pt-6 pb-2 text-center">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          {storeName || "Web Media Hub"}
        </h1>
      </div>

      {/* ── Search Bar ── */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for products, brands..."
            className="w-full pl-11 pr-10 focus:outline-none text-sm transition-colors"
            style={{
              height: 56,
              borderRadius: 18,
              background: "#F5F5F5",
              color: "#212121",
              fontFamily: "'Inter', sans-serif",
            }}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Search Results */}
      {filteredBySearch && (
        <div className="px-4 pb-4">
          <p className="text-xs text-gray-400 mb-2 font-medium">{filteredBySearch.length} results for "{search}"</p>
          <div className="grid grid-cols-2 gap-3">
            {filteredBySearch.slice(0, 6).map((p) => {
              const disc = discountPct(p);
              const liked = likedProducts.has(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => onProductClick(p)}
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
                      <span className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#000", color: "#fff" }}>
                        {disc}%
                      </span>
                    )}
                    <button
                      className="absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow"
                      style={{ background: "rgba(255,255,255,0.9)" }}
                      onClick={(e) => { e.stopPropagation(); onLike(p.id, e); }}
                    >
                      <Heart className={`w-3.5 h-3.5 ${liked ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
                    </button>
                  </div>
                  <div className="px-2.5 pt-2 pb-2.5">
                    <p className="text-[12px] font-semibold text-gray-900 line-clamp-1">{p.name}</p>
                    <p className="text-[13px] font-bold text-gray-900">₹{p.discountPrice.toLocaleString()}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                        <Heart className="w-3 h-3 text-red-400 fill-current" />{likeCounts[p.id] ?? p.likeCount}
                      </span>
                      <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                        <Camera className="w-3 h-3 text-blue-400" />{p.tryOnLikeCount}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {filteredBySearch.length > 6 && (
            <button onClick={onViewAll} className="w-full mt-3 py-2.5 rounded-2xl text-sm font-bold text-center" style={{ background: "#f5f5f5", color: "#333" }}>
              View all {filteredBySearch.length} results
            </button>
          )}
        </div>
      )}

      {!filteredBySearch && (
        <>
          {/* ── Hero Banner ── */}
          <div className="px-4 pb-5">
            <div
              className="relative overflow-hidden flex items-stretch"
              style={{ height: 230, borderRadius: 24, background: "#F7F2EE" }}
            >
              <div className="flex-1 flex flex-col justify-center px-5 py-5 z-10">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">New Feature</p>
                <h2
                  className="text-3xl font-black text-gray-900 leading-tight mb-2"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  TRY BEFORE<br />YOU BUY
                </h2>
                <p className="text-[11px] text-gray-500 leading-snug mb-3">
                  Upload your photo and see yourself wearing any outfit instantly.
                </p>
                <div className="flex items-center gap-1 mb-3">
                  <Zap className="w-3 h-3 text-gray-700 fill-gray-700" />
                  <span className="text-[10px] font-bold text-gray-600">Powered by Virtual Try-On</span>
                </div>
                <p className="text-[11px] font-semibold text-gray-500 italic leading-snug">
                  Go to product and try Virtual Try-On 🌍
                </p>
              </div>
              <div className="relative flex-shrink-0 overflow-hidden" style={{ width: "44%" }}>
                <img
                  src="https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=300&q=80"
                  alt="Fashion Model"
                  className="w-full h-full object-cover object-top"
                  style={{ animation: "floatModel 3s ease-in-out infinite" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            </div>
          </div>

          {/* ── Shop by Category (from admin) ── */}
          {categories.length > 0 && (
            <div className="pb-5">
              <div className="flex items-center justify-between px-4 mb-3">
                <h3 className="font-black text-gray-900 text-base" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  Shop by Category
                </h3>
                <button onClick={onViewAll} className="flex items-center gap-0.5 text-xs font-semibold text-gray-500">
                  View All <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              {(() => {
                const mid = Math.ceil(categories.length / 2);
                const row1 = categories.slice(0, mid);
                const row2 = categories.slice(mid);
                const renderCat = (cat: typeof categories[0]) => (
                  <button
                    key={cat.id}
                    onClick={() => onCategoryOpen(cat)}
                    className="flex flex-col items-center gap-2 active:scale-95 transition-transform shrink-0"
                    style={{ width: 90 }}
                  >
                    <div
                      className="w-full overflow-hidden"
                      style={{ height: 110, borderRadius: 18, background: "#f5f5f5", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}
                    >
                      {cat.coverImage ? (
                        <img
                          src={cat.coverImage}
                          alt={cat.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-8 h-8 text-gray-200" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wide text-center leading-tight">{cat.name}</p>
                  </button>
                );
                return (
                  <div className="flex flex-col gap-2.5">
                    <div
                      className="flex gap-2.5 overflow-x-auto px-4"
                      style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
                    >
                      {row1.map(renderCat)}
                    </div>
                    {row2.length > 0 && (
                      <div
                        className="flex gap-2.5 overflow-x-auto px-4"
                        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
                      >
                        {row2.map(renderCat)}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── New Arrivals / Most Trending Toggle ── */}
          {(newArrivals.length > 0 || mostTrending.length > 0) && (
            <div className="pb-5">
              {/* Toggle Header */}
              <div className="flex items-center justify-between px-4 mb-3">
                <div className="flex items-center gap-1 p-1 rounded-2xl" style={{ background: "#f0f0f0" }}>
                  <button
                    onClick={() => setArrivalTab("arrivals")}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                    style={
                      arrivalTab === "arrivals"
                        ? { background: "#000000", color: "white" }
                        : { background: "transparent", color: "#888888" }
                    }
                  >
                    New Arrivals
                  </button>
                  <button
                    onClick={() => setArrivalTab("trending")}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                    style={
                      arrivalTab === "trending"
                        ? { background: "#000000", color: "white" }
                        : { background: "transparent", color: "#888888" }
                    }
                  >
                    Most Trending 🚀
                  </button>
                </div>
                <button onClick={onViewAll} className="flex items-center gap-0.5 text-xs font-semibold text-gray-500">
                  View All <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Products Grid */}
              {(() => {
                const list = arrivalTab === "arrivals" ? newArrivals : mostTrending;
                if (list.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                      <span className="text-4xl mb-2">🚀</span>
                      <p className="text-sm text-gray-400 font-medium">No trending products yet</p>
                      <p className="text-xs text-gray-300 mt-1">Products with likes + Virtual Try-Ons will appear here</p>
                    </div>
                  );
                }
                return (
                  <div className="grid grid-cols-2 gap-3 px-4">
                    {list.map((p) => {
                      const disc = discountPct(p);
                      const liked = likedProducts.has(p.id);
                      const isTrending = arrivalTab === "trending";
                      return (
                        <div
                          key={p.id}
                          onClick={() => onProductClick(p)}
                          className="rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
                          style={{ background: "#f8f8f8", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
                        >
                          <div className="relative" style={{ aspectRatio: "3/4", background: "#f0f0f0" }}>
                            {p.images[0] ? (
                              <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ShoppingBag className="w-8 h-8 text-gray-200" />
                              </div>
                            )}
                            {isTrending && (
                              <span
                                className="absolute top-2 left-2 text-[10px] font-black px-2 py-0.5 rounded-full"
                                style={{ background: "linear-gradient(135deg,#ff6b00,#ff0066)", color: "white" }}
                              >
                                🚀 Trending
                              </span>
                            )}
                            {!isTrending && disc > 0 && (
                              <span
                                className="absolute top-2 left-2 text-[10px] font-black px-2 py-0.5 rounded-full"
                                style={{ background: "#000000", color: "white" }}
                              >
                                {disc}% OFF
                              </span>
                            )}
                            <button
                              className="absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-md active:scale-90 transition-transform"
                              style={{ background: liked ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.95)" }}
                              onClick={(e) => { e.stopPropagation(); onLike(p.id, e); }}
                            >
                              <Heart className={`w-4 h-4 ${liked ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
                            </button>
                          </div>
                          <div className="px-3 pt-2.5 pb-3">
                            <p className="text-[12px] font-semibold text-gray-900 line-clamp-2 leading-tight mb-1" style={{ fontFamily: "'Poppins', sans-serif" }}>
                              {p.name}
                            </p>
                            <p className="text-[10px] text-gray-400 mb-1">{p.productType}</p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[14px] font-black text-gray-900">₹{p.discountPrice.toLocaleString()}</span>
                              {disc > 0 && (
                                <>
                                  <span className="text-[11px] text-gray-400 line-through">₹{p.actualPrice.toLocaleString()}</span>
                                  <span className="text-[10px] font-bold text-green-500">{disc}% OFF</span>
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-2.5 mt-1.5">
                              <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                                <Heart className="w-3 h-3 text-red-400 fill-current" />{likeCounts[p.id] ?? p.likeCount}
                              </span>
                              <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                                <Camera className="w-3 h-3 text-blue-400" />{p.tryOnLikeCount}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── Premium Banner ── */}
          <div className="px-4 pb-5">
            <div
              className="relative overflow-hidden py-6 px-5"
              style={{ borderRadius: 24, background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)" }}
            >
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">Powered by AI</p>
              <h3 className="text-white text-xl font-black mb-4 leading-tight" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                Discover Your Perfect Style
              </h3>
              <div className="space-y-2.5">
                {[
                  { label: "Virtual Try-On", Icon: Camera },
                  { label: "Online Booking", Icon: CalendarDays },
                  { label: "Loyalty Card", Icon: CreditCard },
                  { label: "All details about separate product", Icon: Info },
                  { label: "Store information", Icon: MapPin },
                ].map(({ label, Icon }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#ef4444" }} />
                      <span className="text-white text-[13px] font-medium">{label}</span>
                    </div>
                    <Icon className="w-4 h-4 shrink-0" style={{ color: "rgba(255,255,255,0.5)" }} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Features ── */}
          <div className="px-4 pb-5">
            <h3 className="font-black text-gray-900 text-base mb-3" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              Why Choose Us
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {FEATURES.map(({ icon: Icon, label, desc }) => (
                <div
                  key={label}
                  className="rounded-2xl p-4 flex flex-col gap-2.5"
                  style={{ background: "#f8f8f8" }}
                >
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{ background: "#000000" }}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                      {label}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-gray-300 pb-4">
            Powered by <span className="font-bold text-gray-400">Web Media Hub</span>
          </p>
        </>
      )}

      <style>{`
        @keyframes floatModel {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}
