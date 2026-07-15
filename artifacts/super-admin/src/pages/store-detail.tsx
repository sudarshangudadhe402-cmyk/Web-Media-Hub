import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import {
  ArrowLeft,
  Store,
  Mail,
  Phone,
  CreditCard,
  CalendarDays,
  MapPin,
  MessageCircle,
  Clock,
  Globe,
  Tag,
  RefreshCw,
  ShieldCheck,
  UserCircle2,
  Zap,
  Pencil,
  Check,
  X,
  ChevronDown,
} from "lucide-react";
import { authFetch } from "@/lib/admin-api";
import { useToast } from "@/hooks/use-toast";

// ── India states list (same as City model uses) ───────────────────────────────
const INDIA_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
  "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
  "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi",
  "Jammu & Kashmir","Ladakh","Puducherry","Chandigarh",
];

// ── types ─────────────────────────────────────────────────────────────────────

interface AdminDetail {
  id: string;
  storeId: string;
  email: string;
  adminNumber: string;
  isActive: boolean;
  activeSessionCount: number;
  planName: string;
  planPrice: string;
  planPeriod: string;
  planBadge: string;
  planColor: string;
  subscriptionStartDate: string | null;
  subscriptionEndDate: string | null;
  autopayStatus: string;
  storeName: string;
  storeAddress: string;
  storeWhatsapp: string;
  storeOpeningTime: string;
  storeOpenDays: string;
  storeDescription: string;
  storeBannerImage: string;
  storeType: string;
  signupSource: string;
  createdAt: string;
  // location — linked to existing City model
  storeState: string;
  storeCity: string;
}

