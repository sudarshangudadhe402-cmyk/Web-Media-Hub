import { useState, useEffect } from "react";
import { useGetStore, useCreateStore, useUpdateStore, useUploadProductImage, getGetStoreQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Store, Image as ImageIcon, MapPin, Phone, Clock, CalendarDays, ExternalLink, QrCode, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";

const storeSchema = z.object({
  name: z.string().min(1, "Store name is required"),
  address: z.string().optional(),
  whatsappNumber: z.string().optional(),
  openingTime: z.string().optional(),
  openDays: z.string().optional(),
  description: z.string().optional()
});

export default function MyStore() {
  const { data: store, isLoading } = useGetStore({ query: { retry: false } });
  const [bannerUrl, setBannerUrl] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createStore = useCreateStore();
  const updateStore = useUpdateStore();
  const uploadImage = useUploadProductImage();

  const form = useForm<z.infer<typeof storeSchema>>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      name: "",
      address: "",
      whatsappNumber: "",
      openingTime: "",
      openDays: "",
      description: ""
    }
  });

  useEffect(() => {
    if (store) {
      form.reset({
        name: store.name || "",
        address: store.address || "",
        whatsappNumber: store.whatsappNumber || "",
        openingTime: store.openingTime || "",
        openDays: store.openDays || "",
        description: store.description || ""
      });
      setBannerUrl(store.bannerImage || "");
    }
  }, [store, form]);

  const handleFileChange = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.readAsDataURL(file);
    });
    
    uploadImage.mutate({ data: { imageData: base64, fileName: file.name } }, {
      onSuccess: (res) => setBannerUrl(res.url),
      onError: () => toast({ title: "Failed to upload image", variant: "destructive" })
    });
  };

  const onSubmit = (values: z.infer<typeof storeSchema>) => {
    const data = { ...values, bannerImage: bannerUrl };
    
    if (store) {
      updateStore.mutate({ data }, {
        onSuccess: () => {
          toast({ title: "Store updated successfully" });
          queryClient.invalidateQueries({ queryKey: getGetStoreQueryKey() });
        }
      });
    } else {
      createStore.mutate({ data }, {
        onSuccess: () => {
          toast({ title: "Store created successfully" });
          queryClient.invalidateQueries({ queryKey: getGetStoreQueryKey() });
        }
      });
    }
  };

  const handleUnlock = () => {
    if (store && store.isLocked) {
      updateStore.mutate({ data: { ...store, isLocked: false } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetStoreQueryKey() });
        }
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[600px] w-full rounded-xl" />
      </div>
    );
  }

  const isLocked = store?.isLocked;
  const storeUrl = store?.publicSlug ? `${window.location.origin}/store/${store.publicSlug}` : "";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Store</h1>
          <p className="text-muted-foreground">Manage your store details and public profile.</p>
        </div>
        {isLocked && (
          <Button variant="outline" onClick={handleUnlock}>
            Edit Store Details
          </Button>
        )}
      </div>

      {store && store.publicSlug && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center md:text-left w-full">
                <h3 className="font-semibold flex items-center justify-center md:justify-start gap-2">
                  <ExternalLink className="w-4 h-4 text-primary" /> Public Store Link
                </h3>
                <p className="text-sm text-muted-foreground font-mono bg-background p-2 rounded border break-all">
                  {storeUrl}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="secondary" onClick={() => {
                  navigator.clipboard.writeText(storeUrl);
                  toast({ title: "Link copied to clipboard" });
                }}>
                  <Copy className="w-4 h-4 mr-2" /> Copy Link
                </Button>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <QrCode className="w-4 h-4 mr-2" /> QR Code
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md flex flex-col items-center justify-center py-10">
                    <DialogHeader>
                      <DialogTitle className="text-center mb-4">Store QR Code</DialogTitle>
                    </DialogHeader>
                    <div className="bg-white p-4 rounded-xl">
                      <QRCodeSVG value={storeUrl} size={250} level="H" includeMargin />
                    </div>
                    <p className="text-sm text-muted-foreground mt-4 text-center">
                      Customers can scan this code to visit your store directly.
                    </p>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLocked ? (
        <Card>
          <div className="h-48 w-full bg-muted relative rounded-t-xl overflow-hidden">
            {store.bannerImage ? (
              <img src={store.bannerImage} alt="Banner" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <ImageIcon className="w-12 h-12 opacity-20" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <h2 className="absolute bottom-4 left-6 text-3xl font-bold text-white">{store.name}</h2>
          </div>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                    <Store className="w-4 h-4" /> About
                  </h4>
                  <p className="text-sm">{store.description || "No description provided."}</p>
                </div>
              </div>
              <div className="space-y-4 bg-muted/50 p-6 rounded-xl">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-sm font-medium block">Address</span>
                    <span className="text-sm text-muted-foreground">{store.address || "Not specified"}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-sm font-medium block">WhatsApp</span>
                    <span className="text-sm text-muted-foreground">{store.whatsappNumber || "Not specified"}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-sm font-medium block">Opening Hours</span>
                    <span className="text-sm text-muted-foreground">{store.openingTime || "Not specified"}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CalendarDays className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-sm font-medium block">Open Days</span>
                    <span className="text-sm text-muted-foreground">{store.openDays || "Not specified"}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{store ? "Edit Store Information" : "Setup Your Store"}</CardTitle>
            <CardDescription>Fill in your store details to generate your public link.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Store Name <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                
                <FormItem>
                  <FormLabel>Banner Image</FormLabel>
                  <FormControl>
                    <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e.target.files)} disabled={uploadImage.isPending} />
                  </FormControl>
                  {bannerUrl && (
                    <div className="mt-2 h-32 w-full max-w-md border rounded-lg overflow-hidden relative">
                      <img src={bannerUrl} alt="Banner Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  {uploadImage.isPending && (
                    <div className="mt-2 h-32 w-full max-w-md border rounded-lg flex items-center justify-center bg-muted animate-pulse">
                      <ImageIcon className="w-8 h-8 opacity-50" />
                    </div>
                  )}
                </FormItem>

                <div className="grid md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="whatsappNumber" render={({ field }) => (
                    <FormItem><FormLabel>WhatsApp Number</FormLabel><FormControl><Input placeholder="+1234567890" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="openDays" render={({ field }) => (
                    <FormItem><FormLabel>Open Days</FormLabel><FormControl><Input placeholder="Mon - Sat" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="openingTime" render={({ field }) => (
                    <FormItem><FormLabel>Opening Time</FormLabel><FormControl><Input placeholder="9:00 AM - 6:00 PM" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem><FormLabel>Address</FormLabel><FormControl><Input placeholder="123 Store St, City" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Store Description</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <Button type="submit" className="w-full md:w-auto" disabled={createStore.isPending || updateStore.isPending}>
                  {store ? "Save Changes & Lock" : "Create Store & Lock"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}