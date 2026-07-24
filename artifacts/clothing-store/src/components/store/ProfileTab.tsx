import { MapPin, Clock, CalendarDays, ShoppingBag, Phone, User, LogOut, Loader2, AlertCircle, Eye, EyeOff, Mail, CheckCircle2, Navigation } from "lucide-react";
import { useState } from "react";

interface StoreData {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  whatsappNumber: string | null;
  openingTime: string | null;
  openDays: string | null;
  bannerImage: string | null;
  description: string | null;
  publicSlug: string;
}

export interface CustomerAccountInfo {
  id: string;
  name: string;
  email: string;
  cart: string[];
  createdAt: string;
}

interface ProfileTabProps {
  data: StoreData;
  customerAccount: CustomerAccountInfo | null;
  onSignUp: (name: string, email: string, password: string, otp: string) => Promise<void>;
  onSignIn: (email: string, password: string, otp: string) => Promise<void>;
  onLogout: () => void;
  onSendOtp: (name: string, email: string, password: string, purpose: "signup" | "signin") => Promise<void>;
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
  const [accountSectionOpen, setAccountSectionOpen] = useState(false);

  // Signup form
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [showSuPwd, setShowSuPwd] = useState(false);
  const [suOtpSent, setSuOtpSent] = useState(false);
  const [suOtp, setSuOtp] = useState("");

  // Signin form
  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");
  const [showSiPwd, setShowSiPwd] = useState(false);
  const [siOtpSent, setSiOtpSent] = useState(false);
  const [siOtp, setSiOtp] = useState("");

  // Resend countdown
  const [resendCountdown, setResendCountdown] = useState(0);

