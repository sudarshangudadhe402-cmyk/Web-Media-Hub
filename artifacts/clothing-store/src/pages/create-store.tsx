import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  ChevronRight, Eye, EyeOff, Sparkles, ArrowLeft, Star,
  Mail, Lock, Store, Phone, CheckCircle, Lock as LockIcon,
  CreditCard, KeyRound, X, AlertCircle, Shirt, Check,
} from "lucide-react";
import DynamicPricingOverlay, { SelectedPlan } from "@/components/dynamic-pricing-overlay";

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
    .regex(/^[a-zA-Z0-9]+$/, "Special characters aur emojis allowed nahi hain")
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

/* ─── Theme ─── */
const GOLD = "#D4A017";
const GOLD_BG = "#F5A623";
const BG = "#FAF6EE";
const BORDER = "#E8E0D0";
const HINT = "#9A9485";
const LABEL = "#1A1A1A";

/* ─── Category icon fallback ─── */
function categoryIcon(cat: string) {
  const lower = cat.toLowerCase();
  if (lower.includes("fashion") || lower.includes("cloth")) return Shirt;
  return Store;
}

/* ─── Steps ─── */
const STEPS = [
  { label: "Category" },
  { label: "Information" },
  { label: "Payment" },
  { label: "Store Login" },
];

/* ─── Duplicate popup state ─── */
interface DupePopup { message: string }

