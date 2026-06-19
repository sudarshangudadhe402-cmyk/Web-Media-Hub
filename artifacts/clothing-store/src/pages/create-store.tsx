import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  ChevronRight, Eye, EyeOff, Sparkles, ArrowLeft, Star,
  Mail, Lock, Store, Phone, CheckCircle, Lock as LockIcon,
  CreditCard, KeyRound,
} from "lucide-react";
import PricingOverlay, { SelectedPlan } from "@/components/pricing-overlay";

/* ─── Spam domains ─── */
const SPAM_DOMAINS = [
  "mailinator.com","guerrillamail.com","10minutemail.com","tempmail.com",
  "throwam.com","yopmail.com","sharklasers.com","trashmail.com",
  "fakeinbox.com","dispostable.com","maildrop.cc","spamgourmet.com",
  "spam4.me","getairmail.com","discard.email","mailnull.com",
  "mytemp.email","mohmal.com","bccto.me","getnada.com",
];
function isSpamEmail(e: string) {
  const d = e.split("@")[1]?.toLowerCase() ?? "";
  return SPAM_DOMAINS.some((s) => d === s || d.endsWith("." + s));
}
function isValidWhatsApp(n: string) {
  return n.length === 10 && !/^(\d)\1{9}$/.test(n) && n !== "0000000000";
}

/* ─── Schema ─── */
const formSchema = z.object({
  email: z.string().min(1,"Email is required").email("Enter a valid email address")
    .refine((e) => !isSpamEmail(e), "Spam/temporary emails not allowed"),
  password: z.string().min(8,"Min 8 characters")
    .regex(/[A-Z]/,"Must contain 1 uppercase letter")
    .regex(/[0-9]/,"Must contain 1 number"),
  storeName: z.string().min(2,"Min 2 characters").max(60,"Store name too long"),
  whatsapp: z.string().length(10,"Enter exactly 10 digits")
    .regex(/^\d{10}$/,"Only digits allowed")
    .refine(isValidWhatsApp,"Real number required (no repeated/all-zero digits)"),
});
type FormValues = z.infer<typeof formSchema>;

/* ─── Password strength ─── */
function getPasswordStrength(pw: string): { level: 0|1|2|3; label: string } {
  if (!pw) return { level: 0, label: "" };
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^a-zA-Z0-9]/.test(pw) || pw.length >= 12) s++;
  if (s <= 1) return { level: 1, label: "Weak" };
  if (s === 2) return { level: 2, label: "Medium" };
  return { level: 3, label: "Strong" };
}

/* ─── Theme tokens ─── */
const GOLD = "#D4A017";
const GOLD_BG = "#F5A623";
const BG = "#FAF6EE";
const BORDER = "#E8E0D0";
const HINT = "#9A9485";
const LABEL = "#1A1A1A";

/* ─── Step config ─── */
const STEPS = [
  { label: "Information", icon: <Store className="w-3.5 h-3.5" /> },
  { label: "Payment",     icon: <CreditCard className="w-3.5 h-3.5" /> },
  { label: "Store Login", icon: <KeyRound className="w-3.5 h-3.5" /> },
];

/* ─── Slide animation ─── */
const slideVariants = {
  hidden: (dir: number) => ({ opacity: 0, x: dir * 40 }),
  show:   { opacity: 1, x: 0, transition: { duration: 0.38, ease: "easeOut" } },
  exit:   (dir: number) => ({ opacity: 0, x: dir * -40, transition: { duration: 0.28 } }),
};

