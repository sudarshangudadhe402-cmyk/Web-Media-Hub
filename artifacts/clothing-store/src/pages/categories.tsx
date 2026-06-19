import { useState, useRef } from "react";
import {
  useListCategories,
  useCreateCategory,
  useDeleteCategory,
  getListCategoriesQueryKey,
  useUploadProductImage,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  X,
  Image as ImageIcon,
  Trash2,
  Pencil,
  ChevronLeft,
  Tags,
  Upload,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface CategoryWithExtras {
  id: string;
  name: string;
  coverImage?: string | null;
  description?: string | null;
  createdAt: string;
}

interface CategoryForm {
  name: string;
  coverImage: string;
  description: string;
}

const EMPTY_FORM: CategoryForm = { name: "", coverImage: "", description: "" };

export default function Categories() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CategoryForm>(EMPTY_FORM);
  const [editingCategory, setEditingCategory] = useState<CategoryWithExtras | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [editImageUploading, setEditImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categoriesRaw, isLoading } = useListCategories();
  const categories = (categoriesRaw ?? []) as CategoryWithExtras[];
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const uploadImage = useUploadProductImage();

  async function compressImage(file: File): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const MAX_DIM = 800;
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
        let quality = 0.82;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        while (dataUrl.length * 0.75 > 200_000 && quality > 0.3) {
          quality -= 0.08;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
        resolve(dataUrl.split(",")[1]);
      };
      img.src = objectUrl;
    });
  }

  async function handleImageUpload(file: File, target: "add" | "edit") {
    if (target === "add") setImageUploading(true);
    else setEditImageUploading(true);
    try {
      const base64 = await compressImage(file);
      uploadImage.mutate(
        { data: { imageData: base64, fileName: file.name.replace(/\.[^.]+$/, ".jpg") } },
        {
          onSuccess: (res) => {
            if (target === "add") setForm((f) => ({ ...f, coverImage: res.url }));
            else setEditForm((f) => ({ ...f, coverImage: res.url }));
          },
          onError: () => toast({ title: "Failed to upload image", variant: "destructive" }),
          onSettled: () => {
            if (target === "add") setImageUploading(false);
            else setEditImageUploading(false);
          },
        }
      );
    } catch {
      if (target === "add") setImageUploading(false);
      else setEditImageUploading(false);
    }
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    createCategory.mutate(
      { data: { name: form.name, coverImage: form.coverImage || null, description: form.description || null } as any },
      {
        onSuccess: () => {
          toast({ title: "Category created" });
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
          setForm(EMPTY_FORM);
          setShowAddForm(false);
        },
        onError: (err: any) => {
          toast({ title: err?.message ?? "Failed to create category", variant: "destructive" });
        },
      }
    );
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !editForm.name.trim()) return;
    try {
      await fetch(`/api/categories/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          coverImage: editForm.coverImage || null,
          description: editForm.description || null,
        }),
      });
      toast({ title: "Category updated" });
      queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
      setEditingCategory(null);
      setEditingId(null);
    } catch {
      toast({ title: "Failed to update category", variant: "destructive" });
    }
  }

  function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete category "${name}"? Products in this category will remain but won't be linked to this category.`)) return;
    deleteCategory.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Category deleted" });
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
          if (editingCategory?.id === id) setEditingCategory(null);
        },
      }
    );
  }

  function openEdit(cat: CategoryWithExtras) {
    setEditingCategory(cat);
    setEditingId(cat.id);
    setEditForm({ name: cat.name, coverImage: cat.coverImage ?? "", description: cat.description ?? "" });
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Category</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {categories.length} categor{categories.length !== 1 ? "ies" : "y"}
          </p>
        </div>
        <Button
          onClick={() => { setShowAddForm(true); setForm(EMPTY_FORM); }}
          className="gap-2 bg-black hover:bg-black/80 text-white"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </Button>
      </div>

      {/* ── Add form slide-down ── */}
      {showAddForm && (
        <div className="mb-6 border rounded-2xl overflow-hidden bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b bg-gray-50">
            <h2 className="font-semibold text-sm">New Category</h2>
            <button onClick={() => setShowAddForm(false)} className="p-1 rounded-full hover:bg-gray-200 transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <form onSubmit={handleCreate} className="p-4 space-y-4">
            {/* Category name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Category Name *</label>
              <Input
                placeholder="e.g. Birthday, Summer Collection..."
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            {/* Cover image */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Cover Image</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, "add"); e.target.value = ""; }}
              />
              {form.coverImage ? (
                <div className="relative w-32 h-32 rounded-xl overflow-hidden border">
                  <img src={form.coverImage} alt="Cover" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, coverImage: "" }))}
                    className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageUploading}
                  className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 hover:border-gray-400 transition-colors text-gray-400"
                >
                  {imageUploading ? (
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      <span className="text-[11px] font-medium">Upload</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Description</label>
              <Textarea
                placeholder="Brief description of this category..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setShowAddForm(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!form.name.trim() || createCategory.isPending}
                className="flex-1 bg-black hover:bg-black/80 text-white"
              >
                {createCategory.isPending ? "Creating..." : "Create Category"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ── Category list ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground rounded-2xl border border-dashed">
          <Tags className="w-12 h-12 mb-4 opacity-20" />
          <p className="font-medium">No categories yet</p>
          <p className="text-sm mt-1">Click "Add Category" to create your first one</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="relative rounded-2xl overflow-hidden border bg-white cursor-pointer group hover:shadow-md transition-shadow"
              onClick={() => openEdit(cat)}
            >
              {/* Cover image */}
              <div className="w-full bg-gray-100" style={{ aspectRatio: "4/3" }}>
                {cat.coverImage ? (
                  <img src={cat.coverImage} alt={cat.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-gray-300" />
                  </div>
                )}
              </div>
              {/* Name */}
              <div className="px-3 py-2.5">
                <p className="font-semibold text-sm text-gray-900 truncate">{cat.name}</p>
                {cat.description && (
                  <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{cat.description}</p>
                )}
              </div>
              {/* Edit/Delete overlay */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); openEdit(cat); }}
                  className="w-7 h-7 rounded-full bg-white shadow flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5 text-gray-600" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(cat.id, cat.name); }}
                  className="w-7 h-7 rounded-full bg-white shadow flex items-center justify-center hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Edit drawer ── */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/40" onClick={() => setEditingCategory(null)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg">Edit Category</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDelete(editingCategory.id, editingCategory.name)}
                  className="px-3 py-1.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
                <button onClick={() => setEditingCategory(null)} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Category Name *</label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Cover Image</label>
                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, "edit"); e.target.value = ""; }}
                />
                <div className="flex items-center gap-3">
                  {editForm.coverImage ? (
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden border shrink-0">
                      <img src={editForm.coverImage} alt="Cover" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setEditForm((f) => ({ ...f, coverImage: "" }))}
                        className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      disabled={editImageUploading}
                      className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 hover:border-gray-400 transition-colors text-gray-400 shrink-0"
                    >
                      {editImageUploading ? (
                        <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          <span className="text-[11px] font-medium">Upload</span>
                        </>
                      )}
                    </button>
                  )}
                  {editForm.coverImage && (
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      disabled={editImageUploading}
                      className="text-sm text-blue-600 font-medium hover:underline"
                    >
                      Change image
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Description</label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="resize-none"
                  placeholder="Brief description of this category..."
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setEditingCategory(null)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-black hover:bg-black/80 text-white">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
