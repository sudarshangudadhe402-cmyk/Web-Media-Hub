import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, ChevronLeft, Tag, Loader2, X } from "lucide-react";
import { DEFAULT_PRICING_CONFIG, PLAN_VISUAL_CONFIG, type PricingConfigData, type PricingPlanData, type SelectedPlan } from "./pricing-data";

export type { SelectedPlan };

// ── Particles (static, no state churn) ──────────────────────────────────────
const STATIC_PARTICLES = Array.from({ length: 30 }).map((_, i) => ({
  id: i,
  size: ((i * 7) % 4) + 1,
  left: (i * 37) % 100,
  delay: (i * 1.3) % 10,
  duration: ((i * 3) % 15) + 15,
}));

function Particles() {
  return (
    <div className="particles">
      {STATIC_PARTICLES.map((p) => (
        <div key={p.id} className="particle" style={{ width: p.size, height: p.size, left: `${p.left}%`, bottom: "-10px", animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` }} />
      ))}
    </div>
  );
}

// ── Price parser helper ───────────────────────────────────────────────────────
function parsePrice(price: string): number {
  return parseInt(price.replace(/[₹,\s]/g, ""), 10) || 0;
}

function formatSavings(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

// ── Coupon state type ─────────────────────────────────────────────────────────
interface CouponState {
  planKey: string;
  input: string;
  loading: boolean;
  result: { discountedPrice: string; remaining: number } | null;
  error: string;
}

// ── Savings popup ─────────────────────────────────────────────────────────────
interface SavingsPopupProps {
  savings: number;
  onContinue: () => void;
}

function SavingsPopup({ savings, onContinue }: SavingsPopupProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="bg-white rounded-3xl shadow-2xl px-8 py-10 max-w-xs w-full text-center"
      >
        <div className="text-5xl mb-3">🎉</div>
        <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Congratulations!</h2>
        <div className="text-5xl mb-1">🎉</div>
        <p className="text-gray-500 text-sm mt-3 mb-1">You saved</p>
        <p className="text-4xl font-extrabold text-green-500 mb-6">{formatSavings(savings)}</p>
        <button
          onClick={onContinue}
          className="w-full py-3.5 rounded-2xl bg-black text-white font-bold text-base hover:bg-gray-800 transition-colors"
        >
          Continue
        </button>
      </motion.div>
    </div>
  );
}

// ── CouponBox — defined at MODULE level to prevent re-mount on parent re-render
interface CouponBoxProps {
  planKey: keyof PricingConfigData;
  accentColor: string;
  buttonLabel: string;
  planCfg: PricingPlanData;
  coupon: CouponState | null;
  onCouponInputChange: (val: string) => void;
  onValidate: () => void;
  onClose: () => void;
  onSelectWithCoupon: () => void;
  onSelectWithoutCoupon: () => void;
  onOpenCoupon: () => void;
}

function CouponBox({
  planKey,
  accentColor,
  buttonLabel,
  planCfg,
  coupon,
  onCouponInputChange,
  onValidate,
  onClose,
  onSelectWithCoupon,
  onSelectWithoutCoupon,
  onOpenCoupon,
}: CouponBoxProps) {
  const isActive = coupon?.planKey === planKey;
  const textColor = accentColor === "#94a3b8" || accentColor === "#fff" ? "#000" : "#000";

  return (
    <div className="flex flex-col gap-2 mt-3">
      {/* Primary button */}
      {isActive && coupon?.result ? (
        <button
          className="w-full h-12 rounded-xl font-bold text-base transition-all"
          style={{ background: accentColor, color: textColor }}
          onClick={onSelectWithCoupon}
        >
          Select at {coupon.result.discountedPrice}
        </button>
      ) : (
        <button
          className="w-full h-12 rounded-xl font-bold text-base transition-all"
          style={{ background: accentColor, color: textColor }}
          onClick={isActive ? onSelectWithoutCoupon : onOpenCoupon}
        >
          {isActive ? `Continue — ${planCfg.price}` : buttonLabel}
        </button>
      )}

      {/* Coupon input panel */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-black rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-white/50 shrink-0" />
                <input
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  value={coupon?.input ?? ""}
                  onChange={(e) => onCouponInputChange(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && onValidate()}
                  placeholder="Enter coupon code"
                  className="flex-1 bg-transparent text-white placeholder:text-white/30 text-sm outline-none font-mono tracking-widest"
                />
                <button
                  onClick={onValidate}
                  disabled={coupon?.loading || !coupon?.input.trim()}
                  className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-40 transition-colors flex items-center gap-1"
                >
                  {coupon?.loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Use Code"}
                </button>
                <button onClick={onClose} className="shrink-0 text-white/40 hover:text-white/80 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {coupon?.error && (
                <p className="text-red-400 text-xs pl-6">{coupon.error}</p>
              )}

              {coupon?.result && (
                <div className="flex items-center gap-3 pl-6">
                  <span className="text-white/40 line-through text-sm">{planCfg.price}</span>
                  <ArrowRight className="h-3 w-3 text-green-400" />
                  <span className="text-green-400 font-bold text-base">{coupon.result.discountedPrice}</span>
                  <span className="text-white/40 text-xs">({coupon.result.remaining} left)</span>
                </div>
              )}
            </div>

            <button
              className="w-full text-center text-white/40 hover:text-white/70 text-xs py-1.5 transition-colors"
              onClick={onSelectWithoutCoupon}
            >
              Continue at original price ({planCfg.price}) →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main overlay ──────────────────────────────────────────────────────────────
interface Props {
  onBack: () => void;
  onSelectPlan: (plan: SelectedPlan) => void;
  config?: PricingConfigData;
}

export default function PricingOverlay({ onBack, onSelectPlan, config }: Props) {
  const cfg = config ?? DEFAULT_PRICING_CONFIG;
  const vis = PLAN_VISUAL_CONFIG;

  const [coupon, setCoupon] = useState<CouponState | null>(null);
  const [savingsPopup, setSavingsPopup] = useState<{
    planKey: keyof PricingConfigData;
    discountedPrice: string;
    couponCode: string;
    savings: number;
  } | null>(null);

  const scrollToPricing = () => {
    document.getElementById("pricing-overlay-section")?.scrollIntoView({ behavior: "smooth" });
  };

  // ── Coupon handlers (stable refs so CouponBox doesn't re-mount) ──────────
  const openCoupon = useCallback((planKey: string) => {
    setCoupon((prev) => {
      if (prev?.planKey === planKey) return prev;
      return { planKey, input: "", loading: false, result: null, error: "" };
    });
  }, []);

  const closeCoupon = useCallback(() => setCoupon(null), []);

  const handleCouponInput = useCallback((val: string) => {
    setCoupon((prev) => prev ? { ...prev, input: val, result: null, error: "" } : prev);
  }, []);

  const validateCoupon = useCallback(async () => {
    setCoupon((prev) => {
      if (!prev || !prev.input.trim()) return prev;
      return { ...prev, loading: true, error: "", result: null };
    });

    // Read current coupon state via a ref trick — we capture via closure from setCoupon
    setCoupon((prev) => {
      if (!prev) return prev;
      // Fire the async call outside
      const planKey = prev.planKey;
      const code = prev.input.trim();
      fetch(`/api/coupons/validate?code=${encodeURIComponent(code)}&planKey=${planKey}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.valid) {
            setCoupon((p) => p ? { ...p, loading: false, result: { discountedPrice: data.discountedPrice, remaining: data.remaining } } : p);
          } else {
            setCoupon((p) => p ? { ...p, loading: false, error: data.error || "Invalid code" } : p);
          }
        })
        .catch(() => {
          setCoupon((p) => p ? { ...p, loading: false, error: "Connection error. Try again." } : p);
        });
      return { ...prev, loading: true };
    });
  }, []);

  function selectAndBack(planKey: keyof PricingConfigData, overridePrice?: string, couponCode?: string) {
    const plan = cfg[planKey];
    onSelectPlan({
      planKey,
      badge: plan.displayBadge,
      name: plan.displayName,
      price: overridePrice ?? plan.price,
      period: plan.displayPeriod,
      tagline: plan.tagline,
      color: vis[planKey].accentColor,
      features: plan.features,
      couponCode,
    });
    onBack();
  }

  function handleSelectWithCoupon(planKey: keyof PricingConfigData) {
    if (!coupon?.result) return;
    const original = parsePrice(cfg[planKey].price);
    const discounted = parsePrice(coupon.result.discountedPrice);
    const savings = original - discounted;
    setSavingsPopup({
      planKey,
      discountedPrice: coupon.result.discountedPrice,
      couponCode: coupon.input.trim(),
      savings,
    });
  }

  function handleSavingsContinue() {
    if (!savingsPopup) return;
    selectAndBack(savingsPopup.planKey, savingsPopup.discountedPrice, savingsPopup.couponCode);
    setSavingsPopup(null);
  }

  // Per-plan CouponBox prop factories (memoised per planKey)
  function boxProps(planKey: keyof PricingConfigData, accentColor: string, buttonLabel: string) {
    return {
      planKey,
      accentColor,
      buttonLabel,
      planCfg: cfg[planKey],
      coupon,
      onCouponInputChange: handleCouponInput,
      onValidate: validateCoupon,
      onClose: closeCoupon,
      onSelectWithCoupon: () => handleSelectWithCoupon(planKey),
      onSelectWithoutCoupon: () => selectAndBack(planKey),
      onOpenCoupon: () => openCoupon(planKey),
    };
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#03020A] text-white overflow-hidden">
      {/* Savings popup */}
      {savingsPopup && <SavingsPopup savings={savingsPopup.savings} onContinue={handleSavingsContinue} />}

      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-[#03020A]/90 backdrop-blur shrink-0">
        <button onClick={onBack} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <span className="font-bold text-base text-white">Choose Plan</span>
      </div>

      <div className="flex-1 overflow-y-auto relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[#03020A] via-[#050B14] to-[#12081C] z-0" />
        <Particles />

        <main className="relative z-10 flex flex-col items-center w-full">
          <section className="w-full max-w-7xl mx-auto px-6 pt-16 pb-12 flex flex-col items-center text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-sm font-medium tracking-wide text-white/80">Premium Store Growth Platform</span>
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }}
              className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 max-w-4xl leading-[1.1]">
              🚀 Grow Your Clothing Store{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] via-[#FFB800] to-[#FFA000]">With AI</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
              className="text-base md:text-lg text-white/60 max-w-2xl mb-10 leading-relaxed">
              Virtual Try-On, AI Promotional Videos, Loyalty Programs, Online Booking & More — Everything Your Store Needs To Increase Sales.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }}>
              <button onClick={scrollToPricing}
                className="inline-flex items-center gap-2 h-12 px-7 text-base font-semibold bg-white text-black hover:bg-gray-200 transition-all duration-300 rounded-xl shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] group">
                View Pricing Plans
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          </section>

          <section id="pricing-overlay-section" className="w-full max-w-[1600px] mx-auto px-4 py-16 scroll-mt-20">
            <div className="flex flex-col lg:flex-row items-center lg:items-stretch justify-center gap-6 lg:gap-8">

              {/* STARTING PLAN */}
              <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
                className="flex-1 w-full max-w-sm lg:w-[22%] scale-95 opacity-90 hover:opacity-100 transition-opacity bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl flex flex-col mt-8 lg:mt-12">
                <div className="inline-block px-3 py-1 bg-white/10 text-white/80 rounded-md text-xs font-bold uppercase tracking-wider mb-6 w-max">{cfg.demo.displayBadge}</div>
                <h3 className="text-xl font-medium text-white/90 mb-2">{cfg.demo.displayName}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-bold text-white">{cfg.demo.price}</span>
                  <span className="text-white/50 text-sm">{cfg.demo.displayPeriod}</span>
                </div>
                <p className="text-white/60 text-sm mb-8">{cfg.demo.tagline}</p>
                <div className="space-y-4 mb-8 flex-1">
                  {cfg.demo.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-white/40 shrink-0 mt-0.5" />
                      <span className="text-sm text-white/70">{f}</span>
                    </div>
                  ))}
                </div>
                <CouponBox {...boxProps("demo", "#fff", "Get Monthly Access")} />
              </motion.div>

              {/* PREMIUM */}
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
                className="flex-[1.2] w-full max-w-md lg:w-[30%] relative rounded-2xl p-[1px] group z-20">
                <div className="absolute inset-0 bg-gradient-to-b from-[#FFD700] to-[#0066FF] rounded-2xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
                <div className="relative h-full bg-gradient-to-b from-[#1A1500] to-[#001133] border border-[#FFD700]/30 rounded-2xl p-8 flex flex-col shadow-[0_0_50px_rgba(255,215,0,0.15)]">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-[#FFD700] to-[#FFA000] text-black text-xs font-bold uppercase tracking-wider rounded-full shadow-[0_0_20px_rgba(255,215,0,0.4)] whitespace-nowrap">⭐ MOST POPULAR</div>
                  <div className="mt-4 mb-2 inline-block text-[#FFD700] text-xs font-bold uppercase tracking-wider">{cfg.premium.displayBadge}</div>
                  <h3 className="text-2xl font-bold text-white mb-2">{cfg.premium.displayName}</h3>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-white">{cfg.premium.price}</span>
                    <span className="text-[#FFD700]/70 font-medium">{cfg.premium.displayPeriod}</span>
                  </div>
                  <p className="text-[#FFD700]/80 text-sm font-medium mb-6">{cfg.premium.tagline}</p>
                  <div className="space-y-4 mb-8 flex-1">
                    {cfg.premium.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-[#FFD700]/20 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-[#FFD700]" />
                        </div>
                        <span className="text-sm font-medium text-white/90">{f}</span>
                      </div>
                    ))}
                  </div>
                  <CouponBox {...boxProps("premium", "#FFD700", "Start Growing Your Store")} />
                </div>
              </motion.div>

              {/* LIFETIME */}
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}
                className="flex-[1.1] w-full max-w-md lg:w-[28%] relative rounded-2xl p-[1px] group z-10 lg:mt-4">
                <div className="absolute inset-0 bg-gradient-to-b from-[#00FF88] to-[#FFD700] rounded-2xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
                <div className="relative h-full bg-gradient-to-b from-[#002211] to-[#1A1A00] border border-[#00FF88]/30 rounded-2xl p-8 flex flex-col shadow-[0_0_40px_rgba(0,255,136,0.1)]">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-[#00FF88] to-[#00CC66] text-black text-xs font-bold uppercase tracking-wider rounded-full shadow-[0_0_20px_rgba(0,255,136,0.4)] whitespace-nowrap">💎 BEST VALUE</div>
                  <div className="mt-4 mb-2 inline-block text-[#00FF88] text-xs font-bold uppercase tracking-wider">{cfg.lifetime.displayBadge}</div>
                  <h3 className="text-2xl font-bold text-white mb-2">{cfg.lifetime.displayName}</h3>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#00FF88] to-white">{cfg.lifetime.price}</span>
                    <span className="text-[#00FF88]/70 font-medium text-sm">{cfg.lifetime.displayPeriod}</span>
                  </div>
                  <p className="text-[#00FF88]/80 text-sm font-medium mb-6">{cfg.lifetime.tagline}</p>
                  {cfg.lifetime.savingsNote && (
                    <div className="bg-[#00FF88]/10 border border-[#00FF88]/20 rounded-lg p-3 mb-6 flex items-center justify-center">
                      <span className="text-[#00FF88] font-semibold text-sm">{cfg.lifetime.savingsNote}</span>
                    </div>
                  )}
                  <div className="space-y-4 mb-8 flex-1">
                    {cfg.lifetime.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-[#00FF88]/20 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-[#00FF88]" />
                        </div>
                        <span className="text-sm font-medium text-white/90">{f}</span>
                      </div>
                    ))}
                  </div>
                  <CouponBox {...boxProps("lifetime", "#00FF88", "Get Lifetime Access")} />
                </div>
              </motion.div>

              {/* ENTERPRISE */}
              <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.3 }}
                className="flex-1 w-full max-w-sm lg:w-[22%] relative rounded-2xl p-[1px] group z-10 mt-8 lg:mt-12">
                <div className="absolute inset-0 bg-gradient-to-b from-[#FF2D2D] to-[#8B0000] rounded-2xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
                <div className="relative h-full bg-gradient-to-b from-[#1A0000] to-[#0D0000] border border-[#FF2D2D]/30 rounded-2xl p-8 flex flex-col shadow-[0_0_40px_rgba(255,45,45,0.1)]">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-[#FF2D2D] to-[#CC0000] text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-[0_0_20px_rgba(255,45,45,0.5)] whitespace-nowrap">🔴 ENTERPRISE</div>
                  <div className="mt-4 mb-2 inline-block text-[#FF2D2D] text-xs font-bold uppercase tracking-wider">{cfg.enterprise.displayBadge}</div>
                  <h3 className="text-2xl font-bold text-white mb-2">{cfg.enterprise.displayName}</h3>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#FF2D2D] to-white">{cfg.enterprise.price}</span>
                    <span className="text-[#FF2D2D]/70 font-medium text-sm">{cfg.enterprise.displayPeriod}</span>
                  </div>
                  <p className="text-[#FF2D2D]/80 text-sm font-medium mb-6">{cfg.enterprise.tagline}</p>
                  <div className="space-y-4 mb-8 flex-1">
                    {cfg.enterprise.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-[#FF2D2D]/20 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-[#FF2D2D]" />
                        </div>
                        <span className="text-sm font-medium text-white/90">{f}</span>
                      </div>
                    ))}
                  </div>
                  <CouponBox {...boxProps("enterprise", "#FF2D2D", "Upgrade To Enterprise")} />
                </div>
              </motion.div>

            </div>
          </section>

          <section className="w-full py-12 mt-8 border-y border-white/5 bg-black/20 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center items-center gap-8 md:gap-16">
              {["Trusted By Clothing Store Owners", "Easy Setup", "AI Powered Growth Tools", "Secure & Reliable"].map((text, i) => (
                <div key={i} className="flex items-center gap-3 text-white/60">
                  <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white/80" />
                  </div>
                  <span className="text-sm md:text-base font-medium tracking-wide">{text}</span>
                </div>
              ))}
            </div>
          </section>

          <footer className="w-full py-10 text-center">
            <p className="text-white/40 text-sm font-medium tracking-wider uppercase">Web Media Hub — AI Powered Store Growth Platform</p>
          </footer>
        </main>
      </div>
    </div>
  );
}
