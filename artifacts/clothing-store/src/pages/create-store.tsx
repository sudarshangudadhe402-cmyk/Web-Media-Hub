import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  Store, ChevronRight, CheckCircle2, Circle,
  Mail, Lock, ShoppingBag, Phone, Eye, EyeOff,
  Sparkles, ArrowLeft, BadgeCheck,
} from "lucide-react";
import PricingOverlay, { SelectedPlan } from "@/components/pricing-overlay";

// ── Spam email domains blocklist ──
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
  if (/^(\d)\1{9}$/.test(num)) return false; // all same digit
  if (num === "0000000000") return false;
  return true;
}

// ── Zod schema for step 1 ──
const step1Schema = z.object({
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

type Step1Values = z.infer<typeof step1Schema>;

const STEPS = ["Your Information", "Store Setup", "Final Review"];

const fadeSlide = {
  hidden: (dir: number) => ({ opacity: 0, x: dir * 40 }),
  show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit: (dir: number) => ({ opacity: 0, x: dir * -40, transition: { duration: 0.3 } }),
};

export default function CreateStore() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | null>(null);
  const [step1Data, setStep1Data] = useState<Step1Values | null>(null);

  const form = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: { email: "", password: "", storeName: "", whatsapp: "" },
    mode: "onChange",
  });

  const { formState: { errors, isValid } } = form;
  const step1Ready = isValid && !!selectedPlan;

  function goToStep(next: number) {
    setDirection(next > currentStep ? 1 : -1);
    setCurrentStep(next);
  }

  function onStep1Continue(values: Step1Values) {
    setStep1Data(values);
    goToStep(1);
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

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(135deg, #FAF7F5 0%, #F3EEF8 50%, #FFFFFF 100%)" }}
    >
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-purple-100 bg-white/70 backdrop-blur-sm sticky top-0 z-10">
        <button
          onClick={() => setLocation("/login")}
          className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-purple-700"
          style={{ color: "#5B2C6F" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#5B2C6F" }}>
            <Store className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-sm tracking-widest" style={{ color: "#111" }}>WEB MEDIA HUB</span>
        </div>
      </div>

      {/* ── Step Indicator ── */}
      <div className="flex items-center justify-center gap-0 py-8 px-4">
        {STEPS.map((label, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <motion.div
                  animate={{
                    background: done ? "#1E8449" : active ? "#5B2C6F" : "#E5E7EB",
                    scale: active ? 1.1 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                  className="w-9 h-9 rounded-full flex items-center justify-center shadow-sm"
                >
                  {done ? (
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  ) : active ? (
                    <span className="text-white text-sm font-bold">{i + 1}</span>
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400" />
                  )}
                </motion.div>
                <span
                  className="text-[11px] font-medium hidden sm:block"
                  style={{ color: active ? "#5B2C6F" : done ? "#1E8449" : "#999" }}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="w-16 sm:w-28 h-0.5 mx-2 mb-5 rounded-full transition-all duration-500"
                  style={{ background: i < currentStep ? "#1E8449" : "#E5E7EB" }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Step Content ── */}
      <div className="flex-1 flex items-start justify-center px-4 pb-12">
        <AnimatePresence mode="wait" custom={direction}>
          {/* ══ STEP 1 ══ */}
          {currentStep === 0 && (
            <motion.div
              key="step1"
              custom={direction}
              variants={fadeSlide}
              initial="hidden"
              animate="show"
              exit="exit"
              className="w-full max-w-lg"
            >
              <div
                className="rounded-3xl overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.95)",
                  backdropFilter: "blur(20px)",
                  boxShadow: "0 25px 70px rgba(0,0,0,0.10)",
                  border: "1px solid rgba(91,44,111,0.08)",
                }}
              >
                {/* Card header */}
                <div className="px-8 pt-8 pb-5 text-center border-b border-purple-50">
                  <div
                    className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#5B2C6F,#8E44AD)", boxShadow: "0 8px 24px rgba(91,44,111,0.3)" }}
                  >
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <h1
                    className="text-2xl font-bold mb-1"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#111" }}
                  >
                    Create Your Store
                  </h1>
                  <p className="text-sm" style={{ color: "#888" }}>Fill in your details to get started</p>
                </div>

                <form onSubmit={form.handleSubmit(onStep1Continue)} className="px-8 pt-6 pb-8 space-y-5">

                  {/* Email */}
                  <Field
                    label="Email ID"
                    icon={<Mail className="w-4 h-4" />}
                    error={errors.email?.message}
                  >
                    <input
                      type="email"
                      placeholder="yourname@gmail.com"
                      autoComplete="email"
                      {...form.register("email")}
                      style={inputStyle}
                      onFocus={onFocusStyle}
                      onBlur={onBlurStyle}
                    />
                  </Field>

                  {/* Password */}
                  <Field
                    label="Password"
                    icon={<Lock className="w-4 h-4" />}
                    error={errors.password?.message}
                  >
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Min 8 chars, 1 uppercase, 1 number"
                        autoComplete="new-password"
                        {...form.register("password")}
                        style={{ ...inputStyle, paddingRight: "48px" }}
                        onFocus={onFocusStyle}
                        onBlur={onBlurStyle}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword((p) => !p)}
                        className="absolute right-4 top-1/2 -translate-y-1/2"
                        style={{ color: "#999" }}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </Field>

                  {/* Store Name */}
                  <Field
                    label="Store Name"
                    icon={<ShoppingBag className="w-4 h-4" />}
                    error={errors.storeName?.message}
                  >
                    <input
                      type="text"
                      placeholder="e.g. Sid Fashion House"
                      {...form.register("storeName")}
                      style={inputStyle}
                      onFocus={onFocusStyle}
                      onBlur={onBlurStyle}
                    />
                  </Field>

                  {/* WhatsApp */}
                  <Field
                    label="Store Owner WhatsApp Number"
                    icon={<Phone className="w-4 h-4" />}
                    error={errors.whatsapp?.message}
                    hint="No repeated digits or all zeros. Real number only."
                  >
                    <div className="flex gap-2">
                      <div
                        className="flex items-center justify-center px-4 rounded-2xl font-semibold text-sm shrink-0"
                        style={{
                          height: "56px",
                          background: "#F3EEF8",
                          border: "1.5px solid #D8BFE8",
                          color: "#5B2C6F",
                          minWidth: "72px",
                        }}
                      >
                        🇮🇳 +91
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
                        style={{ ...inputStyle, flex: 1 }}
                        onFocus={onFocusStyle}
                        onBlur={onBlurStyle}
                      />
                    </div>
                  </Field>

                  {/* Choose Plan */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold" style={{ color: "#333" }}>Choose Your Plan</label>
                    <button
                      type="button"
                      onClick={() => setShowPricing(true)}
                      className="w-full flex items-center justify-between transition-all duration-300"
                      style={{
                        height: "56px",
                        borderRadius: "16px",
                        padding: "0 20px",
                        border: selectedPlan ? `2px solid #5B2C6F` : "1.5px dashed #C9A8E0",
                        background: selectedPlan ? "rgba(91,44,111,0.05)" : "#FAFAFA",
                        color: "#5B2C6F",
                        fontWeight: 500,
                        fontSize: "14px",
                      }}
                    >
                      <span>{selectedPlan ? "Change Plan" : "👉 Select a Plan"}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    {/* Selected plan badge */}
                    <AnimatePresence>
                      {selectedPlan && (
                        <motion.div
                          initial={{ opacity: 0, y: -8, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: "auto" }}
                          exit={{ opacity: 0, y: -8, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div
                            className="flex items-center gap-3 rounded-2xl px-4 py-3 mt-1"
                            style={{
                              background: `${selectedPlan.color}12`,
                              border: `1.5px solid ${selectedPlan.color}40`,
                            }}
                          >
                            <BadgeCheck className="w-5 h-5 shrink-0" style={{ color: selectedPlan.color }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold truncate" style={{ color: selectedPlan.color }}>
                                {selectedPlan.badge} — {selectedPlan.name}
                              </p>
                              <p className="text-xs" style={{ color: "#666" }}>
                                {selectedPlan.price} {selectedPlan.period} · {selectedPlan.tagline}
                              </p>
                            </div>
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-green-500" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Continue Button */}
                  <motion.button
                    type="submit"
                    disabled={!step1Ready}
                    whileHover={step1Ready ? { scale: 1.02, boxShadow: "0 12px 32px rgba(91,44,111,0.30)" } : {}}
                    whileTap={step1Ready ? { scale: 0.98 } : {}}
                    className="w-full flex items-center justify-center gap-2 font-semibold text-white transition-all duration-300"
                    style={{
                      height: "56px",
                      borderRadius: "16px",
                      background: step1Ready
                        ? "linear-gradient(135deg, #5B2C6F, #8E44AD)"
                        : "#D5C5DE",
                      fontSize: "15px",
                      cursor: step1Ready ? "pointer" : "not-allowed",
                      boxShadow: step1Ready ? "0 8px 24px rgba(91,44,111,0.20)" : "none",
                    }}
                  >
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>

                  {!step1Ready && (
                    <p className="text-center text-xs" style={{ color: "#AAA" }}>
                      Fill all fields and choose a plan to continue
                    </p>
                  )}
                </form>
              </div>
            </motion.div>
          )}

          {/* ══ STEP 2 ══ */}
          {currentStep === 1 && (
            <motion.div
              key="step2"
              custom={direction}
              variants={fadeSlide}
              initial="hidden"
              animate="show"
              exit="exit"
              className="w-full max-w-lg"
            >
              <div
                className="rounded-3xl overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.95)",
                  backdropFilter: "blur(20px)",
                  boxShadow: "0 25px 70px rgba(0,0,0,0.10)",
                  border: "1px solid rgba(91,44,111,0.08)",
                }}
              >
                <div className="px-8 pt-8 pb-5 text-center border-b border-purple-50">
                  <div
                    className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#2E86C1,#1A5276)", boxShadow: "0 8px 24px rgba(46,134,193,0.3)" }}
                  >
                    <Store className="w-7 h-7 text-white" />
                  </div>
                  <h1
                    className="text-2xl font-bold mb-1"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#111" }}
                  >
                    Store Setup
                  </h1>
                  <p className="text-sm" style={{ color: "#888" }}>This section will be available soon</p>
                </div>

                <div className="px-8 pt-10 pb-12 flex flex-col items-center gap-4 text-center">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
                    style={{ background: "#F3EEF8" }}
                  >
                    <Sparkles className="w-9 h-9" style={{ color: "#C9A8E0" }} />
                  </div>
                  <p className="text-lg font-semibold" style={{ color: "#5B2C6F" }}>Coming Soon</p>
                  <p className="text-sm max-w-xs" style={{ color: "#999" }}>
                    This step will let you customize your store appearance,
                    upload your logo, and set up your brand colors.
                  </p>

                  <div className="flex gap-3 mt-4 w-full">
                    <button
                      type="button"
                      onClick={() => goToStep(0)}
                      className="flex-1 flex items-center justify-center gap-2 font-semibold transition-all duration-300 hover:bg-purple-50"
                      style={{
                        height: "52px",
                        borderRadius: "14px",
                        border: "2px solid #5B2C6F",
                        color: "#5B2C6F",
                        fontSize: "14px",
                      }}
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>
                    <motion.button
                      type="button"
                      onClick={() => goToStep(2)}
                      whileHover={{ scale: 1.02, boxShadow: "0 12px 32px rgba(91,44,111,0.30)" }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 flex items-center justify-center gap-2 font-semibold text-white transition-all duration-300"
                      style={{
                        height: "52px",
                        borderRadius: "14px",
                        background: "linear-gradient(135deg, #5B2C6F, #8E44AD)",
                        fontSize: "14px",
                        boxShadow: "0 8px 24px rgba(91,44,111,0.20)",
                      }}
                    >
                      Continue
                      <ChevronRight className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══ STEP 3 ══ */}
          {currentStep === 2 && (
            <motion.div
              key="step3"
              custom={direction}
              variants={fadeSlide}
              initial="hidden"
              animate="show"
              exit="exit"
              className="w-full max-w-lg"
            >
              <div
                className="rounded-3xl overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.95)",
                  backdropFilter: "blur(20px)",
                  boxShadow: "0 25px 70px rgba(0,0,0,0.10)",
                  border: "1px solid rgba(91,44,111,0.08)",
                }}
              >
                <div className="px-8 pt-8 pb-5 text-center border-b border-purple-50">
                  <div
                    className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#1E8449,#145A32)", boxShadow: "0 8px 24px rgba(30,132,73,0.3)" }}
                  >
                    <CheckCircle2 className="w-7 h-7 text-white" />
                  </div>
                  <h1
                    className="text-2xl font-bold mb-1"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#111" }}
                  >
                    Final Review
                  </h1>
                  <p className="text-sm" style={{ color: "#888" }}>This section will be available soon</p>
                </div>

                <div className="px-8 pt-10 pb-12 flex flex-col items-center gap-4 text-center">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
                    style={{ background: "#EAFAF1" }}
                  >
                    <CheckCircle2 className="w-9 h-9" style={{ color: "#7DCEA0" }} />
                  </div>
                  <p className="text-lg font-semibold" style={{ color: "#1E8449" }}>Almost There!</p>
                  <p className="text-sm max-w-xs" style={{ color: "#999" }}>
                    Your final review and submission will appear here once all
                    three steps are complete.
                  </p>

                  <div className="flex gap-3 mt-4 w-full">
                    <button
                      type="button"
                      onClick={() => goToStep(1)}
                      className="flex-1 flex items-center justify-center gap-2 font-semibold transition-all duration-300 hover:bg-purple-50"
                      style={{
                        height: "52px",
                        borderRadius: "14px",
                        border: "2px solid #5B2C6F",
                        color: "#5B2C6F",
                        fontSize: "14px",
                      }}
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>
                    {/* Done button — inactive for now */}
                    <button
                      type="button"
                      disabled
                      className="flex-1 flex items-center justify-center gap-2 font-semibold text-white cursor-not-allowed"
                      style={{
                        height: "52px",
                        borderRadius: "14px",
                        background: "#C8D6B9",
                        fontSize: "14px",
                      }}
                    >
                      Done ✅
                    </button>
                  </div>
                  <p className="text-xs" style={{ color: "#BBB" }}>
                    Done button will activate once all 3 steps are complete
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Reusable Field wrapper ──
function Field({
  label, icon, error, hint, children,
}: {
  label: string;
  icon: React.ReactNode;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span style={{ color: "#5B2C6F" }}>{icon}</span>
        <label className="text-sm font-semibold" style={{ color: "#333" }}>{label}</label>
      </div>
      {children}
      {hint && !error && <p className="text-[11px]" style={{ color: "#AAA" }}>{hint}</p>}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="text-[11px] font-medium"
          style={{ color: "#DC2626" }}
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}

// ── Shared input styles ──
const inputStyle: React.CSSProperties = {
  width: "100%",
  height: "56px",
  borderRadius: "16px",
  border: "1.5px solid #E5E7EB",
  padding: "0 20px",
  fontSize: "14px",
  background: "#FAFAFA",
  color: "#111",
  outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

function onFocusStyle(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = "#5B2C6F";
  e.target.style.boxShadow = "0 0 0 4px rgba(91,44,111,0.08)";
}

function onBlurStyle(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = "#E5E7EB";
  e.target.style.boxShadow = "none";
}
