import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import {
  useListProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useUploadProductImage,
  useUploadProductModel,
  useListCategories,
  getListProductsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
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
  Box,
  Link as LinkIcon,
  Copy,
  Palette,
  Package,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

/* ── constants ── */
const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "Free Size"];
const AGE_OPTIONS = Array.from({ length: 50 }, (_, i) => `${i}-${i + 1}Y`);
const GENDER_OPTIONS = ["Men", "Women", "Boys", "Girls", "Unisex"];

interface ProductForm {
  brandName: string;
  name: string;
  description: string;
  discountPrice: string;
  actualPrice: string;
  functionCategory: string;
  sizes: string[];
  age: string;
  gender: string;
  stock: string;
  colours: string[];
}

const EMPTY_FORM: ProductForm = {
  brandName: "",
  name: "",
  description: "",
  discountPrice: "",
  actualPrice: "",
  functionCategory: "",
  sizes: [],
  age: "",
  gender: "",
  stock: "",
  colours: [],
};

function toggleItem(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
}

/* ── main component ── */
export default function Products() {
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [colourInput, setColourInput] = useState("");
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
  const { data: globalLinkData } = useQuery({
    queryKey: ["settings", "global-link"],
    queryFn: async () => {
      const token = localStorage.getItem("wmh_token");
      const res = await fetch("/api/settings/global-link", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return { globalLink: null };
      return res.json() as Promise<{ globalLink: string | null }>;
    },
  });
  const globalLink = globalLinkData?.globalLink ?? null;

  const products = (allProducts ?? []).filter((p) => {
    const catMatch = !filterCategory || p.functionCategory === filterCategory;
    const q = searchQuery.trim().toLowerCase();
    const nameMatch = !q || p.name.toLowerCase().includes(q);
    return catMatch && nameMatch;
  });
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const uploadImage = useUploadProductImage();
  const uploadModel = useUploadProductModel();
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (uploadModel.isPending) {
      setUploadProgress(0);
      interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) { clearInterval(interval); return 90; }
          return prev + Math.random() * 12;
        });
      }, 200);
    } else if (!uploadModel.isPending && uploadProgress > 0) {
      setUploadProgress(100);
      const t = setTimeout(() => setUploadProgress(0), 600);
      return () => clearTimeout(t);
    }
    return () => clearInterval(interval);
  }, [uploadModel.isPending]);

  /* ── helpers ── */
  function resetForm() {
    setForm(EMPTY_FORM);
    setImageUrls([]);
    setModelUrl(null);
    setEditingId(null);
    setColourInput("");
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
      brandName: product.brandName ?? "",
      name: product.name,
      description: product.description ?? "",
      discountPrice: String(product.discountPrice),
      actualPrice: String(product.actualPrice),
      functionCategory: product.functionCategory ?? "",
      sizes: product.sizes,
      age: product.age ?? "",
      gender: product.gender ?? "",
      stock: String(product.stock ?? 0),
      colours: product.colours ?? [],
    });
    setColourInput("");
    setImageUrls(product.images ?? []);
    setModelUrl(product.modelUrl ?? null);
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
    const remaining = 4 - imageUrls.length;
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

  async function handleModelFileChange(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];

    const allowed3DExtensions = [".glb", ".gltf"];
    const fileName = file.name.toLowerCase();
    const is3DModel = allowed3DExtensions.some((ext) => fileName.endsWith(ext));
    if (!is3DModel) {
      toast({ title: "Only 3D model allowed", description: "Please upload a .glb or .gltf file.", variant: "destructive" });
      return;
    }

    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast({ title: "File limit 10MB", description: "Your 3D model file exceeds the 10MB limit.", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadModel.mutate(
        { data: { modelData: base64, fileName: file.name } },
        {
          onSuccess: (res) => setModelUrl(res.url),
          onError: () =>
            toast({ title: "Failed to upload 3D model", variant: "destructive" }),
        }
      );
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.brandName.trim()) {
      toast({ title: "Brand name is required", variant: "destructive" });
      return;
    }
    if (!form.name.trim()) {
      toast({ title: "Product name is required", variant: "destructive" });
      return;
    }
    if (imageUrls.length === 0) {
      toast({ title: "At least one product image is required", variant: "destructive" });
      return;
    }
    if (!form.discountPrice || !form.actualPrice) {
      toast({ title: "Both prices are required", variant: "destructive" });
      return;
    }
    if (!form.functionCategory) {
      toast({ title: "Category is required", variant: "destructive" });
      return;
    }
    if (form.stock === "") {
      toast({ title: "Stock quantity is required", variant: "destructive" });
      return;
    }
    if (form.colours.length === 0) {
      toast({ title: "At least one colour is required", variant: "destructive" });
      return;
    }
    if (form.sizes.length === 0) {
      toast({ title: "At least one size is required", variant: "destructive" });
      return;
    }
    if (!form.age) {
      toast({ title: "Age range is required", variant: "destructive" });
      return;
    }
    if (!form.gender) {
      toast({ title: "Gender is required", variant: "destructive" });
      return;
    }
    const data = {
      brandName: form.brandName,
      name: form.name,
      description: form.description || undefined,
      discountPrice: parseFloat(form.discountPrice) || 0,
      actualPrice: parseFloat(form.actualPrice) || 0,
      functionCategory: form.functionCategory || undefined,
      sizes: form.sizes,
      age: form.age || undefined,
      gender: form.gender || undefined,
      stock: parseInt(form.stock) || 0,
      colours: form.colours,
      images: imageUrls,
      modelUrl: modelUrl || undefined,
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

  const isPending = createProduct.isPending || updateProduct.isPending || uploadModel.isPending;

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

      {/* ── ADD / EDIT FORM — FULL PAGE OVERLAY ── */}
      {formOpen && (() => {
        const isPublishReady =
          form.brandName.trim() !== "" &&
          form.name.trim() !== "" &&
          imageUrls.length > 0 &&
          form.discountPrice !== "" &&
          form.actualPrice !== "" &&
          form.functionCategory !== "" &&
          form.stock !== "" &&
          form.colours.length > 0 &&
          form.sizes.length > 0 &&
          form.age !== "" &&
          form.gender !== "";

        function addColour(val: string) {
          const trimmed = val.trim();
          if (trimmed && !form.colours.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
            setForm((p) => ({ ...p, colours: [...p.colours, trimmed] }));
          }
          setColourInput("");
        }

        return (
          <div className="fixed inset-0 z-50 flex flex-col bg-white">
            {/* ── Sticky header ── */}
            <div className="flex items-center gap-2 px-3 py-2 bg-white border-b shadow-sm shrink-0">
              <button
                type="button"
                aria-label="Go back"
                onClick={() => { setFormOpen(false); resetForm(); }}
                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </button>
              <h2 className="font-semibold text-base flex-1 text-gray-800">
                {editingId ? "Update Product" : "Add New Product"}
              </h2>
            </div>

            {/* ── Scrollable form body ── */}
            <div className="flex-1 overflow-y-auto">
              <form id="add-product-form" onSubmit={handleSubmit} className="space-y-5 px-4 pt-5 pb-4">

                {/* 1. Brand Name */}
                <div className="space-y-1.5">
                  <Label>
                    Brand Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. Zara, H&M, Fabindia"
                    value={form.brandName}
                    onChange={(e) => setForm((p) => ({ ...p, brandName: e.target.value }))}
                  />
                </div>

                {/* 2. Product Name */}
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

                {/* 3. Product Image */}
                <div className="space-y-1.5">
                  <Label>
                    Product Image <span className="text-destructive">*</span>
                    <span className="text-[11px] text-muted-foreground font-normal ml-1">({imageUrls.length}/4)</span>
                  </Label>
                  {imageUrls.length > 0 && (
                    <div className="flex gap-2 flex-wrap mb-2">
                      {imageUrls.map((url, i) => (
                        <div key={i} className="relative w-20 h-20 rounded-lg border overflow-hidden">
                          <img src={url} alt={`Product image ${i + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            aria-label={`Remove image ${i + 1}`}
                            onClick={() => setImageUrls((p) => p.filter((_, idx) => idx !== i))}
                            className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/70 text-white rounded-full flex items-center justify-center"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {imageUrls.length < 4 && (
                    <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl transition-colors bg-muted/40 ${uploadImage.isPending ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:border-primary/50"}`}>
                      <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">
                        {uploadImage.isPending ? "Uploading..." : `Click to upload (${imageUrls.length}/4)`}
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
                  )}
                </div>

                {/* 4. 3D Model Upload — optional */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Box className="w-3.5 h-3.5 text-purple-500" />
                    3D Model <span className="text-[11px] text-muted-foreground font-normal">(optional · .glb / .gltf)</span>
                  </Label>
                  {modelUrl ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl border bg-purple-50 border-purple-200">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                        <Box className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-purple-700">3D model uploaded</p>
                        <p className="text-[10px] text-purple-400 truncate">{modelUrl.slice(0, 40)}…</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setModelUrl(null)}
                        className="w-6 h-6 rounded-full bg-red-100 text-red-500 flex items-center justify-center shrink-0 hover:bg-red-200 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-xl transition-colors bg-muted/40 overflow-hidden ${uploadModel.isPending ? "cursor-not-allowed border-purple-300" : "cursor-pointer hover:border-purple-400 hover:bg-purple-50/40"}`}>
                      {uploadModel.isPending ? (
                        <div className="w-full px-4 py-3 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-purple-700">Uploading 3D model…</span>
                            <span className="text-xs font-semibold text-purple-600">{Math.min(Math.round(uploadProgress), 100)}%</span>
                          </div>
                          <div className="w-full h-2 bg-purple-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all duration-200 ease-out"
                              style={{ width: `${Math.min(uploadProgress, 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground text-center">Please wait, do not close this window</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-20">
                          <Box className="w-5 h-5 text-purple-400 mb-1" />
                          <span className="text-xs text-muted-foreground">Click to upload 3D model</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept=".glb,.gltf"
                        className="hidden"
                        onChange={(e) => handleModelFileChange(e.target.files)}
                        disabled={uploadModel.isPending}
                      />
                    </label>
                  )}
                </div>

                {/* 5. NexGenStudio Link */}
                {globalLink && (
                  <div className="rounded-xl border border-primary/20 overflow-hidden">
                    <div className="flex items-center px-4 py-2.5 bg-primary/5 border-b border-primary/20">
                      <span className="text-sm font-bold text-primary tracking-wide">NexGenStudio</span>
                      <span className="text-xs text-muted-foreground ml-2">(3D Model &amp; products on Model's generator + AI Promotional Video)</span>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <LinkIcon className="w-4 h-4 text-primary shrink-0" />
                      <a href={globalLink} target="_blank" rel="noopener noreferrer"
                        className="flex-1 text-sm text-primary font-medium underline underline-offset-2 truncate">
                        {globalLink}
                      </a>
                      <button
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(globalLink); toast({ title: "Link copied!" }); }}
                        className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors shrink-0">
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                )}

                {/* 6. Description — optional */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    Description
                    <span className="text-[11px] text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Textarea
                    rows={3}
                    placeholder="Describe this product..."
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  />
                </div>

                {/* 7. Price — side by side */}
                <div className="space-y-1.5">
                  <Label>
                    Price <span className="text-destructive">*</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Discount Price</p>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                        <Input
                          type="number"
                          inputMode="numeric"
                          placeholder="0"
                          className="pl-7"
                          value={form.discountPrice}
                          onChange={(e) => setForm((p) => ({ ...p, discountPrice: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Actual Price</p>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                        <Input
                          type="number"
                          inputMode="numeric"
                          placeholder="0"
                          className="pl-7"
                          value={form.actualPrice}
                          onChange={(e) => setForm((p) => ({ ...p, actualPrice: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                  {(form.discountPrice || form.actualPrice) && (
                    <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                      <span className="text-base font-bold text-green-700">₹{form.discountPrice || "0"}</span>
                      {form.actualPrice && parseFloat(form.actualPrice) > parseFloat(form.discountPrice || "0") && (
                        <>
                          <span className="text-sm text-muted-foreground line-through">₹{form.actualPrice}</span>
                          <span className="text-xs font-semibold text-red-500">
                            {Math.round(((parseFloat(form.actualPrice) - parseFloat(form.discountPrice || "0")) / parseFloat(form.actualPrice)) * 100)}% OFF
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* 8. Category */}
                <div className="space-y-1.5">
                  <Label>
                    Category <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={form.functionCategory || ""}
                    onValueChange={(v) => setForm((p) => ({ ...p, functionCategory: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((c) => (
                        <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!categories?.length && (
                    <p className="text-xs text-muted-foreground">No categories yet — go to Categories page to add some.</p>
                  )}
                </div>

                {/* 9. Stock */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-gray-500" />
                    Stock <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="e.g. 50"
                    min={0}
                    value={form.stock}
                    onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))}
                  />
                </div>

                {/* 10. Colour — tag input */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-pink-500" />
                    Colour <span className="text-destructive">*</span>
                    <span className="text-[11px] text-muted-foreground font-normal">(press Enter or comma to add)</span>
                  </Label>
                  {form.colours.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {form.colours.map((c) => (
                        <span key={c} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-pink-50 border border-pink-200 text-pink-700 text-xs font-medium">
                          {c}
                          <button
                            type="button"
                            aria-label={`Remove colour ${c}`}
                            onClick={() => setForm((p) => ({ ...p, colours: p.colours.filter((x) => x !== c) }))}
                            className="ml-0.5 hover:text-red-500 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <Input
                    placeholder="e.g. Red, Blue, Black"
                    value={colourInput}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v.endsWith(",")) {
                        addColour(v.slice(0, -1));
                      } else {
                        setColourInput(v);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addColour(colourInput);
                      }
                    }}
                    onBlur={() => { if (colourInput.trim()) addColour(colourInput); }}
                  />
                </div>

                {/* 11. Size chips */}
                <div className="space-y-1.5">
                  <Label>
                    Size <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {SIZE_OPTIONS.map((s) => {
                      const selected = form.sizes.includes(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, sizes: toggleItem(p.sizes, s) }))}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
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

                {/* 12. Age selector */}
                <div className="space-y-1.5">
                  <Label>
                    Age <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {AGE_OPTIONS.map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, age: p.age === a ? "" : a }))}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors shrink-0 ${
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

                {/* 13. Gender selector */}
                <div className="space-y-1.5">
                  <Label>
                    Gender <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {GENDER_OPTIONS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, gender: p.gender === g ? "" : g }))}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
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

                {/* Spacer for sticky footer */}
                <div className="h-2" />
              </form>
            </div>

            {/* ── Sticky Publish footer ── */}
            <div className="shrink-0 bg-white border-t shadow-[0_-2px_12px_rgba(0,0,0,0.08)] px-4 py-3">
              {!isPublishReady && (
                <p className="text-[11px] text-muted-foreground text-center mb-2">
                  Fill all required fields <span className="text-destructive">*</span> to publish
                </p>
              )}
              <Button
                type="submit"
                form="add-product-form"
                disabled={!isPublishReady || isPending || uploadImage.isPending}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-base py-5 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                {isPending
                  ? "Publishing..."
                  : editingId
                  ? "Update Product"
                  : "Publish"}
              </Button>
            </div>
          </div>
        );
      })()}

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
