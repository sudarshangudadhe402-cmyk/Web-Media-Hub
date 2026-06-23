import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, ChevronLeft, Tag, Loader2, X } from "lucide-react";
import { DEFAULT_PRICING_CONFIG, PLAN_VISUAL_CONFIG, type PricingConfigData, type SelectedPlan } from "./pricing-data";

export type { SelectedPlan };

const Particles = () => {
  const [particles, setParticles] = useState<Array<{ id: number; size: number; left: number; delay: number; duration: number }>>([]);
  useEffect(() => {
    setParticles(
      Array.from({ length: 30 }).map((_, i) => ({
        id: i,
        size: Math.random() * 4 + 1,
        left: Math.random() * 100,
        delay: Math.random() * 10,
        duration: Math.random() * 15 + 15,
      }))
    );
  }, []);
  return (
    <div className="particles">
      {particles.map((p) => (
        <div key={p.id} className="particle" style={{ width: p.size, height: p.size, left: `${p.left}%`, bottom: "-10px", animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` }} />
      ))}
    </div>
  );
};

interface CouponState {
  planKey: string;
  input: string;
  loading: boolean;
  result: { discountedPrice: string; remaining: number } | null;
  error: string;
}

interface Props {
  onBack: () => void;
  onSelectPlan: (plan: SelectedPlan) => void;
  config?: PricingConfigData;
}

export default function PricingOverlay({ onBack, onSelectPlan, config }: Props) {
  const cfg = config ?? DEFAULT_PRICING_CONFIG;
  const vis = PLAN_VISUAL_CONFIG;

  const [coupon, setCoupon] = useState<CouponState | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToPricing = () => {
    document.getElementById("pricing-overlay-section")?.scrollIntoView({ behavior: "smooth" });
  };

  function openCoupon(planKey: string) {
    if (coupon?.planKey === planKey) return; // already open for this plan
    setCoupon({ planKey, input: "", loading: false, result: null, error: "" });
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function closeCoupon() {
    setCoupon(null);
  }

  async function validateCoupon(planKey: string) {
    if (!coupon?.input.trim()) return;
    setCoupon((prev) => prev ? { ...prev, loading: true, error: "", result: null } : prev);
    try {
      const res = await fetch(`/api/coupons/validate?code=${encodeURIComponent(coupon.input.trim())}&planKey=${planKey}`);
      const data = await res.json();
      if (data.valid) {
        setCoupon((prev) => prev ? { ...prev, loading: false, result: { discountedPrice: data.discountedPrice, remaining: data.remaining } } : prev);
      } else {
        setCoupon((prev) => prev ? { ...prev, loading: false, error: data.error || "Invalid code" } : prev);
      }
    } catch {
      setCoupon((prev) => prev ? { ...prev, loading: false, error: "Connection error. Try again." } : prev);
    }
  }

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

  function handlePlanClick(planKey: keyof PricingConfigData) {
    // If coupon for this plan is valid — select with discounted price
    if (coupon?.planKey === planKey && coupon.result) {
      selectAndBack(planKey, coupon.result.discountedPrice, coupon.input.trim());
      return;
    }
    // Open coupon box for this plan
    openCoupon(planKey);
  }

  const PLAN_KEYS: Array<keyof PricingConfigData> = ["demo", "premium", "lifetime", "enterprise"];

  function CouponBox({ planKey, accentColor, buttonLabel }: { planKey: keyof PricingConfigData; accentColor: string; buttonLabel: string }) {
    const isActive = coupon?.planKey === planKey;
    const planCfg = cfg[planKey];
    const hasCoupon = !!planCfg.coupon;

    return (
      <div className="flex flex-col gap-2 mt-3">
        {/* Main action button */}
        {isActive && coupon?.result ? (
          <button
            className="w-full h-12 rounded-xl font-bold text-base transition-all"
            style={{ background: accentColor, color: accentColor === "#94a3b8" ? "#fff" : "#000" }}
            onClick={() => selectAndBack(planKey, coupon.result!.discountedPrice, coupon.input.trim())}
          >
            Select at {coupon.result.discountedPrice}
          </button>
        ) : (
          <button
            className="w-full h-12 rounded-xl font-bold text-base transition-all"
            style={{ background: accentColor, color: accentColor === "#94a3b8" ? "#fff" : "#000" }}
            onClick={() => {
              if (isActive) {
                // Already open, select without coupon
                selectAndBack(planKey);
              } else {
                openCoupon(planKey);
              }
            }}
          >
            {isActive ? buttonLabel.replace("Get ", "Continue without code — ") : buttonLabel}
          </button>
        )}

        {/* Coupon input row — shows when this plan is active */}
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
                {/* Code input row */}
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-white/50 shrink-0" />
                  <input
                    ref={coupon?.planKey === planKey ? inputRef : undefined}
                    type="text"
                    value={coupon?.input ?? ""}
                    onChange={(e) => setCoupon((prev) => prev ? { ...prev, input: e.target.value.toUpperCase(), result: null, error: "" } : prev)}
                    onKeyDown={(e) => e.key === "Enter" && validateCoupon(planKey)}
                    placeholder="Enter coupon code"
                    className="flex-1 bg-transparent text-white placeholder:text-white/30 text-sm outline-none font-mono tracking-widest"
                  />
                  <button
                    onClick={() => validateCoupon(planKey)}
                    disabled={coupon?.loading || !coupon?.input.trim()}
                    className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-40 transition-colors flex items-center gap-1"
                  >
                    {coupon?.loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Use Code"}
                  </button>
                  <button onClick={closeCoupon} className="shrink-0 text-white/40 hover:text-white/80 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Error */}
                {coupon?.error && (
                  <p className="text-red-400 text-xs pl-6">{coupon.error}</p>
                )}

                {/* Valid coupon: show price comparison */}
                {coupon?.result && (
                  <div className="flex items-center gap-3 pl-6">
                    <span className="text-white/40 line-through text-sm">{planCfg.price}</span>
                    <ArrowRight className="h-3 w-3 text-green-400" />
                    <span className="text-green-400 font-bold text-base">{coupon.result.discountedPrice}</span>
                    <span className="text-white/40 text-xs">({coupon.result.remaining} uses left)</span>
                  </div>
                )}

                {!hasCoupon && !coupon?.error && !coupon?.result && (
                  <p className="text-white/30 text-xs pl-6">No coupon available for this plan</p>
                )}
              </div>

              {/* Original price select */}
              <button
                className="w-full text-center text-white/40 hover:text-white/70 text-xs py-1.5 transition-colors"
                onClick={() => selectAndBack(planKey)}
              >
                Continue at original price ({planCfg.price}) →
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#03020A] text-white overflow-hidden">
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
                <CouponBox planKey="demo" accentColor="#fff" buttonLabel="Get Monthly Access" />
              </motion.div>

              {/* PREMIUM */}
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
                whileHover={coupon?.planKey !== "premium" ? { scale: 1.05 } : {}}
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
                  <CouponBox planKey="premium" accentColor="#FFD700" buttonLabel="Start Growing Your Store" />
                </div>
              </motion.div>

              {/* LIFETIME */}
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}
                whileHover={coupon?.planKey !== "lifetime" ? { scale: 1.05 } : {}}
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
                  <CouponBox planKey="lifetime" accentColor="#00FF88" buttonLabel="Get Lifetime Access" />
                </div>
              </motion.div>

              {/* ENTERPRISE */}
              <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.3 }}
                whileHover={coupon?.planKey !== "enterprise" ? { scale: 1.05 } : {}}
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
                  <CouponBox planKey="enterprise" accentColor="#FF2D2D" buttonLabel="Upgrade To Enterprise" />
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
