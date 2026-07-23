import { Search, X, SlidersHorizontal, ShoppingBag, Heart, Camera, Box, Star } from "lucide-react";
import { useState, useMemo } from "react";


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

interface ShopTabProps {
  products: PublicProduct[];
  categories: string[];
  likedProducts: Set<string>;
  likeCounts: Record<string, number>;
  initialSearch?: string;
  initialCategory?: string;
  onProductClick: (product: PublicProduct) => void;
  onLike: (productId: string, e: React.MouseEvent) => void;
  onTryOn?: (product: PublicProduct) => void;
}

function discountPct(p: PublicProduct) {
  return p.actualPrice > p.discountPrice
    ? Math.round(((p.actualPrice - p.discountPrice) / p.actualPrice) * 100)
    : 0;
}

function formatRating(r: number) {
  return r > 0 ? r.toFixed(1) : null;
}


export default function ShopTab({
  products,
  categories,
  likedProducts,
  likeCounts,
  initialSearch = "",
  initialCategory = "all",
  onProductClick,
  onLike,
  onTryOn,
}: ShopTabProps) {
  const [search, setSearch] = useState(initialSearch);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [sortBy, setSortBy] = useState<"newest" | "most-liked" | "most-tried" | "trending">("newest");
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [viewing3D, setViewing3D] = useState<PublicProduct | null>(null);
  const [show3DUnavailable, setShow3DUnavailable] = useState(false);

  const filteredProducts = useMemo(() => {
    let list = [...products];
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
      list = list.filter((p) => p.functionCategory === activeCategory || p.productType === activeCategory);
    }
    if (sortBy === "most-liked") {
      list = list.filter((p) => (likeCounts[p.id] ?? p.likeCount) > 0);
      list.sort((a, b) => (likeCounts[b.id] ?? b.likeCount) - (likeCounts[a.id] ?? a.likeCount));
    } else if (sortBy === "most-tried") {
      list = list.filter((p) => p.tryOnLikeCount > 0);
      list.sort((a, b) => b.tryOnLikeCount - a.tryOnLikeCount);
    } else if (sortBy === "trending") {
      list = list.filter((p) => p.recentLikeCount > 0 || p.recentTryOnCount > 0);
      list.sort((a, b) => b.recentLikeCount + b.recentTryOnCount - (a.recentLikeCount + a.recentTryOnCount));
    }
    return list;
  }, [products, search, activeCategory, sortBy, likeCounts]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#f5f5f5" }}>
      {/* Search + Category */}
      <div className="px-4 pt-3 pb-0 flex-shrink-0" style={{ background: "#ffffff" }}>
        <div className="relative mb-3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for products, brands..."
            className="w-full pl-11 pr-10 py-3.5 text-sm rounded-2xl focus:outline-none transition-colors"
            style={{ background: "#f5f5f5", color: "#212121", fontFamily: "'Inter', sans-serif" }}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Category pills */}
        <div className="overflow-x-auto pb-3" style={{ scrollbarWidth: "none" }}>
          <div className="flex gap-2 min-w-max">
            {["all", ...categories].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95"
                style={
                  activeCategory === cat
                    ? { background: "#000000", color: "white" }
                    : { background: "#f5f5f5", color: "#666666" }
                }
              >
                {cat === "all" ? "All" : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter row */}
      <div
        className="px-4 py-2 flex items-center justify-between flex-shrink-0 border-b"
        style={{ background: "#ffffff", borderColor: "#f0f0f0" }}
      >
        <span className="text-[11px] text-gray-400 font-medium">
          {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={() => setShowFilterSheet(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all border"
          style={
            sortBy !== "newest"
              ? { background: "#000000", color: "white", borderColor: "#000000" }
              : { background: "transparent", color: "#878787", borderColor: "#e0e0e0" }
          }
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          {sortBy === "newest"
            ? "Filter"
            : sortBy === "most-liked"
            ? "❤️ Most Liked"
            : sortBy === "most-tried"
            ? "🪞 Most Tried"
            : "🔥 Trending"}
        </button>
      </div>

      {/* Products Grid */}
      <div className="flex-1 overflow-y-auto pb-24">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <ShoppingBag className="w-12 h-12 mb-3 text-gray-200" />
            <p className="text-gray-400 text-sm">
              {search ? `No results for "${search}"` : "No products in this category"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-3">
            {filteredProducts.map((p) => {
              const disc = discountPct(p);
              const liked = likedProducts.has(p.id);
              const count = likeCounts[p.id] ?? p.likeCount;
              return (
                <div
                  key={p.id}
                  className="rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
                  style={{ background: "#ffffff", boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}
                  onClick={() => onProductClick(p)}
                >
                  {/* Image */}
                  <div className="relative" style={{ aspectRatio: "3/4", background: "#f5f5f5" }}>
                    {p.images[0] ? (
                      <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-gray-200" />
                      </div>
                    )}
                    {/* Discount badge */}
                    {disc > 0 && (
                      <span
                        className="absolute top-2 left-2 text-[10px] font-black px-2 py-0.5 rounded-full"
                        style={{ background: "#ff3b3b", color: "white" }}
                      >
                        -{disc}%
                      </span>
                    )}
                    {/* Heart button */}
                    <button
                      className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-transform"
                      style={{ background: liked ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.92)" }}
                      onClick={(e) => { e.stopPropagation(); onLike(p.id, e); }}
                    >
                      <Heart className={`w-3.5 h-3.5 ${liked ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
                    </button>
                  </div>

                  {/* Info below image */}
                  <div className="px-2.5 pt-2 pb-2.5">
                    <p
                      className="text-[12px] font-semibold text-gray-900 line-clamp-2 leading-tight mb-1"
                      style={{ fontFamily: "'Poppins', sans-serif" }}
                    >
                      {p.name}
                    </p>

                    {/* Price row */}
                    <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                      <span className="text-[13px] font-black text-gray-900">
                        ₹{p.discountPrice.toLocaleString()}
                      </span>
                      {disc > 0 && (
                        <span className="text-[10px] text-gray-400 line-through">
                          ₹{p.actualPrice.toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Star rating */}
                    {formatRating(p.averageRating) ? (
                      <div className="flex items-center gap-0.5 mb-1.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-2.5 h-2.5 ${
                              p.averageRating >= s
                                ? "fill-amber-400 text-amber-400"
                                : p.averageRating >= s - 0.5
                                ? "fill-amber-200 text-amber-300"
                                : "text-gray-200"
                            }`}
                          />
                        ))}
                        <span className="text-[10px] text-gray-400 ml-0.5">{formatRating(p.averageRating)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-0.5 mb-1.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className="w-2.5 h-2.5 text-gray-200" />
                        ))}
                        <span className="text-[10px] text-gray-300 ml-0.5">No ratings</span>
                      </div>
                    )}

                    {/* Try-on count + Like count */}
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                        <Camera className="w-2.5 h-2.5 text-pink-400" />
                        {p.tryOnLikeCount}
                      </span>
                      <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                        <Heart className="w-2.5 h-2.5 text-red-400 fill-current" />
                        {count}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3D Not Available popup */}
      {show3DUnavailable && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setShow3DUnavailable(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full rounded-t-3xl px-6 pt-6 pb-12 text-center"
            style={{ background: "#ffffff" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 rounded-full bg-gray-200 mx-auto mb-5" />
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "#f3f0ff" }}
            >
              <Box className="w-8 h-8" style={{ color: "#7c3aed" }} />
            </div>
            <p className="font-black text-lg text-gray-900 mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              3D Model Not Available
            </p>
            <p className="text-sm text-gray-500 mb-6">
              This product doesn't have a 3D model yet. Check back later!
            </p>
            <button
              className="w-full py-3.5 rounded-2xl font-bold text-sm"
              style={{ background: "#000000", color: "white" }}
              onClick={() => setShow3DUnavailable(false)}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Filter Sheet */}
      {showFilterSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setShowFilterSheet(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative rounded-t-3xl px-4 pt-4 pb-10"
            style={{ background: "#ffffff" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-5" />
            <p className="text-base font-black text-gray-900 mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              Sort & Filter
            </p>
            <div className="space-y-2">
              {([
                { key: "newest", label: "Newest First", desc: "Latest products first", icon: "🆕" },
                { key: "most-liked", label: "Most Liked", desc: "Most popular products", icon: "❤️" },
                { key: "most-tried", label: "Most Virtual Try-On", desc: "Most virtually tried", icon: "🪞" },
                { key: "trending", label: "Trending", desc: "Hot right now", icon: "🔥" },
              ] as const).map(({ key, label, desc, icon }) => (
                <button
                  key={key}
                  onClick={() => { setSortBy(key); setShowFilterSheet(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition-all text-left"
                  style={
                    sortBy === key
                      ? { borderColor: "#000000", background: "#f8f8f8" }
                      : { borderColor: "#f0f0f0", background: "transparent" }
                  }
                >
                  <span className="text-xl">{icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-800">{label}</p>
                    <p className="text-[11px] text-gray-400">{desc}</p>
                  </div>
                  {sortBy === key && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#000000" }}>
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3D Model Viewer Modal */}
      {viewing3D && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: "rgba(0,0,0,0.92)" }}
        >
          <div className="flex items-center justify-between px-4 pt-10 pb-3">
            <div className="flex items-center gap-2">
              <Box className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-white text-sm font-bold leading-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  {viewing3D.name}
                </p>
                <p className="text-purple-300 text-[11px]">3D Model Viewer</p>
              </div>
            </div>
            <button
              onClick={() => setViewing3D(null)}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.12)" }}
            >
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
              style={{
                width: "100%",
                height: "420px",
                background: "transparent",
                borderRadius: "20px",
              }}
            />
          </div>
          <div className="px-4 pb-10 pt-2 text-center">
            <p className="text-gray-400 text-[12px]">
              👆 Drag to rotate &nbsp;·&nbsp; Pinch to zoom
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
