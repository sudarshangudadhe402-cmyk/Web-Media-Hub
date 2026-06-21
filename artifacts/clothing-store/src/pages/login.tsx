import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, Lock, Store, ShieldCheck, Zap, Headphones,
  BarChart3, AlertTriangle, Eye, EyeOff, TrendingUp,
  Tag, ArrowRight, Layers, Sparkles, RefreshCw, CheckCircle2, X,
} from "lucide-react";

/* ── Hanger SVG (exact outline style from image) ── */
const HangerSVG = ({ size = 36, color = "currentColor", strokeWidth = 1.6 }: { size?: number; color?: string; strokeWidth?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3a1.5 1.5 0 0 1 1.5 1.5c0 .6-.35 1.12-.88 1.38L20.5 17H3.5L11.38 5.88A1.5 1.5 0 0 1 10.5 4.5 1.5 1.5 0 0 1 12 3z" />
    <line x1="2.5" y1="17.5" x2="21.5" y2="17.5" />
  </svg>
);

/* ── Schemas / validation ── */
const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

/* ── Feature bullets ── */
const FEATURES = [
  { Icon: Store, title: "Build Your Store", desc: "Set up your own professional clothing store in minutes." },
  { Icon: Tag, title: "List & Manage Products", desc: "Add your products, manage stock, and grow your business online." },
  { Icon: TrendingUp, title: "Grow Your Business", desc: "Reach more customers and increase your sales." },
];

/* ── Trust bar ── */
const TRUST = [
  { Icon: ShieldCheck, a: "Secure", b: "& Reliable" },
  { Icon: Zap, a: "Easy", b: "to Use" },
  { Icon: Headphones, a: "24/7", b: "Support" },
  { Icon: BarChart3, a: "Scalable", b: "for Growth" },
];

/* ── Dashboard mock orders ── */
const ORDERS = [
  { id: "#1042", name: "Ananya Sharma", status: "Shipped", color: "#22C55E" },
  { id: "#1041", name: "Rohan Mehta", status: "Pending", color: "#F59E0B" },
  { id: "#1040", name: "Priya Singh", status: "Delivered", color: "#3B82F6" },
  { id: "#1039", name: "Arjun Patel", status: "Processing", color: "#8B5CF6" },
];

const PHONE_ITEMS = [
  { label: "Silk Kurta", clr: "#E8D5C4" },
  { label: "Lehenga", clr: "#D4B8C7" },
  { label: "Blazer", clr: "#C4C8D4" },
  { label: "Saree", clr: "#D4C4B8" },
  { label: "Anarkali", clr: "#C8D4C4" },
  { label: "Palazzo", clr: "#D4CAB8" },
];

type ForgotStep = "email" | "otp" | "reset" | "done";

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [showCapacityFull, setShowCapacityFull] = useState(false);

  // Forgot password state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotResend, setForgotResend] = useState(0);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    if (forgotResend <= 0) return;
    const t = setTimeout(() => setForgotResend((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [forgotResend]);

  function resetForgot() {
    setForgotOpen(false);
    setForgotStep("email");
    setForgotEmail("");
    setForgotOtp("");
    setForgotNewPassword("");
    setForgotError("");
    setForgotResend(0);
  }

  async function handleForgotSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotEmail.trim()) { setForgotError("Email is required"); return; }
    setForgotLoading(true);
    setForgotError("");
    try {
      const res = await fetch("/api/auth/admin/forgot-password/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setForgotError(data.error || "Failed to send OTP"); return; }
      setForgotStep("otp");
      setForgotOtp("");
      setForgotResend(30);
      toast({ title: "OTP Sent!", description: `Check your email: ${forgotEmail.trim()}` });
    } catch {
      setForgotError("Connection error. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleForgotResend() {
    if (forgotResend > 0) return;
    setForgotLoading(true);
    setForgotError("");
    try {
      const res = await fetch("/api/auth/admin/forgot-password/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setForgotError(data.error || "Failed to resend OTP"); return; }
      setForgotResend(30);
      setForgotOtp("");
      toast({ title: "OTP Resent!" });
    } catch {
      setForgotError("Connection error.");
    } finally {
      setForgotLoading(false);
    }
  }

  function handleForgotVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotOtp || forgotOtp.length !== 6) { setForgotError("Please enter the 6-digit OTP"); return; }
    setForgotError("");
    setForgotStep("reset");
  }

  async function handleForgotReset(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotNewPassword || !/^\d{4,}$/.test(forgotNewPassword)) {
      setForgotError("Password must be numbers only (min 4 digits)"); return;
    }
    setForgotLoading(true);
    setForgotError("");
    try {
      const res = await fetch("/api/auth/admin/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim(), otp: forgotOtp, newPassword: forgotNewPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setForgotError(data.error || "Failed to reset password");
        if (data.error?.includes("OTP")) setForgotStep("otp");
        return;
      }
      setForgotStep("done");
      toast({ title: "Password Reset Successfully!" });
    } catch {
      setForgotError("Connection error.");
    } finally {
      setForgotLoading(false);
    }
  }

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  function getRemainingLockout() {
    if (!lockoutUntil) return "";
    const ms = lockoutUntil - Date.now();
    if (ms <= 0) return "";
    return `${Math.ceil(ms / 60000)} min`;
  }

  const remainingLockout = getRemainingLockout();
  const isCurrentlyLocked = !!remainingLockout;

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    if (isCurrentlyLocked) {
      toast({ variant: "destructive", title: "Account Locked", description: `Wait ${remainingLockout}.` });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email.trim(), password: values.password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg: string = data?.error || "Login failed";
        if (msg === "LOGIN_CAPACITY_FULL") {
          setShowCapacityFull(true);
          return;
        }
        const isLocked = res.status === 429 || msg.toLowerCase().includes("locked");
        const isInactive = msg.toLowerCase().includes("not-active");
        const isInvalidCreds = msg.toLowerCase().includes("invalid credentials");
        const hasAttemptsInfo = msg.toLowerCase().includes("attempt");
        if (isLocked && data?.lockedUntil) setLockoutUntil(data.lockedUntil);
        let displayTitle = "Login Failed";
        let displayDesc = msg;
        if (isLocked) { displayTitle = "Account Locked"; displayDesc = msg; }
        else if (isInactive) { displayTitle = "Account Inactive"; displayDesc = msg; }
        else if (isInvalidCreds && !hasAttemptsInfo) { displayTitle = "Store Not Found"; displayDesc = "Store not exist, please create first 🙏"; }
        else if (isInvalidCreds && hasAttemptsInfo) { displayTitle = "Login Failed"; displayDesc = "Wrong email or password"; }
        toast({ variant: "destructive", title: displayTitle, description: displayDesc, duration: isLocked || isInactive ? 8000 : 4000 });
        return;
      }
      if (data.user?.role === "super_admin") {
        toast({ variant: "destructive", title: "Access Denied", description: "Super admins must use the Super Admin portal." });
        return;
      }
      setLockoutUntil(null);
      login(data.token);
      toast({ title: "Logged in successfully" });
      setLocation("/");
    } catch {
      toast({ variant: "destructive", title: "Connection Error", description: "Could not reach the server." });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col" style={{ minHeight: "100vh", background: "#FAF7F4" }}>

      {/* ══════════════════════════════════════════
          MAIN SPLIT: Left 55% + Right 45%
      ══════════════════════════════════════════ */}
      <div className="flex flex-1">

        {/* ── LEFT SECTION ── */}
        <div className="relative hidden lg:flex flex-col" style={{ width: "55%" }}>

          {/* Boutique background photo */}
          <div
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=85')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          {/* Cream overlay — exact tint from photo */}
          <div
            className="absolute inset-0 z-0"
            style={{ background: "rgba(250,245,238,0.78)" }}
          />

          {/* Content */}
          <div className="relative z-10 flex flex-col h-full px-10 xl:px-14 py-10">

            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="flex items-center gap-2.5 mb-10"
            >
              <HangerSVG size={22} color="#111111" strokeWidth={2} />
              <div>
                <p className="font-bold text-sm leading-none" style={{ color: "#111111", letterSpacing: "0.02em" }}>WEB MEDIA HUB</p>
                <p className="text-[9px] mt-0.5" style={{ color: "#888888", letterSpacing: "0.18em" }}>STORE · STYLE · SUCCESS</p>
              </div>
            </motion.div>

            {/* Headline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.1 }}
              className="mb-5"
            >
              <h1
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "clamp(36px, 4vw, 56px)",
                  lineHeight: 1.08,
                  fontWeight: 700,
                  color: "#111111",
                  marginBottom: 0,
                }}
              >
                Your Store.<br />
                Your Style.<br />
                <span style={{ color: "#7B4FA6" }}>Limitless</span><br />
                <span style={{ color: "#7B4FA6" }}>Possibilities.</span>
              </h1>
            </motion.div>

            {/* Subtext */}
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-8 text-sm leading-relaxed"
              style={{ color: "#333333", maxWidth: "340px" }}
            >
              Create your own online clothing store,<br />
              list your products, and reach<br />
              customers everywhere.
            </motion.p>

            {/* Feature bullets */}
            <div className="space-y-4 mb-8">
              {FEATURES.map(({ Icon, title, desc }, i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.45, delay: 0.25 + i * 0.08 }}
                  className="flex items-start gap-4"
                >
                  <div
                    className="flex items-center justify-center shrink-0 rounded-full"
                    style={{
                      width: "42px", height: "42px",
                      border: "1.5px solid rgba(0,0,0,0.14)",
                      background: "rgba(255,255,255,0.55)",
                      backdropFilter: "blur(4px)",
                    }}
                  >
                    <Icon className="w-4 h-4" style={{ color: "#333333" }} />
                  </div>
                  <div>
                    <p className="font-bold text-sm" style={{ color: "#111111" }}>{title}</p>
                    <p className="text-xs leading-relaxed mt-0.5" style={{ color: "#555555" }}>{desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Dashboard Mockup — Laptop + Phone */}
            <motion.div
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.4 }}
              className="relative mb-6"
              style={{ height: "200px" }}
            >
              {/* Laptop */}
              <div
                className="absolute left-0 bottom-0"
                style={{
                  width: "72%",
                  background: "#FFFFFF",
                  borderRadius: "10px 10px 4px 4px",
                  boxShadow: "0 12px 40px rgba(0,0,0,0.14)",
                  overflow: "hidden",
                  border: "1px solid #E5E7EB",
                }}
              >
                {/* Laptop top bar */}
                <div className="flex items-center gap-1.5 px-3 py-2" style={{ background: "#F3F4F6", borderBottom: "1px solid #E5E7EB" }}>
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <div className="w-2 h-2 rounded-full bg-yellow-400" />
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-[9px] ml-2 font-semibold" style={{ color: "#7B4FA6" }}>Web Media Hub</span>
                </div>
                <div className="flex" style={{ height: "150px" }}>
                  {/* Sidebar */}
                  <div className="flex flex-col gap-1.5 px-2 py-3 shrink-0" style={{ width: "70px", background: "#1C1C2E" }}>
                    <div className="text-[7px] font-bold mb-1" style={{ color: "#7B4FA6" }}>MENU</div>
                    {["Dashboard","Products","Orders","Customers","Settings"].map((item) => (
                      <div key={item} className="text-[7px] py-1 px-1.5 rounded" style={{ color: item === "Dashboard" ? "#FFFFFF" : "#9CA3AF", background: item === "Dashboard" ? "#7B4FA6" : "transparent" }}>
                        {item}
                      </div>
                    ))}
                  </div>
                  {/* Main content */}
                  <div className="flex-1 p-3">
                    <p className="text-[10px] font-bold mb-2" style={{ color: "#111" }}>Dashboard</p>
                    <div className="grid grid-cols-3 gap-1.5 mb-3">
                      {[["₹2.4L","Sales","#7B4FA6"],["1,284","Orders","#2563EB"],["3,920","Users","#16A34A"]].map(([v, l, c]) => (
                        <div key={l} className="rounded p-1.5" style={{ background: `${c}12` }}>
                          <p className="text-[9px] font-bold" style={{ color: c as string }}>{v}</p>
                          <p className="text-[7px]" style={{ color: "#888" }}>{l}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[8px] font-bold mb-1.5" style={{ color: "#333" }}>Recent Orders</p>
                    <div className="space-y-1">
                      {ORDERS.slice(0, 3).map((o) => (
                        <div key={o.id} className="flex items-center justify-between">
                          <span className="text-[7px]" style={{ color: "#555" }}>{o.id} · {o.name}</span>
                          <span className="text-[6px] px-1 py-0.5 rounded-full font-medium" style={{ background: `${o.color}20`, color: o.color }}>{o.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Phone (overlapping right side of laptop) */}
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                className="absolute right-0 bottom-0"
                style={{
                  width: "90px",
                  height: "180px",
                  background: "#111111",
                  borderRadius: "14px",
                  border: "2px solid #333",
                  boxShadow: "0 16px 40px rgba(0,0,0,0.30)",
                  overflow: "hidden",
                  padding: "8px 6px 10px",
                }}
              >
                <div className="w-10 h-1 rounded-full mx-auto mb-2" style={{ background: "#333" }} />
                <p className="text-[8px] font-bold text-center mb-2" style={{ color: "#FFF" }}>New Arrivals</p>
                <div className="grid grid-cols-2 gap-1">
                  {PHONE_ITEMS.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-lg flex items-end justify-center"
                      style={{ height: "46px", background: item.clr }}
                    >
                      <p className="text-[6px] font-medium pb-1" style={{ color: "#333" }}>{item.label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>

            {/* Virtual Try-On Card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex items-center gap-4 rounded-2xl px-4 py-4 mt-auto"
              style={{
                background: "rgba(255,255,255,0.88)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(0,0,0,0.08)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(123,79,166,0.10)", border: "1.5px solid rgba(123,79,166,0.2)" }}
              >
                <Layers className="w-5 h-5" style={{ color: "#7B4FA6" }} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm" style={{ color: "#111111" }}>Virtual Try-On</p>
                <p className="text-xs leading-relaxed" style={{ color: "#666666" }}>
                  Let your customers try before<br />
                  they buy with our advanced<br />
                  Virtual Try-On technology.
                </p>
              </div>
              {/* Fashion model thumbnail */}
              <div
                className="rounded-xl overflow-hidden shrink-0"
                style={{ width: "72px", height: "90px", border: "1px solid #E5E7EB" }}
              >
                <img
                  src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200&q=80"
                  alt="Fashion model"
                  className="w-full h-full object-cover object-top"
                />
              </div>
            </motion.div>

          </div>
        </div>

        {/* ── RIGHT SECTION — Full height white panel ── */}
        <div
          className="flex-1 flex flex-col overflow-y-auto"
          style={{
            background: "#FFFFFF",
            borderLeft: "1px solid #F0EBE5",
          }}
        >
          <div className="flex flex-col flex-1 px-8 xl:px-12 pt-12 pb-8" style={{ maxWidth: "520px", margin: "0 auto", width: "100%" }}>

            {/* Hanger Icon */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="flex justify-center mb-5"
            >
              <HangerSVG size={38} color="#7B4FA6" strokeWidth={1.5} />
            </motion.div>

            {/* Welcome heading */}
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
              className="text-center mb-8"
            >
              <h2
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "clamp(26px, 3vw, 34px)",
                  fontWeight: 700,
                  color: "#111111",
                  lineHeight: 1.2,
                  marginBottom: "10px",
                }}
              >
                Welcome to<br />Web Media Hub
              </h2>
              <p className="text-sm" style={{ color: "#888888", lineHeight: 1.6 }}>
                Create your store and start selling<br />
                your fashion, your way.
              </p>
            </motion.div>

            {/* Lockout banner */}
            <AnimatePresence>
              {isCurrentlyLocked && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="mb-4 flex items-start gap-2 rounded-xl p-3 text-sm"
                  style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626" }}
                >
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Account locked for <strong>{remainingLockout}</strong>. Too many failed attempts.</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* FORM */}
            <motion.form
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.15 }}
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-5"
            >

              {/* Email Address */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold" style={{ color: "#111111" }}>Email Address</label>
                <div className="relative">
                  <Mail
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: "#AAAAAA" }}
                  />
                  <input
                    type="email"
                    placeholder="Enter your email"
                    autoComplete="email"
                    disabled={isLoading || isCurrentlyLocked}
                    {...form.register("email")}
                    className="w-full outline-none transition-all duration-200"
                    style={{
                      height: "52px",
                      borderRadius: "10px",
                      border: "1.5px solid #E5E0DA",
                      paddingLeft: "44px",
                      paddingRight: "16px",
                      fontSize: "14px",
                      color: "#111111",
                      background: "#FAFAF9",
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "#7B4FA6"; e.target.style.background = "#FFF"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#E5E0DA"; e.target.style.background = "#FAFAF9"; }}
                  />
                </div>
                {form.formState.errors.email && (
                  <p className="text-xs" style={{ color: "#DC2626" }}>{form.formState.errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold" style={{ color: "#111111" }}>Password</label>
                <div className="relative">
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: "#AAAAAA" }}
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={isLoading || isCurrentlyLocked}
                    {...form.register("password")}
                    className="w-full outline-none transition-all duration-200"
                    style={{
                      height: "52px",
                      borderRadius: "10px",
                      border: "1.5px solid #E5E0DA",
                      paddingLeft: "44px",
                      paddingRight: "48px",
                      fontSize: "14px",
                      color: "#111111",
                      background: "#FAFAF9",
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "#7B4FA6"; e.target.style.background = "#FFF"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#E5E0DA"; e.target.style.background = "#FAFAF9"; }}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-60"
                    style={{ color: "#AAAAAA" }}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-xs" style={{ color: "#DC2626" }}>{form.formState.errors.password.message}</p>
                )}
                {/* Forgot Password — right aligned, below input */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-xs font-medium hover:underline"
                    style={{ color: "#B05EB0" }}
                    onClick={() => { setForgotOpen(true); setForgotStep("email"); setForgotError(""); }}
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div className="flex items-center gap-2 -mt-1">
                <input
                  type="checkbox"
                  id="rememberMe"
                  {...form.register("rememberMe")}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: "#7B4FA6", cursor: "pointer" }}
                />
                <label htmlFor="rememberMe" className="text-sm cursor-pointer" style={{ color: "#444444" }}>
                  Remember me
                </label>
              </div>

              {/* Store Login button — dark plum */}
              <motion.button
                type="submit"
                disabled={isLoading || isCurrentlyLocked}
                whileHover={!isLoading && !isCurrentlyLocked ? { opacity: 0.92 } : {}}
                whileTap={!isLoading && !isCurrentlyLocked ? { scale: 0.985 } : {}}
                className="w-full flex items-center justify-between font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                style={{
                  height: "54px",
                  borderRadius: "10px",
                  background: isCurrentlyLocked ? "#999" : "#3D1547",
                  paddingLeft: "20px",
                  paddingRight: "20px",
                  fontSize: "15px",
                }}
              >
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4" />
                  <span>
                    {isLoading ? "Logging in..." : isCurrentlyLocked ? `Locked — wait ${remainingLockout}` : "Store Login"}
                  </span>
                </div>
                {!isLoading && !isCurrentlyLocked && <ArrowRight className="w-4 h-4" />}
                {isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              </motion.button>

              {/* OR divider */}
              <div className="text-center">
                <span className="text-sm" style={{ color: "#AAAAAA" }}>OR</span>
              </div>

              {/* Create Your Store — outlined */}
              <motion.button
                type="button"
                onClick={() => setLocation("/create-store")}
                whileHover={{ background: "#FAF7FF" }}
                whileTap={{ scale: 0.985 }}
                className="w-full flex items-center justify-between font-semibold transition-all duration-200"
                style={{
                  height: "54px",
                  borderRadius: "10px",
                  background: "#FFFFFF",
                  border: "1.5px solid #D5C8E0",
                  paddingLeft: "20px",
                  paddingRight: "20px",
                  color: "#3D1547",
                  fontSize: "15px",
                }}
              >
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4" />
                  <span>Create Your Store</span>
                </div>
                <ArrowRight className="w-4 h-4" />
              </motion.button>

              {/* Explore Demo Store */}
              <motion.button
                type="button"
                onClick={() => setLocation("/demo")}
                whileHover={{ scale: 1.01, background: "linear-gradient(135deg,#f5edff,#ede0ff)" }}
                whileTap={{ scale: 0.985 }}
                className="w-full flex items-center justify-between transition-all duration-200"
                style={{
                  height: "50px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg,#FAF5FF,#F3EBFF)",
                  border: "1.5px dashed #C4A0E0",
                  paddingLeft: "18px",
                  paddingRight: "18px",
                  color: "#7B4FA6",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Explore Demo Store</span>
                </div>
                <span className="text-xs font-normal" style={{ color: "#B07FD0" }}>See how it looks →</span>
              </motion.button>

              {/* Rocket tagline */}
              <div className="flex items-start gap-3 py-1">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "#F3EDF8" }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7B4FA6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
                    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
                    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
                    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
                  </svg>
                </div>
                <p className="text-sm pt-1" style={{ color: "#444444", lineHeight: 1.5 }}>
                  Make your store stand out<br />
                  and grow like never before.
                </p>
              </div>

            </motion.form>

            {/* Store exterior image */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-6 relative overflow-hidden rounded-2xl"
              style={{ height: "160px", border: "1px solid #E5E0DA" }}
            >
              <img
                src="https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=700&q=85"
                alt="WEB MEDIA HUB Store"
                className="w-full h-full object-cover"
              />
              {/* Dark overlay */}
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(15,10,30,0.80) 0%, rgba(0,0,0,0.15) 55%)" }} />
              {/* Store name overlay — gold text on dark awning */}
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center py-4">
                <p
                  className="font-bold tracking-widest text-sm"
                  style={{ color: "#D4AF37", letterSpacing: "0.2em" }}
                >
                  WEB MEDIA HUB
                </p>
              </div>
            </motion.div>

          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          BOTTOM TRUST BAR — Full width dark strip
      ══════════════════════════════════════════ */}
      <div
        className="w-full flex items-center justify-around py-4 px-6"
        style={{ background: "#0F0E1A" }}
      >
        {TRUST.map(({ Icon, a, b }) => (
          <div key={a} className="flex flex-col items-center gap-1.5">
            <Icon className="w-5 h-5" style={{ color: "#9CA3AF" }} />
            <div className="text-center">
              <p className="text-[10px] font-medium" style={{ color: "#E5E7EB" }}>{a}</p>
              <p className="text-[10px]" style={{ color: "#9CA3AF" }}>{b}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          FORGOT PASSWORD — Full-screen overlay
      ══════════════════════════════════════════ */}
      <AnimatePresence>
        {forgotOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) resetForgot(); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
              style={{ background: "#fff" }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#F0EBE5" }}>
                <div>
                  <p className="font-bold text-sm" style={{ color: "#111" }}>
                    {forgotStep === "email" && "Forgot Password"}
                    {forgotStep === "otp" && "Enter OTP"}
                    {forgotStep === "reset" && "Set New Password"}
                    {forgotStep === "done" && "Password Reset!"}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#888" }}>
                    {forgotStep === "email" && "Enter your admin email to receive an OTP"}
                    {forgotStep === "otp" && `6-digit code sent to ${forgotEmail}`}
                    {forgotStep === "reset" && "Enter your new password (numbers only)"}
                    {forgotStep === "done" && "You can now login with your new password"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetForgot}
                  className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                  style={{ color: "#888" }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5">
                {/* Step 1 — Email */}
                {forgotStep === "email" && (
                  <form onSubmit={handleForgotSendOtp} className="space-y-4">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#AAA" }} />
                      <input
                        type="email"
                        placeholder="admin@example.com"
                        value={forgotEmail}
                        onChange={(e) => { setForgotEmail(e.target.value); setForgotError(""); }}
                        required
                        autoFocus
                        className="w-full outline-none"
                        style={{
                          height: "48px", borderRadius: "10px", border: "1.5px solid #E5E0DA",
                          paddingLeft: "40px", paddingRight: "14px", fontSize: "14px",
                          color: "#111", background: "#FAFAF9",
                        }}
                        onFocus={(e) => { e.target.style.borderColor = "#7B4FA6"; e.target.style.background = "#FFF"; }}
                        onBlur={(e) => { e.target.style.borderColor = "#E5E0DA"; e.target.style.background = "#FAFAF9"; }}
                      />
                    </div>
                    {forgotError && <p className="text-xs font-medium" style={{ color: "#DC2626" }}>{forgotError}</p>}
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full flex items-center justify-center gap-2 font-semibold text-white disabled:opacity-50"
                      style={{ height: "48px", borderRadius: "10px", background: "#3D1547", fontSize: "14px" }}
                    >
                      {forgotLoading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sending...</> : <><Mail className="w-4 h-4" /> Send OTP</>}
                    </button>
                  </form>
                )}

                {/* Step 2 — OTP */}
                {forgotStep === "otp" && (
                  <form onSubmit={handleForgotVerifyOtp} className="space-y-4">
                    <div className="rounded-xl bg-purple-50 border border-purple-200 px-3 py-3 flex items-start gap-2">
                      <Mail className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-purple-700">OTP sent to <strong>{forgotEmail}</strong>. Check inbox and spam. Valid for 10 minutes.</p>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="_ _ _ _ _ _"
                      maxLength={6}
                      value={forgotOtp}
                      onChange={(e) => { setForgotOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setForgotError(""); }}
                      autoFocus
                      className="w-full outline-none text-center font-bold"
                      style={{
                        height: "56px", borderRadius: "10px", border: "1.5px solid #E5E0DA",
                        fontSize: "22px", letterSpacing: "0.5em", color: "#111", background: "#FAFAF9",
                      }}
                      onFocus={(e) => { e.target.style.borderColor = "#7B4FA6"; e.target.style.background = "#FFF"; }}
                      onBlur={(e) => { e.target.style.borderColor = "#E5E0DA"; e.target.style.background = "#FAFAF9"; }}
                    />
                    {forgotError && <p className="text-xs font-medium" style={{ color: "#DC2626" }}>{forgotError}</p>}
                    <div className="text-center text-xs" style={{ color: "#888" }}>
                      {forgotResend > 0
                        ? <span>Resend OTP in {forgotResend}s</span>
                        : <button type="button" onClick={handleForgotResend} disabled={forgotLoading} className="font-medium underline underline-offset-2" style={{ color: "#7B4FA6" }}>Resend OTP</button>
                      }
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => { setForgotStep("email"); setForgotError(""); }}
                        className="flex-1 font-semibold"
                        style={{ height: "46px", borderRadius: "10px", border: "1.5px solid #E5E0DA", fontSize: "14px", color: "#444" }}
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={forgotLoading || forgotOtp.length !== 6}
                        className="flex-1 font-semibold text-white disabled:opacity-50"
                        style={{ height: "46px", borderRadius: "10px", background: "#3D1547", fontSize: "14px" }}
                      >
                        Verify OTP
                      </button>
                    </div>
                  </form>
                )}

                {/* Step 3 — New Password */}
                {forgotStep === "reset" && (
                  <form onSubmit={handleForgotReset} className="space-y-4">
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#AAA" }} />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        inputMode="numeric"
                        placeholder="New password (numbers only)"
                        value={forgotNewPassword}
                        onChange={(e) => { setForgotNewPassword(e.target.value.replace(/\D/g, "")); setForgotError(""); }}
                        required
                        autoFocus
                        className="w-full outline-none"
                        style={{
                          height: "48px", borderRadius: "10px", border: "1.5px solid #E5E0DA",
                          paddingLeft: "40px", paddingRight: "40px", fontSize: "14px",
                          color: "#111", background: "#FAFAF9",
                        }}
                        onFocus={(e) => { e.target.style.borderColor = "#7B4FA6"; e.target.style.background = "#FFF"; }}
                        onBlur={(e) => { e.target.style.borderColor = "#E5E0DA"; e.target.style.background = "#FAFAF9"; }}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowNewPassword((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: "#AAA" }}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs" style={{ color: "#888" }}>Only numbers allowed, minimum 4 digits</p>
                    {forgotError && <p className="text-xs font-medium" style={{ color: "#DC2626" }}>{forgotError}</p>}
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => { setForgotStep("otp"); setForgotError(""); }}
                        className="flex-1 font-semibold"
                        style={{ height: "46px", borderRadius: "10px", border: "1.5px solid #E5E0DA", fontSize: "14px", color: "#444" }}
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={forgotLoading || forgotNewPassword.length < 4}
                        className="flex-1 font-semibold text-white disabled:opacity-50"
                        style={{ height: "46px", borderRadius: "10px", background: "#3D1547", fontSize: "14px" }}
                      >
                        {forgotLoading ? <span className="flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" />Saving...</span> : "Reset Password"}
                      </button>
                    </div>
                  </form>
                )}

                {/* Step 4 — Done */}
                {forgotStep === "done" && (
                  <div className="space-y-4 text-center">
                    <div className="flex justify-center">
                      <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-base" style={{ color: "#111" }}>Password Reset Successfully!</p>
                      <p className="text-sm mt-1" style={{ color: "#666" }}>You can now login with your new password.</p>
                    </div>
                    <button
                      type="button"
                      onClick={resetForgot}
                      className="w-full font-semibold text-white"
                      style={{ height: "48px", borderRadius: "10px", background: "#3D1547", fontSize: "14px" }}
                    >
                      Go to Login
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Login Capacity Full Popup ── */}
      <AnimatePresence>
        {showCapacityFull && (
          <>
            <motion.div
              key="cap-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCapacityFull(false)}
              className="fixed inset-0 z-50"
              style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            />
            <motion.div
              key="cap-modal"
              initial={{ opacity: 0, scale: 0.88, y: 32 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 32 }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-5"
              style={{ pointerEvents: "none" }}
            >
              <div
                className="w-full max-w-sm rounded-2xl p-6 flex flex-col items-center gap-4 shadow-2xl"
                style={{ background: "#fff", pointerEvents: "auto" }}
              >
                {/* Icon */}
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#FEF2F2" }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>

                {/* Text */}
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-bold text-gray-900">Login Capacity Full</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    All login slots for your plan are in use.<br />
                    Please <span className="font-semibold text-red-600">logout from an old device</span> first, then try again.
                  </p>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setShowCapacityFull(false)}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: "#DC2626" }}
                >
                  OK, Got It
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