  const openDaySet = new Set((data.openDays ?? "").split(",").map((d) => d.trim()).filter(Boolean));

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const isValidName = (n: string) => /^[a-zA-Z\u0900-\u097F\s'-]+$/.test(n.trim()) && n.trim().length >= 2;
  const isValidPassword = (p: string) => /^\d{6,20}$/.test(p);

  const suFormValid = isValidName(suName) && isValidEmail(suEmail) && isValidPassword(suPassword);
  const siFormValid = isValidEmail(siEmail) && isValidPassword(siPassword);

  const suNameError = suName.length > 0 && !isValidName(suName)
    ? /\d/.test(suName) ? "Name me numbers allowed nahi hain"
    : /[^\w\s'-\u0900-\u097F]/.test(suName) ? "Name me special characters ya emojis allowed nahi hain"
    : suName.trim().length < 2 ? "Name kam se kam 2 characters ka hona chahiye"
    : ""
    : "";

  const suPasswordError = suPassword.length > 0 && !isValidPassword(suPassword)
    ? /[^0-9]/.test(suPassword) ? "Password me sirf numbers allowed hain (letters/symbols nahi)"
    : suPassword.length < 6 ? "Password kam se kam 6 numbers ka hona chahiye"
    : suPassword.length > 20 ? "Password zyada se zyada 20 numbers ka ho sakta hai"
    : ""
    : "";

  const siPasswordError = siPassword.length > 0 && !isValidPassword(siPassword)
    ? /[^0-9]/.test(siPassword) ? "Password me sirf numbers allowed hain"
    : siPassword.length < 6 ? "Password kam se kam 6 numbers ka hona chahiye"
    : ""
    : "";

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
    const name = purpose === "signup" ? suName : "";
    const email = purpose === "signup" ? suEmail : siEmail;
    const password = purpose === "signup" ? suPassword : siPassword;
    await onSendOtp(name, email, password, purpose);
    if (purpose === "signup") setSuOtpSent(true);
    else setSiOtpSent(true);
    startResendTimer();
  }

  async function handleVerify(purpose: "signup" | "signin") {
    if (purpose === "signup") {
      await onSignUp(suName, suEmail, suPassword, suOtp);
    } else {
      await onSignIn(siEmail, siPassword, siOtp);
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
                  {customerAccount.name}
                </p>
                <p className="text-white/50 text-xs mt-0.5">{customerAccount.email}</p>
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
          </div>
        ) : !accountSectionOpen ? (
          /* Collapsed — just a "Create account" button */
          <button
            onClick={() => setAccountSectionOpen(true)}
            className="w-full flex items-center justify-center gap-2 font-bold py-3.5 rounded-2xl text-sm transition-all"
            style={{ background: "#16a34a", color: "#ffffff", fontFamily: "'Montserrat', sans-serif", boxShadow: "0 2px 12px rgba(22,163,74,0.25)" }}
          >
            <User className="w-4 h-4" />
            Create Account
          </button>
        ) : (
          /* Sign up / Sign in card */
          <div className="rounded-2xl overflow-hidden" style={{ background: "#ffffff", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div className="px-4 pt-3 pb-0 border-b" style={{ borderColor: "#f0f0f0" }}>
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-gray-900" />
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Store Account</p>
              </div>
              <p className="text-xs text-gray-400 pb-3">Create an account to manage your bookings — verified by email OTP</p>
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
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input
                          type="text"
                          value={suName}
                          onChange={e => {
                            const val = e.target.value;
                            const filtered = val.replace(/[0-9\u0660-\u0669\u06F0-\u06F9]/g, "");
                            setSuName(filtered);
                          }}
                          placeholder="Apna pura naam likhein"
                          className="w-full rounded-xl pl-9 pr-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none border"
                          style={{ borderColor: suNameError ? "#ef4444" : "#e8e8e8" }}
                        />
                      </div>
                      {suNameError ? (
                        <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">⚠ {suNameError}</p>
                      ) : (
                        <p className="text-[10px] text-gray-400 mt-1">Sirf asli naam (numbers ya special characters nahi)</p>
                      )}
                    </div>
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
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Password</label>
                      <div className="relative">
                        <input
                          type={showSuPwd ? "text" : "password"}
                          inputMode="numeric"
                          value={suPassword}
                          onChange={e => {
                            const filtered = e.target.value.replace(/[^0-9]/g, "").slice(0, 20);
                            setSuPassword(filtered);
                          }}
                          placeholder="Sirf numbers (min 6 digits)"
                          className="w-full rounded-xl px-3 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-300 focus:outline-none border"
                          style={{ borderColor: suPasswordError ? "#ef4444" : "#e8e8e8" }}
                        />
                        <button type="button" onClick={() => setShowSuPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                          {showSuPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {suPasswordError ? (
                        <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">⚠ {suPasswordError}</p>
                      ) : (
                        <p className="text-[10px] text-gray-400 mt-1">Sirf numbers allowed — letters ya symbols nahi (6-20 digits)</p>
                      )}
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
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Password</label>
                      <div className="relative">
                        <input
                          type={showSiPwd ? "text" : "password"}
                          inputMode="numeric"
                          value={siPassword}
                          onChange={e => {
                            const filtered = e.target.value.replace(/[^0-9]/g, "").slice(0, 20);
                            setSiPassword(filtered);
                          }}
                          placeholder="Apna number password likhein"
                          className="w-full rounded-xl px-3 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-300 focus:outline-none border"
                          style={{ borderColor: siPasswordError ? "#ef4444" : "#e8e8e8" }}
                        />
                        <button type="button" onClick={() => setShowSiPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                          {showSiPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {siPasswordError && (
                        <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">⚠ {siPasswordError}</p>
                      )}
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
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        <div className="rounded-2xl overflow-hidden" style={{ background: "#ffffff", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: "#f0f0f0" }}>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Store Info</p>
          </div>
          <div className="divide-y" style={{ borderColor: "#f5f5f5" }}>
            {data.openingTime && (
              <div className="flex items-start gap-3 px-4 py-3.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "#f5f5f5" }}>
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
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Open Days</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {[["Sun","Sunday"],["Mon","Monday"],["Tue","Tuesday"],["Wed","Wednesday"],["Thu","Thursday"],["Fri","Friday"],["Sat","Saturday"]].map(([short, full]) => (
                      <span key={short} className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: openDaySet.has(full) ? "#22c55e" : "#f5f5f5", color: openDaySet.has(full) ? "#fff" : "#ccc" }}>
                        {short}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {data.whatsappNumber && waLink && (
              <div className="flex items-start gap-3 px-4 py-3.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "#f5f5f5" }}>
                  <Phone className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">WhatsApp</p>
                  <a href={waLink} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-green-600">{data.whatsappNumber}</a>
                </div>
              </div>
            )}
          </div>
        </div>

        {data.description && (
          <div className="rounded-2xl overflow-hidden" style={{ background: "#ffffff", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: "#f0f0f0" }}>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">About</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-sm text-gray-700 leading-relaxed">{data.description}</p>
            </div>
          </div>
        )}

        <div className="rounded-2xl overflow-hidden" style={{ background: "#ffffff", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: "#f0f0f0" }}>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Store Address</p>
          </div>
          <div className="px-4 py-3 flex items-center gap-3">
            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <p className="text-sm text-gray-600 leading-relaxed flex-1">{data.address || "No address set"}</p>
            {(data.latitude && data.longitude) || data.address ? (
              <button
                onClick={() => {
                  if (data.latitude && data.longitude) {
                    // Get user's current location and open navigation
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          const origin = `${pos.coords.latitude},${pos.coords.longitude}`;
                          const dest = `${data.latitude},${data.longitude}`;
                          window.open(
                            `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=driving`,
                            "_blank"
                          );
                        },
                        () => {
                          // GPS denied — open maps with just the destination
                          window.open(
                            `https://www.google.com/maps/dir/?api=1&destination=${data.latitude},${data.longitude}&travelmode=driving`,
                            "_blank"
                          );
                        },
                        { enableHighAccuracy: true, timeout: 8000 }
                      );
                    } else {
                      window.open(
                        `https://www.google.com/maps/dir/?api=1&destination=${data.latitude},${data.longitude}&travelmode=driving`,
                        "_blank"
                      );
                    }
                  } else if (data.address) {
                    // No coordinates — search by address
                    window.open(
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.address)}`,
                      "_blank"
                    );
                  }
                }}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white flex-shrink-0 active:scale-95 transition-transform"
                style={{ background: "#22c55e" }}
              >
                <Navigation className="w-4 h-4" /> Open in Google Maps
              </button>
            ) : null}
          </div>
          {data.latitude !== null && data.longitude !== null && (
            <div className="px-3 pb-3 rounded-2xl overflow-hidden" style={{ height: 176 }}>
              <iframe
                key={`${data.latitude}-${data.longitude}`}
                src={`https://maps.google.com/maps?q=${data.latitude},${data.longitude}&t=m&z=15&ie=UTF8&iwloc=&output=embed`}
                width="100%"
                height="100%"
                style={{ border: 0, display: "block", borderRadius: 16 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Store Location"
              />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
