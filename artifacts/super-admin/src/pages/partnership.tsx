import { useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import {
  Users, MapPin, Calendar, XCircle, Tag, Star, Handshake,
  TrendingUp, Percent, IndianRupee, Wallet, Shield, Pencil,
  CheckCircle2, AlertCircle, Clock, RefreshCw,
  Send, X, Banknote,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface MemberProfile {
  type: "influencer" | "ambassador" | "referral";
  name: string;
  code: string;
  commission_percentage: number | null;
  customer_discount_percentage: number | null;
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

interface WithdrawalRecord {
  requestId: string;
  amount: number;
  upiId: string;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: string;
  completedAt: string | null;
}

interface WithdrawalData {
  withdrawable_balance: number;
  upi_id: string;
  history: WithdrawalRecord[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number | null | undefined) { return (n ?? 0).toLocaleString("en-IN"); }
function fmtRs(n: number) { return `₹${n.toLocaleString("en-IN")}`; }

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

function subscriptionStatus(end: string | null): "active" | "expired" | "lifetime" {
  if (!end) return "lifetime";
  return new Date(end) > new Date() ? "active" : "expired";
}

function validateUpi(upi: string) {
  return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/.test(upi.trim());
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

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border max-w-sm animate-in slide-in-from-top-2 ${type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
      {type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />}
      <p className="text-sm font-medium flex-1">{msg}</p>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-1"><X className="w-4 h-4" /></button>
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: WithdrawalRecord["status"] }) {
  const map = {
    pending: { cls: "bg-amber-100 text-amber-700", icon: Clock, label: "Pending" },
    processing: { cls: "bg-blue-100 text-blue-700", icon: RefreshCw, label: "Processing" },
    completed: { cls: "bg-green-100 text-green-700", icon: CheckCircle2, label: "Completed" },
    failed: { cls: "bg-red-100 text-red-700", icon: XCircle, label: "Failed" },
  };
  const { cls, icon: Icon, label } = map[status] ?? map.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PartnershipPage() {
  const params = useParams<{ type: string; code: string }>();
  const type = params.type ?? "";
  const code = params.code ?? "";
  const VERIFY_KEY = `partner_verified_${type}_${code}`;

  const withdrawRef = useRef<HTMLDivElement>(null);

  // ── Login / Verification state ─────────────────────────────────────────────
  const [verified, setVerified] = useState(() => {
    try { return !!localStorage.getItem(VERIFY_KEY); } catch { return false; }
  });
  const [verifiedEmail, setVerifiedEmail] = useState(() => {
    try { return localStorage.getItem(`${VERIFY_KEY}_email`) || ""; } catch { return ""; }
  });
  const [verifyStep, setVerifyStep] = useState<"email" | "otp">("email");
  const [inputEmail, setInputEmail] = useState("");
  const [inputOtp, setInputOtp] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  // ── Partner data ───────────────────────────────────────────────────────────
  const [data, setData] = useState<{ member: MemberProfile; signups: SignupRecord[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Withdrawal data ────────────────────────────────────────────────────────
  const [wdData, setWdData] = useState<WithdrawalData | null>(null);
  const [wdLoading, setWdLoading] = useState(false);

  // ── UPI ID editing ─────────────────────────────────────────────────────────
  const [upiEditing, setUpiEditing] = useState(false);
  const [upiInput, setUpiInput] = useState("");
  const [upiSaving, setUpiSaving] = useState(false);
  const [upiError, setUpiError] = useState("");

  // ── Withdrawal OTP flow ────────────────────────────────────────────────────
  const [wdStep, setWdStep] = useState<"idle" | "sending" | "otp" | "verifying" | "confirmed" | "submitting" | "done">("idle");
  const [wdAmount, setWdAmount] = useState("");
  const [wdOtpInput, setWdOtpInput] = useState("");
  const [wdSessionToken, setWdSessionToken] = useState("");
  const [wdOtpError, setWdOtpError] = useState("");
  const [wdSuccessId, setWdSuccessId] = useState("");

  // ── Toast ──────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
  }

  // Fetch partner data when verified
  useEffect(() => {
    if (!verified || !type || !code) return;
    setLoading(true);
    fetch(`/api/public/partner/${encodeURIComponent(type)}/${encodeURIComponent(code)}`)
      .then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error || "Not found"); }); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [verified, type, code]);

  // Fetch withdrawal data when verified
  useEffect(() => {
    if (!verified || !type || !code) return;
    setWdLoading(true);
    fetch(`/api/public/partner/${encodeURIComponent(type)}/${encodeURIComponent(code)}/withdrawal`)
      .then(r => r.json())
      .then(d => { setWdData(d); setWdLoading(false); })
      .catch(() => setWdLoading(false));
  }, [verified, type, code]);

  // ── OTP helpers (login) ────────────────────────────────────────────────────
  async function sendOtp() {
    if (!inputEmail.trim()) { setVerifyError("Please enter your email address."); return; }
    setVerifyLoading(true); setVerifyError("");
    try {
      const r = await fetch("/api/public/partner/send-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, code, email: inputEmail.trim().toLowerCase() }),
      });
      const d = await r.json();
      if (!r.ok) { setVerifyError(d.error || "Failed to send OTP"); return; }
      setVerifyStep("otp");
    } catch { setVerifyError("Network error. Please try again."); }
    finally { setVerifyLoading(false); }
  }

  async function verifyOtp() {
    if (!inputOtp.trim()) { setVerifyError("Please enter the OTP."); return; }
    setVerifyLoading(true); setVerifyError("");
    try {
      const r = await fetch("/api/public/partner/verify-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, code, email: inputEmail.trim().toLowerCase(), otp: inputOtp.trim() }),
      });
      const d = await r.json();
      if (!r.ok) { setVerifyError(d.error || "Invalid OTP. Please try again."); return; }
      const em = inputEmail.trim().toLowerCase();
      try {
        localStorage.setItem(VERIFY_KEY, "1");
        localStorage.setItem(`${VERIFY_KEY}_email`, em);
      } catch { /* ignore */ }
      setVerifiedEmail(em);
      setVerified(true);
    } catch { setVerifyError("Network error. Please try again."); }
    finally { setVerifyLoading(false); }
  }

  // ── UPI save ───────────────────────────────────────────────────────────────
  async function handleSaveUpi() {
    const upi = upiInput.trim();
    if (!validateUpi(upi)) { setUpiError("Invalid UPI ID. Example: name@paytm"); return; }
    setUpiSaving(true); setUpiError("");
    try {
      const r = await fetch(`/api/public/partner/${encodeURIComponent(type)}/${encodeURIComponent(code)}/upi`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifiedEmail, upiId: upi }),
      });
      const d = await r.json();
      if (!r.ok) { setUpiError(d.error || "Failed to save"); return; }
      setWdData(prev => prev ? { ...prev, upi_id: upi } : prev);
      setUpiEditing(false);
      showToast("UPI ID saved successfully!");
    } catch { setUpiError("Network error. Please try again."); }
    finally { setUpiSaving(false); }
  }

  // ── Withdrawal OTP flow ────────────────────────────────────────────────────
  async function handleSendWithdrawalOtp() {
    const amt = Number(wdAmount);
    if (!wdAmount || isNaN(amt) || amt < 500) { showToast("Minimum withdrawal is ₹500", "error"); return; }
    if (amt > 25000) { showToast("Maximum withdrawal is ₹25,000 per request", "error"); return; }
    if (!wdData || amt > wdData.withdrawable_balance) { showToast("Amount exceeds your withdrawable balance", "error"); return; }
    const upiToUse = wdData?.upi_id;
    if (!upiToUse) { showToast("Please add a UPI ID first", "error"); return; }

    setWdStep("sending"); setWdOtpError("");
    try {
      const r = await fetch("/api/public/partner/withdrawal/send-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, code, email: verifiedEmail, amount: amt }),
      });
      const d = await r.json();
      if (!r.ok) { showToast(d.error || "Failed to send OTP", "error"); setWdStep("idle"); return; }
      setWdStep("otp");
    } catch { showToast("Network error", "error"); setWdStep("idle"); }
  }

  async function handleVerifyWithdrawalOtp() {
    if (wdOtpInput.length < 6) { setWdOtpError("Enter the 6-digit OTP"); return; }
    setWdStep("verifying"); setWdOtpError("");
    try {
      const r = await fetch("/api/public/partner/withdrawal/verify-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, code, email: verifiedEmail, otp: wdOtpInput.trim() }),
      });
      const d = await r.json();
      if (!r.ok) { setWdOtpError(d.error || "Invalid OTP"); setWdStep("otp"); return; }
      setWdSessionToken(d.session_token);
      setWdStep("confirmed");
    } catch { setWdOtpError("Network error"); setWdStep("otp"); }
  }

  async function handleWithdrawalRequest() {
    setWdStep("submitting");
    try {
      const r = await fetch("/api/public/partner/withdrawal/request", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_token: wdSessionToken, amount: Number(wdAmount), upiId: wdData?.upi_id }),
      });
      const d = await r.json();
      if (!r.ok) { showToast(d.error || "Failed to create request", "error"); setWdStep("idle"); return; }
      setWdSuccessId(d.requestId);
      setWdStep("done");
      // Refresh withdrawal data
      const r2 = await fetch(`/api/public/partner/${encodeURIComponent(type)}/${encodeURIComponent(code)}/withdrawal`);
      if (r2.ok) { setWdData(await r2.json()); }
    } catch { showToast("Network error", "error"); setWdStep("idle"); }
  }

  function resetWithdrawal() {
    setWdStep("idle"); setWdAmount(""); setWdOtpInput(""); setWdOtpError(""); setWdSessionToken(""); setWdSuccessId("");
  }

  // ── Verification Screen ────────────────────────────────────────────────────
  if (!verified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Handshake className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 mb-1">Partnership Portal</h1>
            <p className="text-gray-500 text-sm">Web Media Hub</p>
          </div>
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            {verifyStep === "email" ? (
              <>
                <h2 className="font-bold text-gray-900 mb-1">Verify your identity</h2>
                <p className="text-sm text-gray-500 mb-3">Enter the email address registered with your partner account to receive a one-time code.</p>
                <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-3 mb-4">
                  <span className="text-amber-500 text-base leading-none mt-0.5">🔒</span>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    <strong>Email yaad rakhein</strong> — yahi email withdrawal ke time bhi verify hogi. Bina is email ke aap payment request nahi kar sakte.
                  </p>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block uppercase tracking-wide">Email address</label>
                    <input type="email" value={inputEmail} onChange={e => setInputEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && sendOtp()} placeholder="you@example.com" className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" autoFocus />
                  </div>
                  {verifyError && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                      <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-600">{verifyError}</p>
                    </div>
                  )}
                  <button onClick={sendOtp} disabled={verifyLoading} className="w-full h-11 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                    {verifyLoading ? "Sending…" : "Send OTP →"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="font-bold text-gray-900 mb-1">Enter your OTP</h2>
                <p className="text-sm text-gray-500 mb-1">A 6-digit code was sent to</p>
                <p className="text-sm font-semibold text-gray-800 mb-5">{inputEmail}</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block uppercase tracking-wide">One-time code</label>
                    <input type="text" inputMode="numeric" value={inputOtp} onChange={e => setInputOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} onKeyDown={e => e.key === "Enter" && verifyOtp()} placeholder="000000" maxLength={6} className="w-full h-14 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-2xl font-mono tracking-[0.4em] text-center" autoFocus />
                  </div>
                  {verifyError && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                      <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-600">{verifyError}</p>
                    </div>
                  )}
                  <button onClick={verifyOtp} disabled={verifyLoading || inputOtp.length < 6} className="w-full h-11 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                    {verifyLoading ? "Verifying…" : "Verify & Enter →"}
                  </button>
                  <button onClick={() => { setVerifyStep("email"); setInputOtp(""); setVerifyError(""); }} className="w-full text-xs text-gray-400 hover:text-gray-600 py-1">← Change email</button>
                </div>
              </>
            )}
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">Code: <span className="font-mono font-bold text-gray-600 uppercase">{code}</span></p>
        </div>
      </div>
    );
  }

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
  const balance = wdData?.withdrawable_balance ?? 0;
  const upiId = wdData?.upi_id ?? "";
  const canWithdraw = balance >= 500 && !!upiId && wdStep === "idle";
  const amtNum = Number(wdAmount);
  const amtValid = !isNaN(amtNum) && amtNum >= 500 && amtNum <= 25000 && amtNum <= balance;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

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
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 backdrop-blur-sm border border-white/30">
              <span className="text-white text-2xl font-black">{member.name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-white text-2xl font-black truncate">{member.name}</h1>
              {member.email && <p className="text-white/70 text-xs mt-0.5">{member.email}</p>}
              {member.city && (
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-white/70" />
                  <span className="text-white/80 text-sm">{member.city}</span>
                </div>
              )}
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

          <div className="mt-4 pt-3 border-t border-white/20 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-white/70 shrink-0" />
            <span className="text-white/70 text-xs font-medium uppercase tracking-wide">Partner Since</span>
            <span className="text-white text-xs font-bold flex-1">{fmtDate(member.joinedAt)}</span>
            <button
              onClick={() => withdrawRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="px-4 py-1.5 bg-white text-slate-800 text-xs font-bold rounded-full hover:bg-white/90 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Wallet className="w-3.5 h-3.5" />
              Withdraw
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        {/* ── Commission + Customer Discount Badges ───────────────────────── */}
        <div className="space-y-2">
          {member.commission_percentage != null && member.commission_percentage > 0 && (
            <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                <Percent className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide leading-none">Your Commission Rate</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{member.commission_percentage}% per sale</p>
              </div>
              <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full shrink-0">{member.commission_percentage}%</span>
            </div>
          )}
          {(member.customer_discount_percentage ?? 0) > 0 && (
            <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100 shadow-sm px-4 py-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                <Tag className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-blue-500 font-medium uppercase tracking-wide leading-none">Customer Discount</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{member.customer_discount_percentage}% off — code <span className="font-mono">{member.code}</span></p>
              </div>
              <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full shrink-0">{member.customer_discount_percentage}% OFF</span>
            </div>
          )}
        </div>

        {/* ── Stats row ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard icon={Users} label="Total Signups" value={fmt(member.total_signups)} color="bg-blue-50 text-blue-600" />
          {member.total_revenue != null && (
            <StatCard icon={TrendingUp} label="Revenue Generated" value={`₹${fmt(member.total_revenue)}`} color="bg-purple-50 text-purple-600" />
          )}
        </div>

        {/* ── Withdrawal Section ─────────────────────────────────────────── */}
        <div ref={withdrawRef} className="space-y-4">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-bold text-gray-900">Withdrawal</h2>
          </div>

          {wdLoading ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex justify-center">
              <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Balance + UPI row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Withdrawable Balance Card */}
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <IndianRupee className="w-4 h-4 text-green-200" />
                    <p className="text-xs font-semibold uppercase tracking-widest text-green-100">Withdrawable Balance</p>
                  </div>
                  <p className="text-4xl font-black tracking-tight">{fmtRs(balance)}</p>
                  <p className="text-green-200 text-xs mt-1.5">Min ₹500 · Max ₹25,000 per request</p>
                </div>

                {/* UPI ID Card */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-gray-500" />
                      <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">UPI ID</p>
                    </div>
                    {!upiEditing && (
                      <button onClick={() => { setUpiInput(upiId); setUpiEditing(true); setUpiError(""); }} className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">
                        <Pencil className="w-3 h-3" />
                        {upiId ? "Edit" : "Add"}
                      </button>
                    )}
                  </div>
                  {upiEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={upiInput}
                        onChange={e => setUpiInput(e.target.value)}
                        placeholder="yourname@paytm"
                        className="w-full h-10 px-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-mono"
                        autoFocus
                      />
                      {upiError && <p className="text-xs text-red-500">{upiError}</p>}
                      <div className="flex gap-2">
                        <button onClick={handleSaveUpi} disabled={upiSaving} className="flex-1 h-9 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition-colors disabled:opacity-60">
                          {upiSaving ? "Saving…" : "Save"}
                        </button>
                        <button onClick={() => { setUpiEditing(false); setUpiError(""); }} className="h-9 px-4 bg-gray-100 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : upiId ? (
                    <div>
                      <p className="text-base font-bold text-gray-900 font-mono truncate">{upiId}</p>
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Ready for withdrawal</p>
                    </div>
                  ) : (
                    <div className="text-center py-3">
                      <p className="text-sm text-gray-400">No UPI ID added yet</p>
                      <button onClick={() => { setUpiInput(""); setUpiEditing(true); setUpiError(""); }} className="text-xs text-green-600 hover:text-green-700 font-semibold mt-1">+ Add UPI ID</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Withdraw Amount + OTP Flow */}
              {wdStep === "done" ? (
                /* ── Success State ───────────────────────────────────────── */
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 text-center">
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-7 h-7 text-green-600" />
                  </div>
                  <h3 className="text-lg font-bold text-green-800 mb-1">Withdrawal Requested!</h3>
                  <p className="text-sm text-green-700 mb-2">Your request has been submitted for processing.</p>
                  <div className="inline-flex items-center gap-2 bg-white border border-green-200 rounded-xl px-4 py-2 mb-4">
                    <span className="text-xs text-gray-500">Request ID:</span>
                    <span className="font-mono text-sm font-bold text-gray-900">{wdSuccessId}</span>
                  </div>
                  <div>
                    <button onClick={resetWithdrawal} className="px-6 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors">
                      New Withdrawal
                    </button>
                  </div>
                </div>
              ) : wdStep === "otp" || wdStep === "verifying" || wdStep === "confirmed" || wdStep === "submitting" ? (
                /* ── OTP Verification State ──────────────────────────────── */
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <Shield className="w-4 h-4 text-green-700" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Verify Withdrawal</p>
                        <p className="text-xs text-gray-500">Amount: <strong>{fmtRs(amtNum)}</strong> → {upiId}</p>
                      </div>
                    </div>
                    {wdStep !== "submitting" && (
                      <button onClick={resetWithdrawal} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                    )}
                  </div>

                  {wdStep === "confirmed" || wdStep === "submitting" ? (
                    /* OTP verified, confirm final submission */
                    <div className="space-y-3">
                      <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                        <p className="text-sm text-green-700 font-medium">OTP verified successfully</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5 text-sm">
                        <div className="flex justify-between"><span className="text-gray-500">Amount</span><span className="font-bold text-gray-900">{fmtRs(amtNum)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">UPI ID</span><span className="font-mono font-bold text-gray-900">{upiId}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">New Balance</span><span className="font-bold text-green-700">{fmtRs(balance - amtNum)}</span></div>
                      </div>
                      <button onClick={handleWithdrawalRequest} disabled={wdStep === "submitting"} className="w-full h-12 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        {wdStep === "submitting" ? (
                          <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Submitting…</>
                        ) : (
                          <><IndianRupee className="w-4 h-4" />Confirm Withdrawal</>
                        )}
                      </button>
                    </div>
                  ) : (
                    /* Enter OTP */
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">A 6-digit OTP was sent to <strong>{verifiedEmail}</strong>. Enter it below to confirm.</p>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={wdOtpInput}
                        onChange={e => setWdOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        onKeyDown={e => e.key === "Enter" && handleVerifyWithdrawalOtp()}
                        placeholder="000000"
                        maxLength={6}
                        className="w-full h-14 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 text-2xl font-mono tracking-[0.4em] text-center"
                        autoFocus
                        disabled={wdStep === "verifying"}
                      />
                      {wdOtpError && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <p className="text-sm text-red-600">{wdOtpError}</p>
                        </div>
                      )}
                      <button onClick={handleVerifyWithdrawalOtp} disabled={wdOtpInput.length < 6 || wdStep === "verifying"} className="w-full h-11 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        {wdStep === "verifying" ? (
                          <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Verifying…</>
                        ) : "Verify OTP →"}
                      </button>
                      <p className="text-xs text-gray-400 text-center">OTP valid for 10 minutes. Check spam if not received.</p>
                    </div>
                  )}
                </div>
              ) : (
                /* ── Idle: Amount Input ───────────────────────────────────── */
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-2 block uppercase tracking-wide">Withdraw Amount</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₹</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={wdAmount}
                          onChange={e => setWdAmount(e.target.value)}
                          placeholder="Enter withdrawal amount"
                          min={500}
                          max={Math.min(25000, balance)}
                          className="w-full h-12 pl-8 pr-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-semibold"
                        />
                      </div>
                      <button
                        onClick={() => setWdAmount(String(Math.min(balance, 25000)))}
                        className="h-12 px-4 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors whitespace-nowrap"
                        disabled={balance === 0}
                      >
                        Withdraw All
                      </button>
                    </div>
                    {wdAmount && !isNaN(amtNum) && (
                      <div className="mt-1.5 flex gap-2 text-xs">
                        {amtNum < 500 && <span className="text-red-500">Minimum is ₹500</span>}
                        {amtNum > 25000 && <span className="text-red-500">Maximum is ₹25,000 per request</span>}
                        {amtNum > balance && amtNum <= 25000 && <span className="text-red-500">Exceeds available balance</span>}
                        {amtValid && <span className="text-green-600 font-medium">✓ Valid amount</span>}
                      </div>
                    )}
                  </div>

                  {!upiId && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-700">Please add your UPI ID above before withdrawing.</p>
                    </div>
                  )}

                  {balance === 0 && (
                    <div className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                      <AlertCircle className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-500">Your withdrawable balance is ₹0. Balance is credited by the admin based on your commissions.</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Shield className="w-3.5 h-3.5" />
                    <span>OTP verification required to process withdrawal</span>
                  </div>

                  <button
                    onClick={handleSendWithdrawalOtp}
                    disabled={!amtValid || !upiId || wdStep === "sending"}
                    className="w-full h-12 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                  >
                    {wdStep === "sending" ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Sending OTP…</>
                    ) : (
                      <><Send className="w-4 h-4" />Withdraw {wdAmount && amtValid ? fmtRs(amtNum) : ""}</>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Withdrawal History ─────────────────────────────────────────── */}
        {wdData && wdData.history.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-bold text-gray-900">Withdrawal History</h2>
              <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-semibold">{wdData.history.length}</span>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Header */}
              <div className="hidden sm:grid grid-cols-[1fr_90px_120px_110px_100px] gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                <span>Request ID</span>
                <span className="text-right">Amount</span>
                <span>Date</span>
                <span>Status</span>
                <span>Completed</span>
              </div>
              {wdData.history.map((w, i) => (
                <div key={w.requestId} className={`flex flex-col sm:grid sm:grid-cols-[1fr_90px_120px_110px_100px] gap-1 sm:gap-3 px-4 py-3.5 sm:items-center border-b border-gray-50 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
                  <div>
                    <span className="font-mono text-xs font-bold text-gray-700">{w.requestId}</span>
                    <p className="text-xs text-gray-400 font-mono sm:hidden">{w.upiId}</p>
                  </div>
                  <div className="text-right sm:text-right">
                    <span className="text-sm font-black text-gray-900">{fmtRs(w.amount)}</span>
                  </div>
                  <span className="text-xs text-gray-500">{fmtDate(w.createdAt)}</span>
                  <StatusBadge status={w.status} />
                  <span className="text-xs text-gray-500">{w.completedAt ? fmtDate(w.completedAt) : "—"}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── My code - signups table ─────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              Signups via <span className="font-mono text-blue-600">{member.code}</span>
            </h2>
            <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-semibold">{signups.length} total</span>
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
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="hidden sm:grid grid-cols-[28px_1fr_100px_110px_70px_80px] gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                <span>#</span>
                <span>Email</span>
                <span>Signup Date</span>
                <span>Plan</span>
                <span className="text-center">Comm %</span>
                <span className="text-right">Earned</span>
              </div>
              {signups.map((s, i) => {
                const priceNum = parseFloat(String(s.planPrice).replace(/[^0-9.]/g, "")) || 0;
                const comm = member.commission_percentage ?? 0;
                const earned = Math.round((priceNum * comm) / 100);
                const status = subscriptionStatus(s.subscriptionEndDate);
                return (
                  <div key={i} className={`flex flex-col sm:grid sm:grid-cols-[28px_1fr_100px_110px_70px_80px] gap-1 sm:gap-2 px-4 py-3 sm:items-center text-sm border-b border-gray-50 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                    <span className="text-xs font-bold text-gray-300 hidden sm:block">{i + 1}</span>
                    <div className="flex items-center justify-between sm:block">
                      <span className="text-xs text-gray-700 font-medium truncate">{s.email || "—"}</span>
                      <span className={`sm:hidden text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${status === "active" ? "bg-green-100 text-green-700" : status === "lifetime" ? "bg-purple-100 text-purple-700" : "bg-red-100 text-red-600"}`}>{status}</span>
                    </div>
                    <span className="text-xs text-gray-500 sm:block">{fmtDate(s.signedUpAt)}</span>
                    <span className="text-xs font-semibold text-gray-800 truncate">{s.planName || "—"}</span>
                    <div className="flex justify-start sm:justify-center">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[11px] font-bold rounded-full">{comm > 0 ? `${comm}%` : "—"}</span>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className={`text-xs font-bold ${earned > 0 ? "text-green-600" : "text-gray-400"}`}>{earned > 0 ? `₹${earned.toLocaleString("en-IN")}` : "—"}</span>
                    </div>
                  </div>
                );
              })}
              {member.commission_percentage != null && member.commission_percentage > 0 && (
                <div className="hidden sm:grid grid-cols-[28px_1fr_100px_110px_70px_80px] gap-2 px-4 py-3 bg-green-50 border-t border-green-100">
                  <span />
                  <span className="text-xs font-bold text-green-700 col-span-4">Total Commission Earned</span>
                  <span className="text-right text-xs font-black text-green-700">
                    ₹{Math.round(signups.reduce((sum, s) => {
                      const p = parseFloat(String(s.planPrice).replace(/[^0-9.]/g, "")) || 0;
                      return sum + (p * (member.commission_percentage ?? 0)) / 100;
                    }, 0)).toLocaleString("en-IN")}
                  </span>
                </div>
              )}
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
