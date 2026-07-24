import { useState, useEffect, useRef, useCallback } from "react";
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
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
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
  KeyRound,
  Download,
  Share2,
  ZoomIn,
  ZoomOut,
  Check,
  X as XIcon,
  Navigation,
  LocateFixed,
  Map as MapIcon,
} from "lucide-react";
import { INDIA_CENTER, isIndiaCoordinate } from "@/components/india-map";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { QRCodeCanvas } from "qrcode.react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";

const ALL_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface TimeVal {
  hour: string;
  minute: string;
  period: "AM" | "PM";
}

interface StoreForm {
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  addressDetails: StoreAddressDetails | null;
  whatsappNumber: string;
  openFrom: TimeVal;
  openTo: TimeVal;
  openDays: string[];
  description: string;
}

interface StoreAddressDetails {
  houseNumber?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  district?: string;
  stateDistrict?: string;
  state?: string;
  postcode?: string;
  country?: string;
  countryCode?: string;
}

const DEFAULT_TIME: TimeVal = { hour: "", minute: "00", period: "AM" };

const EMPTY_FORM: StoreForm = {
  name: "",
  address: "",
  latitude: null,
  longitude: null,
  addressDetails: null,
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

function parseTime12(raw: string | null | undefined, index: 0 | 1): TimeVal {
  if (!raw) return index === 0 ? { ...DEFAULT_TIME } : { ...DEFAULT_TIME, period: "PM" };
  const parts = raw.split(" - ");
  const segment = parts[index]?.trim() ?? "";
  const match = segment.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return index === 0 ? { ...DEFAULT_TIME } : { ...DEFAULT_TIME, period: "PM" };
  return { hour: match[1], minute: match[2], period: match[3].toUpperCase() as "AM" | "PM" };
}

function parseDays(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw.split(",").map((d) => d.trim()).filter(Boolean);
}


export default function MyStore() {
  const { data: store, isLoading } = useGetStore({ query: { retry: false } });
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const createStore = useCreateStore();
  const updateStore = useUpdateStore();
  const uploadImage = useUploadProductImage();

  const [locked, setLocked] = useState(false);
  const [editing, setEditing] = useState(false);
  const [bannerUrl, setBannerUrl] = useState("");
  const [bannerPreview, setBannerPreview] = useState("");
  const [form, setForm] = useState<StoreForm>(EMPTY_FORM);
  const initializedRef = useRef(false);

  const [cropOpen, setCropOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const qrCanvasRef = useRef<HTMLDivElement>(null);
  const logoSrc = `${import.meta.env.BASE_URL ?? "/"}wmh-logo.png`;
  const [circularLogoSrc, setCircularLogoSrc] = useState<string>(logoSrc);

  const [cancelStep, setCancelStep] = useState<"idle" | "otp" | "sending" | "verifying">("idle");
  const [cancelOtp, setCancelOtp] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSentTo, setCancelSentTo] = useState("");

  const [reactStep, setReactStep] = useState<"idle" | "sending" | "otp" | "verifying" | "mandate">("idle");
  const [reactOtp, setReactOtp] = useState("");
  const [reactError, setReactError] = useState<string | null>(null);
  const [reactSentTo, setReactSentTo] = useState("");

  // Map picker state
  const [mapOpen, setMapOpen] = useState(false);
  const [mapPin, setMapPin] = useState<{ lat: number; lng: number } | null>(null);
  const [mapGeoLoading, setMapGeoLoading] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = logoSrc;
    img.onload = () => {
      const size = 120;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      // Black circle background
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.fill();
      // Clip to circle, draw logo with padding
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
      ctx.clip();
      const pad = 14;
      ctx.drawImage(img, pad, pad, size - pad * 2, size - pad * 2);
      ctx.restore();
      setCircularLogoSrc(canvas.toDataURL("image/png"));
    };
  }, [logoSrc]);

  const getQrCanvas = useCallback((): HTMLCanvasElement | null => {
    return qrCanvasRef.current?.querySelector("canvas") ?? null;
  }, []);

  const buildStyledCanvas = useCallback(async (): Promise<HTMLCanvasElement | null> => {
    const qrCanvas = getQrCanvas();
    if (!qrCanvas) return null;

    const qrSize = qrCanvas.width;
    const pad = 32;
    const total = qrSize + pad * 2;

    const out = document.createElement("canvas");
    out.width = total;
    out.height = total;
    const ctx = out.getContext("2d");
    if (!ctx) return null;

    // Dark background
    ctx.fillStyle = "#111108";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(0, 0, total, total, 24);
    else ctx.rect(0, 0, total, total);
    ctx.fill();

    // Decorative blobs
    const blobs: [number, number, number, string][] = [
      [total - 10, -10, 60, "rgba(22,163,74,0.45)"],
      [10, total + 5, 55, "rgba(16,185,129,0.35)"],
      [-5, total * 0.35, 28, "rgba(52,211,153,0.20)"],
      [total + 5, total * 0.65, 28, "rgba(34,197,94,0.18)"],
    ];
    ctx.save();
    ctx.filter = "blur(18px)";
    for (const [x, y, r, color] of blobs) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.restore();

    // QR code (already contains logo via imageSettings)
    ctx.drawImage(qrCanvas, pad, pad, qrSize, qrSize);

    return out;
  }, [getQrCanvas]);

  const handleDownloadQr = useCallback(async () => {
    const canvas = await buildStyledCanvas();
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "store-qr.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [buildStyledCanvas]);

  const handleShareQr = useCallback(async () => {
    const canvas = await buildStyledCanvas();
    if (!canvas) return;
    if (!navigator.share) {
      toast({ title: "Sharing not supported on this device" });
      return;
    }
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "store-qr.png", { type: "image/png" });
      try {
        await navigator.share({ files: [file], title: "My Store QR Code" });
      } catch {
        // user cancelled or share failed silently
      }
    }, "image/png");
  }, [buildStyledCanvas, toast]);

  const handleSendReactivateOtp = useCallback(async () => {
    setReactError(null);
    setReactStep("sending");
    try {
      const token = localStorage.getItem("wmh_token");
      const res = await fetch("/api/payments/autopay/send-reactivate-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (!res.ok) {
        setReactError(data.error ?? "Failed to send verification code.");
        setReactStep("idle");
        return;
      }
      setReactSentTo(data.email ?? user?.email ?? "");
      setReactOtp("");
      setReactStep("otp");
    } catch {
      setReactError("Network error. Please try again.");
      setReactStep("idle");
    }
  }, [user]);

  const handleVerifyReactivateOtp = useCallback(async () => {
    if (!reactOtp.trim()) {
      setReactError("Please enter the OTP sent to your email.");
      return;
    }
    setReactError(null);
    setReactStep("verifying");
    try {
      const token = localStorage.getItem("wmh_token");
      const res = await fetch("/api/payments/autopay/reactivate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ otp: reactOtp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReactError(data.error ?? "Failed to reactivate AutoPay.");
        setReactStep("otp");
        return;
      }
      // OTP verified — open Razorpay subscription checkout for mandate
      setReactStep("mandate");
      await new Promise<void>((resolve) => {
        const rzp = new (window as any).Razorpay({
          key: data.keyId,
          subscription_id: data.subscriptionId,
          name: "Web Media Hub",
          description: `AutoPay Reactivation — ${user?.planName ?? ""}`,
          prefill: { email: user?.email ?? "" },
          theme: { color: "#16a34a" },
          handler: async (subResponse: any) => {
            try {
              const vToken = localStorage.getItem("wmh_token");
              await fetch("/api/payments/verify-subscription-auth", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(vToken ? { Authorization: `Bearer ${vToken}` } : {}),
                },
                body: JSON.stringify({
                  razorpay_payment_id: subResponse.razorpay_payment_id,
                  razorpay_subscription_id: subResponse.razorpay_subscription_id,
                  razorpay_signature: subResponse.razorpay_signature,
                  email: user?.email ?? "",
                }),
              });
            } catch { /* non-fatal */ }
            toast({ title: "AutoPay reactivated!", description: "Your plan will auto-renew at the end of the current period." });
            resolve();
          },
          modal: { ondismiss: () => resolve() },
        });
        rzp.open();
      });
      setReactStep("idle");
      setReactOtp("");
      queryClient.invalidateQueries();
    } catch {
      setReactError("Network error. Please try again.");
      setReactStep("otp");
    }
  }, [reactOtp, user, toast, queryClient]);

  const handleSendCancelOtp = useCallback(async () => {
    setCancelError(null);
    setCancelStep("sending");
    try {
      const token = localStorage.getItem("wmh_token");
      const res = await fetch("/api/payments/autopay/send-cancel-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (!res.ok) {
        setCancelError(data.error ?? "Failed to send verification code.");
        setCancelStep("idle");
        return;
      }
      setCancelSentTo(data.email ?? user?.email ?? "");
      setCancelOtp("");
      setCancelStep("otp");
    } catch {
      setCancelError("Network error. Please try again.");
      setCancelStep("idle");
    }
  }, [user]);

  const handleVerifyCancelOtp = useCallback(async () => {
    if (!cancelOtp.trim()) {
      setCancelError("Please enter the OTP sent to your email.");
      return;
    }
    setCancelError(null);
    setCancelStep("verifying");
    try {
      const token = localStorage.getItem("wmh_token");
      const res = await fetch("/api/payments/autopay/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ otp: cancelOtp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCancelError(data.error ?? "Failed to cancel AutoPay.");
        setCancelStep("otp");
        return;
      }
      toast({ title: "AutoPay cancelled", description: "Your subscription will not auto-renew after the current period ends." });
      setCancelStep("idle");
      setCancelOtp("");
      queryClient.invalidateQueries();
    } catch {
      setCancelError("Network error. Please try again.");
      setCancelStep("otp");
    }
  }, [cancelOtp, toast, queryClient]);

  useEffect(() => {
    if (store && !initializedRef.current) {
      initializedRef.current = true;
      const lat = store.latitude ?? null;
      const lng = store.longitude ?? null;
      setForm({
        name: store.name ?? "",
        address: store.address ?? "",
        latitude: lat,
        longitude: lng,
        addressDetails: store.addressDetails ?? null,
        whatsappNumber: store.whatsappNumber ?? "",
        openFrom: parseTime12(store.openingTime, 0),
        openTo: parseTime12(store.openingTime, 1),
        openDays: parseDays(store.openDays),
        description: store.description ?? "",
      });
      if (lat !== null && lng !== null) setMapPin({ lat, lng });
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

  async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> {
    const image = new Image();
    image.src = imageSrc;
    await new Promise<void>((resolve) => { image.onload = () => resolve(); });
    const canvas = document.createElement("canvas");
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
    return canvas.toDataURL("image/jpeg", 0.92);
  }

  async function handleBannerChange(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
    setRawImageSrc(dataUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setAspect(undefined);
    setCroppedAreaPixels(null);
    setCropOpen(true);
  }

  async function handleCropConfirm() {
    if (!rawImageSrc || !croppedAreaPixels) return;
    const dataUrl = await getCroppedImg(rawImageSrc, croppedAreaPixels);
    setBannerPreview(dataUrl);
    const base64 = dataUrl.split(",")[1];
    uploadImage.mutate(
      { data: { imageData: base64, fileName: "banner.jpg" } },
      {
        onSuccess: (res) => setBannerUrl(res.url),
        onError: () => toast({ variant: "destructive", title: "Failed to upload banner" }),
      }
    );
    setCropOpen(false);
  }

  async function reverseGeocode(lat: number, lng: number): Promise<{ displayName: string; addressDetails: StoreAddressDetails | null }> {
    try {
      const res = await fetch(
        `/api/public/map/reverse-geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      return {
        displayName: data.displayName ?? "",
        addressDetails: data.addressDetails ?? null,
      };
    } catch {
      return { displayName: "", addressDetails: null };
    }
  }

  async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const res = await fetch(
        `/api/public/map/geocode?q=${encodeURIComponent(address)}`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      if (!data.result) return null;
      return { lat: Number(data.result.lat), lng: Number(data.result.lng) };
    } catch {
      return null;
    }
  }

  async function handleFindOnMap() {
    if (!form.address.trim()) return;
    setMapGeoLoading(true);
    const coords = await geocodeAddress(form.address);
    setMapGeoLoading(false);
    if (!coords) {
      toast({ variant: "destructive", title: "Address not found on map", description: "Try a more specific address, or pin manually on the map." });
      setMapOpen(true);
      return;
    }
    setMapPin(coords);
    setForm((p) => ({ ...p, latitude: coords.lat, longitude: coords.lng, addressDetails: null }));
    setMapOpen(true);
  }

  async function handleMapPick(lat: number, lng: number) {
    setMapPin({ lat, lng });
    setMapGeoLoading(true);
    const result = await reverseGeocode(lat, lng);
    setMapGeoLoading(false);
    setForm((p) => ({
      ...p,
      latitude: lat,
      longitude: lng,
      address: result.displayName || p.address,
      // A manually selected pin is not a browser GPS confirmation.
      addressDetails: null,
    }));
  }

  async function handleUseMyLocation() {
    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "Geolocation not supported by your browser" });
      return;
    }
    setMapGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (!isIndiaCoordinate(lat, lng)) {
          setMapGeoLoading(false);
          toast({
            variant: "destructive",
            title: "India locations only",
            description: "Your current location is outside India's boundary.",
          });
          return;
        }
        setMapPin({ lat, lng });
        const result = await reverseGeocode(lat, lng);
        setMapGeoLoading(false);
        setForm((p) => ({
          ...p,
          latitude: lat,
          longitude: lng,
          address: result.displayName || p.address,
          addressDetails: result.addressDetails,
        }));
      },
      () => {
        setMapGeoLoading(false);
        toast({ variant: "destructive", title: "Could not get location", description: "Please allow location access and try again." });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function buildPayload() {
    return {
      name: form.name,
      address: form.address,
      latitude: form.latitude ?? undefined,
      longitude: form.longitude ?? undefined,
      // Structured address data is only populated by the live-location flow.
      addressDetails: form.addressDetails,
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
          onSuccess: async () => {
            toast({ title: editing ? "Store updated successfully" : "Store saved successfully" });
            await queryClient.refetchQueries({ queryKey: getGetStoreQueryKey() });
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
          onSuccess: async () => {
            toast({ title: "Store created successfully" });
            await queryClient.refetchQueries({ queryKey: getGetStoreQueryKey() });
            setLocked(true);
          },
          onError: () => toast({ variant: "destructive", title: "Failed to create store" }),
        }
      );
    }
  }

  function handleUpdate() {
    if (store) {
      const lat = store.latitude ?? null;
      const lng = store.longitude ?? null;
      setForm({
        name: store.name ?? "",
        address: store.address ?? "",
        latitude: lat,
        longitude: lng,
        addressDetails: store.addressDetails ?? null,
        whatsappNumber: store.whatsappNumber ?? "",
        openFrom: parseTime12(store.openingTime, 0),
        openTo: parseTime12(store.openingTime, 1),
        openDays: parseDays(store.openDays),
        description: store.description ?? "",
      });
      if (lat !== null && lng !== null) setMapPin({ lat, lng });
      setBannerPreview(store.bannerImage ?? "");
      setBannerUrl(store.bannerImage ?? "");
    }
    setEditing(true);
    setLocked(false);
  }

  function handleCancel() {
    if (store) {
      const lat = store.latitude ?? null;
      const lng = store.longitude ?? null;
      setForm({
        name: store.name ?? "",
        address: store.address ?? "",
        latitude: lat,
        longitude: lng,
        addressDetails: store.addressDetails ?? null,
        whatsappNumber: store.whatsappNumber ?? "",
        openFrom: parseTime12(store.openingTime, 0),
        openTo: parseTime12(store.openingTime, 1),
        openDays: parseDays(store.openDays),
        description: store.description ?? "",
      });
      if (lat !== null && lng !== null) setMapPin({ lat, lng }); else setMapPin(null);
      setBannerPreview(store.bannerImage ?? "");
      setBannerUrl(store.bannerImage ?? "");
    }
    setEditing(false);
    setLocked(true);
  }

  const BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const storeUrl = store?.publicSlug
    ? `${window.location.origin}${BASE}/store/${store.publicSlug}`
    : "";

  const isPending = createStore.isPending || updateStore.isPending;

  const isFormValid =
    form.name.trim().length >= 2 &&
    form.address.trim().length >= 2 &&
    form.latitude !== null &&
    form.longitude !== null &&
    form.whatsappNumber.trim().length >= 5 &&
    form.openFrom.hour !== "" &&
    form.openTo.hour !== "" &&
    form.openDays.length >= 1 &&
    form.description.trim().length >= 5;

  const missingFields: string[] = [];
  if (form.name.trim().length < 2) missingFields.push("Store Name");
  if (form.address.trim().length < 2) missingFields.push("Store Address");
  if (form.latitude === null || form.longitude === null) missingFields.push("India Map Location");
  if (form.whatsappNumber.trim().length < 5) missingFields.push("WhatsApp Number");
  if (!form.openFrom.hour || !form.openTo.hour) missingFields.push("Opening Time");
  if (form.openDays.length < 1) missingFields.push("Open Days");
  if (form.description.trim().length < 5) missingFields.push("Description");

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
            <div className="w-full bg-black relative">
              {bannerPreview || store.bannerImage ? (
                <img
                  src={bannerPreview || store.bannerImage || undefined}
                  alt="Store banner"
                  className="w-full object-contain max-h-[70vh]"
                />
              ) : (
                <div className="w-full h-44 flex items-center justify-center bg-muted">
                  <ImageIcon className="w-10 h-10 text-muted-foreground/30" />
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
              <h2 className="absolute bottom-4 left-5 text-2xl font-bold text-white drop-shadow">{store.name}</h2>
            </div>

            <CardContent className="p-5 space-y-4">
              {/* Plan Card */}
              {user?.planName && (
                <div
                  className="rounded-xl border px-4 py-3 flex items-start justify-between gap-3"
                  style={{
                    borderColor: user.planColor ? user.planColor + "55" : undefined,
                    background: user.planColor ? user.planColor + "11" : undefined,
                  }}
                >
                  <div className="space-y-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: user.planColor || "#888" }}>
                      {user.planBadge}
                    </p>
                    <p className="font-bold text-sm">{user.planName}</p>
                    {user.planPrice && (
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-extrabold" style={{ color: user.planColor || undefined }}>
                          {user.planPrice}
                        </span>
                        {user.planPeriod && (
                          <span className="text-xs text-muted-foreground">{user.planPeriod}</span>
                        )}
                      </div>
                    )}
                    {user.subscriptionEndDate && (
                      <p className="text-[11px] text-muted-foreground">
                        Valid till {new Date(user.subscriptionEndDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    )}
                  </div>

                  {user.autopayStatus === "active" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                      onClick={() => { setCancelError(null); handleSendCancelOtp(); }}
                      disabled={cancelStep === "sending"}
                    >
                      {cancelStep === "sending" ? "Sending…" : "Cancel AutoPay"}
                    </Button>
                  )}
                  {user.autopayStatus === "cancelled" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 text-xs text-green-700 border-green-300 bg-green-50 hover:bg-green-100 hover:text-green-800"
                      onClick={() => { setReactError(null); handleSendReactivateOtp(); }}
                      disabled={reactStep === "sending"}
                    >
                      {reactStep === "sending" ? "Sending…" : "⚡ Active AutoPay"}
                    </Button>
                  )}
                </div>
              )}

              {/* Cancel AutoPay — OTP verification dialog */}
              <Dialog open={cancelStep === "otp" || cancelStep === "verifying"} onOpenChange={(open) => { if (!open) { setCancelStep("idle"); setCancelOtp(""); setCancelError(null); } }}>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Cancel AutoPay</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      We've sent a 6-digit OTP to <span className="font-medium text-foreground">{cancelSentTo}</span>. Enter it below to confirm cancellation. Your store stays active until the current billing period ends — it just won't auto-renew.
                    </p>
                    <Input
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Enter OTP"
                      value={cancelOtp}
                      onChange={(e) => setCancelOtp(e.target.value.replace(/\D/g, ""))}
                      className="text-center tracking-[0.3em] font-semibold"
                    />
                    {cancelError && <p className="text-xs text-red-600">{cancelError}</p>}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={handleSendCancelOtp}
                        disabled={cancelStep === "verifying"}
                      >
                        Resend OTP
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        className="flex-1"
                        onClick={handleVerifyCancelOtp}
                        disabled={cancelStep === "verifying"}
                      >
                        {cancelStep === "verifying" ? "Cancelling…" : "Confirm Cancellation"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Reactivate AutoPay — OTP verification dialog */}
              <Dialog open={reactStep === "otp" || reactStep === "verifying" || reactStep === "mandate"} onOpenChange={(open) => { if (!open) { setReactStep("idle"); setReactOtp(""); setReactError(null); } }}>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="text-green-700">Reactivate AutoPay</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      We've sent a 6-digit OTP to <span className="font-medium text-foreground">{reactSentTo}</span>. Enter it below to confirm. After verification, you'll complete the AutoPay mandate setup.
                    </p>
                    <Input
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Enter OTP"
                      value={reactOtp}
                      onChange={(e) => setReactOtp(e.target.value.replace(/\D/g, ""))}
                      className="text-center tracking-[0.3em] font-semibold"
                      disabled={reactStep === "verifying" || reactStep === "mandate"}
                    />
                    {reactError && <p className="text-xs text-red-600">{reactError}</p>}
                    {reactStep === "mandate" && (
                      <p className="text-xs text-green-700 font-medium text-center">OTP verified! Complete mandate setup in the payment window…</p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={handleSendReactivateOtp}
                        disabled={reactStep === "verifying" || reactStep === "mandate"}
                      >
                        Resend OTP
                      </Button>
                      <Button
                        type="button"
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        onClick={handleVerifyReactivateOtp}
                        disabled={reactStep === "verifying" || reactStep === "mandate"}
                      >
                        {reactStep === "verifying" ? "Verifying…" : reactStep === "mandate" ? "Setting up…" : "Confirm & Setup"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Info rows */}
              <div className="divide-y divide-border rounded-xl border overflow-hidden">
                {store.address && (
                  <div className="flex items-start gap-3 px-4 py-3">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Store Address</p>
                      <p className="text-sm font-medium">{store.address}</p>
                      {store.latitude && store.longitude && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          <Navigation className="w-3 h-3" /> Navigate in Google Maps
                        </a>
                      )}
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

                        {/* Dark themed QR card */}
                        <div
                          className="relative rounded-2xl overflow-hidden flex items-center justify-center"
                          style={{ background: "#111108", padding: "24px" }}
                        >
                          {/* Decorative blobs */}
                          <div className="absolute top-0 right-0 w-20 h-20 rounded-full"
                            style={{ background: "rgba(22,163,74,0.45)", filter: "blur(20px)", transform: "translate(30%,-30%)" }} />
                          <div className="absolute bottom-0 left-0 w-16 h-16 rounded-full"
                            style={{ background: "rgba(16,185,129,0.35)", filter: "blur(18px)", transform: "translate(-30%,30%)" }} />
                          <div className="absolute left-0 top-1/3 w-8 h-8 rounded-full"
                            style={{ background: "rgba(52,211,153,0.22)", filter: "blur(12px)" }} />
                          <div className="absolute right-0 bottom-1/3 w-8 h-8 rounded-full"
                            style={{ background: "rgba(34,197,94,0.20)", filter: "blur(12px)" }} />

                          {/* QR canvas with logo in center */}
                          <div ref={qrCanvasRef} className="relative z-10">
                            <QRCodeCanvas
                              value={storeUrl}
                              size={220}
                              level="H"
                              includeMargin
                              imageSettings={{
                                src: circularLogoSrc,
                                height: 56,
                                width: 56,
                                excavate: true,
                              }}
                            />
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground mt-4 text-center">
                          Customers scan this to visit your store.
                        </p>
                        <div className="flex gap-3 w-full mt-2">
                          <Button variant="outline" className="flex-1" onClick={handleDownloadQr}>
                            <Download className="w-4 h-4 mr-2" /> Download
                          </Button>
                          <Button className="flex-1" onClick={handleShareQr}>
                            <Share2 className="w-4 h-4 mr-2" /> Share
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              )}

              {/* Bottom actions */}
              <div className="flex items-center justify-between pt-1">
                <button
                  data-testid="update-info-btn"
                  onClick={handleUpdate}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Update information
                </button>
                <button
                  data-testid="username-password-btn"
                  onClick={() => setLocation("/username-password")}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Username &amp; Password
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
                <img src={bannerPreview} alt="Banner preview" className="w-full h-full object-contain bg-black" />
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
            {bannerPreview && (
              <button
                type="button"
                onClick={() => {
                  setRawImageSrc(bannerPreview);
                  setCrop({ x: 0, y: 0 });
                  setZoom(1);
                  setCroppedAreaPixels(null);
                  setCropOpen(true);
                }}
                className="text-xs text-primary underline underline-offset-2 flex items-center gap-1"
              >
                <ZoomIn className="w-3 h-3" /> Crop / Zoom banner
              </button>
            )}
            {uploadImage.isPending && (
              <p className="text-xs text-muted-foreground animate-pulse">Uploading...</p>
            )}
          </div>

          {/* ── CROP DIALOG ── */}
          <Dialog open={cropOpen} onOpenChange={(o) => { if (!o) setCropOpen(false); }}>
            <DialogContent className="max-w-sm p-0 overflow-hidden">
              <DialogHeader className="px-4 pt-4 pb-2">
                <DialogTitle>Crop &amp; Zoom Banner</DialogTitle>
              </DialogHeader>

              {/* Aspect ratio pills */}
              <div className="flex gap-2 px-4 pb-2">
                {([["Free", undefined], ["16:9", 16/9], ["4:3", 4/3], ["1:1", 1]] as [string, number | undefined][]).map(([label, val]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setAspect(val)}
                    className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                      aspect === val
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Cropper */}
              <div className="relative w-full bg-black" style={{ height: 280 }}>
                {rawImageSrc && (
                  <Cropper
                    image={rawImageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={aspect}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
                  />
                )}
              </div>

              {/* Zoom slider */}
              <div className="px-4 py-3 flex items-center gap-3">
                <ZoomOut className="w-4 h-4 text-muted-foreground shrink-0" />
                <Slider
                  min={1}
                  max={3}
                  step={0.01}
                  value={[zoom]}
                  onValueChange={([v]) => setZoom(v)}
                  className="flex-1"
                />
                <ZoomIn className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>

              {/* Actions */}
              <div className="flex gap-2 px-4 pb-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setCropOpen(false)}>
                  <XIcon className="w-4 h-4 mr-1.5" /> Cancel
                </Button>
                <Button type="button" className="flex-1" onClick={handleCropConfirm}>
                  <Check className="w-4 h-4 mr-1.5" /> Apply
                </Button>
              </div>
            </DialogContent>
          </Dialog>

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
          <div className="space-y-2">
            <Label htmlFor="address">Store Address <span className="text-destructive">*</span></Label>
            <Input
              id="address"
              placeholder="e.g. 123 Market Street, Mumbai"
              value={form.address}
              onChange={(e) => {
                const val = e.target.value;
                // Clear saved coordinates when admin edits address manually
                setForm((p) => ({
                  ...p,
                  address: val,
                  latitude: null,
                  longitude: null,
                  addressDetails: null,
                }));
                setMapPin(null);
              }}
              data-testid="store-address"
            />

            {/* If address typed but no coordinates yet — show Find on Map prompt */}
            {form.address.trim().length >= 3 && form.latitude === null && (
              <button
                type="button"
                onClick={handleFindOnMap}
                disabled={mapGeoLoading}
                className="w-full rounded-xl border-2 border-dashed border-orange-400/60 bg-orange-50 hover:bg-orange-100 disabled:opacity-60 transition-colors px-4 py-3 flex items-center gap-3 text-left"
              >
                <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <MapIcon className="w-5 h-5 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-orange-700 leading-tight">
                    {mapGeoLoading ? "Searching on map…" : "Find This Address on Map"}
                  </p>
                  <p className="text-xs text-orange-500 mt-0.5">
                    Coordinates required for customer navigation — tap to confirm location
                  </p>
                </div>
                <MapPin className="w-5 h-5 text-orange-400 shrink-0" />
              </button>
            )}

            {/* Live Location Card — always visible to pin via GPS or manual tap */}
            <button
              type="button"
              onClick={() => setMapOpen(true)}
              className="w-full rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary/60 transition-colors px-4 py-3.5 flex items-center gap-3 text-left"
            >
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <LocateFixed className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-primary leading-tight">Save Live Location on Map</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {form.latitude !== null && form.longitude !== null
                    ? `📍 Location saved — tap to change`
                    : "Tap to pin exact store location on map"}
                </p>
              </div>
              {form.latitude !== null && form.longitude !== null ? (
                <Check className="w-5 h-5 text-green-600 shrink-0" />
              ) : (
                <MapIcon className="w-5 h-5 text-primary/50 shrink-0" />
              )}
            </button>

            {form.latitude !== null && form.longitude !== null && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <LocateFixed className="w-3 h-3" />
                Exact location saved ({form.latitude.toFixed(5)}, {form.longitude.toFixed(5)})
              </p>
            )}
          </div>

          {/* Map Picker Dialog */}
          <Dialog open={mapOpen} onOpenChange={setMapOpen}>
            <DialogContent className="max-w-lg p-0 overflow-hidden">
              <DialogHeader className="px-4 pt-4 pb-2">
                <DialogTitle className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" /> Pin Your Store Location
                </DialogTitle>
              </DialogHeader>

              {/* Prominent GPS button */}
              <div className="px-4 pb-3">
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  disabled={mapGeoLoading}
                  className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors px-4 py-3 flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <LocateFixed className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold leading-tight">
                      {mapGeoLoading ? "Getting your location…" : "Use My Live Location"}
                    </p>
                    <p className="text-xs opacity-80 mt-0.5">Precise • Exact location only</p>
                  </div>
                  {!mapGeoLoading && <Navigation className="w-4 h-4 opacity-70 shrink-0" />}
                </button>

                {mapPin && (
                  <div className="flex items-center gap-2 mt-2.5">
                    <div className="flex-1 h-px bg-border" />
                    <p className="text-xs text-muted-foreground px-1">location pinned on map</p>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}
              </div>

              {/* Map — Google Maps iframe */}
              <div className="h-80 w-full">
                <iframe
                  key={mapPin ? `${mapPin.lat}-${mapPin.lng}` : "india"}
                  src={
                    mapPin
                      ? `https://maps.google.com/maps?q=${mapPin.lat},${mapPin.lng}&t=m&z=16&ie=UTF8&iwloc=&output=embed`
                      : `https://maps.google.com/maps?q=India&t=m&z=5&ll=20.5937,78.9629&ie=UTF8&iwloc=&output=embed`
                  }
                  width="100%"
                  height="100%"
                  style={{ border: 0, display: "block" }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Store Location Map"
                />
              </div>

              {/* Address preview */}
              <div className="px-4 py-3 border-t bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Address will be set to:</p>
                <p className="text-sm font-medium line-clamp-2">
                  {mapGeoLoading ? "Looking up address…" : form.address || "Tap a location on the map above"}
                </p>
              </div>
              <div className="flex gap-2 px-4 pb-4 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setMapOpen(false)}>
                  <XIcon className="w-4 h-4 mr-1.5" /> Close
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={() => setMapOpen(false)}
                  disabled={!mapPin}
                >
                  <Check className="w-4 h-4 mr-1.5" /> Confirm Location
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* 3. Owner WhatsApp Number */}
          <div className="space-y-1.5">
            <Label htmlFor="whatsapp">Owner WhatsApp Number <span className="text-destructive">*</span></Label>
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
            <Label>Opening Time <span className="text-destructive">*</span></Label>
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
            <Label>Open Days <span className="text-destructive">*</span></Label>
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
            <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
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
          {/* Missing fields hint */}
          {!isFormValid && missingFields.length > 0 && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
              <p className="text-xs font-semibold text-orange-700 mb-1">Please fill in all required fields:</p>
              <div className="flex flex-wrap gap-1.5">
                {missingFields.map((f) => (
                  <span key={f} className="text-xs bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full font-medium">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

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
              disabled={isPending || uploadImage.isPending || !isFormValid}
              className="flex-1 text-white font-semibold text-base py-5 transition-all"
              style={{
                background: isFormValid
                  ? "linear-gradient(135deg, #16a34a, #22c55e)"
                  : "#d1d5db",
                color: isFormValid ? "white" : "#9ca3af",
                cursor: isFormValid ? "pointer" : "not-allowed",
              }}
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
