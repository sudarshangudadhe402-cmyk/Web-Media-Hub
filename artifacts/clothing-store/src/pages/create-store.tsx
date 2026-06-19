import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  ChevronRight, Eye, EyeOff, Sparkles, ArrowLeft, Star,
  Mail, Lock, Store, Phone, CheckCircle, Shield, Lock as LockIcon,
} from "lucide-react";
import PricingOverlay, { SelectedPlan } from "@/components/pricing-overlay";

const SPAM_DOMAINS = [
  "mailinator.com","guerrillamail.com","10minutemail.com","tempmail.com",
  "throwam.com","yopmail.com","sharklasers.com","trashmail.com",
  "fakeinbox.com","dispostable.com","maildrop.cc","spamgourmet.com",
  "spam4.me","getairmail.com","discard.email","mailnull.com",
  "mytemp.email","mohmal.com","bccto.me","getnada.com",
];

function isSpamEmail(email: string) {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return SPAM_DOMAINS.some((d) => domain === d || domain.endsWith("." + d));
}

function isValidWhatsApp(num: string) {
  if (num.length !== 10) return false;
  if (/^(\d)\1{9}$/.test(num)) return false;
  if (num === "0000000000") return false;
  return true;
}

const formSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .refine((e) => !isSpamEmail(e), "Spam/temporary emails are not allowed"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
  storeName: z
    .string()
    .min(2, "Store name must be at least 2 characters")
    .max(60, "Store name too long"),
  whatsapp: z
    .string()
    .length(10, "Enter exactly 10 digits")
    .regex(/^\d{10}$/, "Only digits allowed")
    .refine(isValidWhatsApp, "Enter a real WhatsApp number (no repeated/all-zero digits)"),
});

type FormValues = z.infer<typeof formSchema>;

function getPasswordStrength(pw: string): { level: 0 | 1 | 2 | 3; label: string } {
  if (!pw) return { level: 0, label: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw) || pw.length >= 12) score++;
  if (score <= 1) return { level: 1, label: "Weak" };
  if (score === 2) return { level: 2, label: "Medium" };
  return { level: 3, label: "Strong" };
}

const GOLD = "#D4A017";
const GOLD_BG = "#F5A623";
const BG = "#FAF6EE";
const BORDER = "#E8E0D0";
const HINT = "#9A9485";
const LABEL = "#1A1A1A";

