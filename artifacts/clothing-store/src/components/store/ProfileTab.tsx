import { MapPin, Clock, CalendarDays, MessageCircle, ShoppingBag, Phone, Star, Shield, User, LogOut, Loader2, AlertCircle, Eye, EyeOff, Mail, CheckCircle2 } from "lucide-react";
import { useState } from "react";

interface StoreData {
  id: string;
  name: string;
  address: string | null;
  whatsappNumber: string | null;
  openingTime: string | null;
  openDays: string | null;
  bannerImage: string | null;
  description: string | null;
  publicSlug: string;
}

export interface CustomerAccountInfo {
  id: string;
  mobileNumber: string;
  password: string;
  createdAt: string;
}

interface ProfileTabProps {
  data: StoreData;
  customerAccount: CustomerAccountInfo | null;
  onSignUp: (email: string, mobile: string, password: string, otp: string) => Promise<void>;
  onSignIn: (email: string, mobile: string, password: string, otp: string) => Promise<void>;
  onLogout: () => void;
  onSendOtp: (email: string, mobile: string, password: string, purpose: "signup" | "signin") => Promise<void>;
  signUpLoading: boolean;
  signInLoading: boolean;
  otpLoading: boolean;
  signUpError: string | null;
  signInError: string | null;
  otpError: string | null;
}