interface CityOption {
  id: string;
  name: string;
  state: string;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ── sub-components ────────────────────────────────────────────────────────────

function InfoRow({
  icon, label, value, accent,
}: {
  icon: React.ReactNode; label: string; value: string; accent?: string;
}) {
  if (!value || value === "—") return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0" style={{ borderColor: "#f0f0f5" }}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: accent ? accent + "15" : "rgba(124,58,237,0.08)" }}>
        <span style={{ color: accent || "#7c3aed" }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold mt-0.5 break-all" style={{ color: "#1e1b4b" }}>{value}</p>
      </div>
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl px-4 pb-1 mb-3"
      style={{ border: "1px solid #f0f0f5", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
      <div className="flex items-center justify-between pt-4 pb-1">
        <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#7c3aed" }}>{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Location edit panel ───────────────────────────────────────────────────────

function LocationEdit({
  adminId,
  currentState,
  currentCity,
  onSaved,
}: {
  adminId: string;
  currentState: string;
  currentCity: string;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [selState, setSelState] = useState(currentState);
  const [selCity, setSelCity] = useState(currentCity);

  // Fetch cities for selected state (uses existing /api/cities route)
  const { data: cities = [], isLoading: citiesLoading } = useQuery<CityOption[]>({
    queryKey: ["cities", selState],
    queryFn: async () => {
      if (!selState) return [];
      const res = await authFetch(`/api/cities?state=${encodeURIComponent(selState)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selState,
    staleTime: 60_000,
  });

  const save = useMutation({
    mutationFn: async () => {
      const res = await authFetch(`/api/admins/${adminId}/location`, {
        method: "PATCH",
        body: JSON.stringify({ storeState: selState, storeCity: selCity }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Location saved ✅" });
      onSaved();
    },
    onError: () => toast({ variant: "destructive", title: "Failed to save location" }),
  });

  const selectCls = "w-full h-9 rounded-lg border px-3 text-sm font-medium appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-purple-200";
  const selectStyle = { borderColor: "#e5e7eb", color: "#1e1b4b" };

  return (
    <div className="pb-3 space-y-3">
      {/* State picker */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
          <Globe className="w-3 h-3" /> State
        </p>
        <div className="relative">
          <select
            className={selectCls}
            style={selectStyle}
            value={selState}
            onChange={(e) => { setSelState(e.target.value); setSelCity(""); }}
          >
            <option value="">— Select State —</option>
            {INDIA_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-gray-400" />
        </div>
      </div>

      {/* City picker — uses existing City model via /api/cities */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
          <MapPin className="w-3 h-3" /> City
        </p>
        {!selState ? (
          <p className="text-xs text-gray-400 italic">Pehle state chuniye</p>
        ) : citiesLoading ? (
          <div className="h-9 rounded-lg animate-pulse" style={{ background: "#f0f0f5" }} />
        ) : cities.length === 0 ? (
          <div>
            <input
              className={selectCls}
              style={{ ...selectStyle, borderColor: "#e5e7eb" }}
              placeholder="City ka naam type karein..."
              value={selCity}
              onChange={(e) => setSelCity(e.target.value)}
            />
            <p className="text-[10px] text-amber-500 mt-1 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Is state mein koi city add nahi hai — city name type karein
            </p>
          </div>
        ) : (
          <div className="relative">
            <select
              className={selectCls}
              style={selectStyle}
              value={selCity}
              onChange={(e) => setSelCity(e.target.value)}
            >
              <option value="">— Select City —</option>
              {cities.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-gray-400" />
          </div>
        )}
      </div>

      {/* Save button */}
      <button
        onClick={() => save.mutate()}
        disabled={save.isPending || !selState}
        className="w-full h-9 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 flex items-center justify-center gap-2"
        style={{ background: save.isPending ? "#a78bfa" : "linear-gradient(135deg, #7c3aed, #a855f7)" }}
      >
        <Check className="w-4 h-4" />
        {save.isPending ? "Saving..." : "Location Save Karo"}
      </button>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function StoreDetail() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const adminId = params.id;
  const queryClient = useQueryClient();
  const [editingLocation, setEditingLocation] = useState(false);

  const { data, isLoading, isError } = useQuery<AdminDetail>({
    queryKey: ["admin-detail", adminId],
    queryFn: async () => {
      const res = await authFetch(`/api/admins/${adminId}`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: !!adminId,
    staleTime: 30_000,
  });

  const initials = (data?.storeName || data?.storeId || "??").substring(0, 2).toUpperCase();
  const isOnline = (data?.activeSessionCount ?? 0) > 0;
  const daysLeft = data?.subscriptionEndDate
    ? Math.max(0, Math.ceil((new Date(data.subscriptionEndDate).getTime() - Date.now()) / 86_400_000))
    : null;
  const planColorVal = data?.planColor || "#7c3aed";

  const hasLocation = !!(data?.storeState || data?.storeCity);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => setLocation("/stores")}
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border hover:bg-gray-50 transition-colors shrink-0"
          style={{ borderColor: "#e5e7eb" }}
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5" style={{ color: "#7c3aed" }} />
          <h1 className="text-lg font-bold" style={{ color: "#1e1b4b" }}>Store Details</h1>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: "#f0f0f5" }} />
          ))}
        </div>
      ) : isError || !data ? (
        <div className="py-16 text-center">
          <Store className="w-10 h-10 mx-auto mb-3 opacity-15" style={{ color: "#7c3aed" }} />
          <p className="text-sm font-medium text-gray-500">Store not found</p>
        </div>
      ) : (
        <>
          {/* Hero card */}
          <div className="bg-white rounded-2xl p-5 mb-3 flex items-center gap-4"
            style={{ border: "1px solid #f0f0f5", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0"
              style={{ background: `linear-gradient(135deg, ${planColorVal}, ${planColorVal}cc)` }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold truncate" style={{ color: "#1e1b4b" }}>{data.storeName || "—"}</h2>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: data.isActive ? "rgba(5,150,105,0.10)" : "rgba(220,38,38,0.10)", color: data.isActive ? "#059669" : "#dc2626" }}>
                  {data.isActive ? "Active" : "Inactive"}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: isOnline ? "rgba(5,150,105,0.10)" : "rgba(107,114,128,0.10)", color: isOnline ? "#059669" : "#6b7280" }}>
                  {isOnline ? "Online" : "Offline"}
                </span>
                {data.planName && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: planColorVal + "18", color: planColorVal }}>
                    {data.planName}
                  </span>
                )}
              </div>
              {daysLeft !== null && (
                <p className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" />
                  {daysLeft > 0 ? `${daysLeft} days left` : "Subscription expired"}
                </p>
              )}
            </div>
          </div>

          {/* Owner Details */}
          <Section title="Owner Details">
            <InfoRow icon={<UserCircle2 className="w-4 h-4" />} label="Store ID" value={data.storeId} accent="#7c3aed" />
            <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={data.email} accent="#0ea5e9" />
            <InfoRow icon={<Phone className="w-4 h-4" />} label="Mobile Number" value={data.adminNumber} accent="#10b981" />
            <InfoRow icon={<Tag className="w-4 h-4" />} label="Store Type" value={data.storeType} />
            <InfoRow icon={<Zap className="w-4 h-4" />} label="Signup Source" value={data.signupSource} />
            <InfoRow icon={<CalendarDays className="w-4 h-4" />} label="Joined On" value={fmtDate(data.createdAt)} />
          </Section>

          {/* Plan Details */}
          <Section title="Subscription Plan">
            <InfoRow icon={<CreditCard className="w-4 h-4" />} label="Plan Name" value={data.planName || "—"} accent={planColorVal} />
            {data.planPrice && (
              <InfoRow icon={<span className="text-sm font-bold">₹</span>} label="Plan Price"
                value={`₹${data.planPrice}${data.planPeriod ? ` / ${data.planPeriod}` : ""}`} accent="#059669" />
            )}
            <InfoRow icon={<CalendarDays className="w-4 h-4" />} label="Subscription Start" value={fmtDate(data.subscriptionStartDate)} />
            <InfoRow icon={<CalendarDays className="w-4 h-4" />} label="Subscription End" value={fmtDate(data.subscriptionEndDate)}
              accent={daysLeft !== null && daysLeft <= 7 ? "#dc2626" : undefined} />
            {data.autopayStatus && data.autopayStatus !== "none" && (
              <InfoRow icon={<RefreshCw className="w-4 h-4" />} label="Autopay Status"
                value={data.autopayStatus.charAt(0).toUpperCase() + data.autopayStatus.slice(1)}
                accent={data.autopayStatus === "active" ? "#059669" : "#f59e0b"} />
            )}
          </Section>

          {/* ── Location (State + City) — uses existing City model ── */}
          <Section
            title="Location"
            action={
              <button
                onClick={() => setEditingLocation((v) => !v)}
                className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all"
                style={{
                  background: editingLocation ? "rgba(220,38,38,0.08)" : "rgba(124,58,237,0.08)",
                  color: editingLocation ? "#dc2626" : "#7c3aed",
                }}
              >
                {editingLocation ? <X className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
                {editingLocation ? "Cancel" : "Edit"}
              </button>
            }
          >
            {editingLocation ? (
              <LocationEdit
                adminId={data.id}
                currentState={data.storeState}
                currentCity={data.storeCity}
                onSaved={() => {
                  setEditingLocation(false);
                  queryClient.invalidateQueries({ queryKey: ["admin-detail", adminId] });
                }}
              />
            ) : hasLocation ? (
              <div className="py-3 space-y-0">
                {data.storeState && (
                  <div className="flex items-start gap-3 py-3 border-b" style={{ borderColor: "#f0f0f5" }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(124,58,237,0.08)" }}>
                      <Globe className="w-4 h-4" style={{ color: "#7c3aed" }} />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">State</p>
                      <p className="text-sm font-semibold mt-0.5" style={{ color: "#1e1b4b" }}>{data.storeState}</p>
                    </div>
                  </div>
                )}
                {data.storeCity && (
                  <div className="flex items-start gap-3 py-3" style={{ borderColor: "#f0f0f5" }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(14,165,233,0.08)" }}>
                      <MapPin className="w-4 h-4" style={{ color: "#0ea5e9" }} />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">City</p>
                      <p className="text-sm font-semibold mt-0.5" style={{ color: "#1e1b4b" }}>{data.storeCity}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-5 text-center">
                <MapPin className="w-8 h-8 mx-auto mb-2 opacity-15" style={{ color: "#7c3aed" }} />
                <p className="text-xs text-gray-400 font-medium">Location set nahi hai</p>
                <p className="text-[11px] text-gray-300 mt-0.5">Edit button se state aur city assign karein</p>
              </div>
            )}
          </Section>

          {/* Store Info */}
          {(data.storeAddress || data.storeWhatsapp || data.storeOpeningTime || data.storeOpenDays || data.storeDescription) && (
            <Section title="Store Info">
              <InfoRow icon={<MapPin className="w-4 h-4" />} label="Address" value={data.storeAddress} accent="#ef4444" />
              <InfoRow icon={<MessageCircle className="w-4 h-4" />} label="WhatsApp" value={data.storeWhatsapp} accent="#22c55e" />
              <InfoRow icon={<Clock className="w-4 h-4" />} label="Opening Time" value={data.storeOpeningTime} />
              <InfoRow icon={<CalendarDays className="w-4 h-4" />} label="Open Days" value={data.storeOpenDays} />
              {data.storeDescription && (
                <div className="py-3 border-b last:border-0" style={{ borderColor: "#f0f0f5" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-3.5 h-3.5" style={{ color: "#7c3aed" }} />
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Description</p>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{data.storeDescription}</p>
                </div>
              )}
            </Section>
          )}
        </>
      )}
    </div>
  );
}
