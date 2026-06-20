import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  Store, Eye, EyeOff, Sparkles, ArrowLeft, ArrowRight, BadgeCheck, Star,
  CheckCircle, XCircle, Clock, Copy, Link as LinkIcon, Mail,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useSubmitStoreRequest,
  useMyStoreRequests,
  getMyStoreRequestsQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
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

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "#E0D8CF" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length >= 12) score++;
  if (score <= 1) return { score, label: "Weak", color: "#C0392B" };
  if (score <= 2) return { score, label: "Fair", color: "#E67E22" };
  if (score <= 3) return { score, label: "Good", color: "#F5A623" };
  return { score, label: "Strong", color: "#27AE60" };
}

const BG = "#EDE8DF";
const CARD_BG = "#FFFFFF";
const INPUT_BG = "#F7F4EF";
const BORDER = "#D6CFC4";
const LABEL = "#111111";
const HINT = "#888880";
const GOLD = "#F5A623";
const GOLD_DARK = "#D4891A";
const PREFIX_BG = "#EDEAE4";

export default function StoreRequest() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const submitRequest = useSubmitStoreRequest();
  const { data: myRequests, isLoading } = useMyStoreRequests();

  const [showPassword, setShowPassword] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | null>(null);
  const [selectedReq, setSelectedReq] = useState<any>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "", storeName: "", whatsapp: "" },
    mode: "onChange",
  });

  const { formState: { errors, isValid }, watch } = form;
  const passwordValue = watch("password");
  const strength = getPasswordStrength(passwordValue);
  const formReady = isValid && !!selectedPlan;

  function onSubmit(values: FormValues) {
    submitRequest.mutate(
      {
        data: {
          email: values.email,
          password: values.password,
          storeName: values.storeName,
          whatsapp: `+91${values.whatsapp}`,
          plan: selectedPlan?.name ?? null,
          planName: selectedPlan?.name ?? null,
          planPrice: selectedPlan?.price ?? null,
          planPeriod: selectedPlan?.period ?? null,
          planBadge: selectedPlan?.badge ?? null,
          planColor: selectedPlan?.color ?? null,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Request submitted ✅", description: "Your store request has been sent to the super-admin for approval." });
          queryClient.invalidateQueries({ queryKey: getMyStoreRequestsQueryKey() });
          form.reset();
          setSelectedPlan(null);
        },
        onError: (err: any) => {
          const reason: string =
            err?.data?.error ??
            err?.data?.message ??
            err?.response?.data?.error ??
            err?.message?.replace(/^HTTP \d+[^:]*:\s*/i, "") ??
            "";
          const isEmailTaken = reason.toLowerCase().includes("email already exists");
          const isMobileTaken = reason.toLowerCase().includes("mobile number already exists");
          const isSpamWa = reason.toLowerCase().includes("whatsapp") || reason.toLowerCase().includes("phone");
          const title = isEmailTaken
            ? "Email already exists, please use a different email 🙏"
            : isMobileTaken
            ? "This WhatsApp number is already registered, please use a different number 🙏"
            : isSpamWa
            ? "Spam WhatsApp number not allowed, please fill real 🙏"
            : reason || "Something went wrong, please try again 🙏";
          toast({ variant: "destructive", title });
        },
      }
    );
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

  const statusConfig = {
    pending:  { label: "Pending",  Icon: Clock,        bg: "#FFF7ED", iconColor: "#D97706", badgeBg: "#FFFBEB", badgeText: "#92400E" },
    approved: { label: "Approved", Icon: CheckCircle,  bg: "#F0FDF4", iconColor: "#16A34A", badgeBg: "#DCFCE7", badgeText: "#14532D" },
    rejected: { label: "Rejected", Icon: XCircle,      bg: "#FEF2F2", iconColor: "#DC2626", badgeBg: "#FEE2E2", badgeText: "#7F1D1D" },
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: BG }}>

      {/* ── Top Bar ── */}
      <div
        className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
        style={{ background: BG, borderBottom: `1px solid ${BORDER}` }}
      >
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-70"
          style={{ color: LABEL }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: LABEL }}>
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-sm tracking-widest" style={{ color: LABEL }}>WEB MEDIA HUB</span>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg space-y-6">

          {/* ── Form Card ── */}
          <div
            className="rounded-3xl overflow-hidden"
            style={{
              background: CARD_BG,
              boxShadow: "0 8px 40px rgba(0,0,0,0.10)",
              border: `1px solid ${BORDER}`,
            }}
          >
            {/* Card Header */}
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
              <p
                className="text-xs font-bold tracking-[0.2em] mb-1"
                style={{ color: GOLD }}
              >
                WEB MEDIA HUB
              </p>
              <h1
                className="text-2xl font-bold mb-1"
                style={{ fontFamily: "'Playfair Display', Georgia, serif", color: LABEL }}
              >
                Create Your Store
              </h1>
              <div className="flex items-center justify-center gap-2 mt-1 mb-1">
                <div className="h-px w-8" style={{ background: BORDER }} />
                <div className="w-1 h-1 rounded-full" style={{ background: GOLD }} />
                <div className="h-px w-8" style={{ background: BORDER }} />
              </div>
              <p className="text-sm" style={{ color: HINT }}>Fill in your details to get started</p>
              <div
                className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-[11px] font-semibold"
                style={{ background: "#FEF9EC", border: `1px solid #F5C842`, color: "#7A5C00" }}
              >
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                Trusted by Fashion Stores
              </div>
            </div>

            {/* Form */}
            <form onSubmit={form.handleSubmit(onSubmit)} className="px-8 pt-6 pb-8 space-y-5">

              {/* Email ID */}
              <CreamField label="Email ID" error={errors.email?.message}>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: HINT }} />
                  <CreamInput
                    type="email"
                    placeholder="yourname@gmail.com"
                    autoComplete="email"
                    style={{ paddingLeft: "44px" }}
                    {...form.register("email")}
                  />
                </div>
              </CreamField>

              {/* Password */}
              <CreamField label="Password" error={errors.password?.message} hint="Min 8 chars, 1 uppercase, 1 number">
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
                {/* Strength bar */}
                {passwordValue && (
                  <div className="space-y-1 mt-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="flex-1 h-1 rounded-full transition-all duration-300"
                          style={{
                            background: i <= strength.score ? strength.color : "#E8E2DA",
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-[11px] font-semibold" style={{ color: strength.color }}>
                      {strength.label}
                    </p>
                  </div>
                )}
              </CreamField>

              {/* Store Name */}
              <CreamField label="Store Name" error={errors.storeName?.message}>
                <div className="relative">
                  <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: HINT }} />
                  <CreamInput
                    type="text"
                    placeholder="e.g. Fashion Hub"
                    style={{ paddingLeft: "44px" }}
                    {...form.register("storeName")}
                  />
                </div>
              </CreamField>

              {/* WhatsApp */}
              <CreamField
                label="Store Owner WhatsApp Number"
                error={errors.whatsapp?.message}
                hint="Enter 10-digit mobile number (repeated digits like 9999999999 not allowed)"
              >
                <div
                  className="flex gap-0 overflow-hidden rounded-xl"
                  style={{ border: `1.5px solid ${BORDER}` }}
                >
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
                    <span>{selectedPlan ? "Change Plan" : "Choose Your Plan"}</span>
                  </div>
                  <ArrowRight className="w-5 h-5" />
                </motion.button>

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
                        <CheckCircle className="w-4 h-4 shrink-0 text-green-500" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!selectedPlan && (
                  <p className="text-center text-xs font-medium" style={{ color: "#BBAA99" }}>
                    ⚠️ Please select a plan to submit your request
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={!formReady || submitRequest.isPending}
                whileHover={formReady && !submitRequest.isPending ? { scale: 1.02, boxShadow: "0 8px 28px rgba(0,0,0,0.20)" } : {}}
                whileTap={formReady && !submitRequest.isPending ? { scale: 0.98 } : {}}
                className="w-full flex items-center justify-center gap-2 font-bold text-white transition-all duration-300"
                style={{
                  height: "54px",
                  borderRadius: "14px",
                  background: formReady && !submitRequest.isPending ? LABEL : "#C5BFB5",
                  fontSize: "15px",
                  cursor: formReady && !submitRequest.isPending ? "pointer" : "not-allowed",
                  boxShadow: formReady && !submitRequest.isPending ? "0 4px 16px rgba(0,0,0,0.18)" : "none",
                }}
              >
                {submitRequest.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Create Store
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>

              {!formReady && !submitRequest.isPending && (
                <p className="text-center text-xs" style={{ color: "#BBAA99" }}>
                  Fill all fields and choose a plan to continue
                </p>
              )}

              {/* Trust footer */}
              <div className="flex flex-col items-center gap-1 pt-1">
                <p className="text-xs" style={{ color: HINT }}>🔒 Your data is secure with us</p>
                <p className="text-[11px]" style={{ color: "#C5BFB5" }}>
                  By continuing, you agree to our Terms & Privacy Policy
                </p>
              </div>
            </form>
          </div>

          {/* ── My Requests History ── */}
          <div>
            <h2 className="text-base font-bold mb-3 px-1" style={{ color: LABEL }}>My Requests</h2>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "#E8E3DA" }} />
                ))}
              </div>
            ) : !myRequests || myRequests.length === 0 ? (
              <div
                className="rounded-2xl border-2 border-dashed py-10 text-center"
                style={{ borderColor: BORDER }}
              >
                <Store className="w-8 h-8 mx-auto mb-2" style={{ color: "#C5BFB5" }} />
                <p className="text-sm" style={{ color: HINT }}>No requests submitted yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myRequests.map((req) => {
                  const cfg = statusConfig[req.status];
                  const isApproved = req.status === "approved";
                  return (
                    <motion.div
                      key={req.id}
                      whileHover={isApproved ? { scale: 1.01 } : {}}
                      onClick={() => isApproved && setSelectedReq(req)}
                      className="rounded-2xl p-4 flex items-center gap-3 transition-all"
                      style={{
                        background: cfg.bg,
                        border: `1.5px solid ${cfg.iconColor}25`,
                        cursor: isApproved ? "pointer" : "default",
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: `${cfg.iconColor}15` }}
                      >
                        <cfg.Icon className="w-4 h-4" style={{ color: cfg.iconColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate text-sm" style={{ color: LABEL }}>{req.storeName}</p>
                        <p className="text-xs truncate" style={{ color: HINT }}>{req.email}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: cfg.badgeBg, color: cfg.badgeText }}
                        >
                          {cfg.label}
                        </span>
                        <span className="text-[10px]" style={{ color: HINT }}>
                          {new Date(req.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Approved Request Dialog ── */}
      <AnimatePresence>
        {selectedReq && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedReq(null); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ type: "spring", damping: 24, stiffness: 260 }}
              className="w-full max-w-md rounded-3xl overflow-hidden"
              style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
            >
              <div className="px-6 py-5 flex items-center gap-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: LABEL }}>{selectedReq.storeName}</p>
                  <p className="text-xs" style={{ color: HINT }}>Approved Store</p>
                </div>
                <button
                  onClick={() => setSelectedReq(null)}
                  className="ml-auto text-lg font-light transition-opacity hover:opacity-50"
                  style={{ color: HINT }}
                >×</button>
              </div>

              <div className="p-6 space-y-4">
                {/* Info rows */}
                <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
                  {[
                    { label: "Store", value: selectedReq.storeName },
                    { label: "Email", value: selectedReq.email },
                    { label: "WhatsApp", value: `+91 ${selectedReq.whatsapp?.replace(/^\+?91/, "").trim()}` },
                    { label: "Approved on", value: new Date(selectedReq.updatedAt ?? selectedReq.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) },
                  ].map(({ label, value }, i) => (
                    <div
                      key={label}
                      className="flex items-center justify-between px-4 py-3"
                      style={{ borderTop: i > 0 ? `1px solid ${BORDER}` : undefined }}
                    >
                      <span className="text-xs" style={{ color: HINT }}>{label}</span>
                      <span className="text-xs font-semibold" style={{ color: LABEL }}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* Reward Code */}
                {selectedReq.rewardCode && (
                  <div className="rounded-2xl px-4 py-3 flex items-center justify-between gap-3" style={{ background: selectedReq.rewardCode === "NO_REWARD_MONTHLY_PLAN" ? "#FEF2F2" : "#F0FDF4", border: `1.5px solid ${selectedReq.rewardCode === "NO_REWARD_MONTHLY_PLAN" ? "#FECACA" : "#BBF7D0"}` }}>
                    <span className="text-xs shrink-0" style={{ color: selectedReq.rewardCode === "NO_REWARD_MONTHLY_PLAN" ? "#991B1B" : "#166534" }}>Reward Code</span>
                    {selectedReq.rewardCode === "NO_REWARD_MONTHLY_PLAN" ? (
                      <span className="text-xs font-medium text-right leading-snug" style={{ color: "#DC2626" }}>
                        No reward available on the Starting Monthly Plan. To earn a reward, please submit the request with a higher plan.
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm tracking-[0.15em]" style={{ color: "#15803D" }}>
                          {selectedReq.rewardCode}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(selectedReq.rewardCode);
                            toast({ title: "Reward code copied ✅" });
                          }}
                          className="w-7 h-7 rounded-full bg-green-100 hover:bg-green-200 flex items-center justify-center text-green-700 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Store Link coming soon */}
                <div className="rounded-2xl px-4 py-3 flex items-center justify-between" style={{ background: INPUT_BG, border: `1px solid ${BORDER}` }}>
                  <span className="text-xs flex items-center gap-1.5" style={{ color: HINT }}>
                    <LinkIcon className="w-3.5 h-3.5" /> Store Link
                  </span>
                  <span className="text-xs italic" style={{ color: "#C5BFB5" }}>Coming soon...</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
      <label className="block text-sm font-bold" style={{ color: LABEL }}>{label}</label>
      {children}
      {hint && !error && <p className="text-xs" style={{ color: HINT }}>{hint}</p>}
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
      border: `1.5px solid ${BORDER}`,
      padding: "0 18px",
      fontSize: "15px",
      background: INPUT_BG,
      color: LABEL,
      ...style,
    }}
    onFocus={(e) => {
      e.target.style.borderColor = LABEL;
      e.target.style.background = "#FFFFFF";
      e.target.style.boxShadow = "0 0 0 3px rgba(0,0,0,0.06)";
      onFocus?.(e);
    }}
    onBlur={(e) => {
      e.target.style.borderColor = BORDER;
      e.target.style.background = INPUT_BG;
      e.target.style.boxShadow = "none";
      onBlur?.(e);
    }}
  />
);
