import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Clock, CalendarDays, MessageCircle, Heart, ShoppingBag, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface PublicProduct {
  id: string;
  name: string;
  description: string | null;
  images: string[];
  discountPrice: number;
  actualPrice: number;
  productType: string;
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

function ProductCard({ product }: { product: PublicProduct }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(product.likeCount);

  async function handleLike() {
    if (liked) return;
    try {
      const res = await fetch(`/api/products/${product.id}/like`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setLikeCount(data.likeCount);
        setLiked(true);
      }
    } catch {}
  }

  const discount = product.actualPrice > product.discountPrice
    ? Math.round(((product.actualPrice - product.discountPrice) / product.actualPrice) * 100)
    : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group">
      <div className="relative aspect-[3/4] bg-gray-50 overflow-hidden">
        {product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-10 h-10 text-gray-200" />
          </div>
        )}
        {discount > 0 && (
          <span className="absolute top-2 left-2 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            -{discount}%
          </span>
        )}
        <button
          onClick={handleLike}
          className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow transition-all ${
            liked ? "bg-rose-500 text-white" : "bg-white/90 text-gray-500 hover:bg-rose-50 hover:text-rose-500"
          }`}
        >
          <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
        </button>
      </div>
      <div className="p-3 space-y-1.5">
        <p className="text-sm font-semibold text-gray-900 line-clamp-1">{product.name}</p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-bold text-gray-900">₹{product.discountPrice.toLocaleString()}</span>
          {discount > 0 && (
            <span className="text-xs text-gray-400 line-through">₹{product.actualPrice.toLocaleString()}</span>
          )}
        </div>
        {product.sizes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.sizes.slice(0, 4).map((s) => (
              <span key={s} className="text-[10px] border border-gray-200 rounded px-1.5 py-0.5 text-gray-600 font-medium">{s}</span>
            ))}
            {product.sizes.length > 4 && (
              <span className="text-[10px] text-gray-400">+{product.sizes.length - 4}</span>
            )}
          </div>
        )}
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Heart className="w-3 h-3" />
          <span>{likeCount}</span>
        </div>
      </div>
    </div>
  );
}

export default function PublicStore() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const { data, isLoading, error } = useQuery<PublicStoreData>({
    queryKey: ["public-store", slug],
    queryFn: async () => {
      const res = await fetch(`/api/public/store/${slug}`);
      if (!res.ok) throw new Error("Store not found");
      return res.json();
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Skeleton className="h-64 w-full rounded-none" />
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-80" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />)}
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
        <p className="text-gray-400 mt-2 text-sm">This store link may be invalid or the store may have been removed.</p>
      </div>
    );
  }

  const waLink = data.whatsappNumber
    ? `https://wa.me/${data.whatsappNumber.replace(/\D/g, "")}`
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner Header */}
      <div className="relative h-56 sm:h-72 w-full overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-rose-500">
        {data.bannerImage && (
          <img
            src={data.bannerImage}
            alt={data.name}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <div className="absolute bottom-5 left-5 right-5 text-white">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight drop-shadow">{data.name}</h1>
          {data.description && (
            <p className="text-sm mt-1 text-white/80 line-clamp-2">{data.description}</p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Store Info */}
        {(data.address || data.openingTime || data.openDays) && (
          <div className="flex flex-wrap gap-2">
            {data.address && (
              <div className="flex items-center gap-1.5 bg-white border border-gray-100 rounded-full px-3 py-1.5 text-xs text-gray-600 shadow-sm">
                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>{data.address}</span>
              </div>
            )}
            {data.openingTime && (
              <div className="flex items-center gap-1.5 bg-white border border-gray-100 rounded-full px-3 py-1.5 text-xs text-gray-600 shadow-sm">
                <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>{data.openingTime}</span>
              </div>
            )}
            {data.openDays && (
              <div className="flex items-center gap-1.5 bg-white border border-gray-100 rounded-full px-3 py-1.5 text-xs text-gray-600 shadow-sm">
                <CalendarDays className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>{data.openDays}</span>
              </div>
            )}
          </div>
        )}

        {/* WhatsApp CTA */}
        {waLink && (
          <a href={waLink} target="_blank" rel="noopener noreferrer">
            <Button className="bg-[#25D366] hover:bg-[#1ebe5c] text-white gap-2 rounded-full px-6 shadow-md">
              <MessageCircle className="w-4 h-4" />
              Chat on WhatsApp
            </Button>
          </a>
        )}

        {/* Products */}
        {data.products.length > 0 ? (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">Our Collection ({data.products.length})</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {data.products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p className="text-sm">No products added yet</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-8 text-xs text-gray-400 border-t border-gray-100 mt-4">
        Powered by Web Media Hub
      </div>
    </div>
  );
}
