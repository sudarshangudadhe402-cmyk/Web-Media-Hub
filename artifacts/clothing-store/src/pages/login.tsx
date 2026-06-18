import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, EyeOff, Store, Tag, TrendingUp, ShieldCheck,
  Zap, Headphones, BarChart3, AlertTriangle,
  Package, Users, ShoppingBag, Layers,
  Shirt, Star, CheckCircle,
} from "lucide-react";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" },
  }),
};

const features = [
  { icon: Store, title: "Build Your Store", desc: "Set up your professional clothing store within minutes." },
  { icon: Tag, title: "List & Manage Products", desc: "Add products, manage stock, and grow your online business." },
  { icon: TrendingUp, title: "Grow Your Business", desc: "Reach more customers and increase sales faster." },
];

const trustBadges = [
  { icon: ShieldCheck, label: "Secure & Reliable" },
  { icon: Zap, label: "Easy to Use" },
  { icon: Headphones, label: "24/7 Support" },
  { icon: BarChart3, label: "Scalable for Growth" },
];

const dashStats = [
  { icon: ShoppingBag, label: "Orders", value: "1,284", color: "#5B2C6F" },
  { icon: Users, label: "Customers", value: "3,920", color: "#2E86C1" },
  { icon: BarChart3, label: "Sales", value: "₹2.4L", color: "#1E8449" },
  { icon: Package, label: "Products", value: "847", color: "#D35400" },
];

