import { Heart, ShoppingBag } from "lucide-react";

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

interface WishlistTabProps {
  products: PublicProduct[];
  likedProducts: Set<string>;
  likeCounts: Record<string, number>;
  onProductClick: (product: PublicProduct) => void;
  onUnlike: (productId: string, e: React.MouseEvent) => void;
}

function discountPct(p: PublicProduct) {
  return p.actualPrice > p.discountPrice
    ? Math.round(((p.actualPrice - p.discountPrice) / p.actualPrice) * 100)
    : 0;
}

export default function WishlistTab({ products, likedProducts, likeCounts, onProductClick, onUnlike }: WishlistTabProps) {
  const wishlistProducts = products.filter((p) => likedProducts.has(p.id));

  if (wishlistProducts.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center pb-24 px-6 text-center" style={{ background: "#ffffff" }}>
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mb-5"
          style={{ background: "#f8f8f8" }}
        >
          <Heart className="w-10 h-10 text-gray-200" />
        </div>
        <h2 className="text-lg font-black text-gray-900 mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          Your Wishlist is Empty
        </h2>
        <p className="text-sm text-gray-400 leading-relaxed">
          Tap the ♡ on any product to save it here for later.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24" style={{ background: "#f8f8f8" }}>
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h2 className="font-black text-gray-900 text-lg" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          Wishlist
        </h2>
        <span className="text-xs text-gray-400 font-medium">{wishlistProducts.length} item{wishlistProducts.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4">
        {wishlistProducts.map((p) => {
          const disc = discountPct(p);
          return (
            <div
              key={p.id}
              onClick={() => onProductClick(p)}
              className="rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
              style={{ background: "#ffffff", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
            >
              <div className="relative" style={{ aspectRatio: "3/4", background: "#f5f5f5" }}>
                {p.images[0] ? (
                  <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag className="w-8 h-8 text-gray-200" />
                  </div>
                )}
                {disc > 0 && (
                  <span
                    className="absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: "#000000", color: "white" }}
                  >
                    {disc}% OFF
                  </span>
                )}
                <button
                  className="absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                  style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}
                  onClick={(e) => { e.stopPropagation(); onUnlike(p.id, e); }}
                >
                  <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                </button>
              </div>
              <div className="px-3 pt-2.5 pb-3">
                <p className="text-[12px] font-semibold text-gray-900 line-clamp-2 leading-tight mb-1" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  {p.name}
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[13px] font-bold text-gray-900">₹{p.discountPrice.toLocaleString()}</span>
                  {disc > 0 && (
                    <span className="text-[10px] text-gray-400 line-through">₹{p.actualPrice.toLocaleString()}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-1.5">
                  <span className="text-yellow-400 text-[10px]">★</span>
                  <span className="text-[10px] text-gray-400">{(4.0 + Math.random()).toFixed(1)}</span>
                  <span className="text-[10px] text-gray-300">· {p.likeCount} liked</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
