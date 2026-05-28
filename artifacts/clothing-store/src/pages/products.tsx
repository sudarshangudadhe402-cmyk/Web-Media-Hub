import { useState } from "react";
import { useListProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useLikeProduct, useUploadProductImage, useListCategories, getListProductsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Heart, Trash2, Edit, Image as ImageIcon, MessageCircle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  actualPrice: z.coerce.number().min(0, "Actual price must be positive"),
  discountPrice: z.coerce.number().min(0, "Discount price must be positive"),
  functionCategory: z.string().optional(),
  productType: z.enum(["Top", "Bottom", "Full Outfit", "Functional"]),
  sizes: z.array(z.string()).min(1, "At least one size is required")
});

const AVAILABLE_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "0-3M", "3-6M", "6-12M", "1Y", "2Y", "3Y", "4Y", "5Y"];

export default function Products() {
  const [filterType, setFilterType] = useState<string>("All");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useListProducts(filterType !== "All" ? { type: filterType as any } : {});
  const { data: categories } = useListCategories();
  
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const likeProduct = useLikeProduct();
  const uploadImage = useUploadProductImage();

  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      actualPrice: 0,
      discountPrice: 0,
      functionCategory: "",
      productType: "Top",
      sizes: []
    }
  });

  const handleFileChange = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(file);
      });
      uploadImage.mutate({ data: { imageData: base64, fileName: file.name } }, {
        onSuccess: (res) => setImageUrls(prev => [...prev, res.url]),
        onError: () => toast({ title: "Failed to upload image", variant: "destructive" })
      });
    }
  };

  const onSubmit = (values: z.infer<typeof productSchema>) => {
    const data = { ...values, images: imageUrls };
    if (editingProduct) {
      updateProduct.mutate({ id: editingProduct.id, data }, {
        onSuccess: () => {
          toast({ title: "Product updated" });
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          setEditingProduct(null);
          setIsModalOpen(false);
          form.reset();
          setImageUrls([]);
        }
      });
    } else {
      createProduct.mutate({ data }, {
        onSuccess: () => {
          toast({ title: "Product created" });
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          form.reset();
          setImageUrls([]);
          setIsModalOpen(false);
        }
      });
    }
  };

  const openEdit = (product: any) => {
    setEditingProduct(product);
    setImageUrls(product.images || []);
    form.reset({
      name: product.name,
      description: product.description || "",
      actualPrice: product.actualPrice,
      discountPrice: product.discountPrice,
      functionCategory: product.functionCategory || "",
      productType: product.productType,
      sizes: product.sizes
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      deleteProduct.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Product deleted" });
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        }
      });
    }
  };

  const handleLike = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    likeProduct.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <Dialog open={isModalOpen} onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            setEditingProduct(null);
            form.reset();
            setImageUrls([]);
          }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-product">Add Product</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Product Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormItem>
                  <FormLabel>Product Images</FormLabel>
                  <FormControl>
                    <Input type="file" multiple accept="image/*" onChange={(e) => handleFileChange(e.target.files)} disabled={uploadImage.isPending} />
                  </FormControl>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {imageUrls.map((url, i) => (
                      <div key={i} className="relative w-16 h-16 border rounded">
                        <img src={url} alt={`Preview ${i}`} className="w-full h-full object-cover rounded" />
                        <button type="button" className="absolute top-0 right-0 bg-destructive text-white rounded-full w-4 h-4 text-xs flex items-center justify-center" onClick={() => setImageUrls(prev => prev.filter((_, idx) => idx !== i))}>×</button>
                      </div>
                    ))}
                    {uploadImage.isPending && (
                      <div className="w-16 h-16 border rounded flex items-center justify-center bg-muted animate-pulse">
                        <ImageIcon className="w-6 h-6 opacity-50" />
                      </div>
                    )}
                  </div>
                </FormItem>
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="actualPrice" render={({ field }) => (
                    <FormItem><FormLabel>Actual Price</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="discountPrice" render={({ field }) => (
                    <FormItem><FormLabel>Discount Price</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="productType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Top">Top</SelectItem>
                          <SelectItem value="Bottom">Bottom</SelectItem>
                          <SelectItem value="Full Outfit">Full Outfit</SelectItem>
                          <SelectItem value="Functional">Functional</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="functionCategory" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Function Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "none"}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {categories?.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="sizes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sizes</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_SIZES.map(size => {
                        const isSelected = field.value.includes(size);
                        return (
                          <Badge 
                            key={size} 
                            variant={isSelected ? "default" : "outline"} 
                            className="cursor-pointer"
                            onClick={() => {
                              const newSizes = isSelected ? field.value.filter(s => s !== size) : [...field.value, size];
                              field.onChange(newSizes);
                            }}
                          >
                            {size}
                          </Badge>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending} className="w-full">
                  {editingProduct ? "Update Product" : "Add Product"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={filterType} onValueChange={setFilterType}>
        <TabsList>
          <TabsTrigger value="All">All</TabsTrigger>
          <TabsTrigger value="Top">Top</TabsTrigger>
          <TabsTrigger value="Bottom">Bottom</TabsTrigger>
          <TabsTrigger value="Full Outfit">Full Outfit</TabsTrigger>
          <TabsTrigger value="Functional">Functional</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
        </div>
      ) : products?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ImageIcon className="mx-auto h-12 w-12 opacity-20 mb-4" />
          <p>No products found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products?.map(product => {
            const savings = product.actualPrice > product.discountPrice 
              ? Math.round(((product.actualPrice - product.discountPrice) / product.actualPrice) * 100) 
              : 0;

            return (
              <Card key={product.id} className="overflow-hidden cursor-pointer hover:border-primary transition-all group relative" onClick={() => setSelectedProduct(product)} data-testid={`card-product-${product.id}`}>
                <div className="aspect-square bg-muted relative">
                  {product.images?.[0] ? (
                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><ImageIcon className="opacity-20 h-10 w-10" /></div>
                  )}
                  <Badge className="absolute top-2 left-2">{product.productType}</Badge>
                  {savings > 0 && <Badge variant="destructive" className="absolute top-2 left-16">{savings}% OFF</Badge>}
                  
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="secondary" className="h-8 w-8 bg-background/80 backdrop-blur" onClick={(e) => { e.stopPropagation(); openEdit(product); }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="destructive" className="h-8 w-8 bg-destructive/80 backdrop-blur" onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold line-clamp-1">{product.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg font-bold">${product.discountPrice}</span>
                    {product.actualPrice > product.discountPrice && (
                      <span className="text-sm text-muted-foreground line-through">${product.actualPrice}</span>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0 flex justify-between items-center">
                  <div className="flex gap-1 overflow-hidden">
                    {product.sizes.slice(0, 3).map(s => <Badge key={s} variant="outline" className="text-[10px] px-1">{s}</Badge>)}
                    {product.sizes.length > 3 && <Badge variant="outline" className="text-[10px] px-1">+{product.sizes.length - 3}</Badge>}
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 gap-1 px-2" onClick={(e) => handleLike(e, product.id)}>
                    <Heart className={`h-4 w-4 ${product.likeCount > 0 ? "fill-destructive text-destructive" : ""}`} />
                    <span className="text-xs">{product.likeCount}</span>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {selectedProduct && (
        <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedProduct.name}</DialogTitle>
            </DialogHeader>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="aspect-square bg-muted rounded-lg overflow-hidden border">
                  {selectedProduct.images?.[0] ? (
                    <img src={selectedProduct.images[0]} alt={selectedProduct.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><ImageIcon className="opacity-20 h-16 w-16" /></div>
                  )}
                </div>
                {selectedProduct.images?.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {selectedProduct.images.map((img: string, i: number) => (
                      <img key={i} src={img} alt="" className="h-16 w-16 object-cover rounded cursor-pointer border hover:border-primary" />
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{selectedProduct.productType}</Badge>
                  {selectedProduct.functionCategory && <Badge variant="outline">{selectedProduct.functionCategory}</Badge>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold">${selectedProduct.discountPrice}</div>
                  {selectedProduct.actualPrice > selectedProduct.discountPrice && (
                    <div className="text-muted-foreground line-through text-lg">${selectedProduct.actualPrice}</div>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Sizes Available</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.sizes.map((s: string) => <Badge key={s} variant="secondary">{s}</Badge>)}
                  </div>
                </div>
                {selectedProduct.description && (
                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedProduct.description}</p>
                  </div>
                )}
                <Button className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white" onClick={() => {
                  window.open(`https://wa.me/?text=${encodeURIComponent(`Check out ${selectedProduct.name} for $${selectedProduct.discountPrice}!`)}`, '_blank');
                }}>
                  <MessageCircle className="mr-2 h-4 w-4" /> Share on WhatsApp
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}