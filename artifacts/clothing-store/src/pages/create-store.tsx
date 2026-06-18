import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  Store, ChevronRight, CheckCircle2, Circle,
  Eye, EyeOff, Sparkles, ArrowLeft, BadgeCheck, Star,
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
  if (/^(\d)\1{9}$/.test(num)) return false;
  if (num === "0000000000") return false;
  return true;
}

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

// ── Theme tokens ──
const BG = "#EDE8DF";
const CARD_BG = "#FFFFFF";
const INPUT_BG = "#F7F4EF";
const BORDER = "#D6CFC4";
const LABEL = "#111111";
const HINT = "#888880";
const ERROR = "#C0392B";
const GOLD = "#F5A623";
const GOLD_DARK = "#D4891A";
const PREFIX_BG = "#EDEAE4";

export default function CreateStore() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | null>(null);
  const [, setStep1Data] = useState<Step1Values | null>(null);

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
    <div className="min-h-screen flex flex-col" style={{ background: BG }}>

      {/* ── Top Bar ── */}
      <div
        className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
        style={{ background: BG, borderBottom: `1px solid ${BORDER}` }}
      >
        <button
          onClick={() => setLocation("/login")}
          className="flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-70"
          style={{ color: LABEL }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: LABEL }}>
            <Store className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-sm tracking-widest" style={{ color: LABEL }}>WEB MEDIA HUB</span>
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
                    background: done ? "#3A7D44" : active ? LABEL : BORDER,
                    scale: active ? 1.1 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ boxShadow: active ? "0 4px 12px rgba(0,0,0,0.15)" : "none" }}
                >
                  {done ? (
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  ) : active ? (
                    <span className="text-white text-sm font-bold">{i + 1}</span>
                  ) : (
                    <Circle className="w-5 h-5" style={{ color: "#AAA" }} />
                  )}
                </motion.div>
                <span
                  className="text-[11px] font-semibold hidden sm:block"
                  style={{ color: active ? LABEL : done ? "#3A7D44" : "#AAA" }}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="w-16 sm:w-28 h-0.5 mx-2 mb-5 rounded-full transition-all duration-500"
                  style={{ background: i < currentStep ? "#3A7D44" : BORDER }}
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
                  background: CARD_BG,
                  boxShadow: "0 8px 40px rgba(0,0,0,0.10)",
                  border: `1px solid ${BORDER}`,
                }}
              >
                {/* Card header */}
                <div
                  className="px-8 pt-8 pb-5 text-center"
                  style={{ borderBottom: `1px solid #EDE8DF` }}
                >
                  <div
                    className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                    style={{ background: LABEL }}
                  >
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <h1
                    className="text-2xl font-bold mb-1"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif", color: LABEL }}
                  >
                    Create Your Store
                  </h1>
                  <p className="text-sm" style={{ color: HINT }}>Fill in your details to get started</p>
                </div>

                <form onSubmit={form.handleSubmit(onStep1Continue)} className="px-8 pt-6 pb-8 space-y-5">

                  {/* Email ID */}
                  <CreamField label="Email ID" error={errors.email?.message}>
                    <CreamInput
                      type="email"
                      placeholder="yourname@gmail.com"
                      autoComplete="email"
                      {...form.register("email")}
                    />
                  </CreamField>

                  {/* Password */}
                  <CreamField
                    label="Password"
                    error={errors.password?.message}
                    hint="Min 8 characters, 1 uppercase letter, 1 number"
                  >
                    <div className="relative">
                      <CreamInput
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        style={{ paddingRight: "48px" }}
                        {...form.register("password")}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword((p) => !p)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-60"
                        style={{ color: HINT }}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </CreamField>

                  {/* Store Name */}
                  <CreamField label="Store Name" error={errors.storeName?.message}>
                    <CreamInput
                      type="text"
                      placeholder="e.g. Sid Fashion House"
                      {...form.register("storeName")}
                    />
                  </CreamField>

                  {/* WhatsApp */}
                  <CreamField
                    label="Store Owner WhatsApp Number"
                    error={errors.whatsapp?.message}
                    hint="Enter 10-digit mobile number (repeated digits like 9999999999 not allowed)"
                  >
                    <div className="flex gap-0 overflow-hidden rounded-xl" style={{ border: `1.5px solid ${BORDER}` }}>
                      <div
                        className="flex items-center justify-center px-4 font-bold text-sm shrink-0"
                        style={{
                          background: PREFIX_BG,
                          color: LABEL,
                          borderRight: `1.5px solid ${BORDER}`,
                          minWidth: "68px",
                          height: "52px",
                        }}
                      >
                        +91
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
                        className="flex-1 outline-none bg-white px-4 text-sm font-medium"
                        style={{
                          height: "52px",
                          color: LABEL,
                          fontSize: "15px",
                          letterSpacing: "0.05em",
                        }}
                        onFocus={(e) => { (e.target.closest("div") as HTMLElement).style.borderColor = LABEL; }}
                        onBlur={(e) => { (e.target.closest("div") as HTMLElement).style.borderColor = BORDER; }}
                      />
                    </div>
                  </CreamField>

                  {/* Choose Plan */}
                  <div className="space-y-3">
                    <motion.button
                      type="button"
                      onClick={() => setShowPricing(true)}
                      whileHover={{ scale: 1.02, background: GOLD_DARK }}
                      whileTap={{ scale: 0.97 }}
                      className="w-full flex items-center justify-between text-white font-bold transition-all duration-300"
                      style={{
                        height: "56px",
                        borderRadius: "999px",
                        padding: "0 24px",
                        background: GOLD,
                        fontSize: "16px",
                        boxShadow: "0 4px 18px rgba(245,166,35,0.35)",
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 fill-white text-white" />
                        <span>{selectedPlan ? "Change Plan" : "Choose Plan"}</span>
                      </div>
                      <ChevronRight className="w-5 h-5" />
                    </motion.button>

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
                            className="flex items-center gap-3 rounded-2xl px-4 py-3"
                            style={{
                              background: `${selectedPlan.color}12`,
                              border: `1.5px solid ${selectedPlan.color}50`,
                            }}
                          >
                            <BadgeCheck className="w-5 h-5 shrink-0" style={{ color: selectedPlan.color }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold truncate" style={{ color: selectedPlan.color }}>
                                {selectedPlan.badge} — {selectedPlan.name}
                              </p>
                              <p className="text-xs" style={{ color: HINT }}>
                                {selectedPlan.price} {selectedPlan.period} · {selectedPlan.tagline}
                              </p>
                            </div>
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-green-500" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Continue */}
                  <motion.button
                    type="submit"
                    disabled={!step1Ready}
                    whileHover={step1Ready ? { scale: 1.02, boxShadow: "0 8px 28px rgba(0,0,0,0.20)" } : {}}
                    whileTap={step1Ready ? { scale: 0.98 } : {}}
                    className="w-full flex items-center justify-center gap-2 font-bold text-white transition-all duration-300"
                    style={{
                      height: "54px",
                      borderRadius: "14px",
                      background: step1Ready ? LABEL : "#C5BFB5",
                      fontSize: "15px",
                      cursor: step1Ready ? "pointer" : "not-allowed",
                      boxShadow: step1Ready ? "0 4px 16px rgba(0,0,0,0.18)" : "none",
                    }}
                  >
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>

                  {!step1Ready && (
                    <p className="text-center text-xs" style={{ color: "#BBAA99" }}>
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
                style={{ background: CARD_BG, boxShadow: "0 8px 40px rgba(0,0,0,0.10)", border: `1px solid ${BORDER}` }}
              >
                <div className="px-8 pt-8 pb-5 text-center" style={{ borderBottom: `1px solid #EDE8DF` }}>
                  <div
                    className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                    style={{ background: "#2E86C1" }}
                  >
                    <Store className="w-7 h-7 text-white" />
                  </div>
                  <h1
                    className="text-2xl font-bold mb-1"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif", color: LABEL }}
                  >
                    Store Setup
                  </h1>
                  <p className="text-sm" style={{ color: HINT }}>This section will be available soon</p>
                </div>

                <div className="px-8 pt-10 pb-12 flex flex-col items-center gap-4 text-center">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto" style={{ background: INPUT_BG }}>
                    <Sparkles className="w-9 h-9" style={{ color: "#C5BFB5" }} />
                  </div>
                  <p className="text-lg font-semibold" style={{ color: LABEL }}>Coming Soon</p>
                  <p className="text-sm max-w-xs" style={{ color: HINT }}>
                    This step will let you customize your store appearance,
                    upload your logo, and set up your brand colors.
                  </p>

                  <div className="flex gap-3 mt-4 w-full">
                    <button
                      type="button"
                      onClick={() => goToStep(0)}
                      className="flex-1 flex items-center justify-center gap-2 font-semibold transition-all hover:opacity-80"
                      style={{
                        height: "52px",
                        borderRadius: "14px",
                        border: `2px solid ${LABEL}`,
                        color: LABEL,
                        fontSize: "14px",
                        background: "transparent",
                      }}
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>
                    <motion.button
                      type="button"
                      onClick={() => goToStep(2)}
                      whileHover={{ scale: 1.02, boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 flex items-center justify-center gap-2 font-bold text-white"
                      style={{
                        height: "52px",
                        borderRadius: "14px",
                        background: LABEL,
                        fontSize: "14px",
                        boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
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
                style={{ background: CARD_BG, boxShadow: "0 8px 40px rgba(0,0,0,0.10)", border: `1px solid ${BORDER}` }}
              >
                <div className="px-8 pt-8 pb-5 text-center" style={{ borderBottom: `1px solid #EDE8DF` }}>
                  <div
                    className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                    style={{ background: "#3A7D44" }}
                  >
                    <CheckCircle2 className="w-7 h-7 text-white" />
                  </div>
                  <h1
                    className="text-2xl font-bold mb-1"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif", color: LABEL }}
                  >
                    Final Review
                  </h1>
                  <p className="text-sm" style={{ color: HINT }}>This section will be available soon</p>
                </div>

                <div className="px-8 pt-10 pb-12 flex flex-col items-center gap-4 text-center">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto" style={{ background: "#EAFAF1" }}>
                    <CheckCircle2 className="w-9 h-9" style={{ color: "#7DCEA0" }} />
                  </div>
                  <p className="text-lg font-semibold" style={{ color: "#3A7D44" }}>Almost There!</p>
                  <p className="text-sm max-w-xs" style={{ color: HINT }}>
                    Your final review and submission will appear here once all three steps are complete.
                  </p>

                  <div className="flex gap-3 mt-4 w-full">
                    <button
                      type="button"
                      onClick={() => goToStep(1)}
                      className="flex-1 flex items-center justify-center gap-2 font-semibold transition-all hover:opacity-80"
                      style={{
                        height: "52px",
                        borderRadius: "14px",
                        border: `2px solid ${LABEL}`,
                        color: LABEL,
                        fontSize: "14px",
                        background: "transparent",
                      }}
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>
                    {/* Done — inactive */}
                    <button
                      type="button"
                      disabled
                      className="flex-1 flex items-center justify-center gap-2 font-bold text-white cursor-not-allowed"
                      style={{
                        height: "52px",
                        borderRadius: "14px",
                        background: "#C5BFB5",
                        fontSize: "14px",
                      }}
                    >
                      Done ✅
                    </button>
                  </div>
                  <p className="text-xs" style={{ color: "#BBAA99" }}>
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

// ── Cream-themed Field wrapper ──
function CreamField({
  label, error, hint, children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold" style={{ color: "#111111" }}>{label}</label>
      {children}
      {hint && !error && <p className="text-xs" style={{ color: "#888880" }}>{hint}</p>}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="text-xs font-medium"
          style={{ color: "#C0392B" }}
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}

// ── Cream input component ──
const CreamInput = ({
  style,
  onFocus,
  onBlur,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className="w-full outline-none font-medium transition-all duration-200"
    style={{
      height: "52px",
      borderRadius: "12px",
      border: "1.5px solid #D6CFC4",
      padding: "0 18px",
      fontSize: "15px",
      background: "#F7F4EF",
      color: "#111111",
      ...style,
    }}
    onFocus={(e) => {
      e.target.style.borderColor = "#111111";
      e.target.style.background = "#FFFFFF";
      e.target.style.boxShadow = "0 0 0 3px rgba(0,0,0,0.06)";
      onFocus?.(e);
    }}
    onBlur={(e) => {
      e.target.style.borderColor = "#D6CFC4";
      e.target.style.background = "#F7F4EF";
      e.target.style.boxShadow = "none";
      onBlur?.(e);
    }}
  />
);
