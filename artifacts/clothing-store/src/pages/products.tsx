import { useState, useRef } from "react";
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
  ChevronLeft,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

/* ── constants ── */
const PRODUCT_TYPES = ["Top", "Bottom", "Full Outfit"] as const;
type ProductType = (typeof PRODUCT_TYPES)[number];

const SIZE_GROUPS = [
  {
    label: "Adults",
    sizes: ["XS", "S", "M", "L", "XL", "XXL", "XXXL"],
  },
  {
    label: "Kids (Age)",
    sizes: ["0-3M", "3-6M", "6-12M", "1Y+", "2Y+", "3Y+", "4Y+", "5Y+", "6Y+", "7Y+", "8Y+"],
  },
  {
    label: "Gender",
    sizes: ["Boy", "Girl", "Unisex"],
  },
];

interface ProductForm {
  name: string;
  description: string;
  discountPrice: string;
  actualPrice: string;
  functionCategory: string;
  productType: ProductType;
  sizes: string[];
}

const EMPTY_FORM: ProductForm = {
  name: "",
  description: "",
  discountPrice: "",
  actualPrice: "",
  functionCategory: "",
  productType: "Top",
  sizes: [],
};

function toggleItem(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
}

/* ── main component ── */
export default function Products() {
  const [filterType, setFilterType] = useState("All");
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useListProducts(
    filterType !== "All" ? { type: filterType as any } : {}
  );
  const { data: categories } = useListCategories();
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
    });
    setImageUrls(product.images ?? []);
    setEditingId(product.id);
    setSelectedProduct(null);
    setFormOpen(true);
  }

  async function handleFileChange(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(file);
      });
      uploadImage.mutate(
        { data: { imageData: base64, fileName: file.name } },
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

  const isPending = createProduct.isPending || updateProduct.isPending;

  /* ── render ── */
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {products?.length ?? 0} items
          </p>
        </div>
        <Button
          onClick={openAdd}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </Button>
      </div>

      {/* Filter tabs */}
      <Tabs value={filterType} onValueChange={setFilterType}>
        <TabsList>
          <TabsTrigger value="All">All</TabsTrigger>
          {PRODUCT_TYPES.map((t) => (
            <TabsTrigger key={t} value={t}>
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Product grid — newest first */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : !products?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <ImageIcon className="w-12 h-12 opacity-20 mb-3" />
          <p className="text-sm">No products yet. Add your first one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
              <Card
                key={product.id}
                className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => { setSelectedProduct(product); setActiveImgIdx(0); }}
              >
                {/* Image */}
                <div className="aspect-[3/4] bg-muted relative">
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 opacity-20" />
                    </div>
                  )}
                  {discount > 0 && (
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      {discount}% OFF
                    </span>
                  )}
                  <span className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                    {product.productType}
                  </span>
                </div>
                <CardContent className="p-3 space-y-1">
                  <p className="font-medium text-sm line-clamp-1 leading-tight">
                    {product.name}
                  </p>
                  {product.functionCategory && (
                    <p className="text-[10px] text-muted-foreground">
                      {product.functionCategory}
                    </p>
                  )}
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-base font-bold text-green-700">
                      ₹{product.discountPrice}
                    </span>
                    {product.actualPrice > product.discountPrice && (
                      <span className="text-xs text-muted-foreground line-through">
                        ₹{product.actualPrice}
                      </span>
                    )}
                  </div>
                  {product.sizes?.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {product.sizes.slice(0, 3).map((s: string) => (
                        <span
                          key={s}
                          className="text-[9px] border rounded px-1 py-0.5 text-muted-foreground"
                        >
                          {s}
                        </span>
                      ))}
                      {product.sizes.length > 3 && (
                        <span className="text-[9px] text-muted-foreground">
                          +{product.sizes.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
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
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-muted/40">
                <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground">
                  {uploadImage.isPending ? "Uploading..." : "Click to upload images"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files)}
                  disabled={uploadImage.isPending}
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

            {/* 7. Size / Age chips — grouped */}
            <div className="space-y-2">
              <Label>Size / Age</Label>
              {SIZE_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="text-xs text-muted-foreground mb-1.5">
                    {group.label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.sizes.map((s) => {
                      const selected = form.sizes.includes(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() =>
                            setForm((p) => ({
                              ...p,
                              sizes: toggleItem(p.sizes, s),
                            }))
                          }
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
              ))}
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
            <div className="flex-1 overflow-y-auto">

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
                      style={{ scrollSnapAlign: "start", aspectRatio: "3/4", maxHeight: "68vh" }}
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

          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