export default function CreateStore() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const [dir, setDir]   = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showPricing,  setShowPricing]  = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | null>(null);
  const [checking,     setChecking]     = useState(false);
  const [dupePopup,    setDupePopup]    = useState<DupePopup | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStoreType, setSelectedStoreType] = useState<string | null>(null);
  const [apiCategories, setApiCategories] = useState<string[]>([]);
  const [apiStoreTypes, setApiStoreTypes] = useState<{name: string; category: string}[]>([]);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [submitting,     setSubmitting]     = useState(false);
  const [submitError,    setSubmitError]    = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [rzpLoading,     setRzpLoading]     = useState(false);
  const [autopayLoading, setAutopayLoading] = useState(false);
  const [refAdmin,       setRefAdmin]       = useState<string>("");

  function isRecurring(plan: SelectedPlan | null): boolean {
    if (!plan) return false;
    const p = plan.period.toLowerCase();
    return !p.includes("lifetime") && !p.includes("one-time") && !p.includes("forever");
  }

  /* Fetch marketing (Growth & Marketing Analytics) categories + store types from API — independent from pricing categories */
  function fetchPricing() {
    setApiLoading(true);
    setApiError(false);
    fetch("/api/marketing/categories-config")
      .then(r => r.ok ? r.json() : Promise.reject("not-ok"))
      .then(d => {
        const cats: string[] = d.categories ?? [];
        const types = (d.storeTypes ?? []).map((s: any) =>
          typeof s === "string" ? { name: s, category: "" } : s
        );
        setApiCategories(cats);
        setApiStoreTypes(types);
        if (cats.length > 0) setSelectedCategory(prev => prev ?? cats[0]);
        setApiLoading(false);
      })
      .catch(() => { setApiError(true); setApiLoading(false); });
  }
  useEffect(() => { fetchPricing(); }, []);

  /* Capture ?ref= param from URL at mount */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref") ?? "";
    if (ref) {
      setRefAdmin(ref);
      sessionStorage.setItem("wmh_ref_admin", ref);
    } else {
      const stored = sessionStorage.getItem("wmh_ref_admin") ?? "";
      if (stored) setRefAdmin(stored);
    }
  }, []);

  async function handlePayNow() {
    const values = form.getValues();
    setSubmitError(null);
    setRzpLoading(true);
    const recurring = isRecurring(selectedPlan);

    try {
      // 1. Create Razorpay order for first (possibly discounted) payment
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planPrice: selectedPlan?.price ?? "",
          planName: selectedPlan?.name ?? "",
          email: values.email.trim(),
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        setSubmitError(orderData.error ?? "Failed to initiate payment. Please try again.");
        return;
      }

      // 2. Load Razorpay checkout.js if not already present
      if (!(window as any).Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load payment SDK"));
          document.head.appendChild(script);
        });
      }

      setRzpLoading(false);

      // 3. First payment checkout (one-time order)
      await new Promise<void>((resolve, reject) => {
        const rzp = new (window as any).Razorpay({
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          order_id: orderData.orderId,
          name: "Web Media Hub",
          description: selectedPlan?.name ?? "Store Plan",
          prefill: {
            email: values.email.trim(),
            contact: `+91${values.whatsapp.trim()}`,
          },
          theme: { color: "#F5A623" },
          handler: async (response: any) => {
            // 4. Verify payment + register account
            setSubmitting(true);
            try {
              const verifyRes = await fetch("/api/payments/verify-and-register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  email: values.email.trim(),
                  password: values.password,
                  storeName: values.storeName.trim(),
                  whatsapp: values.whatsapp.trim(),
                  plan: selectedPlan?.key ?? null,
                  planName: selectedPlan?.name ?? "",
                  planPrice: selectedPlan?.price ?? "",
                  planPeriod: selectedPlan?.period ?? "",
                  planBadge: selectedPlan?.badge ?? "",
                  planColor: selectedPlan?.color ?? "",
                  couponCode: selectedPlan?.couponCode ?? null,
                  originalPlanPrice: selectedPlan?.originalPrice ?? selectedPlan?.price ?? "",
                  ref_admin: refAdmin,
                  storeType: selectedStoreType ?? "",
                }),
              });
              const verifyData = await verifyRes.json();
              if (!verifyRes.ok) {
                setSubmitError(verifyData.error ?? "Payment verified but registration failed. Contact support.");
                reject(new Error(verifyData.error));
                return;
              }
              sessionStorage.removeItem("wmh_ref_admin");

              // 5. For recurring plans: set up AutoPay mandate (no charge today)
              //    The subscription starts billing at next renewal at original plan price.
              const autopayToken: string = verifyData.autopaySetupToken ?? "";
              if (recurring && autopayToken) {
                setSubmitting(false);
                setAutopayLoading(true);
                try {
                  const subRes = await fetch("/api/payments/create-subscription", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      email: values.email.trim(),
                      autopaySetupToken: autopayToken,
                    }),
                  });
                  const subData = await subRes.json();
                  if (subRes.ok && subData.subscriptionId) {
                    // Open Razorpay subscription checkout — mandate only, no charge today
                    await new Promise<void>((subResolve) => {
                      const subRzp = new (window as any).Razorpay({
                        key: subData.keyId,
                        subscription_id: subData.subscriptionId,
                        name: "Web Media Hub",
                        description: `AutoPay Setup — ${selectedPlan?.name ?? ""}`,
                        prefill: {
                          email: values.email.trim(),
                          contact: `+91${values.whatsapp.trim()}`,
                        },
                        theme: { color: "#F5A623" },
                        handler: async (subResponse: any) => {
                          try {
                            await fetch("/api/payments/verify-subscription-auth", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                razorpay_payment_id: subResponse.razorpay_payment_id,
                                razorpay_subscription_id: subResponse.razorpay_subscription_id,
                                razorpay_signature: subResponse.razorpay_signature,
                                email: values.email.trim(),
                              }),
                            });
                          } catch { /* non-fatal — autopay can be re-enabled later */ }
                          subResolve();
                        },
                        modal: { ondismiss: () => subResolve() },
                      });
                      subRzp.open();
                    });
                  }
                } catch { /* autopay setup failure is non-fatal */ }
                setAutopayLoading(false);
              }

              setPaymentSuccess(true);
              goTo(3);
              resolve();
            } catch {
              setSubmitError("Registration failed after payment. Please contact support.");
              reject(new Error("Registration failed"));
            } finally {
              setSubmitting(false);
              setAutopayLoading(false);
            }
          },
          modal: {
            ondismiss: () => {
              setSubmitError(null);
              resolve();
            },
          },
        });
        rzp.open();
      });
    } catch (err: any) {
      setSubmitError(err?.message ?? "Payment failed. Please try again.");
    } finally {
      setRzpLoading(false);
      setAutopayLoading(false);
    }
  }

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

  async function handleContinueStep2() {
    if (!step1Ready) return;
    setChecking(true);
    try {
      const values = form.getValues();
      const res = await fetch("/api/store-requests/check-duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email.trim(), whatsapp: values.whatsapp.trim() }),
      });
      const data = await res.json();
      if (data.emailTaken) {
        setDupePopup({ message: "Email is already registered as a store, please choose different." });
        return;
      }
      if (data.whatsappTaken) {
        setDupePopup({ message: "Mobile number is already registered as a store, please choose different." });
        return;
      }
      goTo(2);
    } catch {
      goTo(2);
    } finally {
      setChecking(false);
    }
  }

  if (showPricing) {
    return (
      <DynamicPricingOverlay
        onBack={() => setShowPricing(false)}
        onSelectPlan={(plan) => { setSelectedPlan(plan); setShowPricing(false); }}
      />
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "100vh", overflow: "hidden", background: BG }}>
      <DecorativeRings />

      {/* ── Duplicate Popup Modal ── */}
      <AnimatePresence>
        {dupePopup && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
            onClick={() => setDupePopup(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 16 }}
              transition={{ duration: 0.25 }}
              className="relative bg-white rounded-2xl shadow-2xl p-7 w-full max-w-sm text-center"
              style={{ border: `1.5px solid #FED7D7` }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setDupePopup(null)}
                className="absolute top-3 right-3 hover:opacity-60 transition-opacity"
                style={{ color: "#999" }}
              >
                <X className="w-4 h-4" />
              </button>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: "#FEF2F2" }}>
                <AlertCircle className="w-7 h-7" style={{ color: "#DC2626" }} />
              </div>
              <h3 className="font-bold text-base mb-2" style={{ color: LABEL }}>Already Registered</h3>
              <p className="text-sm leading-relaxed mb-5" style={{ color: "#555" }}>{dupePopup.message}</p>
              <button
                onClick={() => setDupePopup(null)}
                className="w-full font-bold text-white py-3 rounded-xl text-sm"
                style={{ background: "#DC2626" }}
              >
                OK, I'll Use Different
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top Bar ── */}
      <div
        className="relative z-20 flex items-center justify-between px-5 py-3.5 shrink-0"
        style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(250,246,238,0.97)" }}
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
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: LABEL }}>
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <span className="font-bold text-sm tracking-widest" style={{ color: LABEL }}>WEB MEDIA HUB</span>
        </div>
      </div>

      {/* ── Step Indicator ── */}
      <div className="relative z-10 flex items-center justify-center py-4 shrink-0">
        {STEPS.map((s, i) => {
          const done   = i < step;
          const active = i === step;
          const dotBg  = done ? "#16A34A" : active ? GOLD_BG : "#D1D5DB";
          const labelColor = done ? "#16A34A" : active ? GOLD : "#9CA3AF";
          return (
            <div key={s.label} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <motion.div
                  animate={{ background: dotBg, scale: active ? 1.1 : 1 }}
                  transition={{ duration: 0.3 }}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ boxShadow: active ? `0 0 0 3px ${GOLD_BG}35` : done ? "0 0 0 3px #16A34A22" : "none" }}
                >
                  {done ? (
                    <CheckCircle className="w-4 h-4 text-white" />
                  ) : (
                    <span className="text-white text-xs font-bold">{i + 1}</span>
                  )}
                </motion.div>
                <span className="text-[10px] font-semibold hidden sm:block" style={{ color: labelColor }}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="mx-2 mb-4 rounded-full transition-all duration-500"
                  style={{ width: "clamp(32px,6vw,70px)", height: "2px", background: i < step ? "#16A34A" : "#D1D5DB" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Step Content ── */}
      <div className="relative z-10 flex-1 flex items-start justify-center px-4 pb-4 overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>

          {/* ══ STEP 1: Category ══ */}
          {step === 0 && (
            <motion.div
              key="step0"
              custom={dir}
              variants={{ hidden:(d:number)=>({opacity:0,x:d*36}), show:{opacity:1,x:0,transition:{duration:0.32,ease:"easeOut"}}, exit:(d:number)=>({opacity:0,x:d*-36,transition:{duration:0.22}}) }}
              initial="hidden" animate="show" exit="exit"
              className="w-full max-w-md"
              style={{ paddingBottom: 88 }}
            >
              <div className="bg-white rounded-2xl overflow-hidden"
                style={{ boxShadow:"0 10px 40px rgba(0,0,0,0.10)", border:`1px solid ${BORDER}` }}>

                {/* Header */}
                <div className="px-6 pt-4 pb-3 text-center">
                  <p className="font-extrabold text-xs tracking-widest mb-0.5" style={{ color:GOLD }}>WEB MEDIA HUB</p>
                  <h1 className="text-2xl font-black mb-1" style={{ fontFamily:"'Playfair Display', Georgia, serif", color:LABEL }}>
                    Create Your Store
                  </h1>
                  <div className="flex items-center justify-center gap-2 mb-1.5">
                    <div className="h-px flex-1" style={{ background:`linear-gradient(to right, transparent, ${GOLD})` }} />
                    <span style={{ color:GOLD, fontSize:"12px" }}>◆</span>
                    <div className="h-px flex-1" style={{ background:`linear-gradient(to left, transparent, ${GOLD})` }} />
                  </div>
                  <p className="text-sm font-medium" style={{ color:HINT }}>Choose your store category to get started</p>
                </div>

                {/* Category + Types */}
                <div className="px-6 pb-6 space-y-4">
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color:HINT }}>Available Categories</p>

                  {apiLoading ? (
                    <div className="flex flex-col items-center gap-2 py-6">
                      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: GOLD_BG, borderTopColor: "transparent" }} />
                      <p className="text-xs" style={{ color:HINT }}>Loading categories…</p>
                    </div>
                  ) : apiError ? (
                    <div className="flex flex-col items-center gap-3 py-6 text-center">
                      <p className="text-sm font-medium" style={{ color:"#E05A5A" }}>Couldn't load categories</p>
                      <button onClick={fetchPricing} className="text-xs font-semibold px-4 py-2 rounded-lg"
                        style={{ background: LABEL, color: "white" }}>Retry</button>
                    </div>
                  ) : apiCategories.length === 0 ? (
                    <p className="text-xs text-center py-4" style={{ color:"#C5BFB5" }}>
                      No categories available yet. Please check back later.
                    </p>
                  ) : (
                    <>
                      {/* Plain text category tabs — horizontal row, no border/pill */}
                      <div className="flex gap-5 overflow-x-auto" style={{ scrollbarWidth:"none" }}>
                        {apiCategories.map(cat => {
                          const isSelected = selectedCategory === cat;
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                setSelectedCategory(cat);
                                setSelectedStoreType(null);
                              }}
                              className="shrink-0 font-bold text-sm pb-1.5 transition-all"
                              style={{
                                color: isSelected ? LABEL : "#B5AA9A",
                                borderBottom: isSelected ? `2.5px solid ${GOLD_BG}` : "2.5px solid transparent",
                                background: "none",
                                padding: "0 0 6px 0",
                              }}
                            >
                              {cat}
                            </button>
                          );
                        })}
                      </div>

                      {/* Store types — separate row-boxes below selected category */}
                      {selectedCategory && (() => {
                        const typesForCat = apiStoreTypes.filter(s => s.category === selectedCategory);
                        if (typesForCat.length === 0) return null;
                        return (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color:HINT }}>
                              Select Store Type
                            </p>
                            <div className="flex flex-col gap-2">
                              {typesForCat.map(st => {
                                const isSel = selectedStoreType === st.name;
                                return (
                                  <motion.button
                                    key={st.name}
                                    type="button"
                                    onClick={() => setSelectedStoreType(prev => prev === st.name ? null : st.name)}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full flex items-center justify-between text-left transition-all"
                                    style={{
                                      padding: "14px 18px",
                                      borderRadius: "12px",
                                      border: isSel ? `2px solid ${GOLD_BG}` : `2px solid ${BORDER}`,
                                      background: isSel ? `${GOLD_BG}12` : "#FDFCF9",
                                      boxShadow: isSel ? `0 3px 10px rgba(212,160,23,0.15)` : "none",
                                    }}
                                  >
                                    <p className="font-semibold text-sm" style={{ color: isSel ? GOLD_BG : LABEL }}>
                                      {st.name}
                                    </p>
                                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                                      style={{ borderColor: isSel ? GOLD_BG : BORDER, background: isSel ? GOLD_BG : "transparent" }}>
                                      {isSel && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                  </motion.button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              </div>

              {/* ── Continue button — fixed at bottom of screen always ── */}
              <div
                className="fixed left-0 right-0 bottom-0 px-4 pb-5 pt-3 z-30"
                style={{ background: `linear-gradient(to top, ${BG} 80%, transparent)` }}
              >
                {(() => {
                  const typesForCat = apiStoreTypes.filter(s => s.category === selectedCategory);
                  const canContinue = !!selectedCategory && (typesForCat.length === 0 || !!selectedStoreType);
                  return (
                    <>
                      <motion.button
                        type="button"
                        disabled={!canContinue}
                        onClick={() => canContinue && goTo(1)}
                        whileHover={canContinue ? {scale:1.012} : {}}
                        whileTap={canContinue ? {scale:0.97} : {}}
                        className="w-full flex items-center justify-center gap-2 font-bold text-white max-w-md mx-auto"
                        style={{
                          height:"52px", borderRadius:"14px",
                          background: canContinue ? LABEL : "#C5BFB5",
                          fontSize:"15px", cursor: canContinue ? "pointer" : "not-allowed",
                          boxShadow: canContinue ? "0 4px 16px rgba(0,0,0,0.18)" : "none",
                          transition:"all 0.2s",
                          display:"flex",
                        }}
                      >
                        Continue <ChevronRight className="w-4 h-4" />
                      </motion.button>
                      {!canContinue && (
                        <p className="text-center text-xs mt-1.5" style={{ color:"#BBAA99" }}>
                          {!selectedCategory
                            ? "Select a category to continue"
                            : "Select a store type to continue"}
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            </motion.div>
          )}

          {/* ══ STEP 2: Information ══ */}
          {step === 1 && (
            <motion.div
              key="step1"
              custom={dir}
              variants={{ hidden: (d:number)=>({opacity:0,x:d*36}), show:{opacity:1,x:0,transition:{duration:0.32,ease:"easeOut"}}, exit:(d:number)=>({opacity:0,x:d*-36,transition:{duration:0.22}}) }}
              initial="hidden" animate="show" exit="exit"
              className="w-full max-w-md overflow-y-auto"
              style={{ maxHeight: "100%" }}
            >
              <div className="bg-white rounded-2xl overflow-hidden"
                style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.10)", border: `1px solid ${BORDER}` }}>

                {/* Card header */}
                <div className="px-6 pt-5 pb-4 text-center">
                  <div className="w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: LABEL }}>
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <p className="font-extrabold text-xs tracking-widest mb-0.5" style={{ color: GOLD }}>WEB MEDIA HUB</p>
                  <h1 className="text-2xl font-black mb-1.5"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif", color: LABEL }}>
                    Create Your Store
                  </h1>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="h-px flex-1" style={{ background: `linear-gradient(to right, transparent, ${GOLD})` }} />
                    <span style={{ color: GOLD, fontSize: "12px" }}>◆</span>
                    <div className="h-px flex-1" style={{ background: `linear-gradient(to left, transparent, ${GOLD})` }} />
                  </div>
                  <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-semibold"
                    style={{ borderColor: BORDER, color: "#7A6A4A" }}>
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    Trusted by Fashion Stores
                  </div>
                </div>

                {/* Form */}
                <div className="px-6 pb-5 space-y-3.5">

                  {/* Email */}
                  <FieldRow icon={<Mail className="w-4 h-4" style={{ color: HINT }} />} label="Email ID" error={errors.email?.message}>
                    <input type="email" placeholder="yourname@gmail.com" autoComplete="email"
                      {...form.register("email")}
                      className="flex-1 outline-none text-sm font-medium bg-transparent" style={{ color: LABEL }} />
                  </FieldRow>

                  {/* Password */}
                  <div className="space-y-1">
                    <FieldRow icon={<Lock className="w-4 h-4" style={{ color: HINT }} />} label="Password" error={errors.password?.message}>
                      <input type={showPassword?"text":"password"} placeholder="••••••••••" autoComplete="new-password"
                        {...form.register("password")}
                        onChange={(e) => {
                          const filtered = e.target.value.replace(/[^a-zA-Z0-9]/g, "");
                          form.setValue("password", filtered, { shouldValidate: true });
                        }}
                        className="flex-1 outline-none text-sm font-medium bg-transparent" style={{ color: LABEL }} />
                      <button type="button" tabIndex={-1} onClick={()=>setShowPassword(p=>!p)}
                        className="shrink-0 hover:opacity-60 transition-opacity" style={{ color: HINT }}>
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </FieldRow>
                    {password.length > 0 && (
                      <div className="flex items-center gap-2 pt-0.5">
                        <div className="flex gap-1 flex-1">
                          {[1,2,3].map((i)=>(
                            <div key={i} className="h-1.5 flex-1 rounded-full transition-all duration-300"
                              style={{ background: i<=strength.level ? (strength.level===1?"#E53E3E":strength.level===2?"#F5A623":"#38A169") : "#E8E0D0" }} />
                          ))}
                        </div>
                        <span className="text-xs font-semibold shrink-0"
                          style={{ color: strength.level===1?"#E53E3E":strength.level===2?"#F5A623":"#38A169" }}>
                          {strength.label}
                        </span>
                      </div>
                    )}
                    {!errors.password && <p className="text-xs" style={{ color: HINT }}>Min 8 chars, 1 uppercase, 1 number (special chars/emojis nahi)</p>}
                  </div>

                  {/* Store Name */}
                  <div className="space-y-1">
                    <FieldRow icon={<Store className="w-4 h-4" style={{ color: HINT }} />} label="Store Name" error={errors.storeName?.message}>
                      <input type="text" placeholder="e.g. Sid Fashion House"
                        {...form.register("storeName")}
                        className="flex-1 outline-none text-sm font-medium bg-transparent" style={{ color: LABEL }} />
                    </FieldRow>
                    <AnimatePresence>
                      {storeNameOk && (
                        <motion.div initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                          className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#38A169" }}>
                          <CheckCircle className="w-3 h-3" />Store name available
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* WhatsApp */}
                  <div className="space-y-1">
                    <label className="block text-sm font-bold" style={{ color: LABEL }}>Store Owner WhatsApp</label>
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ border: `1.5px solid ${BORDER}`, background: "#F7F3EC" }}>
                        <Phone className="w-4 h-4" style={{ color: HINT }} />
                      </div>
                      <div className="flex flex-1 items-center rounded-xl overflow-hidden"
                        style={{ border: `1.5px solid ${BORDER}`, height: "44px" }}>
                        <div className="flex items-center gap-0.5 px-2.5 shrink-0 h-full font-bold text-sm"
                          style={{ background: "#F0EBE1", borderRight: `1.5px solid ${BORDER}`, color: LABEL, minWidth: "52px" }}>
                          +91
                          <ChevronRight className="w-3 h-3 rotate-90" style={{ color: HINT }} />
                        </div>
                        <input type="tel" placeholder="0000000000" maxLength={10}
                          {...form.register("whatsapp")}
                          onChange={(e)=>{ const v=e.target.value.replace(/\D/g,"").slice(0,10); form.setValue("whatsapp",v,{shouldValidate:true}); }}
                          className="flex-1 outline-none px-3 text-sm font-medium bg-white" style={{ color: LABEL, letterSpacing:"0.04em" }} />
                      </div>
                    </div>
                    {errors.whatsapp ? (
                      <p className="text-xs font-medium" style={{ color: "#E53E3E" }}>{errors.whatsapp.message}</p>
                    ) : (
                      <p className="text-xs" style={{ color: HINT }}>10-digit number (no repeated digits)</p>
                    )}
                  </div>

                  {/* Choose Plan */}
                  <motion.button type="button" onClick={()=>setShowPricing(true)}
                    whileHover={{scale:1.012}} whileTap={{scale:0.97}}
                    className="w-full flex items-center justify-between text-white"
                    style={{ height:"52px", borderRadius:"14px", padding:"0 18px",
                      background:`linear-gradient(135deg, ${GOLD_BG}, #E8940A)`,
                      boxShadow:"0 4px 16px rgba(212,160,23,0.35)" }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center">
                        <Star className="w-3.5 h-3.5 fill-white text-white" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-sm leading-tight">
                          {selectedPlan ? `${selectedPlan.name} Selected` : "Choose Your Plan"}
                        </p>
                        {selectedPlan && <p className="text-xs text-white/80 leading-tight">{selectedPlan.tagline}</p>}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/80" />
                  </motion.button>

                  {/* Continue */}
                  <motion.button type="button"
                    disabled={!step1Ready || checking}
                    onClick={handleContinueStep2}
                    whileHover={step1Ready&&!checking?{scale:1.012}:{}}
                    whileTap={step1Ready&&!checking?{scale:0.97}:{}}
                    className="w-full flex items-center justify-center gap-2 font-bold text-white"
                    style={{ height:"52px", borderRadius:"14px",
                      background: step1Ready&&!checking ? LABEL : "#C5BFB5",
                      fontSize:"15px", cursor:step1Ready&&!checking?"pointer":"not-allowed",
                      boxShadow:step1Ready?"0 4px 16px rgba(0,0,0,0.18)":"none", transition:"all 0.2s" }}>
                    {checking ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Checking...</>
                    ) : (
                      <>Continue <ChevronRight className="w-4 h-4" /></>
                    )}
                  </motion.button>

                  {!step1Ready && !checking && (
                    <p className="text-center text-xs" style={{ color: "#BBAA99" }}>
                      {!selectedPlan ? "Choose a plan to continue" : "Fill all fields to continue"}
                    </p>
                  )}

                  <div className="pt-1 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-xs" style={{ color: HINT }}>
                      <LockIcon className="w-3 h-3" />
                      By continuing, you agree to our{" "}
                      <span className="underline cursor-pointer" style={{ color: GOLD }}>Terms & Privacy Policy</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══ STEP 3: Payment — split layout ══ */}
          {step === 2 && (
            <motion.div
              key="step3"
              custom={dir}
              variants={{ hidden:(d:number)=>({opacity:0,x:d*36}), show:{opacity:1,x:0,transition:{duration:0.32,ease:"easeOut"}}, exit:(d:number)=>({opacity:0,x:d*-36,transition:{duration:0.22}}) }}
              initial="hidden" animate="show" exit="exit"
              className="w-full"
              style={{ maxWidth: "860px" }}
            >
              <div className="bg-white rounded-2xl overflow-hidden flex flex-col sm:flex-row"
                style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.10)", border: `1px solid ${BORDER}`, minHeight: "420px" }}>

                {/* LEFT — Plan details */}
                <div className="flex flex-col sm:w-1/2 p-6"
                  style={{ background: selectedPlan ? `${selectedPlan.color}10` : "#F5F7FA",
                    borderRight: `1.5px solid ${BORDER}` }}>
                  {selectedPlan ? (
                    <>
                      {/* Badge */}
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-4 w-max"
                        style={{ background: `${selectedPlan.color}20`, color: selectedPlan.color, border: `1px solid ${selectedPlan.color}40` }}>
                        {selectedPlan.badge}
                      </div>

                      {/* Plan name */}
                      <h2 className="font-black text-xl mb-1"
                        style={{ fontFamily:"'Playfair Display', Georgia, serif", color: LABEL }}>
                        {selectedPlan.name}
                      </h2>
                      <p className="text-xs mb-4" style={{ color: HINT }}>{selectedPlan.tagline}</p>

                      {/* Price */}
                      <div className="flex items-baseline gap-1 mb-5">
                        <span className="text-4xl font-extrabold" style={{ color: selectedPlan.color !== "#94a3b8" ? selectedPlan.color : LABEL }}>
                          {selectedPlan.price}
                        </span>
                        <span className="text-sm font-medium" style={{ color: HINT }}>{selectedPlan.period}</span>
                      </div>

                      {/* Divider */}
                      <div className="h-px mb-4" style={{ background: BORDER }} />

                      {/* Features */}
                      <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: HINT }}>What's Included</p>
                      <div className="space-y-2.5 flex-1">
                        {selectedPlan.features.map((f, i) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                              style={{ background: `${selectedPlan.color}22` }}>
                              <CheckCircle className="w-3 h-3" style={{ color: selectedPlan.color !== "#94a3b8" ? selectedPlan.color : "#38A169" }} />
                            </div>
                            <span className="text-xs font-medium leading-relaxed" style={{ color: "#333" }}>{f}</span>
                          </div>
                        ))}
                      </div>

                      {/* Change plan */}
                      <button type="button" onClick={()=>setShowPricing(true)}
                        className="mt-5 text-xs font-semibold underline hover:opacity-70 transition-opacity text-left"
                        style={{ color: GOLD }}>
                        Change Plan →
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                      <Star className="w-10 h-10" style={{ color: "#D1D5DB" }} />
                      <p className="text-sm font-medium" style={{ color: HINT }}>No plan selected</p>
                      <button type="button" onClick={()=>setShowPricing(true)}
                        className="text-xs font-bold underline" style={{ color: GOLD }}>
                        Choose a Plan
                      </button>
                    </div>
                  )}
                </div>

                {/* RIGHT — Razorpay Payment */}
                <div className="flex flex-col sm:w-1/2 p-6 items-center justify-center text-center gap-4">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
                    style={{ background: "#FFF8EC", border: `2px dashed ${GOLD}` }}>
                    <CreditCard className="w-9 h-9" style={{ color: GOLD }} />
                  </div>

                  <div>
                    <p className="font-bold text-base mb-1" style={{ color: LABEL }}>Complete Payment</p>
                    <p className="text-sm leading-relaxed" style={{ color: HINT }}>
                      Pay securely via UPI, Card, Net Banking or Wallet. Your store will be activated immediately after payment.
                    </p>
                  </div>

                  {/* AutoPay info box — shown for recurring plans */}
                  {selectedPlan && isRecurring(selectedPlan) && (
                    <div className="w-full rounded-2xl overflow-hidden"
                      style={{ border: `1.5px solid ${GOLD}40`, background: `${GOLD_BG}08` }}>
                      {/* Header */}
                      <div className="flex items-center gap-2 px-4 py-2.5"
                        style={{ background: `${GOLD_BG}18`, borderBottom: `1px solid ${GOLD}25` }}>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: GOLD_BG }}>
                          <CheckCircle className="w-3 h-3 text-white" />
                        </div>
                        <p className="text-xs font-extrabold tracking-wide" style={{ color: GOLD_BG }}>
                          AutoPay Enabled
                        </p>
                      </div>

                      {/* Pricing breakdown */}
                      <div className="px-4 py-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold" style={{ color: HINT }}>Today (first payment)</span>
                          <span className="text-sm font-extrabold" style={{ color: LABEL }}>
                            {selectedPlan.price}
                            {selectedPlan.couponCode && (
                              <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                style={{ background: "#DCFCE7", color: "#16A34A" }}>COUPON</span>
                            )}
                          </span>
                        </div>
                        {selectedPlan.originalPrice && selectedPlan.originalPrice !== selectedPlan.price && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold" style={{ color: HINT }}>From 2nd renewal (auto)</span>
                            <span className="text-sm font-extrabold" style={{ color: GOLD_BG }}>
                              {selectedPlan.originalPrice}
                              <span className="text-[10px] font-medium ml-0.5" style={{ color: HINT }}>{selectedPlan.period.replace(/\d+-day plan/, "").trim() || "/cycle"}</span>
                            </span>
                          </div>
                        )}
                        {(!selectedPlan.originalPrice || selectedPlan.originalPrice === selectedPlan.price) && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold" style={{ color: HINT }}>Auto-renews at</span>
                            <span className="text-sm font-extrabold" style={{ color: GOLD_BG }}>
                              {selectedPlan.price}
                              <span className="text-[10px] font-medium ml-0.5" style={{ color: HINT }}>/cycle</span>
                            </span>
                          </div>
                        )}
                        <p className="text-[10px] leading-relaxed text-center pt-0.5" style={{ color: "#9CA3AF" }}>
                          You'll set up autopay after your first payment. Cancel anytime.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Accepted payment methods */}
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    {["UPI", "Card", "Net Banking", "Wallet"].map(m => (
                      <span key={m} className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "#F3F4F6", color: "#6B7280", border: "1px solid #E5E7EB" }}>
                        {m}
                      </span>
                    ))}
                  </div>

                  {submitError && (
                    <div className="w-full rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700 text-center">
                      {submitError}
                    </div>
                  )}

                  <div className="flex gap-3 w-full mt-1">
                    <button type="button" onClick={() => goTo(1)}
                      disabled={rzpLoading || submitting || autopayLoading}
                      className="flex items-center justify-center gap-2 font-semibold hover:opacity-80 transition-opacity disabled:opacity-40"
                      style={{ height:"48px", borderRadius:"12px", border:`2px solid ${LABEL}`, color:LABEL, background:"transparent", fontSize:"14px", width:"80px" }}>
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <motion.button
                      type="button"
                      onClick={handlePayNow}
                      disabled={!selectedPlan || rzpLoading || submitting || autopayLoading}
                      whileHover={{ scale: selectedPlan && !rzpLoading && !autopayLoading ? 1.012 : 1 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex-1 flex items-center justify-center gap-2 font-bold text-white"
                      style={{
                        height: "48px", borderRadius: "12px", fontSize: "14px",
                        background: selectedPlan && !rzpLoading && !submitting && !autopayLoading
                          ? `linear-gradient(135deg, ${GOLD_BG}, #E8940A)`
                          : "#C5BFB5",
                        boxShadow: selectedPlan ? "0 4px 14px rgba(245,166,35,0.4)" : "none",
                        cursor: selectedPlan && !rzpLoading && !autopayLoading ? "pointer" : "not-allowed",
                      }}
                    >
                      {autopayLoading ? (
                        <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Setting up AutoPay…</>
                      ) : rzpLoading || submitting ? (
                        <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing…</>
                      ) : selectedPlan && isRecurring(selectedPlan) ? (
                        <><CreditCard className="w-4 h-4" /> Pay &amp; Enable AutoPay</>
                      ) : (
                        <><CreditCard className="w-4 h-4" /> Pay Now</>
                      )}
                    </motion.button>
                  </div>

                  {!selectedPlan && (
                    <p className="text-xs" style={{ color: "#BBAA99" }}>Please select a plan first</p>
                  )}
                </div>

              </div>
            </motion.div>
          )}

          {/* ══ STEP 4: Store Created Success ══ */}
          {step === 3 && (
            <motion.div
              key="step4"
              custom={dir}
              variants={{ hidden:(d:number)=>({opacity:0,x:d*36}), show:{opacity:1,x:0,transition:{duration:0.32,ease:"easeOut"}}, exit:(d:number)=>({opacity:0,x:d*-36,transition:{duration:0.22}}) }}
              initial="hidden" animate="show" exit="exit"
              className="w-full max-w-md"
            >
              <div className="bg-white rounded-2xl overflow-hidden"
                style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.10)", border: `1px solid ${BORDER}` }}>

                <div className="px-6 pt-7 pb-4 text-center">
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
                    className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #16A34A, #22C55E)" }}>
                    <Check className="w-9 h-9 text-white" strokeWidth={3} />
                  </motion.div>
                  <h2 className="text-2xl font-black mb-1"
                    style={{ fontFamily:"'Playfair Display', Georgia, serif", color: LABEL }}>
                    Store Activated! 🎉
                  </h2>
                  <p className="text-sm" style={{ color: HINT }}>Payment successful. Your store is ready.</p>
                </div>

                <div className="px-6 pb-7 flex flex-col gap-4">
                  {/* Credentials card */}
                  <div className="rounded-2xl p-4 space-y-3"
                    style={{ background: BG, border: `1.5px solid ${BORDER}` }}>
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: HINT }}>Your Login Credentials</p>

                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-3 bg-white rounded-xl"
                        style={{ border: `1px solid ${BORDER}` }}>
                        <Mail className="w-4 h-4 shrink-0" style={{ color: GOLD }} />
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: HINT }}>Email</p>
                          <p className="text-sm font-bold truncate" style={{ color: LABEL }}>{form.getValues("email")}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-white rounded-xl"
                        style={{ border: `1px solid ${BORDER}` }}>
                        <Lock className="w-4 h-4 shrink-0" style={{ color: GOLD }} />
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: HINT }}>Password</p>
                          <p className="text-sm font-bold tracking-widest" style={{ color: LABEL }}>{"•".repeat(form.getValues("password").length)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-white rounded-xl"
                        style={{ border: `1px solid ${BORDER}` }}>
                        <Store className="w-4 h-4 shrink-0" style={{ color: GOLD }} />
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: HINT }}>Store Name</p>
                          <p className="text-sm font-bold" style={{ color: LABEL }}>{form.getValues("storeName")}</p>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs leading-relaxed text-center pt-1" style={{ color: HINT }}>
                      Save these credentials — use them to login to your store dashboard.
                    </p>
                  </div>

                  {/* Login button */}
                  <motion.button
                    type="button"
                    onClick={() => setLocation("/login")}
                    whileHover={{ scale: 1.012 }} whileTap={{ scale: 0.97 }}
                    className="w-full flex items-center justify-center gap-2 font-bold text-white"
                    style={{
                      height: "52px", borderRadius: "14px", fontSize: "15px",
                      background: "linear-gradient(135deg, #16A34A, #22C55E)",
                      boxShadow: "0 4px 16px rgba(22,163,74,0.35)",
                    }}
                  >
                    <KeyRound className="w-4 h-4" /> Login to My Store
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── Field Row ─── */
function FieldRow({ icon, label, error, children }: {
  icon: React.ReactNode; label: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-bold" style={{ color: LABEL }}>{label}</label>
      <div className="flex items-center gap-2.5">
        <div className="w-10 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ border:`1.5px solid ${BORDER}`, background:"#F7F3EC" }}>
          {icon}
        </div>
        <div className="flex flex-1 items-center rounded-xl px-3 gap-2"
          style={{ border:`1.5px solid ${BORDER}`, height:"44px", background:"#FDFCF9" }}>
          {children}
        </div>
      </div>
      {error && (
        <motion.p initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}}
          className="text-xs font-medium" style={{ color:"#E53E3E" }}>
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
      <svg className="fixed top-0 right-0 pointer-events-none" width="200" height="200" viewBox="0 0 220 220" fill="none" style={{ zIndex:0 }}>
        <circle cx="180" cy="40" r="90" stroke={GOLD} strokeWidth="1.5" opacity="0.25" />
        <circle cx="180" cy="40" r="65" stroke={GOLD} strokeWidth="1" opacity="0.18" />
      </svg>
      <svg className="fixed bottom-0 left-0 pointer-events-none" width="180" height="180" viewBox="0 0 200 200" fill="none" style={{ zIndex:0 }}>
        <circle cx="20" cy="180" r="80" stroke={GOLD} strokeWidth="1.5" opacity="0.20" />
        <circle cx="20" cy="180" r="55" stroke={GOLD} strokeWidth="1" opacity="0.14" />
      </svg>
    </>
  );
}
