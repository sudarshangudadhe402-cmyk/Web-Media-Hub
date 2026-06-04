import { useState, useRef } from "react";
import {
  useListCategories,
  useCreateCategory,
  useDeleteCategory,
  useListProducts,
  useLikeProduct,
  getListCategoriesQueryKey,
  getListProductsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Trash2,
  Tags,
  Plus,
  ChevronLeft,
  Image as ImageIcon,
  X,
  Tag,
  Heart,
  TrendingDown,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PRODUCT_TYPES = ["All", "Top", "Bottom", "Full Outfit"] as const;

export default function Categories() {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [filterType, setFilterType] = useState("All");
  const [localLikes, setLocalLikes] = useState<Record<string, number>>({});
  const carouselRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useListCategories();
  const { data: products } = useListProducts({});
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const likeProduct = useLikeProduct();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    createCategory.mutate(
      { data: { name: newCategoryName } },
      {
        onSuccess: () => {
          toast({ title: "Category created" });
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          setNewCategoryName("");
        },
      }
    );
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Delete category "${name}"?`)) {
      deleteCategory.mutate(
        { id },
        {
          onSuccess: () => {
            toast({ title: "Category deleted" });
            queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
            if (selectedCategory === name) setSelectedCategory(null);
          },
        }
      );
    }
  };

  const categoryProducts = (name: string) =>
    (products ?? []).filter(
      (p) =>
        p.functionCategory === name &&
        (filterType === "All" || p.productType === filterType)
    );

  const totalCount = (name: string) =>
    (products ?? []).filter((p) => p.functionCategory === name).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {categories?.length ?? 0} categories
        </p>
      </div>

      {/* Add category form */}
      <form onSubmit={handleCreate} className="flex gap-2">
        <Input
          placeholder="New category name e.g. Birthday, Marriage..."
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          className="flex-1"
        />
        <Button
          type="submit"
          disabled={!newCategoryName.trim() || createCategory.isPending}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" /> Add
        </Button>
      </form>

      {/* Product type tabs */}
      <Tabs value={filterType} onValueChange={setFilterType}>
        <TabsList className="w-full">
          {PRODUCT_TYPES.map((t) => (
            <TabsTrigger key={t} value={t} className="flex-1">
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Category tiles */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : categories?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Tags className="w-12 h-12 opacity-20 mb-3" />
          <p className="text-sm">No categories yet. Add one above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {categories?.map((category) => {
            const count = totalCount(category.name);
            const filteredCount = categoryProducts(category.name).length;
            const thumb = (products ?? []).find(
              (p) => p.functionCategory === category.name && p.images?.[0]
            )?.images?.[0];

            return (
              <div
                key={category.id}
                className="relative rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm cursor-pointer active:scale-[0.98] transition-transform"
                style={{ minHeight: 100 }}
                onClick={() => setSelectedCategory(category.name)}
              >
                {/* Background thumbnail */}
                {thumb ? (
                  <img
                    src={thumb}
                    alt={category.name}
                    className="absolute inset-0 w-full h-full object-cover opacity-20"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50" />
                )}

                {/* Content */}
                <div className="relative p-3 flex flex-col justify-between h-full" style={{ minHeight: 100 }}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-1">
                      <p className="font-bold text-sm text-gray-900 leading-tight truncate">
                        {category.name}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {filteredCount > 0
                          ? `${filteredCount} ${filterType === "All" ? "" : filterType + " "}item${filteredCount !== 1 ? "s" : ""}`
                          : count > 0
                          ? `${count} total`
                          : "No products yet"}
                      </p>
                    </div>
                    <button
                      className="p-1 rounded-full hover:bg-red-50 transition-colors shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(category.id, category.name);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1 mt-2">
                    <Tag className="w-3 h-3 text-purple-400" />
                    <span className="text-[10px] text-purple-500 font-medium">Tap to view</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Category product drawer ── */}
      {selectedCategory && (
        <div className="fixed inset-0 z-40 flex flex-col bg-[#f4f4f4]">
          {/* Top bar */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white border-b shadow-sm">
            <button
              onClick={() => setSelectedCategory(null)}
              className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-sm text-gray-800 truncate">{selectedCategory}</h2>
              <p className="text-[11px] text-gray-400">
                {categoryProducts(selectedCategory).length} product
                {categoryProducts(selectedCategory).length !== 1 ? "s" : ""}
                {filterType !== "All" ? ` · ${filterType}` : ""}
              </p>
            </div>
            <button
              onClick={() => setSelectedCategory(null)}
              className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Sub-filter tabs inside drawer */}
          <div className="bg-white border-b px-3 py-1.5">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {PRODUCT_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    filterType === t
                      ? "bg-purple-600 text-white border-purple-600"
                      : "bg-white text-gray-500 border-gray-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto">
            {categoryProducts(selectedCategory).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
                <ImageIcon className="w-12 h-12 opacity-20 mb-3" />
                <p className="text-sm">
                  No {filterType !== "All" ? filterType + " " : ""}products in this category.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-[2px] bg-gray-200">
                {categoryProducts(selectedCategory).map((p) => {
                  const disc =
                    p.actualPrice > p.discountPrice
                      ? Math.round(((p.actualPrice - p.discountPrice) / p.actualPrice) * 100)
                      : 0;
                  const likes = localLikes[p.id] ?? p.likeCount;
                  return (
                    <div
                      key={p.id}
                      className="bg-white cursor-pointer active:opacity-90"
                      onClick={() => {
                        setSelectedProduct(p);
                        setActiveImgIdx(0);
                        setTimeout(() => carouselRef.current?.scrollTo({ left: 0 }), 0);
                      }}
                    >
                      {/* Image */}
                      <div className="aspect-[3/4] bg-gray-100 relative overflow-hidden">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-gray-300" />
                          </div>
                        )}
                        {/* Heart button */}
                        <button
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow-sm active:scale-90 transition-transform"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocalLikes((l) => ({ ...l, [p.id]: (l[p.id] ?? p.likeCount) + 1 }));
                            likeProduct.mutate({ id: p.id });
                          }}
                        >
                          <Heart className={`w-3.5 h-3.5 ${likes > 0 ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
                        </button>
                        {/* Like count overlay */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent pt-6 pb-1.5 px-2">
                          <div className="flex items-center gap-1">
                            <Heart className="w-3 h-3 fill-red-400 text-red-400" />
                            <span className="text-white text-[11px] font-semibold">{likes.toLocaleString("en-IN")}</span>
                            <span className="text-white/70 text-[10px]">likes</span>
                          </div>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-2 pb-3 space-y-0.5">
                        {p.functionCategory && (
                          <p className="text-[11px] font-bold text-purple-600 leading-tight uppercase tracking-wide truncate">
                            {p.functionCategory}
                          </p>
                        )}
                        <p className="text-[12px] text-gray-700 leading-tight line-clamp-2">{p.name}</p>

                        {/* Price */}
                        <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                          {disc > 0 && (
                            <span className="flex items-center gap-0.5 text-[11px] font-bold text-green-600">
                              <TrendingDown className="w-3 h-3" />{disc}%
                            </span>
                          )}
                          {disc > 0 && (
                            <span className="text-[11px] text-gray-400 line-through">₹{p.actualPrice}</span>
                          )}
                          <span className="text-[13px] font-bold text-gray-900">₹{p.discountPrice}</span>
                        </div>

                        {/* Size */}
                        {p.sizes?.length > 0 && (
                          <div className="pt-1">
                            <p className="text-[10px] font-semibold text-gray-500 mb-0.5">Size</p>
                            <div className="flex flex-wrap gap-1">
                              {p.sizes.slice(0, 4).map((s: string) => (
                                <span key={s} className="text-[9px] border border-gray-300 rounded px-1.5 py-0.5 text-gray-600 bg-gray-50">{s}</span>
                              ))}
                              {p.sizes.length > 4 && <span className="text-[9px] text-gray-400">+{p.sizes.length - 4}</span>}
                            </div>
                          </div>
                        )}

                        {/* Age */}
                        {p.age && (
                          <div className="pt-0.5">
                            <p className="text-[10px] font-semibold text-gray-500 mb-0.5">Age</p>
                            <span className="text-[9px] bg-orange-50 text-orange-600 border border-orange-200 rounded px-1.5 py-0.5 font-medium">{p.age}</span>
                          </div>
                        )}

                        {/* Gender */}
                        {p.gender && (
                          <div className="pt-0.5">
                            <p className="text-[10px] font-semibold text-gray-500 mb-0.5">Gender</p>
                            <span className="text-[9px] bg-blue-50 text-blue-600 border border-blue-200 rounded px-1.5 py-0.5 font-medium">{p.gender}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Product detail view ── */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#f4f4f4]">
          <div className="flex items-center gap-2 px-3 py-2 bg-white border-b shadow-sm">
            <button
              onClick={() => setSelectedProduct(null)}
              className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            <h2 className="font-semibold text-sm line-clamp-1 flex-1 text-gray-800">
              {selectedProduct.name}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="relative bg-white">
              <div
                ref={carouselRef}
                className="flex overflow-x-auto"
                style={{ scrollSnapType: "x mandatory", scrollBehavior: "smooth" }}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  setActiveImgIdx(Math.round(el.scrollLeft / el.clientWidth));
                }}
              >
                {(selectedProduct.images?.length > 0 ? selectedProduct.images : [null]).map(
                  (img: string | null, i: number) => (
                    <div
                      key={i}
                      className="shrink-0 w-full bg-white"
                      style={{ scrollSnapAlign: "start", aspectRatio: "3/4", maxHeight: "48vh" }}
                    >
                      {img ? (
                        <img src={img} alt={selectedProduct.name} className="w-full h-full object-contain" draggable={false} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                          <ImageIcon className="w-20 h-20 opacity-20" />
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>

              {selectedProduct.actualPrice > selectedProduct.discountPrice && (
                <div className="absolute top-3 left-3 bg-[#ff3e6c] text-white text-[11px] font-bold px-2 py-0.5 rounded-sm">
                  {Math.round(((selectedProduct.actualPrice - selectedProduct.discountPrice) / selectedProduct.actualPrice) * 100)}% OFF
                </div>
              )}
              <div className="absolute top-3 right-3 bg-black/50 text-white text-[10px] font-medium px-2 py-0.5 rounded-sm">
                {selectedProduct.productType}
              </div>

              {selectedProduct.images?.length > 1 && (
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                  {selectedProduct.images.map((_: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => {
                        carouselRef.current?.scrollTo({ left: i * (carouselRef.current?.clientWidth ?? 0), behavior: "smooth" });
                        setActiveImgIdx(i);
                      }}
                      className="rounded-full transition-all"
                      style={{
                        width: i === activeImgIdx ? 20 : 6,
                        height: 6,
                        background: i === activeImgIdx ? "#ff3e6c" : "rgba(255,255,255,0.7)",
                        border: "1px solid rgba(0,0,0,0.15)",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white mt-2 px-4 pt-4 pb-3">
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="text-[11px] font-semibold bg-[#fff0f5] text-[#ff3e6c] border border-[#ffb3cb] px-2.5 py-0.5 rounded-full">
                  {selectedProduct.productType}
                </span>
                {selectedProduct.functionCategory && (
                  <span className="text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Tag className="w-2.5 h-2.5" />{selectedProduct.functionCategory}
                  </span>
                )}
              </div>
              <h1 className="text-[15px] font-semibold text-gray-900 leading-snug mb-3">{selectedProduct.name}</h1>
              <div className="flex items-baseline gap-2">
                <span className="text-[22px] font-extrabold text-gray-900">₹{selectedProduct.discountPrice}</span>
                {selectedProduct.actualPrice > selectedProduct.discountPrice && (
                  <>
                    <span className="text-sm text-gray-400 line-through">₹{selectedProduct.actualPrice}</span>
                    <span className="text-sm font-bold text-[#2ecc71]">
                      ↓{Math.round(((selectedProduct.actualPrice - selectedProduct.discountPrice) / selectedProduct.actualPrice) * 100)}% off
                    </span>
                  </>
                )}
              </div>
            </div>

            {selectedProduct.sizes?.length > 0 && (
              <div className="bg-white mt-2 px-4 py-4">
                <p className="text-[13px] font-bold text-gray-800 mb-2 tracking-wide uppercase">Size</p>
                <div className="flex flex-wrap gap-2">
                  {selectedProduct.sizes.map((s: string) => (
                    <span key={s} className="px-4 py-1.5 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {(selectedProduct.age || selectedProduct.gender) && (
              <div className="bg-white mt-2 px-4 py-4 flex gap-6">
                {selectedProduct.age && (
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 uppercase mb-1">Age</p>
                    <span className="text-sm font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-3 py-1 rounded">{selectedProduct.age}</span>
                  </div>
                )}
                {selectedProduct.gender && (
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 uppercase mb-1">Gender</p>
                    <span className="text-sm font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded">{selectedProduct.gender}</span>
                  </div>
                )}
              </div>
            )}

            {selectedProduct.description && (
              <div className="bg-white mt-2 px-4 py-4">
                <p className="text-[13px] font-bold text-gray-800 mb-2 tracking-wide uppercase">Description</p>
                <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-wrap">{selectedProduct.description}</p>
              </div>
            )}

            <div className="h-6" />
          </div>
        </div>
      )}
    </div>
  );
}
