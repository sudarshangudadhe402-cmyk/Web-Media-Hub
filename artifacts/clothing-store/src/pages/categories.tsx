import { useState, useRef } from "react";
import {
  useListCategories,
  useCreateCategory,
  useDeleteCategory,
  useListProducts,
  getListCategoriesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Categories() {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useListCategories();
  const { data: products } = useListProducts({});
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    createCategory.mutate(
      { data: { name: newCategoryName } },
      {
        onSuccess: () => {
          toast({ title: "Category created" });
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
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

  const categoryProductCount = (name: string) =>
    (products ?? []).filter((p) => p.functionCategory === name).length;

  const categoryProducts = (name: string) =>
    (products ?? []).filter((p) => p.functionCategory === name);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
        <p className="text-muted-foreground">Manage function categories for your products.</p>
      </div>

      {/* Add category form */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Category</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex gap-3">
            <Input
              placeholder="e.g. Birthday, Marriage, Summer Collection..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={!newCategoryName.trim() || createCategory.isPending}>
              <Plus className="w-4 h-4 mr-2" /> Add
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Category list */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">All Categories</h2>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : categories?.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Tags className="w-12 h-12 mb-4 opacity-20" />
              <p>No categories yet. Create one above.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories?.map((category) => {
              const count = categoryProductCount(category.name);
              return (
                <Card
                  key={category.id}
                  className="cursor-pointer hover:border-primary/60 hover:shadow-sm transition-all"
                  onClick={() => setSelectedCategory(category.name)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0 pr-3">
                      <h3 className="font-semibold truncate" title={category.name}>
                        {category.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {count} product{count !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(category.id, category.name);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

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
              </p>
            </div>
            <button
              onClick={() => setSelectedCategory(null)}
              className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {categoryProducts(selectedCategory).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
                <ImageIcon className="w-12 h-12 opacity-20 mb-3" />
                <p className="text-sm">No products in this category yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {categoryProducts(selectedCategory).map((p) => {
                  const disc =
                    p.actualPrice > p.discountPrice
                      ? Math.round(((p.actualPrice - p.discountPrice) / p.actualPrice) * 100)
                      : 0;
                  return (
                    <Card
                      key={p.id}
                      className="overflow-hidden bg-white cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => {
                        setSelectedProduct(p);
                        setActiveImgIdx(0);
                        setTimeout(() => carouselRef.current?.scrollTo({ left: 0 }), 0);
                      }}
                    >
                      <div className="aspect-[3/4] bg-gray-100 relative">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 opacity-20" />
                          </div>
                        )}
                        {disc > 0 && (
                          <span className="absolute top-2 left-2 bg-[#ff3e6c] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm">
                            {disc}% OFF
                          </span>
                        )}
                        <span className="absolute top-2 right-2 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded-sm">
                          {p.productType}
                        </span>
                      </div>
                      <CardContent className="p-2.5 space-y-0.5">
                        <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-tight">{p.name}</p>
                        {disc > 0 && (
                          <p className="text-[10px] font-bold text-[#2ecc71]">{disc}% OFF</p>
                        )}
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm font-extrabold text-gray-900">₹{p.discountPrice}</span>
                          {disc > 0 && (
                            <span className="text-[10px] text-gray-400 line-through">₹{p.actualPrice}</span>
                          )}
                        </div>
                        {p.sizes?.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {p.sizes.slice(0, 3).map((s: string) => (
                              <span key={s} className="text-[9px] border rounded px-1 py-0.5 text-muted-foreground">{s}</span>
                            ))}
                            {p.sizes.length > 3 && (
                              <span className="text-[9px] text-muted-foreground">+{p.sizes.length - 3}</span>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Product detail view (Meesho style) ── */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#f4f4f4]">
          {/* Top bar */}
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

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto">
            {/* Swipeable image carousel */}
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
                        <img
                          src={img}
                          alt={selectedProduct.name}
                          className="w-full h-full object-contain"
                          draggable={false}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                          <ImageIcon className="w-20 h-20 opacity-20" />
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>

              {/* Discount badge */}
              {selectedProduct.actualPrice > selectedProduct.discountPrice && (
                <div className="absolute top-3 left-3 bg-[#ff3e6c] text-white text-[11px] font-bold px-2 py-0.5 rounded-sm">
                  {Math.round(
                    ((selectedProduct.actualPrice - selectedProduct.discountPrice) /
                      selectedProduct.actualPrice) * 100
                  )}% OFF
                </div>
              )}
              <div className="absolute top-3 right-3 bg-black/50 text-white text-[10px] font-medium px-2 py-0.5 rounded-sm">
                {selectedProduct.productType}
              </div>

              {/* Dot indicators */}
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

            {/* Info card */}
            <div className="bg-white mt-2 px-4 pt-4 pb-3">
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="text-[11px] font-semibold bg-[#fff0f5] text-[#ff3e6c] border border-[#ffb3cb] px-2.5 py-0.5 rounded-full">
                  {selectedProduct.productType}
                </span>
                {selectedProduct.functionCategory && (
                  <span className="text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Tag className="w-2.5 h-2.5" />
                    {selectedProduct.functionCategory}
                  </span>
                )}
              </div>
              <h1 className="text-[15px] font-semibold text-gray-900 leading-snug mb-3">
                {selectedProduct.name}
              </h1>
              <div className="flex items-baseline gap-2">
                <span className="text-[22px] font-extrabold text-gray-900">
                  ₹{selectedProduct.discountPrice}
                </span>
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

            {/* Sizes */}
            {selectedProduct.sizes?.length > 0 && (
              <div className="bg-white mt-2 px-4 py-4">
                <p className="text-[13px] font-bold text-gray-800 mb-3 tracking-wide uppercase">Select Size</p>
                <div className="flex flex-wrap gap-2">
                  {selectedProduct.sizes.map((s: string) => (
                    <span key={s} className="px-4 py-1.5 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {selectedProduct.description && (
              <div className="bg-white mt-2 px-4 py-4">
                <p className="text-[13px] font-bold text-gray-800 mb-2 tracking-wide uppercase">Description</p>
                <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-wrap">
                  {selectedProduct.description}
                </p>
              </div>
            )}

            <div className="h-6" />
          </div>
        </div>
      )}
    </div>
  );
}
