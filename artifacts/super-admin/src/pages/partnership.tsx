import { useEffect, useState } from "react";
import { useParams } from "wouter";
import {
  Users, MapPin, Calendar,
  XCircle, Clock, Tag, Star, Handshake, TrendingUp, IndianRupee, Percent,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface MemberProfile {
  type: "influencer" | "ambassador" | "referral";
  name: string;
  code: string;
  commission_percentage: number | null;
  total_signups: number;
  total_paid_admins: number;
  total_revenue: number | null;
  joinedAt: string;
  city?: string;
  email?: string;
  owner_plan?: string;
}

interface SignupRecord {
  email: string;
  adminNumber: string;
  planName: string;
  planPrice: string;
  planBadge: string;
  isActive: boolean;
  subscriptionStartDate: string | null;
  subscriptionEndDate: string | null;
  signedUpAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number | null | undefined) { return (n ?? 0).toLocaleString("en-IN"); }

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function typeLabel(t: string) {
  if (t === "influencer") return "Influencer";
  if (t === "ambassador") return "Brand Ambassador";
  return "Referral Partner";
}

function typeBadgeColor(t: string) {
  if (t === "influencer") return "from-cyan-500 to-blue-600";
  if (t === "ambassador") return "from-violet-500 to-purple-700";
  return "from-amber-500 to-orange-600";
}

function typeIconBg(t: string) {
  if (t === "influencer") return "bg-cyan-100 text-cyan-700";
  if (t === "ambassador") return "bg-violet-100 text-violet-700";
  return "bg-amber-100 text-amber-700";
}

function subscriptionStatus(end: string | null): "active" | "expired" | "lifetime" {
  if (!end) return "lifetime";
  return new Date(end) > new Date() ? "active" : "expired";
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

// ── Commission Earned Card ─────────────────────────────────────────────────────
function CommissionEarnedCard({ revenue, commission }: { revenue: number; commission: number }) {
  const earned = Math.round((revenue * commission) / 100);
  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 shadow-sm p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
        <IndianRupee className="w-6 h-6 text-green-600" />
      </div>
      <div>
        <p className="text-xs text-green-700 font-medium uppercase tracking-wide">Commission Earned</p>
        <p className="text-xl font-bold text-green-800 mt-0.5">₹{earned.toLocaleString("en-IN")}</p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PartnershipPage() {
  const params = useParams<{ type: string; code: string }>();
  const type = params.type ?? "";
  const code = params.code ?? "";

  const [data, setData] = useState<{ member: MemberProfile; signups: SignupRecord[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!type || !code) return;
    setLoading(true);
    fetch(`/api/public/partner/${encodeURIComponent(type)}/${encodeURIComponent(code)}`)
      .then((r) => {
        if (!r.ok) return r.json().then((e) => { throw new Error(e.error || "Not found"); });
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [type, code]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading your partnership profile…</p>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
          <p className="text-gray-500 text-sm">The partnership profile you're looking for doesn't exist or the link may be incorrect.</p>
        </div>
      </div>
    );
  }

  const { member, signups } = data;
  const gradientClass = typeBadgeColor(member.type);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">

      {/* ── Top Banner ─────────────────────────────────────────────────────── */}
      <div className={`bg-gradient-to-r ${gradientClass} py-10 px-4`}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Handshake className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white/80 text-xs font-semibold uppercase tracking-widest">Web Media Hub</p>
              <p className="text-white font-bold text-lg leading-tight">Partnership Portal</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 backdrop-blur-sm border border-white/30">
              <span className="text-white text-2xl font-black">
                {member.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-white text-2xl font-black truncate">{member.name}</h1>
              {member.city && (
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-white/70" />
                  <span className="text-white/80 text-sm">{member.city}</span>
                </div>
              )}
              {/* Only type label + code in banner — commission badge is shown below */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full text-white text-xs font-semibold">
                  <Star className="w-3 h-3" />
                  {typeLabel(member.type)}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full text-white font-mono text-xs font-bold">
                  <Tag className="w-3 h-3" />
                  {member.code}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        {/* ── Commission Badge ────────────────────────────────────────────── */}
        {member.commission_percentage != null && (
          <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <Percent className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Commission Rate</p>
              <p className="text-lg font-black text-gray-900 mt-0.5">{member.commission_percentage}% per sale</p>
            </div>
            <span className="px-3 py-1.5 bg-indigo-100 text-indigo-700 text-sm font-bold rounded-full">
              {member.commission_percentage}%
            </span>
          </div>
        )}

        {/* ── Stats row ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            icon={Users}
            label="Total Signups"
            value={fmt(member.total_signups)}
            color="bg-blue-50 text-blue-600"
          />
          <StatCard
            icon={Calendar}
            label="Partner Since"
            value={fmtDate(member.joinedAt)}
            color="bg-amber-50 text-amber-600"
          />
          {member.total_revenue != null && (
            <StatCard
              icon={TrendingUp}
              label="Revenue Generated"
              value={`₹${fmt(member.total_revenue)}`}
              color="bg-purple-50 text-purple-600"
            />
          )}
          {member.total_revenue != null && member.commission_percentage != null && (
            <CommissionEarnedCard
              revenue={member.total_revenue}
              commission={member.commission_percentage}
            />
          )}
        </div>

        {/* ── My code - signups table ─────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              Signups via <span className="font-mono text-blue-600">{member.code}</span>
            </h2>
            <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-semibold">
              {signups.length} total
            </span>
          </div>

          {signups.length === 0 ? (
            <div className="text-center py-14 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No signups yet</p>
              <p className="text-gray-400 text-sm mt-1">When someone signs up using your code, they'll appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {signups.map((s, i) => {
                const status = subscriptionStatus(s.subscriptionEndDate);
                return (
                  <div
                    key={i}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                  >
                    {/* Serial + status dot */}
                    <div className="flex items-center gap-3 sm:w-8 shrink-0">
                      <span className="text-xs font-bold text-gray-400 w-6 text-center">{i + 1}</span>
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        status === "active" ? "bg-green-400" :
                        status === "lifetime" ? "bg-purple-400" :
                        "bg-gray-300"
                      }`} title={status} />
                    </div>

                    {/* Plan info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-gray-800">{s.planName || "—"}</span>
                        {s.planBadge && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200 uppercase">{s.planBadge}</span>
                        )}
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          status === "active" ? "bg-green-100 text-green-700" :
                          status === "lifetime" ? "bg-purple-100 text-purple-700" :
                          "bg-gray-100 text-gray-500"
                        }`}>
                          {status === "active" ? "Active" : status === "lifetime" ? "Lifetime" : "Expired"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {s.planPrice || "—"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Joined {fmtDate(s.signedUpAt)}
                        </span>
                        {s.subscriptionEndDate && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {status === "active" ? "Expires" : "Expired"} {fmtDate(s.subscriptionEndDate)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Masked contact */}
                    <div className="text-xs text-gray-400 text-right shrink-0 font-mono">
                      {s.adminNumber ? `📱 ${s.adminNumber}` : s.email ? `✉ ${maskEmail(s.email)}` : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="text-center pt-4 pb-8">
          <div className="inline-flex items-center gap-2 text-xs text-gray-400">
            <Handshake className="w-3.5 h-3.5" />
            <span>Web Media Hub Partnership Program</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.length > 3 ? local.slice(0, 3) : local.slice(0, 1);
  return `${visible}***@${domain}`;
}