export default function CreateStore() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "", storeName: "", whatsapp: "" },
    mode: "onChange",
  });

  const { formState: { errors } } = form;
  const password = form.watch("password");
  const storeName = form.watch("storeName");
  const strength = getPasswordStrength(password);
  const storeNameOk = (storeName ?? "").length >= 2 && !errors.storeName;
  const formReady = form.formState.isValid && !!selectedPlan;

  async function onSubmit(values: FormValues) {
    if (!selectedPlan) { setShowPricing(true); return; }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/store-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          storeName: values.storeName,
          whatsappNumber: values.whatsapp,
          plan: selectedPlan.name,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Something went wrong");
      }
      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (showPricing) {
    return (
      <PricingOverlay
        onBack={() => setShowPricing(false)}
        onSelectPlan={(plan) => {
          setSelectedPlan(plan);
          setShowPricing(false);
        }}
      />
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: BG }}>
        <DecorativeRings />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-xl p-10 text-center z-10"
          style={{ border: `1px solid ${BORDER}` }}
        >
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-9 h-9 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: LABEL }}>Request Submitted!</h2>
          <p className="text-sm mb-6" style={{ color: HINT }}>
            Your store request has been sent successfully. Our team will review and get back to you soon.
          </p>
          <button
            onClick={() => setLocation("/login")}
            className="w-full font-bold text-white py-4 rounded-2xl text-base"
            style={{ background: LABEL }}
          >
            Back to Login
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: BG }}>
      <DecorativeRings />

      {/* Top Bar */}
      <div
        className="relative z-20 flex items-center justify-between px-5 py-4"
        style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(250,246,238,0.95)" }}
      >
        <button
          onClick={() => setLocation("/login")}
          className="flex items-center gap-1.5 text-sm font-semibold hover:opacity-70 transition-opacity"
          style={{ color: LABEL }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: LABEL }}>
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-sm tracking-widest" style={{ color: LABEL }}>WEB MEDIA HUB</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex items-start justify-center px-4 py-8 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <div
            className="bg-white rounded-3xl overflow-hidden"
            style={{ boxShadow: "0 12px 48px rgba(0,0,0,0.10)", border: `1px solid ${BORDER}` }}
          >
            {/* Card Header */}
            <div className="px-7 pt-8 pb-6 text-center">
              {/* Logo icon */}
              <div
                className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                style={{ background: LABEL }}
              >
                <Sparkles className="w-8 h-8 text-white" />
              </div>

              {/* Brand name */}
              <p className="font-extrabold text-base tracking-widest mb-0.5" style={{ color: GOLD }}>
                WEB MEDIA HUB
              </p>
              <p className="text-xs mb-4" style={{ color: HINT }}>Your Store. Your Brand. Your Success.</p>

              {/* Heading */}
              <h1
                className="text-3xl font-black mb-2"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  color: LABEL,
                  letterSpacing: "-0.01em",
                }}
              >
                Create Your Store
              </h1>

              {/* Decorative divider */}
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="h-px flex-1" style={{ background: `linear-gradient(to right, transparent, ${GOLD})` }} />
                <span style={{ color: GOLD, fontSize: "14px" }}>◆</span>
                <div className="h-px flex-1" style={{ background: `linear-gradient(to left, transparent, ${GOLD})` }} />
              </div>

              <p className="text-sm mb-4" style={{ color: HINT }}>Fill in your details to get started</p>

              {/* Trusted badge */}
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-xs font-semibold" style={{ borderColor: BORDER, color: "#7A6A4A" }}>
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                Trusted by Fashion Stores
              </div>
            </div>

            {/* Form */}
            <form onSubmit={form.handleSubmit(onSubmit)} className="px-7 pb-8 space-y-5">

              {/* Email */}
              <FieldRow icon={<Mail className="w-4 h-4" style={{ color: HINT }} />} label="Email ID" error={errors.email?.message}>
                <input
                  type="email"
                  placeholder="yourname@gmail.com"
                  autoComplete="email"
                  {...form.register("email")}
                  className="flex-1 outline-none text-sm font-medium bg-transparent"
                  style={{ color: LABEL }}
                />
              </FieldRow>

              {/* Password */}
              <div className="space-y-1.5">
                <FieldRow icon={<Lock className="w-4 h-4" style={{ color: HINT }} />} label="Password" error={errors.password?.message}>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••"
                    autoComplete="new-password"
                    {...form.register("password")}
                    className="flex-1 outline-none text-sm font-medium bg-transparent"
                    style={{ color: LABEL }}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((p) => !p)}
                    className="shrink-0 hover:opacity-60 transition-opacity"
                    style={{ color: HINT }}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </FieldRow>
                {/* Strength bar */}
                {password.length > 0 && (
                  <div className="flex items-center gap-2 pt-0.5">
                    <div className="flex gap-1 flex-1">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-1.5 flex-1 rounded-full transition-all duration-300"
                          style={{
                            background: i <= strength.level
                              ? strength.level === 1 ? "#E53E3E"
                                : strength.level === 2 ? "#F5A623"
                                : "#38A169"
                              : "#E8E0D0",
                          }}
                        />
                      ))}
                    </div>
                    <span
                      className="text-xs font-semibold shrink-0"
                      style={{
                        color: strength.level === 1 ? "#E53E3E" : strength.level === 2 ? "#F5A623" : "#38A169",
                      }}
                    >
                      {strength.label}
                    </span>
                  </div>
                )}
                {!errors.password && (
                  <p className="text-xs" style={{ color: HINT }}>Min 8 characters, 1 uppercase letter, 1 number</p>
                )}
              </div>

              {/* Store Name */}
              <div className="space-y-1.5">
                <FieldRow icon={<Store className="w-4 h-4" style={{ color: HINT }} />} label="Store Name" error={errors.storeName?.message}>
                  <input
                    type="text"
                    placeholder="e.g. Sid Fashion House"
                    {...form.register("storeName")}
                    className="flex-1 outline-none text-sm font-medium bg-transparent"
                    style={{ color: LABEL }}
                  />
                </FieldRow>
                <AnimatePresence>
                  {storeNameOk && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-1.5 text-xs font-semibold"
                      style={{ color: "#38A169" }}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Store name available
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* WhatsApp */}
              <div className="space-y-1.5">
                <label className="block text-sm font-bold" style={{ color: LABEL }}>Store Owner WhatsApp Number</label>
                <div className="flex items-center gap-3">
                  {/* Icon box */}
                  <div
                    className="w-11 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ border: `1.5px solid ${BORDER}`, background: "#F7F3EC" }}
                  >
                    <Phone className="w-4 h-4" style={{ color: HINT }} />
                  </div>
                  {/* Input group */}
                  <div
                    className="flex flex-1 items-center rounded-xl overflow-hidden"
                    style={{ border: `1.5px solid ${BORDER}`, height: "48px" }}
                  >
                    <div
                      className="flex items-center gap-1 px-3 shrink-0 h-full font-bold text-sm"
                      style={{
                        background: "#F0EBE1",
                        borderRight: `1.5px solid ${BORDER}`,
                        color: LABEL,
                        minWidth: "62px",
                      }}
                    >
                      +91
                      <ChevronRight className="w-3 h-3 rotate-90" style={{ color: HINT }} />
                    </div>
                    <input
                      type="tel"
                      placeholder="0000000000"
                      maxLength={10}
                      {...form.register("whatsapp")}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                        form.setValue("whatsapp", val, { shouldValidate: true });
                      }}
                      className="flex-1 outline-none px-3 text-sm font-medium bg-white"
                      style={{ color: LABEL, letterSpacing: "0.04em" }}
                    />
                  </div>
                </div>
                {errors.whatsapp ? (
                  <p className="text-xs font-medium" style={{ color: "#E53E3E" }}>{errors.whatsapp.message}</p>
                ) : (
                  <p className="text-xs" style={{ color: HINT }}>
                    Enter 10-digit mobile number (repeated digits like 9999999999 not allowed)
                  </p>
                )}
              </div>

              {/* Choose Plan button */}
              <div className="space-y-2 pt-1">
                <motion.button
                  type="button"
                  onClick={() => setShowPricing(true)}
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full flex items-center justify-between text-white"
                  style={{
                    height: "58px",
                    borderRadius: "16px",
                    padding: "0 20px",
                    background: `linear-gradient(135deg, ${GOLD_BG}, #E8940A)`,
                    boxShadow: "0 4px 20px rgba(212,160,23,0.40)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                      <Star className="w-4 h-4 fill-white text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-sm leading-tight">
                        {selectedPlan ? `${selectedPlan.name} Selected` : "Choose Your Plan"}
                      </p>
                      <p className="text-xs text-white/80 leading-tight">
                        {selectedPlan ? selectedPlan.tagline : "Basic  •  Pro  •  Elite"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/80" />
                </motion.button>
              </div>

              {/* Error */}
              <AnimatePresence>
                {submitError && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded-xl px-4 py-3 text-sm font-medium"
                    style={{ background: "#FEF2F2", color: "#C53030", border: "1px solid #FED7D7" }}
                  >
                    {submitError}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Create Store button */}
              <motion.button
                type="submit"
                disabled={!formReady || submitting}
                whileHover={formReady ? { scale: 1.015 } : {}}
                whileTap={formReady ? { scale: 0.97 } : {}}
                className="w-full flex items-center justify-center gap-2 font-bold text-white"
                style={{
                  height: "58px",
                  borderRadius: "16px",
                  background: formReady ? LABEL : "#C5BFB5",
                  fontSize: "16px",
                  cursor: formReady ? "pointer" : "not-allowed",
                  boxShadow: formReady ? "0 4px 20px rgba(0,0,0,0.20)" : "none",
                  transition: "all 0.2s",
                }}
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Create Store
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>

              {!formReady && !submitting && (
                <p className="text-center text-xs" style={{ color: "#BBAA99" }}>
                  {!selectedPlan ? "Choose a plan to continue" : "Fill all fields to continue"}
                </p>
              )}

              {/* Footer */}
              <div className="pt-2 text-center space-y-1.5">
                <div className="flex items-center justify-center gap-1.5 text-xs" style={{ color: HINT }}>
                  <LockIcon className="w-3 h-3" />
                  Your data is secure with us
                </div>
                <p className="text-xs" style={{ color: HINT }}>
                  By continuing, you agree to our{" "}
                  <span className="underline cursor-pointer" style={{ color: GOLD }}>Terms & Privacy Policy</span>
                </p>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function FieldRow({
  icon, label, error, children,
}: {
  icon: React.ReactNode;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-bold" style={{ color: LABEL }}>{label}</label>
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ border: `1.5px solid ${BORDER}`, background: "#F7F3EC" }}
        >
          {icon}
        </div>
        <div
          className="flex flex-1 items-center rounded-xl px-4 gap-2"
          style={{ border: `1.5px solid ${BORDER}`, height: "48px", background: "#FDFCF9" }}
        >
          {children}
        </div>
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs font-medium"
          style={{ color: "#E53E3E" }}
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}

function DecorativeRings() {
  return (
    <>
      <svg
        className="fixed top-0 right-0 pointer-events-none"
        width="220" height="220"
        viewBox="0 0 220 220"
        fill="none"
        style={{ zIndex: 0 }}
      >
        <circle cx="180" cy="40" r="90" stroke={GOLD} strokeWidth="1.5" opacity="0.25" />
        <circle cx="180" cy="40" r="65" stroke={GOLD} strokeWidth="1" opacity="0.18" />
        <circle cx="200" cy="20" r="40" stroke={GOLD} strokeWidth="0.8" opacity="0.12" />
      </svg>
      <svg
        className="fixed bottom-0 left-0 pointer-events-none"
        width="200" height="200"
        viewBox="0 0 200 200"
        fill="none"
        style={{ zIndex: 0 }}
      >
        <circle cx="20" cy="180" r="80" stroke={GOLD} strokeWidth="1.5" opacity="0.20" />
        <circle cx="20" cy="180" r="55" stroke={GOLD} strokeWidth="1" opacity="0.14" />
        <circle cx="5" cy="200" r="35" stroke={GOLD} strokeWidth="0.8" opacity="0.10" />
      </svg>
      <svg
        className="fixed top-1/2 left-4 pointer-events-none"
        width="30" height="30"
        viewBox="0 0 30 30"
        fill="none"
        style={{ zIndex: 0 }}
      >
        <circle cx="15" cy="15" r="12" stroke={GOLD} strokeWidth="1.2" opacity="0.25" />
      </svg>
    </>
  );
}
