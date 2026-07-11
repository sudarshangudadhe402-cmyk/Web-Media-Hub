import { ShoppingBag, ShoppingCart, Trash2 } from "lucide-react";

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

interface CartTabProps {
  products: PublicProduct[];
  cartProductIds: Set<string>;
  onProductClick: (product: PublicProduct) => void;
  onRemove: (productId: string) => void;
}

function discountPct(p: PublicProduct) {
  return p.actualPrice > p.discountPrice
    ? Math.round(((p.actualPrice - p.discountPrice) / p.actualPrice) * 100)
    : 0;
}

export default function CartTab({ products, cartProductIds, onProductClick, onRemove }: CartTabProps) {
  const filtered = products.filter((p) => cartProductIds.has(p.id));

  if (filtered.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center pb-24 px-6 text-center" style={{ background: "#ffffff" }}>
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mb-5"
          style={{ background: "#f8f8f8" }}
        >
          <ShoppingCart className="w-10 h-10 text-gray-200" />
        </div>
        <h2 className="text-lg font-black text-gray-900 mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          Your Cart is Empty
        </h2>
        <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
          Open any product and tap <span className="font-semibold text-gray-600">"Add to Cart"</span> to save it here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24" style={{ background: "#f8f8f8" }}>
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h2 className="font-black text-gray-900 text-lg" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          Cart
        </h2>
        <span className="text-xs text-gray-400 font-medium">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="flex flex-col gap-2 px-4">
        {filtered.map((p) => {
          const disc = discountPct(p);
          return (
            <div
              key={p.id}
              className="flex gap-3 rounded-2xl overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
              style={{ background: "#ffffff", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
              onClick={() => onProductClick(p)}
            >
              {/* Image */}
              <div
                className="relative shrink-0 overflow-hidden"
                style={{ width: 110, minHeight: 148, background: "#f8f8f8", borderRadius: "16px 0 0 16px" }}
              >
                {p.images[0] ? (
                  <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" style={{ minHeight: 148 }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ minHeight: 148 }}>
                    <ShoppingBag className="w-8 h-8 text-gray-200" />
                  </div>
                )}
                {disc > 0 && (
                  <div
                    className="absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: "#ff3b3b", color: "white" }}
                  >
                    -{disc}%
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 py-3 pr-3 flex flex-col justify-between">
                <div className="flex items-start gap-1">
                  <p className="flex-1 font-semibold text-sm text-gray-900 leading-tight line-clamp-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    {p.name}
                  </p>
                  <button
                    className="shrink-0 w-8 h-8 flex items-center justify-center -mt-1 -mr-1"
                    onClick={(e) => { e.stopPropagation(); onRemove(p.id); }}
                  >
                    <Trash2 className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap mt-1">
                  <span className="text-base font-black text-gray-900">₹{p.discountPrice.toLocaleString()}</span>
                  {disc > 0 && (
                    <>
                      <span className="text-xs text-gray-400 line-through">₹{p.actualPrice.toLocaleString()}</span>
                      <span className="text-xs font-bold text-red-500">-{disc}%</span>
                    </>
                  )}
                </div>

                <div className="mt-2.5">
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                    style={{ background: "#ecfdf5", color: "#16a34a" }}
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    In Cart
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
