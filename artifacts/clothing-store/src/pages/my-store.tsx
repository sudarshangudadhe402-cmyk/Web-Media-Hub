import { useState, useEffect } from "react";
import {
  useGetStore,
  useCreateStore,
  useUpdateStore,
  useUploadProductImage,
  getGetStoreQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Store,
  Image as ImageIcon,
  MapPin,
  Phone,
  Clock,
  CalendarDays,
  Pencil,
  Upload,
  ExternalLink,
  Copy,
  QrCode,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";

const ALL_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface TimeVal {
  hour: string;
  minute: string;
  period: "AM" | "PM";
}

interface StoreForm {
  name: string;
  address: string;
  whatsappNumber: string;
  openFrom: TimeVal;
  openTo: TimeVal;
  openDays: string[];
  description: string;
}

const DEFAULT_TIME: TimeVal = { hour: "", minute: "00", period: "AM" };

const EMPTY_FORM: StoreForm = {
  name: "",
  address: "",
  whatsappNumber: "",
  openFrom: { ...DEFAULT_TIME },
  openTo: { ...DEFAULT_TIME, period: "PM" },
  openDays: [],
  description: "",
};

function formatTime(t: TimeVal): string {
  if (!t.hour) return "";
  return `${t.hour}:${t.minute} ${t.period}`;
}

function parseTime12(raw: string | undefined, index: 0 | 1): TimeVal {
  if (!raw) return index === 0 ? { ...DEFAULT_TIME } : { ...DEFAULT_TIME, period: "PM" };
  const parts = raw.split(" - ");
  const segment = parts[index]?.trim() ?? "";
  const match = segment.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return index === 0 ? { ...DEFAULT_TIME } : { ...DEFAULT_TIME, period: "PM" };
  return { hour: match[1], minute: match[2], period: match[3].toUpperCase() as "AM" | "PM" };
}

function parseDays(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw.split(",").map((d) => d.trim()).filter(Boolean);
}


export default function MyStore() {
  const { data: store, isLoading } = useGetStore({ query: { retry: false } });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createStore = useCreateStore();
  const updateStore = useUpdateStore();
  const uploadImage = useUploadProductImage();

  const [locked, setLocked] = useState(false);
  const [editing, setEditing] = useState(false);
  const [bannerUrl, setBannerUrl] = useState("");
  const [bannerPreview, setBannerPreview] = useState("");
  const [form, setForm] = useState<StoreForm>(EMPTY_FORM);

  useEffect(() => {
    if (store) {
      setForm({
        name: store.name ?? "",
        address: store.address ?? "",
        whatsappNumber: store.whatsappNumber ?? "",
        openFrom: parseTime12(store.openingTime, 0),
        openTo: parseTime12(store.openingTime, 1),
        openDays: parseDays(store.openDays),
        description: store.description ?? "",
      });
      setBannerUrl(store.bannerImage ?? "");
      setBannerPreview(store.bannerImage ?? "");
      setLocked(!!store.isLocked);
    }
  }, [store]);

  function toggleDay(day: string) {
    setForm((p) => ({
      ...p,
      openDays: p.openDays.includes(day)
        ? p.openDays.filter((d) => d !== day)
        : [...p.openDays, day],
    }));
  }

  async function handleBannerChange(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    const preview = URL.createObjectURL(file);
    setBannerPreview(preview);
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.readAsDataURL(file);
    });
    uploadImage.mutate(
      { data: { imageData: base64, fileName: file.name } },
      {
        onSuccess: (res) => setBannerUrl(res.url),
        onError: () => toast({ variant: "destructive", title: "Failed to upload banner" }),
      }
    );
  }

  function buildPayload() {
    return {
      name: form.name,
      address: form.address,
      whatsappNumber: form.whatsappNumber,
      openingTime:
        form.openFrom.hour && form.openTo.hour
          ? `${formatTime(form.openFrom)} - ${formatTime(form.openTo)}`
          : formatTime(form.openFrom),
      openDays: form.openDays.join(", "),
      description: form.description,
      bannerImage: bannerUrl,
      isLocked: true,
    };
  }

  function handleDone(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ variant: "destructive", title: "Store name is required" });
      return;
    }
    const payload = buildPayload();
    if (store) {
      updateStore.mutate(
        { data: payload },
        {
          onSuccess: () => {
            toast({ title: editing ? "Store updated successfully" : "Store saved successfully" });
            queryClient.invalidateQueries({ queryKey: getGetStoreQueryKey() });
            setLocked(true);
            setEditing(false);
          },
          onError: () => toast({ variant: "destructive", title: "Failed to save store" }),
        }
      );
    } else {
      createStore.mutate(
        { data: payload },
        {
          onSuccess: () => {
            toast({ title: "Store created successfully" });
            queryClient.invalidateQueries({ queryKey: getGetStoreQueryKey() });
            setLocked(true);
          },
          onError: () => toast({ variant: "destructive", title: "Failed to create store" }),
        }
      );
    }
  }

  function handleUpdate() {
    setEditing(true);
    setLocked(false);
  }

  function handleCancel() {
    if (store) {
      setForm({
        name: store.name ?? "",
        address: store.address ?? "",
        whatsappNumber: store.whatsappNumber ?? "",
        openFrom: parseTime(store.openingTime, 0),
        openTo: parseTime(store.openingTime, 1),
        openDays: parseDays(store.openDays),
        description: store.description ?? "",
      });
      setBannerPreview(store.bannerImage ?? "");
      setBannerUrl(store.bannerImage ?? "");
    }
    setEditing(false);
    setLocked(true);
  }

  const storeUrl =
    store?.publicSlug ? `${window.location.origin}/store/${store.publicSlug}` : "";

  const isPending = createStore.isPending || updateStore.isPending;

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-[500px] w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Store</h1>
        <p className="text-muted-foreground text-sm mt-1">Set up your store profile and public page</p>
      </div>

      {/* ── LOCKED VIEW ── */}
      {locked && store ? (
        <div className="space-y-4">
          <Card className="overflow-hidden">
            {/* Banner */}
            <div className="h-44 w-full bg-muted relative">
              {bannerPreview || store.bannerImage ? (
                <img
                  src={bannerPreview || store.bannerImage}
                  alt="Store banner"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-10 h-10 text-muted-foreground/30" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <h2 className="absolute bottom-4 left-5 text-2xl font-bold text-white">{store.name}</h2>
            </div>

            <CardContent className="p-5 space-y-4">
              {/* Info rows */}
              <div className="divide-y divide-border rounded-xl border overflow-hidden">
                {store.address && (
                  <div className="flex items-start gap-3 px-4 py-3">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Store Address</p>
                      <p className="text-sm font-medium">{store.address}</p>
                    </div>
                  </div>
                )}
                {store.whatsappNumber && (
                  <div className="flex items-start gap-3 px-4 py-3">
                    <Phone className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Owner WhatsApp Number</p>
                      <p className="text-sm font-medium">{store.whatsappNumber}</p>
                    </div>
                  </div>
                )}
                {store.openingTime && (
                  <div className="flex items-start gap-3 px-4 py-3">
                    <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Opening Time</p>
                      <p className="text-sm font-medium">{store.openingTime}</p>
                    </div>
                  </div>
                )}
                {store.openDays && (
                  <div className="flex items-start gap-3 px-4 py-3">
                    <CalendarDays className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Open Days</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {parseDays(store.openDays).map((d) => (
                          <span key={d} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {store.description && (
                  <div className="flex items-start gap-3 px-4 py-3">
                    <Store className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Description</p>
                      <p className="text-sm">{store.description}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Public link + QR */}
              {storeUrl && (
                <div className="bg-muted rounded-xl p-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5" /> Public Store Link
                  </p>
                  <p className="text-xs font-mono bg-background border rounded px-2 py-1.5 break-all">{storeUrl}</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => {
                        navigator.clipboard.writeText(storeUrl);
                        toast({ title: "Link copied" });
                      }}
                    >
                      <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" className="flex-1">
                          <QrCode className="w-3.5 h-3.5 mr-1.5" /> QR Code
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-sm flex flex-col items-center py-8">
                        <DialogHeader>
                          <DialogTitle className="text-center mb-4">Store QR Code</DialogTitle>
                        </DialogHeader>
                        <div className="bg-white p-4 rounded-xl">
                          <QRCodeSVG value={storeUrl} size={220} level="H" includeMargin />
                        </div>
                        <p className="text-sm text-muted-foreground mt-4 text-center">
                          Customers scan this to visit your store.
                        </p>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              )}

              {/* Update Information — small, bottom left */}
              <div className="flex justify-start pt-1">
                <button
                  data-testid="update-info-btn"
                  onClick={handleUpdate}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Update information
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* ── EDIT / CREATE FORM ── */
        <form onSubmit={handleDone} className="space-y-5">
          {/* 6. Store Banner */}
          <div className="space-y-2">
            <Label>Store Banner</Label>
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-muted/40 overflow-hidden relative">
              {bannerPreview ? (
                <img src={bannerPreview} alt="Banner preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="w-8 h-8" />
                  <span className="text-sm">Click to upload banner image</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleBannerChange(e.target.files)}
                disabled={uploadImage.isPending}
                data-testid="banner-upload"
              />
            </label>
            {uploadImage.isPending && (
              <p className="text-xs text-muted-foreground animate-pulse">Uploading...</p>
            )}
          </div>

          {/* 1. Store Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">
              Store Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g. Fashion Zone"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
              data-testid="store-name"
            />
          </div>

          {/* 2. Store Address */}
          <div className="space-y-1.5">
            <Label htmlFor="address">Store Address</Label>
            <Input
              id="address"
              placeholder="e.g. 123 Market Street, Mumbai"
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              data-testid="store-address"
            />
          </div>

          {/* 3. Owner WhatsApp Number */}
          <div className="space-y-1.5">
            <Label htmlFor="whatsapp">Owner WhatsApp Number</Label>
            <Input
              id="whatsapp"
              type="tel"
              placeholder="+91 00000 00000"
              value={form.whatsappNumber}
              onChange={(e) => setForm((p) => ({ ...p, whatsappNumber: e.target.value }))}
              data-testid="store-whatsapp"
            />
          </div>

          {/* 4. Opening Time */}
          <div className="space-y-1.5">
            <Label>Opening Time</Label>
            <div className="flex items-center gap-2 flex-wrap">
              {(["openFrom", "openTo"] as const).map((key, idx) => (
                <div key={key} className="flex items-center gap-1 flex-1 min-w-0">
                  {idx === 1 && <span className="text-muted-foreground text-sm font-medium shrink-0 px-1">to</span>}
                  <select
                    value={form[key].hour}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: { ...p[key], hour: e.target.value } }))}
                    className="flex-1 min-w-0 h-9 rounded-md border border-input bg-background px-2 text-sm"
                    data-testid={`${key}-hour`}
                  >
                    <option value="">HH</option>
                    {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <span className="text-muted-foreground shrink-0">:</span>
                  <select
                    value={form[key].minute}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: { ...p[key], minute: e.target.value } }))}
                    className="w-16 h-9 rounded-md border border-input bg-background px-2 text-sm"
                    data-testid={`${key}-minute`}
                  >
                    {["00", "15", "30", "45"].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={form[key].period}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: { ...p[key], period: e.target.value as "AM" | "PM" } }))}
                    className="w-16 h-9 rounded-md border border-input bg-background px-2 text-sm"
                    data-testid={`${key}-period`}
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Open Days */}
          <div className="space-y-2">
            <Label>Open Days</Label>
            <div className="flex flex-wrap gap-2">
              {ALL_DAYS.map((day) => {
                const selected = form.openDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    data-testid={`day-${day}`}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground border-border hover:border-primary/40"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 7. Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="Tell customers about your store..."
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              data-testid="store-description"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            {editing && (
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleCancel}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isPending || uploadImage.isPending}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold text-base py-5"
              data-testid="store-done-btn"
            >
              {isPending ? "Saving..." : editing ? "Update" : "Done"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