export default function ProfileTab({
  data,
  customerAccount,
  onSignUp,
  onSignIn,
  onLogout,
  onSendOtp,
  signUpLoading,
  signInLoading,
  otpLoading,
  signUpError,
  signInError,
  otpError,
}: ProfileTabProps) {
  const waLink = data.whatsappNumber
    ? `https://wa.me/${data.whatsappNumber.replace(/\D/g, "")}`
    : null;

  const [accountTab, setAccountTab] = useState<"signup" | "signin">("signup");

  // Signup form
  const [suEmail, setSuEmail] = useState("");
  const [suMobile, setSuMobile] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [showSuPwd, setShowSuPwd] = useState(false);
  const [suOtpSent, setSuOtpSent] = useState(false);
  const [suOtp, setSuOtp] = useState("");

  // Signin form
  const [siEmail, setSiEmail] = useState("");
  const [siMobile, setSiMobile] = useState("");
  const [siPassword, setSiPassword] = useState("");
  const [showSiPwd, setShowSiPwd] = useState(false);
  const [siOtpSent, setSiOtpSent] = useState(false);
  const [siOtp, setSiOtp] = useState("");

  // Resend countdown
  const [resendCountdown, setResendCountdown] = useState(0);

  const DAY_FULL: Record<string, string> = {
    Sun: "Sunday", Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday",
    Thu: "Thursday", Fri: "Friday", Sat: "Saturday",
  };
  const openDaySet = new Set((data.openDays ?? "").split(",").map((d) => d.trim()).filter(Boolean));

  const isValidMobile = (m: string) => /^\d{10}$/.test(m) && !/^(\d)\1{9}$/.test(m);
  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const suFormValid = isValidEmail(suEmail) && isValidMobile(suMobile) && /^\d{10}$/.test(suPassword);
  const siFormValid = isValidEmail(siEmail) && isValidMobile(siMobile) && /^\d{10}$/.test(siPassword);

  function startResendTimer() {
    setResendCountdown(30);
    const t = setInterval(() => {
      setResendCountdown(prev => {
        if (prev <= 1) { clearInterval(t); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSendOtp(purpose: "signup" | "signin") {
    const email = purpose === "signup" ? suEmail : siEmail;
    const mobile = purpose === "signup" ? suMobile : siMobile;
    const password = purpose === "signup" ? suPassword : siPassword;
    await onSendOtp(email, mobile, password, purpose);
    if (purpose === "signup") setSuOtpSent(true);
    else setSiOtpSent(true);
    startResendTimer();
  }

  async function handleVerify(purpose: "signup" | "signin") {
    if (purpose === "signup") {
      await onSignUp(suEmail, suMobile, suPassword, suOtp);
    } else {
      await onSignIn(siEmail, siMobile, siPassword, siOtp);
    }
  }

  function switchTab(tab: "signup" | "signin") {
    setAccountTab(tab);
    setSuOtpSent(false); setSuOtp(""); setSiOtpSent(false); setSiOtp("");
    setResendCountdown(0);
  }

  const activeError = accountTab === "signup" ? (signUpError || otpError) : (signInError || otpError);

  return (
    <div className="flex-1 overflow-y-auto pb-24" style={{ background: "#f8f8f8" }}>

      {/* ── ACCOUNT SECTION ── */}
      <div className="px-4 pt-4 mb-4">
        {customerAccount ? (
          /* Logged-in account card */
          <div className="rounded-2xl overflow-hidden" style={{ background: "#000000", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
            <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <User className="w-4 h-4 text-white" />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-white/40">My Account</p>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg"
                style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}
              >
                <LogOut className="w-3 h-3" />
                Logout
              </button>
            </div>
            <div className="px-4 py-3 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)" }}>
                <User className="w-6 h-6 text-white/70" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-black text-base" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  {customerAccount.mobileNumber}
                </p>
                <p className="text-white/40 text-xs mt-0.5">
                  Member since {new Date(customerAccount.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <div className="flex-shrink-0">
                <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: "rgba(34,197,94,0.2)", color: "#4ade80" }}>
                  ✓ Active
                </span>
              </div>
            </div>
            <div className="px-4 pb-3">
              <div className="rounded-xl px-3 py-2 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.05)" }}>
                <span className="text-lg">🎫</span>
                <p className="text-xs text-white/60">Your loyalty card uses this account's number and password</p>
              </div>
            </div>
          </div>
        ) : (
          /* Sign up / Sign in card */
          <div className="rounded-2xl overflow-hidden" style={{ background: "#ffffff", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div className="px-4 pt-3 pb-0 border-b" style={{ borderColor: "#f0f0f0" }}>
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-gray-900" />
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Store Account</p>
              </div>
              <p className="text-xs text-gray-400 pb-3">Create an account to access your loyalty card — verified by email OTP</p>
              {/* tab switcher */}
              <div className="relative rounded-xl p-0.5 mb-0" style={{ background: "#f5f5f5" }}>
                <div
                  className="absolute top-0.5 bottom-0.5 rounded-[10px]"
                  style={{
                    width: "calc(50% - 2px)",
                    left: accountTab === "signup" ? "2px" : "calc(50%)",
                    background: "#000000",
                    transition: "left 0.3s cubic-bezier(0.4,0,0.2,1)",
                  }}
                />
                <div className="relative flex">
                  <button onClick={() => switchTab("signup")} className="flex-1 py-2.5 text-xs font-bold z-10 rounded-[10px]" style={{ color: accountTab === "signup" ? "#fff" : "rgba(0,0,0,0.4)", fontFamily: "'Montserrat', sans-serif" }}>
                    Sign Up
                  </button>
                  <button onClick={() => switchTab("signin")} className="flex-1 py-2.5 text-xs font-bold z-10 rounded-[10px]" style={{ color: accountTab === "signin" ? "#fff" : "rgba(0,0,0,0.4)", fontFamily: "'Montserrat', sans-serif" }}>
                    Sign In
                  </button>
                </div>
              </div>
            </div>

            <div className="px-4 py-4 space-y-3">
              {activeError && (
                <div className="flex items-start gap-2 rounded-xl px-3 py-2.5" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                  <p className="text-xs text-red-500">{activeError}</p>
                </div>
              )}

              {accountTab === "signup" ? (
                !suOtpSent ? (
                  /* Signup Step 1 — fill details */
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input
                          type="email"
                          inputMode="email"
                          value={suEmail}
                          onChange={e => setSuEmail(e.target.value.trim())}
                          placeholder="your@email.com"
                          className="w-full rounded-xl pl-9 pr-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none border"
                          style={{ borderColor: "#e8e8e8" }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">OTP will be sent to this email</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Mobile Number</label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={suMobile}
                        onChange={e => setSuMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="10-digit mobile number"
                        className="w-full rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none border"
                        style={{ borderColor: "#e8e8e8" }}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Password</label>
                      <div className="relative">
                        <input
                          type={showSuPwd ? "text" : "password"}
                          inputMode="numeric"
                          maxLength={10}
                          value={suPassword}
                          onChange={e => setSuPassword(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          placeholder="10-digit numeric password"
                          className="w-full rounded-xl px-3 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-300 focus:outline-none border"
                          style={{ borderColor: "#e8e8e8" }}
                        />
                        <button type="button" onClick={() => setShowSuPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                          {showSuPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">Must be exactly 10 digits</p>
                    </div>
                    <button
                      onClick={() => handleSendOtp("signup")}
                      disabled={!suFormValid || otpLoading}
                      className="w-full font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all"
                      style={{ background: suFormValid && !otpLoading ? "#000000" : "#e5e7eb", color: suFormValid && !otpLoading ? "white" : "#9ca3af", fontFamily: "'Montserrat', sans-serif" }}
                    >
                      {otpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                      {otpLoading ? "Sending OTP..." : "Send OTP to Email"}
                    </button>
                  </>
                ) : (
                  /* Signup Step 2 — enter OTP */
                  <>
                    <div className="rounded-xl px-4 py-3 flex items-start gap-3" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-green-700">OTP sent!</p>
                        <p className="text-xs text-green-600 mt-0.5">Check your inbox at <strong>{suEmail}</strong></p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Enter 6-Digit OTP</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={suOtp}
                        onChange={e => setSuOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="- - - - - -"
                        className="w-full rounded-xl px-3 py-3 text-center text-xl font-black tracking-[0.5em] text-gray-900 placeholder-gray-200 focus:outline-none border"
                        style={{ borderColor: suOtp.length === 6 ? "#000" : "#e8e8e8", fontFamily: "monospace" }}
                      />
                      <p className="text-[10px] text-gray-400 mt-1">Valid for 10 minutes</p>
                    </div>
                    <button
                      onClick={() => handleVerify("signup")}
                      disabled={suOtp.length !== 6 || signUpLoading}
                      className="w-full font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all"
                      style={{ background: suOtp.length === 6 && !signUpLoading ? "#000000" : "#e5e7eb", color: suOtp.length === 6 && !signUpLoading ? "white" : "#9ca3af", fontFamily: "'Montserrat', sans-serif" }}
                    >
                      {signUpLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Verify & Create Account
                    </button>
                    <button
                      onClick={() => { setSuOtpSent(false); setSuOtp(""); }}
                      className="w-full text-xs text-gray-400 underline text-center py-1"
                    >
                      ← Change details
                    </button>
                    <div className="text-center">
                      {resendCountdown > 0 ? (
                        <p className="text-xs text-gray-400">Resend OTP in {resendCountdown}s</p>
                      ) : (
                        <button
                          onClick={() => handleSendOtp("signup")}
                          disabled={otpLoading}
                          className="text-xs font-bold text-gray-800 underline"
                        >
                          Resend OTP
                        </button>
                      )}
                    </div>
                  </>
                )
              ) : (
                !siOtpSent ? (
                  /* Signin Step 1 — fill details */
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input
                          type="email"
                          inputMode="email"
                          value={siEmail}
                          onChange={e => setSiEmail(e.target.value.trim())}
                          placeholder="your@email.com"
                          className="w-full rounded-xl pl-9 pr-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none border"
                          style={{ borderColor: "#e8e8e8" }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Mobile Number</label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={siMobile}
                        onChange={e => setSiMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="10-digit mobile number"
                        className="w-full rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none border"
                        style={{ borderColor: "#e8e8e8" }}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Password</label>
                      <div className="relative">
                        <input
                          type={showSiPwd ? "text" : "password"}
                          inputMode="numeric"
                          maxLength={10}
                          value={siPassword}
                          onChange={e => setSiPassword(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          placeholder="10-digit numeric password"
                          className="w-full rounded-xl px-3 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-300 focus:outline-none border"
                          style={{ borderColor: "#e8e8e8" }}
                        />
                        <button type="button" onClick={() => setShowSiPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                          {showSiPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSendOtp("signin")}
                      disabled={!siFormValid || otpLoading}
                      className="w-full font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all"
                      style={{ background: siFormValid && !otpLoading ? "#000000" : "#e5e7eb", color: siFormValid && !otpLoading ? "white" : "#9ca3af", fontFamily: "'Montserrat', sans-serif" }}
                    >
                      {otpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                      {otpLoading ? "Sending OTP..." : "Send OTP to Email"}
                    </button>
                  </>
                ) : (
                  /* Signin Step 2 — enter OTP */
                  <>
                    <div className="rounded-xl px-4 py-3 flex items-start gap-3" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-green-700">OTP sent!</p>
                        <p className="text-xs text-green-600 mt-0.5">Check your inbox at <strong>{siEmail}</strong></p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Enter 6-Digit OTP</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={siOtp}
                        onChange={e => setSiOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="- - - - - -"
                        className="w-full rounded-xl px-3 py-3 text-center text-xl font-black tracking-[0.5em] text-gray-900 placeholder-gray-200 focus:outline-none border"
                        style={{ borderColor: siOtp.length === 6 ? "#000" : "#e8e8e8", fontFamily: "monospace" }}
                      />
                      <p className="text-[10px] text-gray-400 mt-1">Valid for 10 minutes</p>
                    </div>
                    <button
                      onClick={() => handleVerify("signin")}
                      disabled={siOtp.length !== 6 || signInLoading}
                      className="w-full font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all"
                      style={{ background: siOtp.length === 6 && !signInLoading ? "#000000" : "#e5e7eb", color: siOtp.length === 6 && !signInLoading ? "white" : "#9ca3af", fontFamily: "'Montserrat', sans-serif" }}
                    >
                      {signInLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Verify & Sign In
                    </button>
                    <button
                      onClick={() => { setSiOtpSent(false); setSiOtp(""); }}
                      className="w-full text-xs text-gray-400 underline text-center py-1"
                    >
                      ← Change details
                    </button>
                    <div className="text-center">
                      {resendCountdown > 0 ? (
                        <p className="text-xs text-gray-400">Resend OTP in {resendCountdown}s</p>
                      ) : (
                        <button
                          onClick={() => handleSendOtp("signin")}
                          disabled={otpLoading}
                          className="text-xs font-bold text-gray-800 underline"
                        >
                          Resend OTP
                        </button>
                      )}
                    </div>
                  </>
                )
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── STORE DETAILS ── */}
      <div className="relative w-full" style={{ height: 180, background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)" }}>
        {data.bannerImage ? (
          <img src={data.bannerImage} alt={data.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-16 h-16 text-white/10" />
          </div>
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)" }} />
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-white font-black text-2xl leading-tight" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            {data.name}
          </h1>
          {data.publicSlug && (
            <p className="text-white/60 text-xs mt-0.5">@{data.publicSlug}</p>
          )}
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        <div className="rounded-2xl overflow-hidden" style={{ background: "#ffffff", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: "#f0f0f0" }}>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Store Info</p>
          </div>
          <div className="divide-y" style={{ borderColor: "#f5f5f5" }}>
            {data.address && (
              <div className="flex items-start gap-3 px-4 py-3.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "#f5f5f5" }}>
                  <MapPin className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Address</p>
                  <p className="text-sm text-gray-800 font-medium leading-snug">{data.address}</p>
                </div>
              </div>
            )}
            {data.openingTime && (
              <div className="flex items-start gap-3 px-4 py-3.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#f5f5f5" }}>
                  <Clock className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Timings</p>
                  <p className="text-sm text-gray-800 font-medium">{data.openingTime}</p>
                </div>
              </div>
            )}
            {data.openDays && (
              <div className="flex items-start gap-3 px-4 py-3.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "#f5f5f5" }}>
                  <CalendarDays className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Open Days</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((abbr) => {
                      const isOpen = openDaySet.has(DAY_FULL[abbr]);
                      return (
                        <span key={abbr} className="text-[10px] font-bold px-2 py-1 rounded-lg"
                          style={isOpen ? { background: "#000000", color: "white" } : { background: "#f0f0f0", color: "#d0d0d0" }}>
                          {abbr}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            {data.whatsappNumber && (
              <div className="flex items-start gap-3 px-4 py-3.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#f5f5f5" }}>
                  <Phone className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">WhatsApp</p>
                  <p className="text-sm text-gray-800 font-medium">{data.whatsappNumber}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {data.description && (
          <div className="rounded-2xl p-4" style={{ background: "#ffffff", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">About Store</p>
            <p className="text-sm text-gray-600 leading-relaxed">{data.description}</p>
          </div>
        )}

        <div className="rounded-2xl p-4" style={{ background: "#ffffff", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Why Shop With Us</p>
          <div className="space-y-3">
            {[
              { icon: "🪞", title: "Virtual Try-On", desc: "See how clothes look on you before booking" },
              { icon: "🎫", title: "Loyalty Card", desc: "Earn rewards on every purchase" },
              { icon: "⚡", title: "Easy Booking", desc: "Book in seconds, pay at store" },
              { icon: "📱", title: "Digital Catalog", desc: "Browse full collection anytime, anywhere" },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex items-center gap-3">
                <span className="text-xl">{icon}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{title}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: "#000000" }}>
          <div className="flex flex-col items-center">
            <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
            <p className="text-white font-black text-xl">4.8</p>
            <p className="text-white/50 text-[10px]">Rating</p>
          </div>
          <div className="w-px h-12 bg-white/10" />
          <div className="flex-1">
            <p className="text-white font-bold text-sm">Trusted Store</p>
            <p className="text-white/50 text-xs mt-0.5">Powered by Web Media Hub</p>
          </div>
          <Shield className="w-8 h-8 text-white/20" />
        </div>

        {waLink && (
          <a href={waLink} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl font-bold text-sm"
            style={{ background: "#25D366", color: "white", fontFamily: "'Montserrat', sans-serif" }}>
            <MessageCircle className="w-5 h-5" />
            Chat on WhatsApp
          </a>
        )}

        <p className="text-center text-xs text-gray-300 pb-2">
          Powered by <span className="font-bold text-gray-400">Web Media Hub</span>
        </p>
      </div>
    </div>
  );
}
