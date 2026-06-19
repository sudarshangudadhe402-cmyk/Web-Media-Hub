import { useState, useRef } from "react";
import { Link } from "wouter";
import {
  useListProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useUploadProductImage,
  useListCategories,
  getListProductsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Image as ImageIcon,
  Plus,
  Upload,
  X,
  Pencil,
  Trash2,
  Tag,
  Tags,
  ChevronLeft,
  Heart,
  TrendingDown,
  CheckCircle2,
  Circle,
  Search,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

/* ── constants ── */
const PRODUCT_TYPES = ["Top", "Bottom", "Full Outfit"] as const;
type ProductType = (typeof PRODUCT_TYPES)[number];

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "Free Size"];
const AGE_OPTIONS = Array.from({ length: 50 }, (_, i) => `${i}-${i + 1}Y`);
const GENDER_OPTIONS = ["Men", "Women", "Boys", "Girls", "Unisex"];

interface ProductForm {
  name: string;
  description: string;
  discountPrice: string;
  actualPrice: string;
  functionCategory: string;
  productType: ProductType;
  sizes: string[];
  age: string;
  gender: string;
}

const EMPTY_FORM: ProductForm = {
  name: "",
  description: "",
  discountPrice: "",
  actualPrice: "",
  functionCategory: "",
  productType: "Top",
  sizes: [],
  age: "",
  gender: "",
};

function toggleItem(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
}

