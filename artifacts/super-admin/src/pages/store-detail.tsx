import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";
import { authFetch } from "@/lib/admin-api";

interface AdminDetail {
  id: string;
  storeId: string;
  email: string;
  adminNumber: string;
  isActive: boolean;
  activeSessionCount: number;
  // plan
  planName: string;
  planPrice: string;
  planPeriod: string;
  planBadge: string;
  planColor: string;
  subscriptionStartDate: string | null;
  subscriptionEndDate: string | null;
  autopayStatus: string;
  // store
  storeName: string;
  storeAddress: string;
  storeWhatsapp: string;
  storeOpeningTime: string;
  storeOpenDays: string;
  storeDescription: string;
  storeBannerImage: string;
  // meta
  storeType: string;
  signupSource: string;
  createdAt: string;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function InfoRow({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: string;
}) {
  if (!value || value === "—") return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0" style={{ borderColor: "#f0f0f5" }}>
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: accent ? accent + "15" : "rgba(124,58,237,0.08)" }}
      >
        <span style={{ color: accent || "#7c3aed" }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold mt-0.5 break-all" style={{ color: "#1e1b4b" }}>
          {value}
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="bg-white rounded-2xl px-4 pb-1 mb-3"
      style={{ border: "1px solid #f0f0f5", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
    >
      <p
        className="text-[11px] font-bold uppercase tracking-wider pt-4 pb-1"
        style={{ color: "#7c3aed" }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

export default function StoreDetail() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const adminId = params.id;

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

  const initials = (data?.storeName || data?.storeId || "??")
    .substring(0, 2)
    .toUpperCase();

  const isOnline = (data?.activeSessionCount ?? 0) > 0;

  // Subscription days left
  const daysLeft = data?.subscriptionEndDate
    ? Math.max(0, Math.ceil((new Date(data.subscriptionEndDate).getTime() - Date.now()) / 86_400_000))
    : null;

  const planColorVal = data?.planColor || "#7c3aed";

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
          <div
            className="bg-white rounded-2xl p-5 mb-3 flex items-center gap-4"
            style={{ border: "1px solid #f0f0f5", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
          >
            {/* Avatar */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0"
              style={{ background: `linear-gradient(135deg, ${planColorVal}, ${planColorVal}cc)` }}
            >
              {initials}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold truncate" style={{ color: "#1e1b4b" }}>
                {data.storeName || "—"}
              </h2>

              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                {/* Active / Inactive */}
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: data.isActive ? "rgba(5,150,105,0.10)" : "rgba(220,38,38,0.10)",
                    color: data.isActive ? "#059669" : "#dc2626",
                  }}
                >
                  {data.isActive ? "Active" : "Inactive"}
                </span>

                {/* Online / Offline */}
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: isOnline ? "rgba(5,150,105,0.10)" : "rgba(107,114,128,0.10)",
                    color: isOnline ? "#059669" : "#6b7280",
                  }}
                >
                  {isOnline ? "Online" : "Offline"}
                </span>

                {/* Plan badge */}
                {data.planName && (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: planColorVal + "18",
                      color: planColorVal,
                    }}
                  >
                    {data.planName}
                  </span>
                )}
              </div>

              {/* Subscription days left */}
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
            <InfoRow
              icon={<CreditCard className="w-4 h-4" />}
              label="Plan Name"
              value={data.planName || "—"}
              accent={planColorVal}
            />
            {data.planPrice && (
              <InfoRow
                icon={<span className="text-sm font-bold">₹</span>}
                label="Plan Price"
                value={`₹${data.planPrice}${data.planPeriod ? ` / ${data.planPeriod}` : ""}`}
                accent="#059669"
              />
            )}
            <InfoRow
              icon={<CalendarDays className="w-4 h-4" />}
              label="Subscription Start"
              value={fmtDate(data.subscriptionStartDate)}
            />
            <InfoRow
              icon={<CalendarDays className="w-4 h-4" />}
              label="Subscription End"
              value={fmtDate(data.subscriptionEndDate)}
              accent={daysLeft !== null && daysLeft <= 7 ? "#dc2626" : undefined}
            />
            {data.autopayStatus && data.autopayStatus !== "none" && (
              <InfoRow
                icon={<RefreshCw className="w-4 h-4" />}
                label="Autopay Status"
                value={data.autopayStatus.charAt(0).toUpperCase() + data.autopayStatus.slice(1)}
                accent={data.autopayStatus === "active" ? "#059669" : "#f59e0b"}
              />
            )}
          </Section>

          {/* Store Details */}
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