export default function CreateStore() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);       // 0, 1, 2
  const [dir, setDir]   = useState(1);       // slide direction
  const [showPassword, setShowPassword] = useState(false);
  const [showPricing,  setShowPricing]  = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "", storeName: "", whatsapp: "" },
    mode: "onChange",
  });
  const { formState: { errors, isValid } } = form;
  const password  = form.watch("password");
  const storeName = form.watch("storeName");
  const strength  = getPasswordStrength(password);
  const storeNameOk = (storeName ?? "").length >= 2 && !errors.storeName;
  const step1Ready = isValid && !!selectedPlan;

  function goTo(next: number) {
    setDir(next > step ? 1 : -1);
    setStep(next);
  }

  if (showPricing) {
    return (
      <PricingOverlay
        onBack={() => setShowPricing(false)}
        onSelectPlan={(plan) => { setSelectedPlan(plan); setShowPricing(false); }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: BG }}>
      <DecorativeRings />

      {/* ── Top Bar ── */}
      <div
        className="relative z-20 flex items-center justify-between px-5 py-4"
        style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(250,246,238,0.95)" }}
      >
        <button
          onClick={() => step === 0 ? setLocation("/login") : goTo(step - 1)}
          className="flex items-center gap-1.5 text-sm font-semibold hover:opacity-70 transition-opacity"
          style={{ color: LABEL }}
        >
          <ArrowLeft className="w-4 h-4" />
          {step === 0 ? "Back to Login" : "Back"}
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: LABEL }}>
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-sm tracking-widest" style={{ color: LABEL }}>WEB MEDIA HUB</span>
        </div>
      </div>

      {/* ── Step Indicator ── */}
      <div className="relative z-10 flex items-center justify-center py-6 px-4">
        {STEPS.map((s, i) => {
          const done   = i < step;
          const active = i === step;
          const dotBg  = done ? "#16A34A" : active ? GOLD_BG : "#D1D5DB";
          const labelColor = done ? "#16A34A" : active ? GOLD : "#9CA3AF";
          return (
            <div key={s.label} className="flex items-center">
              {/* Circle */}
              <div className="flex flex-col items-center gap-1.5">
                <motion.div
                  animate={{ background: dotBg, scale: active ? 1.12 : 1 }}
                  transition={{ duration: 0.3 }}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{
                    boxShadow: active
                      ? `0 0 0 4px ${GOLD_BG}30`
                      : done
                      ? "0 0 0 4px #16A34A20"
                      : "none",
                  }}
                >
                  {done ? (
                    <CheckCircle className="w-5 h-5 text-white" />
                  ) : (
                    <span className="text-white text-sm font-bold">{i + 1}</span>
                  )}
                </motion.div>
                <span className="text-[11px] font-semibold hidden sm:block" style={{ color: labelColor }}>
                  {s.label}
                </span>
              </div>

              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div
                  className="mx-2 mb-5 rounded-full transition-all duration-500"
                  style={{
                    width: "clamp(36px, 8vw, 80px)",
                    height: "2px",
                    background: i < step ? "#16A34A" : "#D1D5DB",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Step Content ── */}
      <div className="relative z-10 flex-1 flex items-start justify-center px-4 pb-12">
        <AnimatePresence mode="wait" custom={dir}>

          {/* ══ STEP 1: Information ══ */}
          {step === 0 && (
            <motion.div
              key="step1"
              custom={dir}
              variants={slideVariants}
              initial="hidden" animate="show" exit="exit"
              className="w-full max-w-md"
            >
              <div
                className="bg-white rounded-3xl overflow-hidden"
                style={{ boxShadow: "0 12px 48px rgba(0,0,0,0.10)", border: `1px solid ${BORDER}` }}
              >
                {/* Card header */}
                <div className="px-7 pt-8 pb-6 text-center">
                  <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: LABEL }}>
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <p className="font-extrabold text-base tracking-widest mb-0.5" style={{ color: GOLD }}>WEB MEDIA HUB</p>
                  <p className="text-xs mb-4" style={{ color: HINT }}>Your Store. Your Brand. Your Success.</p>
                  <h1
                    className="text-3xl font-black mb-2"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif", color: LABEL, letterSpacing: "-0.01em" }}
                  >
                    Create Your Store
                  </h1>
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <div className="h-px flex-1" style={{ background: `linear-gradient(to right, transparent, ${GOLD})` }} />
                    <span style={{ color: GOLD, fontSize: "14px" }}>◆</span>
                    <div className="h-px flex-1" style={{ background: `linear-gradient(to left, transparent, ${GOLD})` }} />
                  </div>
                  <p className="text-sm mb-4" style={{ color: HINT }}>Fill in your details to get started</p>
                  <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-xs font-semibold" style={{ borderColor: BORDER, color: "#7A6A4A" }}>
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    Trusted by Fashion Stores
                  </div>
                </div>

                {/* Form */}
                <div className="px-7 pb-8 space-y-5">

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
                      <button type="button" tabIndex={-1} onClick={() => setShowPassword(p => !p)}
                        className="shrink-0 hover:opacity-60 transition-opacity" style={{ color: HINT }}>
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </FieldRow>
                    {password.length > 0 && (
                      <div className="flex items-center gap-2 pt-0.5">
                        <div className="flex gap-1 flex-1">
                          {[1,2,3].map((i) => (
                            <div key={i} className="h-1.5 flex-1 rounded-full transition-all duration-300"
                              style={{ background: i <= strength.level
                                ? strength.level===1 ? "#E53E3E" : strength.level===2 ? "#F5A623" : "#38A169"
                                : "#E8E0D0" }} />
                          ))}
                        </div>
                        <span className="text-xs font-semibold shrink-0"
                          style={{ color: strength.level===1?"#E53E3E":strength.level===2?"#F5A623":"#38A169" }}>
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
                        <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                          className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#38A169" }}>
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
                      <div className="w-11 h-12 rounded-xl flex items-center justify-center shrink-0"
                        style={{ border: `1.5px solid ${BORDER}`, background: "#F7F3EC" }}>
                        <Phone className="w-4 h-4" style={{ color: HINT }} />
                      </div>
                      <div className="flex flex-1 items-center rounded-xl overflow-hidden"
                        style={{ border: `1.5px solid ${BORDER}`, height: "48px" }}>
                        <div className="flex items-center gap-1 px-3 shrink-0 h-full font-bold text-sm"
                          style={{ background: "#F0EBE1", borderRight: `1.5px solid ${BORDER}`, color: LABEL, minWidth: "62px" }}>
                          +91
                          <ChevronRight className="w-3 h-3 rotate-90" style={{ color: HINT }} />
                        </div>
                        <input
                          type="tel"
                          placeholder="0000000000"
                          maxLength={10}
                          {...form.register("whatsapp")}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g,"").slice(0,10);
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

                  {/* Choose Plan */}
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
                          {selectedPlan && (
                            <p className="text-xs text-white/80 leading-tight">{selectedPlan.tagline}</p>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-white/80" />
                    </motion.button>
                  </div>

                  {/* Continue button */}
                  <motion.button
                    type="button"
                    disabled={!step1Ready}
                    onClick={() => { if (step1Ready) goTo(1); }}
                    whileHover={step1Ready ? { scale: 1.015 } : {}}
                    whileTap={step1Ready ? { scale: 0.97 } : {}}
                    className="w-full flex items-center justify-center gap-2 font-bold text-white"
                    style={{
                      height: "58px",
                      borderRadius: "16px",
                      background: step1Ready ? LABEL : "#C5BFB5",
                      fontSize: "16px",
                      cursor: step1Ready ? "pointer" : "not-allowed",
                      boxShadow: step1Ready ? "0 4px 20px rgba(0,0,0,0.20)" : "none",
                      transition: "all 0.2s",
                    }}
                  >
                    Continue
                    <ChevronRight className="w-5 h-5" />
                  </motion.button>

                  {!step1Ready && (
                    <p className="text-center text-xs" style={{ color: "#BBAA99" }}>
                      {!selectedPlan ? "Choose a plan to continue" : "Fill all fields to continue"}
                    </p>
                  )}

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
                </div>
              </div>
            </motion.div>
          )}

          {/* ══ STEP 2: Payment ══ */}
          {step === 1 && (
            <motion.div
              key="step2"
              custom={dir}
              variants={slideVariants}
              initial="hidden" animate="show" exit="exit"
              className="w-full max-w-md"
            >
              <div
                className="bg-white rounded-3xl overflow-hidden"
                style={{ boxShadow: "0 12px 48px rgba(0,0,0,0.10)", border: `1px solid ${BORDER}` }}
              >
                {/* Header */}
                <div className="px-7 pt-8 pb-6 text-center">
                  <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                    style={{ background: "#2563EB" }}>
                    <CreditCard className="w-8 h-8 text-white" />
                  </div>
                  <p className="font-extrabold text-base tracking-widest mb-0.5" style={{ color: GOLD }}>STEP 2 OF 3</p>
                  <h2
                    className="text-2xl font-black mb-2"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif", color: LABEL }}
                  >
                    Payment
                  </h2>
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <div className="h-px flex-1" style={{ background: `linear-gradient(to right, transparent, ${GOLD})` }} />
                    <span style={{ color: GOLD, fontSize: "14px" }}>◆</span>
                    <div className="h-px flex-1" style={{ background: `linear-gradient(to left, transparent, ${GOLD})` }} />
                  </div>
                </div>

                {/* Blank placeholder */}
                <div className="px-7 pb-10 flex flex-col items-center gap-4 text-center">
                  <div className="w-24 h-24 rounded-2xl flex items-center justify-center"
                    style={{ background: "#EFF6FF", border: "2px dashed #BFDBFE" }}>
                    <CreditCard className="w-10 h-10" style={{ color: "#93C5FD" }} />
                  </div>
                  <p className="text-base font-bold" style={{ color: "#2563EB" }}>Coming Soon</p>
                  <p className="text-sm max-w-xs" style={{ color: HINT }}>
                    Payment integration will be available soon. We'll add secure payment options here.
                  </p>

                  {/* Navigation */}
                  <div className="flex gap-3 mt-4 w-full">
                    <button type="button" onClick={() => goTo(0)}
                      className="flex-1 flex items-center justify-center gap-2 font-semibold hover:opacity-80 transition-opacity"
                      style={{ height:"52px", borderRadius:"14px", border:`2px solid ${LABEL}`, color:LABEL, background:"transparent", fontSize:"14px" }}>
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>
                    <motion.button type="button" onClick={() => goTo(2)}
                      whileHover={{ scale:1.015 }} whileTap={{ scale:0.97 }}
                      className="flex-1 flex items-center justify-center gap-2 font-bold text-white"
                      style={{ height:"52px", borderRadius:"14px", background:LABEL, fontSize:"14px", boxShadow:"0 4px 16px rgba(0,0,0,0.18)" }}>
                      Continue
                      <ChevronRight className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══ STEP 3: Store Login Details ══ */}
          {step === 2 && (
            <motion.div
              key="step3"
              custom={dir}
              variants={slideVariants}
              initial="hidden" animate="show" exit="exit"
              className="w-full max-w-md"
            >
              <div
                className="bg-white rounded-3xl overflow-hidden"
                style={{ boxShadow: "0 12px 48px rgba(0,0,0,0.10)", border: `1px solid ${BORDER}` }}
              >
                {/* Header */}
                <div className="px-7 pt-8 pb-6 text-center">
                  <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                    style={{ background: "#16A34A" }}>
                    <KeyRound className="w-8 h-8 text-white" />
                  </div>
                  <p className="font-extrabold text-base tracking-widest mb-0.5" style={{ color: GOLD }}>STEP 3 OF 3</p>
                  <h2
                    className="text-2xl font-black mb-2"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif", color: LABEL }}
                  >
                    Store Login Details
                  </h2>
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <div className="h-px flex-1" style={{ background: `linear-gradient(to right, transparent, ${GOLD})` }} />
                    <span style={{ color: GOLD, fontSize: "14px" }}>◆</span>
                    <div className="h-px flex-1" style={{ background: `linear-gradient(to left, transparent, ${GOLD})` }} />
                  </div>
                </div>

                {/* Blank placeholder */}
                <div className="px-7 pb-10 flex flex-col items-center gap-4 text-center">
                  <div className="w-24 h-24 rounded-2xl flex items-center justify-center"
                    style={{ background: "#F0FDF4", border: "2px dashed #86EFAC" }}>
                    <KeyRound className="w-10 h-10" style={{ color: "#4ADE80" }} />
                  </div>
                  <p className="text-base font-bold" style={{ color: "#16A34A" }}>Coming Soon</p>
                  <p className="text-sm max-w-xs" style={{ color: HINT }}>
                    Your store login credentials and dashboard access details will be configured here.
                  </p>

                  {/* Navigation */}
                  <div className="flex gap-3 mt-4 w-full">
                    <button type="button" onClick={() => goTo(1)}
                      className="flex-1 flex items-center justify-center gap-2 font-semibold hover:opacity-80 transition-opacity"
                      style={{ height:"52px", borderRadius:"14px", border:`2px solid ${LABEL}`, color:LABEL, background:"transparent", fontSize:"14px" }}>
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>
                    {/* Done — inactive for now */}
                    <button type="button" disabled
                      className="flex-1 flex items-center justify-center gap-2 font-bold text-white cursor-not-allowed"
                      style={{ height:"52px", borderRadius:"14px", background:"#C5BFB5", fontSize:"14px" }}>
                      Done ✅
                    </button>
                  </div>
                  <p className="text-xs" style={{ color: "#BBAA99" }}>
                    Done will activate once all 3 steps are complete
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

/* ─── Field Row component ─── */
function FieldRow({ icon, label, error, children }: {
  icon: React.ReactNode; label: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-bold" style={{ color: LABEL }}>{label}</label>
      <div className="flex items-center gap-3">
        <div className="w-11 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ border: `1.5px solid ${BORDER}`, background: "#F7F3EC" }}>
          {icon}
        </div>
        <div className="flex flex-1 items-center rounded-xl px-4 gap-2"
          style={{ border: `1.5px solid ${BORDER}`, height: "48px", background: "#FDFCF9" }}>
          {children}
        </div>
      </div>
      {error && (
        <motion.p initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }}
          className="text-xs font-medium" style={{ color: "#E53E3E" }}>
          {error}
        </motion.p>
      )}
    </div>
  );
}

/* ─── Decorative rings ─── */
function DecorativeRings() {
  return (
    <>
      <svg className="fixed top-0 right-0 pointer-events-none" width="220" height="220" viewBox="0 0 220 220" fill="none" style={{ zIndex:0 }}>
        <circle cx="180" cy="40" r="90" stroke={GOLD} strokeWidth="1.5" opacity="0.25" />
        <circle cx="180" cy="40" r="65" stroke={GOLD} strokeWidth="1" opacity="0.18" />
        <circle cx="200" cy="20" r="40" stroke={GOLD} strokeWidth="0.8" opacity="0.12" />
      </svg>
      <svg className="fixed bottom-0 left-0 pointer-events-none" width="200" height="200" viewBox="0 0 200 200" fill="none" style={{ zIndex:0 }}>
        <circle cx="20" cy="180" r="80" stroke={GOLD} strokeWidth="1.5" opacity="0.20" />
        <circle cx="20" cy="180" r="55" stroke={GOLD} strokeWidth="1" opacity="0.14" />
        <circle cx="5" cy="200" r="35" stroke={GOLD} strokeWidth="0.8" opacity="0.10" />
      </svg>
    </>
  );
}