/* ── main component ── */
export default function Products() {
  const [filterType, setFilterType] = useState("All");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [previousProductId, setPreviousProductId] = useState<string | null>(null);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [limitPopupOpen, setLimitPopupOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();


  const { data: allProducts, isLoading } = useListProducts({});
  const { data: categories } = useListCategories();

  const products = (allProducts ?? []).filter((p) => {
    const typeMatch = filterType === "All" || p.productType === filterType;
    const catMatch = !filterCategory || p.functionCategory === filterCategory;
    const q = searchQuery.trim().toLowerCase();
    const nameMatch = !q || p.name.toLowerCase().includes(q);
    return typeMatch && catMatch && nameMatch;
  });
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const uploadImage = useUploadProductImage();
  /* ── helpers ── */
  function resetForm() {
    setForm(EMPTY_FORM);
    setImageUrls([]);
    setEditingId(null);
  }

  function openAdd() {
    if ((allProducts ?? []).length >= 1000) {
      setLimitPopupOpen(true);
      return;
    }
    resetForm();
    setFormOpen(true);
  }

  function openEdit(product: any) {
    setForm({
      name: product.name,
      description: product.description ?? "",
      discountPrice: String(product.discountPrice),
      actualPrice: String(product.actualPrice),
      functionCategory: product.functionCategory ?? "",
      productType: product.productType,
      sizes: product.sizes,
      age: product.age ?? "",
      gender: product.gender ?? "",
    });
    setImageUrls(product.images ?? []);
    setEditingId(product.id);
    setSelectedProduct(null);
    setFormOpen(true);
  }

  async function compressImage(file: File): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const MAX_DIM = 1200;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        // Try quality steps until ≤ 280 KB
        let quality = 0.82;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        while (dataUrl.length * 0.75 > 280_000 && quality > 0.3) {
          quality -= 0.08;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
        resolve(dataUrl.split(",")[1]);
      };
      img.src = objectUrl;
    });
  }

  async function handleFileChange(files: FileList | null) {
    if (!files) return;
    const remaining = 2 - imageUrls.length;
    if (remaining <= 0) return;
    const toUpload = Array.from(files).slice(0, remaining);
    for (const file of toUpload) {
      const base64 = await compressImage(file);
      uploadImage.mutate(
        { data: { imageData: base64, fileName: file.name.replace(/\.[^.]+$/, ".jpg") } },
        {
          onSuccess: (res) => setImageUrls((p) => [...p, res.url]),
          onError: () =>
            toast({ title: "Failed to upload image", variant: "destructive" }),
        }
      );
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Product name is required", variant: "destructive" });
      return;
    }
    const data = {
      name: form.name,
      description: form.description,
      discountPrice: parseFloat(form.discountPrice) || 0,
      actualPrice: parseFloat(form.actualPrice) || 0,
      functionCategory: form.functionCategory || undefined,
      productType: form.productType,
      sizes: form.sizes,
      age: form.age || undefined,
      gender: form.gender || undefined,
      images: imageUrls,
    };

    if (editingId) {
      updateProduct.mutate(
        { id: editingId, data },
        {
          onSuccess: () => {
            toast({ title: "Product updated" });
            queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
            resetForm();
            setFormOpen(false);
          },
          onError: () =>
            toast({ title: "Failed to update product", variant: "destructive" }),
        }
      );
    } else {
      createProduct.mutate(
        { data },
        {
          onSuccess: () => {
            toast({ title: "Product added" });
            queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
            resetForm();
            setFormOpen(false);
          },
          onError: () =>
            toast({ title: "Failed to add product", variant: "destructive" }),
        }
      );
    }
  }

  function handleDelete(id: string) {
    if (!window.confirm("Delete this product?")) return;
    deleteProduct.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Product deleted" });
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          setSelectedProduct(null);
        },
        onError: () =>
          toast({ title: "Failed to delete product", variant: "destructive" }),
      }
    );
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} product${selectedIds.size > 1 ? "s" : ""}?`)) return;
    const ids = Array.from(selectedIds);
    let failed = 0;
    for (const id of ids) {
      try {
        await deleteProduct.mutateAsync({ id });
      } catch {
        failed++;
      }
    }
    queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
    setSelectedIds(new Set());
    setBulkMode(false);
    if (failed === 0) toast({ title: `${ids.length} product${ids.length > 1 ? "s" : ""} deleted` });
    else toast({ title: `${ids.length - failed} deleted, ${failed} failed`, variant: "destructive" });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitBulkMode() {
    setBulkMode(false);
    setSelectedIds(new Set());
  }

  const isPending = createProduct.isPending || updateProduct.isPending;

  /* ── render ── */
  return (
    <div className="space-y-5">
      {/* Product limit popup */}
      <Dialog open={limitPopupOpen} onOpenChange={setLimitPopupOpen}>
        <DialogContent className="max-w-xs text-center">
          <DialogHeader>
            <DialogTitle className="text-red-600 text-lg">Store Limit Reached</DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-3">
            <div className="text-4xl">🚫</div>
            <p className="text-sm text-gray-700 font-medium leading-relaxed">
              Your store product add limit crossed,<br />you can't add product more.
            </p>
          </div>
          <Button onClick={() => setLimitPopupOpen(false)} className="w-full mt-1">
            OK
          </Button>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="space-y-2">
        {/* Row 1: Title + Select / bulk actions */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Products</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {products.length} item{products.length !== 1 ? "s" : ""}
              {filterCategory ? ` · ${filterCategory}` : ""}
            </p>
          </div>

          {!bulkMode ? (
            /* Select button — top right */
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={() => setBulkMode(true)}
            >
              <CheckCircle2 className="w-4 h-4" />
              Select
            </Button>
          ) : (
            /* Bulk mode controls — top row */
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exitBulkMode}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (selectedIds.size === products.length) {
                    setSelectedIds(new Set());
                  } else {
                    setSelectedIds(new Set(products.map((p) => p.id)));
                  }
                }}
                className="gap-1.5"
              >
                {selectedIds.size === products.length ? "Deselect All" : "Select All"}
              </Button>
              <Button
                size="sm"
                disabled={selectedIds.size === 0 || deleteProduct.isPending}
                onClick={handleBulkDelete}
                className="bg-red-600 hover:bg-red-700 text-white gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Delete {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
              </Button>
            </div>
          )}
        </div>

        {/* Row 2: Add buttons — always full width, fully visible */}
        {!bulkMode && (
          <div className="flex gap-2">
            <Link href="/categories" className="flex-1">
              <Button
                variant="outline"
                className="w-full gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
              >
                <Tags className="w-4 h-4" />
                Category
              </Button>
            </Link>
            <Button
              onClick={openAdd}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </Button>
          </div>
        )}
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search products by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <Tabs value={filterType} onValueChange={(v) => { setFilterType(v); setFilterCategory(null); }}>
        <TabsList>
          <TabsTrigger value="All">All</TabsTrigger>
          {PRODUCT_TYPES.map((t) => (
            <TabsTrigger key={t} value={t}>
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Category chips */}
      {categories && categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
          {categories.map((cat) => {
            const active = filterCategory === cat.name;
            return (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(active ? null : cat.name)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  active
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-purple-400"
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Product grid — newest first */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <ImageIcon className="w-12 h-12 opacity-20 mb-3" />
          {searchQuery.trim() ? (
            <>
              <p className="text-sm font-medium">No products found</p>
              <p className="text-xs mt-1">No match for "{searchQuery.trim()}"</p>
              <button
                onClick={() => setSearchQuery("")}
                className="mt-3 text-xs text-primary underline underline-offset-2"
              >
                Clear search
              </button>
            </>
          ) : (
            <p className="text-sm">No products yet. Add your first one!</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-[2px] bg-gray-200">
          {products.map((product) => {
            const discount =
              product.actualPrice > product.discountPrice
                ? Math.round(
                    ((product.actualPrice - product.discountPrice) /
                      product.actualPrice) *
                      100
                  )
                : 0;
            return (
              <div
                key={product.id}
                className="bg-white cursor-pointer active:opacity-90 relative"
                onClick={() => {
                  if (bulkMode) { toggleSelect(product.id); return; }
                  setPreviousProductId(null); setSelectedProduct(product); setActiveImgIdx(0);
                }}
              >
                {/* Bulk select checkbox */}
                {bulkMode && (
                  <div className="absolute top-2 left-2 z-10">
                    {selectedIds.has(product.id)
                      ? <CheckCircle2 className="w-6 h-6 text-white drop-shadow-md fill-red-500" />
                      : <Circle className="w-6 h-6 text-white drop-shadow-md" />
                    }
                  </div>
                )}
                {bulkMode && selectedIds.has(product.id) && (
                  <div className="absolute inset-0 bg-red-500/10 z-[5] pointer-events-none" />
                )}
                {/* Image */}
                <div className="aspect-[3/4] bg-gray-100 relative overflow-hidden">
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                  {/* Counts overlay — likes left, try-on right */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent pt-6 pb-1.5 px-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Heart className="w-3 h-3 fill-red-400 text-red-400" />
                        <span className="text-white text-[11px] font-semibold">
                          {product.likeCount.toLocaleString("en-IN")}
                        </span>
                        <span className="text-white/70 text-[10px]">likes</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px]">🪞</span>
                        <span className="text-white text-[11px] font-semibold">
                          {((product as any).tryOnLikeCount ?? 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card info */}
                <div className="p-2 pb-3 space-y-0.5">
                  {/* Brand + name */}
                  {product.functionCategory && (
                    <p className="text-[11px] font-bold text-purple-600 leading-tight uppercase tracking-wide truncate">
                      {product.functionCategory}
                    </p>
                  )}
                  <p className="text-[12px] text-gray-700 leading-tight line-clamp-2">
                    {product.name}
                  </p>

                  {/* Pricing row */}
                  <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                    {discount > 0 && (
                      <span className="flex items-center gap-0.5 text-[11px] font-bold text-green-600">
                        <TrendingDown className="w-3 h-3" />
                        {discount}%
                      </span>
                    )}
                    {product.actualPrice > product.discountPrice && (
                      <span className="text-[11px] text-gray-400 line-through">
                        ₹{product.actualPrice}
                      </span>
                    )}
                    <span className="text-[13px] font-bold text-gray-900">
                      ₹{product.discountPrice}
                    </span>
                  </div>

                  {/* Size */}
                  {product.sizes?.length > 0 && (
                    <div className="pt-1">
                      <p className="text-[10px] font-semibold text-gray-500 mb-0.5">Size</p>
                      <div className="flex flex-wrap gap-1">
                        {product.sizes.slice(0, 4).map((s: string) => (
                          <span key={s} className="text-[9px] border border-gray-300 rounded px-1.5 py-0.5 text-gray-600 bg-gray-50">
                            {s}
                          </span>
                        ))}
                        {product.sizes.length > 4 && (
                          <span className="text-[9px] text-gray-400">+{product.sizes.length - 4}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Age */}
                  {product.age && (
                    <div className="pt-0.5">
                      <p className="text-[10px] font-semibold text-gray-500 mb-0.5">Age</p>
                      <span className="text-[9px] bg-orange-50 text-orange-600 border border-orange-200 rounded px-1.5 py-0.5 font-medium">
                        {product.age}
                      </span>
                    </div>
                  )}

                  {/* Gender */}
                  {product.gender && (
                    <div className="pt-0.5">
                      <p className="text-[10px] font-semibold text-gray-500 mb-0.5">Gender</p>
                      <span className="text-[9px] bg-blue-50 text-blue-600 border border-blue-200 rounded px-1.5 py-0.5 font-medium">
                        {product.gender}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ADD / EDIT FORM DIALOG ── */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Update Product" : "Add New Product"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 pb-2">
            {/* 1. Product Name */}
            <div className="space-y-1.5">
              <Label>
                Product Name <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g. Floral Summer Kurta"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>

            {/* 2. Product Image */}
            <div className="space-y-1.5">
              <Label>Product Image</Label>
              <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl transition-colors bg-muted/40 ${imageUrls.length >= 2 ? "opacity-50 cursor-not-allowed border-muted" : "cursor-pointer hover:border-primary/50"}`}>
                <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground">
                  {uploadImage.isPending
                    ? "Uploading..."
                    : imageUrls.length >= 2
                    ? "Images added"
                    : `Click to upload (${imageUrls.length}/2)`}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files)}
                  disabled={uploadImage.isPending || imageUrls.length >= 2}
                />
              </label>
              {imageUrls.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-1">
                  {imageUrls.map((url, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg border overflow-hidden">
                      <img
                        src={url}
                        alt={`img-${i}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setImageUrls((p) => p.filter((_, idx) => idx !== i))
                        }
                        className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/70 text-white rounded-full flex items-center justify-center"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Description */}
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={2}
                placeholder="Describe this product..."
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
              />
            </div>

            {/* 4. Price — Discount + Actual side by side */}
            <div className="space-y-1.5">
              <Label>Price</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Discount Price</p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      ₹
                    </span>
                    <Input
                      type="number"
                      placeholder="0"
                      className="pl-7"
                      value={form.discountPrice}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, discountPrice: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Actual Price</p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      ₹
                    </span>
                    <Input
                      type="number"
                      placeholder="0"
                      className="pl-7"
                      value={form.actualPrice}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, actualPrice: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>
              {/* Price preview */}
              {(form.discountPrice || form.actualPrice) && (
                <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                  <span className="text-base font-bold text-green-700">
                    ₹{form.discountPrice || "0"}
                  </span>
                  {form.actualPrice &&
                    parseFloat(form.actualPrice) >
                      parseFloat(form.discountPrice || "0") && (
                      <>
                        <span className="text-sm text-muted-foreground line-through">
                          ₹{form.actualPrice}
                        </span>
                        <span className="text-xs font-semibold text-red-500">
                          {Math.round(
                            ((parseFloat(form.actualPrice) -
                              parseFloat(form.discountPrice || "0")) /
                              parseFloat(form.actualPrice)) *
                              100
                          )}
                          % OFF
                        </span>
                      </>
                    )}
                </div>
              )}
            </div>

            {/* 5. Category */}
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={form.functionCategory || "none"}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    functionCategory: v === "none" ? "" : v,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!categories?.length && (
                <p className="text-xs text-muted-foreground">
                  No categories yet — go to Categories page to add some.
                </p>
              )}
            </div>

            {/* 6. Product Type chips */}
            <div className="space-y-1.5">
              <Label>Type</Label>
              <div className="flex gap-2 flex-wrap">
                {PRODUCT_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, productType: t }))}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      form.productType === t
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground border-border hover:border-primary/40"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* 7. Size chips */}
            <div className="space-y-1.5">
              <Label>Size</Label>
              <div className="flex flex-wrap gap-1.5">
                {SIZE_OPTIONS.map((s) => {
                  const selected = form.sizes.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, sizes: toggleItem(p.sizes, s) }))}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:border-primary/40"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 8. Age selector */}
            <div className="space-y-1.5">
              <Label>Age</Label>
              <div className="flex flex-wrap gap-1.5">
                {AGE_OPTIONS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, age: p.age === a ? "" : a }))}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                      form.age === a
                        ? "bg-orange-500 text-white border-orange-500"
                        : "bg-background text-muted-foreground border-border hover:border-orange-300"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* 9. Gender selector */}
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <div className="flex flex-wrap gap-1.5">
                {GENDER_OPTIONS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, gender: p.gender === g ? "" : g }))}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                      form.gender === g
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-background text-muted-foreground border-border hover:border-blue-300"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Done / Update button */}
            <Button
              type="submit"
              disabled={isPending || uploadImage.isPending}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold text-base py-5"
            >
              {isPending
                ? "Saving..."
                : editingId
                ? "Update Product"
                : "Done"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── PRODUCT DETAIL DIALOG (Meesho/Flipkart full-screen) ── */}
      {selectedProduct && (
        <Dialog
          open={!!selectedProduct}
          onOpenChange={(open) => !open && setSelectedProduct(null)}
        >
          <DialogContent className="fixed inset-0 max-w-none w-full h-full rounded-none p-0 m-0 flex flex-col bg-[#f4f4f4] translate-x-0 translate-y-0 top-0 left-0">
            <div key={selectedProduct?.id} className="flex flex-col flex-1 min-h-0 animate-slide-up-page">

            {/* ── Sticky top bar ── */}
            <div className="flex items-center gap-2 px-3 py-2 bg-white border-b sticky top-0 z-20 shadow-sm">
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

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto min-h-0">

              {/* Swipeable image carousel */}
              <div className="relative bg-white">
                {/* Scroll-snap track */}
                <div
                  ref={carouselRef}
                  className="flex overflow-x-auto"
                  style={{ scrollSnapType: "x mandatory", scrollBehavior: "smooth" }}
                  onScroll={(e) => {
                    const el = e.currentTarget;
                    const idx = Math.round(el.scrollLeft / el.clientWidth);
                    setActiveImgIdx(idx);
                  }}
                >
                  {(selectedProduct.images?.length > 0
                    ? selectedProduct.images
                    : [null]
                  ).map((img: string | null, i: number) => (
                    <div
                      key={i}
                      className="shrink-0 w-full bg-white"
                      style={{ scrollSnapAlign: "start", scrollSnapStop: "always", aspectRatio: "3/4", maxHeight: "48vh" }}
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
                  ))}
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

                {/* Product type tag */}
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
                          carouselRef.current?.scrollTo({ left: i * carouselRef.current.clientWidth, behavior: "smooth" });
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

              {/* ── Info card ── */}
              <div className="bg-white mt-2 px-4 pt-4 pb-2">
                {/* Badges */}
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

                {/* Product name */}
                <h1 className="text-[15px] font-semibold text-gray-900 leading-snug mb-3">
                  {selectedProduct.name}
                </h1>

                {/* Price row */}
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-[22px] font-extrabold text-gray-900">
                    ₹{selectedProduct.discountPrice}
                  </span>
                  {selectedProduct.actualPrice > selectedProduct.discountPrice && (
                    <>
                      <span className="text-sm text-gray-400 line-through">
                        ₹{selectedProduct.actualPrice}
                      </span>
                      <span className="text-sm font-bold text-[#2ecc71]">
                        ↓{Math.round(
                          ((selectedProduct.actualPrice - selectedProduct.discountPrice) /
                            selectedProduct.actualPrice) * 100
                        )}% off
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* ── Sizes ── */}
              {selectedProduct.sizes?.length > 0 && (
                <div className="bg-white mt-2 px-4 py-4">
                  <p className="text-[13px] font-bold text-gray-800 mb-3 tracking-wide uppercase">
                    Select Size
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.sizes.map((s: string) => (
                      <span
                        key={s}
                        className="px-4 py-1.5 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Description ── */}
              {selectedProduct.description && (
                <div className="bg-white mt-2 px-4 py-4">
                  <p className="text-[13px] font-bold text-gray-800 mb-2 tracking-wide uppercase">
                    Description
                  </p>
                  <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-wrap">
                    {selectedProduct.description}
                  </p>
                </div>
              )}

              {/* ── More like this ── */}
              {(() => {
                const related = (products ?? []).filter(
                  (p) =>
                    p.id !== selectedProduct.id &&
                    p.id !== previousProductId &&
                    p.productType === selectedProduct.productType
                );
                if (!related.length) return null;
                return (
                  <div className="bg-white mt-2 pb-4">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 pt-4 pb-3">
                      <span className="text-[15px] font-bold text-gray-900">More like this</span>
                      <button className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center">
                        <ChevronLeft className="w-4 h-4 rotate-180" />
                      </button>
                    </div>
                    {/* Horizontal scroll row */}
                    <div className="flex gap-3 overflow-x-auto px-4 pb-1" style={{ scrollSnapType: "x mandatory" }}>
                      {related.map((p) => {
                        const disc =
                          p.actualPrice > p.discountPrice
                            ? Math.round(((p.actualPrice - p.discountPrice) / p.actualPrice) * 100)
                            : 0;
                        return (
                          <div
                            key={p.id}
                            className="shrink-0 cursor-pointer"
                            style={{ width: 140, scrollSnapAlign: "start" }}
                            onClick={() => { setPreviousProductId(selectedProduct.id); setSelectedProduct(p); setActiveImgIdx(0); carouselRef.current?.scrollTo({ left: 0 }); }}
                          >
                            {/* Image */}
                            <div className="rounded-lg overflow-hidden bg-gray-100 relative" style={{ aspectRatio: "3/4" }}>
                              {p.images?.[0] ? (
                                <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="w-8 h-8 opacity-20" />
                                </div>
                              )}
                              {disc > 0 && (
                                <span className="absolute bottom-1.5 left-1.5 bg-[#ff3e6c] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm">
                                  {disc}% OFF
                                </span>
                              )}
                            </div>
                            {/* Info */}
                            <div className="mt-1.5 space-y-0.5">
                              <p className="text-[11px] font-medium text-gray-800 line-clamp-2 leading-tight">{p.name}</p>
                              {disc > 0 && (
                                <p className="text-[10px] font-bold text-[#2ecc71]">{disc}% OFF</p>
                              )}
                              <div className="flex items-baseline gap-1">
                                {disc > 0 && (
                                  <span className="text-[10px] text-gray-400 line-through">₹{p.actualPrice}</span>
                                )}
                                <span className="text-[12px] font-bold text-gray-900">₹{p.discountPrice}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <div className="h-24" />
            </div>

            {/* ── Sticky bottom bar — Meesho/Flipkart style ── */}
            <div className="sticky bottom-0 bg-white border-t shadow-[0_-2px_12px_rgba(0,0,0,0.1)] px-4 py-3 grid grid-cols-2 gap-3 z-20">
              <button
                onClick={() => openEdit(selectedProduct)}
                className="flex items-center justify-center gap-2 py-3 rounded font-bold text-sm border-2 border-gray-800 text-gray-800 bg-white hover:bg-gray-50 transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Update
              </button>
              <button
                onClick={() => handleDelete(selectedProduct.id)}
                disabled={deleteProduct.isPending}
                className="flex items-center justify-center gap-2 py-3 rounded font-bold text-sm bg-[#ff3e6c] text-white hover:bg-[#e0355f] transition-colors disabled:opacity-60"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>

            </div>{/* end animate-slide-up-page wrapper */}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