const phoneItems = ["Silk Kurta", "Lehenga", "Anarkali", "Saree", "Blazer", "Palazzo"];

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

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
        const isLocked = res.status === 429 || msg.toLowerCase().includes("locked");
        if (isLocked && data?.lockedUntil) setLockoutUntil(data.lockedUntil);
        toast({
          variant: "destructive",
          title: isLocked ? "Account Locked" : msg.toLowerCase().includes("not-active") ? "Account Inactive" : "Login Failed",
          description: msg,
          duration: isLocked ? 8000 : 4000,
        });
        return;
      }
      if (data.user?.role === "super_admin") {
        toast({ variant: "destructive", title: "Access Denied", description: "Super admins must use the Super Admin portal." });
        return;
      }
      setLockoutUntil(null);
      login(data.token);
      toast({ title: "Welcome back! 🎉" });
      setLocation("/");
    } catch {
      toast({ variant: "destructive", title: "Connection Error", description: "Could not reach the server." });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "linear-gradient(135deg, #FAF7F5 0%, #FFFFFF 100%)" }}
    >
      {/* ── LEFT SECTION (55%) ── */}
      <div className="hidden lg:flex flex-col w-[55%] relative overflow-hidden">

        {/* Background luxury image layer */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(2px) brightness(0.35)",
          }}
        />
        <div className="absolute inset-0 z-0" style={{ background: "linear-gradient(135deg, rgba(250,247,245,0.92) 0%, rgba(91,44,111,0.15) 100%)" }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full px-12 py-10">

          {/* Logo */}
          <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show" className="flex items-center gap-3 mb-auto">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#5B2C6F" }}>
              <Shirt className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm tracking-widest" style={{ color: "#111111" }}>WEB MEDIA HUB</p>
              <p className="text-[10px] tracking-[0.25em] font-medium" style={{ color: "#5B2C6F" }}>STORE • STYLE • SUCCESS</p>
            </div>
          </motion.div>

          {/* Headline */}
          <div className="mt-10 mb-8">
            <motion.h1
              custom={1} variants={fadeUp} initial="hidden" animate="show"
              className="text-5xl xl:text-6xl leading-[1.1] font-bold mb-5"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#111111" }}
            >
              Your Store.<br />
              Your Style.<br />
              <span style={{ color: "#5B2C6F" }}>Limitless</span><br />
              Possibilities.
            </motion.h1>
            <motion.p custom={2} variants={fadeUp} initial="hidden" animate="show"
              className="text-base leading-relaxed max-w-sm" style={{ color: "#555555" }}>
              Create your own online clothing store,<br />
              list your products, and reach customers everywhere.
            </motion.p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                custom={3 + i} variants={fadeUp} initial="hidden" animate="show"
                whileHover={{ y: -4, boxShadow: "0 12px 32px rgba(91,44,111,0.12)" }}
                className="rounded-2xl p-4 cursor-default transition-all duration-300"
                style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)", border: "1px solid rgba(91,44,111,0.1)" }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(91,44,111,0.1)" }}>
                  <f.icon className="w-4 h-4" style={{ color: "#5B2C6F" }} />
                </div>
                <p className="font-semibold text-xs mb-1" style={{ color: "#111111" }}>{f.title}</p>
                <p className="text-[11px] leading-relaxed" style={{ color: "#777777" }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Dashboard Mockup */}
          <motion.div
            custom={6} variants={fadeUp} initial="hidden" animate="show"
            className="mb-6 relative"
          >
            <motion.div
              whileHover={{ y: -2 }}
              className="rounded-3xl p-5 relative"
              style={{
                background: "rgba(255,255,255,0.9)",
                backdropFilter: "blur(16px)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
                borderRadius: "24px",
                border: "1px solid rgba(255,255,255,0.9)",
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <p className="text-xs font-semibold" style={{ color: "#5B2C6F" }}>Admin Dashboard</p>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {dashStats.map((s) => (
                  <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: `${s.color}10` }}>
                    <s.icon className="w-4 h-4 mx-auto mb-1" style={{ color: s.color }} />
                    <p className="text-base font-bold" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-[10px] font-medium" style={{ color: "#888" }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Mini chart bars */}
              <div className="mt-4 flex items-end gap-1 h-10">
                {[40, 65, 45, 80, 60, 90, 55, 75, 85, 70, 95, 60].map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: 0.8 + i * 0.05, duration: 0.4 }}
                    className="flex-1 rounded-sm"
                    style={{ background: i % 2 === 0 ? "#5B2C6F" : "#D7BDE2", opacity: 0.7 }}
                  />
                ))}
              </div>

              {/* Floating phone mockup */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="absolute -right-6 -bottom-8 w-28 rounded-2xl overflow-hidden"
                style={{
                  background: "#111",
                  padding: "8px",
                  boxShadow: "0 16px 40px rgba(0,0,0,0.25)",
                  border: "2px solid #333",
                }}
              >
                <div className="w-8 h-1.5 rounded-full mx-auto mb-2" style={{ background: "#333" }} />
                <div className="space-y-1.5">
                  {phoneItems.slice(0, 4).map((item, i) => (
                    <div key={i} className="rounded-lg p-1.5 flex items-center gap-1.5" style={{ background: i % 2 === 0 ? "#5B2C6F22" : "#ffffff12" }}>
                      <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ background: "#5B2C6F" }}>
                        <Shirt className="w-2.5 h-2.5 text-white" />
                      </div>
                      <p className="text-[8px] text-white truncate">{item}</p>
                    </div>
                  ))}
                </div>
                <div className="w-8 h-1 rounded-full mx-auto mt-2" style={{ background: "#555" }} />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Virtual Try-On Card */}
          <motion.div
            custom={7} variants={fadeUp} initial="hidden" animate="show"
            whileHover={{ y: -3 }}
            className="mb-8 rounded-3xl p-4 flex items-center gap-4 transition-all duration-300"
            style={{
              background: "rgba(255,255,255,0.88)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(91,44,111,0.12)",
              borderRadius: "24px",
              boxShadow: "0 8px 24px rgba(91,44,111,0.06)",
            }}
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#5B2C6F,#8E44AD)" }}>
              <Layers className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm mb-0.5" style={{ color: "#111111", fontFamily: "'Playfair Display', serif" }}>Virtual Try-On</p>
              <p className="text-xs leading-relaxed" style={{ color: "#666" }}>Let your customers try products before buying using AI Virtual Try-On.</p>
            </div>
            <div className="flex gap-1 shrink-0">
              {["#5B2C6F", "#8E44AD", "#D7BDE2"].map((c, i) => (
                <div key={i} className="w-7 h-7 rounded-full border-2 border-white" style={{ background: c }} />
              ))}
            </div>
          </motion.div>

          {/* Trust Bar */}
          <motion.div custom={8} variants={fadeUp} initial="hidden" animate="show" className="grid grid-cols-4 gap-2 mt-auto">
            {trustBadges.map((t) => (
              <div key={t.label} className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl"
                style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)", border: "1px solid rgba(91,44,111,0.08)" }}>
                <t.icon className="w-4 h-4" style={{ color: "#5B2C6F" }} />
                <p className="text-[10px] font-medium text-center leading-tight" style={{ color: "#333" }}>{t.label}</p>
              </div>
            ))}
          </motion.div>

        </div>
      </div>

      {/* ── RIGHT SECTION (45%) ── */}
      <div className="flex-1 lg:w-[45%] flex items-center justify-center p-6 lg:p-10 relative overflow-y-auto">

        {/* Mobile logo */}
        <div className="absolute top-6 left-6 flex items-center gap-2 lg:hidden">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#5B2C6F" }}>
            <Shirt className="w-4 h-4 text-white" />
          </div>
          <p className="font-bold text-sm tracking-widest" style={{ color: "#111111" }}>WEB MEDIA HUB</p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-[520px]"
          style={{
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(20px)",
            borderRadius: "32px",
            boxShadow: "0 25px 70px rgba(0,0,0,0.12)",
            border: "1px solid rgba(91,44,111,0.08)",
            overflow: "hidden",
          }}
        >
          {/* Card Header */}
          <div className="px-8 pt-10 pb-6 text-center">
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#5B2C6F,#8E44AD)", boxShadow: "0 8px 24px rgba(91,44,111,0.3)" }}
            >
              <ShoppingBag className="w-8 h-8 text-white" />
            </motion.div>
            <h2
              className="text-3xl font-bold mb-2"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#111111" }}
            >
              Welcome to<br />
              <span style={{ color: "#5B2C6F" }}>Web Media Hub</span>
            </h2>
            <p className="text-sm" style={{ color: "#777" }}>
              Create your store and start selling<br />your fashion products online.
            </p>
          </div>

          <div className="px-8 pb-8">
            {/* Lockout warning */}
            <AnimatePresence>
              {isCurrentlyLocked && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="mb-4 flex items-start gap-2 rounded-xl p-3 text-sm"
                  style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626" }}
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Account locked for <strong>{remainingLockout}</strong>. Too many failed attempts.</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold" style={{ color: "#333" }}>Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="admin@example.com"
                    autoComplete="email"
                    disabled={isLoading || isCurrentlyLocked}
                    {...form.register("email")}
                    className="w-full outline-none transition-all duration-300 text-sm"
                    style={{
                      height: "60px",
                      borderRadius: "16px",
                      border: "1.5px solid #E5E7EB",
                      padding: "0 20px",
                      fontSize: "15px",
                      background: "#FAFAFA",
                      color: "#111",
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "#5B2C6F"; e.target.style.boxShadow = "0 0 0 4px rgba(91,44,111,0.08)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#E5E7EB"; e.target.style.boxShadow = "none"; }}
                  />
                </div>
                {form.formState.errors.email && (
                  <p className="text-xs" style={{ color: "#DC2626" }}>{form.formState.errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold" style={{ color: "#333" }}>Password</label>
                  <button type="button" className="text-xs font-medium hover:underline transition-all" style={{ color: "#5B2C6F" }}>
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={isLoading || isCurrentlyLocked}
                    {...form.register("password")}
                    className="w-full outline-none transition-all duration-300 text-sm"
                    style={{
                      height: "60px",
                      borderRadius: "16px",
                      border: "1.5px solid #E5E7EB",
                      padding: "0 52px 0 20px",
                      fontSize: "15px",
                      background: "#FAFAFA",
                      color: "#111",
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "#5B2C6F"; e.target.style.boxShadow = "0 0 0 4px rgba(91,44,111,0.08)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#E5E7EB"; e.target.style.boxShadow = "none"; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    tabIndex={-1}
                    className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: "#999" }}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-xs" style={{ color: "#DC2626" }}>{form.formState.errors.password.message}</p>
                )}
              </div>

              {/* Remember Me */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rememberMe"
                  {...form.register("rememberMe")}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: "#5B2C6F" }}
                />
                <label htmlFor="rememberMe" className="text-sm" style={{ color: "#555" }}>Remember me</label>
              </div>

              {/* Primary Button */}
              <motion.button
                type="submit"
                disabled={isLoading || isCurrentlyLocked}
                whileHover={!isLoading && !isCurrentlyLocked ? { scale: 1.02, boxShadow: "0 12px 32px rgba(91,44,111,0.35)" } : {}}
                whileTap={!isLoading && !isCurrentlyLocked ? { scale: 0.98 } : {}}
                className="w-full flex items-center justify-center gap-2 font-semibold text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  height: "60px",
                  borderRadius: "16px",
                  background: isCurrentlyLocked ? "#999" : "linear-gradient(135deg, #5B2C6F, #8E44AD)",
                  fontSize: "16px",
                  boxShadow: "0 8px 24px rgba(91,44,111,0.25)",
                }}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : isCurrentlyLocked ? (
                  <>🔒 Locked — wait {remainingLockout}</>
                ) : (
                  <><Store className="w-5 h-5" /> Store Login</>
                )}
              </motion.button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px" style={{ background: "#E5E7EB" }} />
                <span className="text-xs font-medium" style={{ color: "#AAA" }}>OR</span>
                <div className="flex-1 h-px" style={{ background: "#E5E7EB" }} />
              </div>

              {/* Secondary Button */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.02, background: "rgba(91,44,111,0.04)" }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 font-semibold transition-all duration-300"
                style={{
                  height: "60px",
                  borderRadius: "16px",
                  background: "white",
                  border: "2px solid #5B2C6F",
                  color: "#5B2C6F",
                  fontSize: "15px",
                }}
              >
                <Star className="w-4 h-4" />
                Create Your Store
              </motion.button>
            </form>

            {/* Store Showcase */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
              className="mt-6 relative overflow-hidden group cursor-pointer"
              style={{ borderRadius: "24px" }}
            >
              <motion.div
                whileHover={{ scale: 1.03 }}
                transition={{ duration: 0.4 }}
                className="relative overflow-hidden"
                style={{ borderRadius: "24px", height: "140px" }}
              >
                <img
                  src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80"
                  alt="Clothing Store"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(91,44,111,0.75) 0%, rgba(0,0,0,0.1) 60%)" }} />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>WEB MEDIA HUB</p>
                    <p className="text-white/70 text-xs">Premium Fashion Store</p>
                  </div>
                  <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2 py-1">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    <span className="text-white text-[10px] font-medium">Live Store</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            <p className="text-center text-xs mt-5" style={{ color: "#AAA" }}>
              By logging in, you agree to our Terms of Service & Privacy Policy.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
