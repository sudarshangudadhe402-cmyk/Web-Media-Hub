import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, ArrowRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

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
        <div
          key={p.id}
          className="particle"
          style={{ width: p.size, height: p.size, left: `${p.left}%`, bottom: "-10px", animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` }}
        />
      ))}
    </div>
  );
};

interface Props {
  onBack: () => void;
}

export default function PricingOverlay({ onBack }: Props) {
  const scrollToPricing = () => {
    document.getElementById("pricing-overlay-section")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#03020A] text-white overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-[#03020A]/90 backdrop-blur shrink-0">
        <button
          onClick={onBack}
          className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <span className="font-bold text-base text-white">Choose Plan</span>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[#03020A] via-[#050B14] to-[#12081C] z-0" />
        <Particles />

        <main className="relative z-10 flex flex-col items-center w-full">

          {/* HERO */}
          <section className="w-full max-w-7xl mx-auto px-6 pt-16 pb-12 flex flex-col items-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8"
            >
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-sm font-medium tracking-wide text-white/80">Premium Store Growth Platform</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
              className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 max-w-4xl leading-[1.1]"
            >
              🚀 Grow Your Clothing Store{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] via-[#FFB800] to-[#FFA000]">
                With AI
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="text-base md:text-lg text-white/60 max-w-2xl mb-10 leading-relaxed"
            >
              Virtual Try-On, AI Promotional Videos, Loyalty Programs, Online Booking & More — Everything Your Store Needs To Increase Sales.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            >
              <Button
                onClick={scrollToPricing}
                size="lg"
                className="h-12 px-7 text-base font-semibold bg-white text-black hover:bg-gray-200 transition-all duration-300 rounded-xl shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] group"
              >
                View Pricing Plans
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>
          </section>

          {/* PRICING */}
          <section id="pricing-overlay-section" className="w-full max-w-[1600px] mx-auto px-4 py-16 scroll-mt-20">
            <div className="flex flex-col lg:flex-row items-center lg:items-stretch justify-center gap-6 lg:gap-8">

              {/* DEMO */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="flex-1 w-full max-w-sm lg:w-[22%] scale-95 opacity-90 hover:opacity-100 transition-opacity bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl flex flex-col mt-8 lg:mt-12"
              >
                <div className="inline-block px-3 py-1 bg-white/10 text-white/80 rounded-md text-xs font-bold uppercase tracking-wider mb-6 w-max">🧪 Try First</div>
                <h3 className="text-xl font-medium text-white/90 mb-2">Demo Plan</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-bold text-white">₹999</span>
                  <span className="text-white/50 text-sm">/ Month</span>
                </div>
                <p className="text-white/60 text-sm mb-8">Perfect for testing the platform before upgrading.</p>
                <div className="space-y-4 mb-8 flex-1">
                  {['Full Feature Access', '1 Store Login', 'Virtual Try-On', 'Loyalty Card', 'AI Promotional Videos', 'Online Booking', 'Live Notifications'].map((f, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-white/40 shrink-0 mt-0.5" />
                      <span className="text-sm text-white/70">{f}</span>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full bg-transparent border-white/20 text-white hover:bg-white/10 h-12">Try Demo</Button>
              </motion.div>

              {/* PREMIUM */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                whileHover={{ scale: 1.05 }}
                className="flex-[1.2] w-full max-w-md lg:w-[30%] relative rounded-2xl p-[1px] group z-20"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-[#FFD700] to-[#0066FF] rounded-2xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
                <div className="relative h-full bg-gradient-to-b from-[#1A1500] to-[#001133] border border-[#FFD700]/30 rounded-2xl p-8 flex flex-col shadow-[0_0_50px_rgba(255,215,0,0.15)]">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-[#FFD700] to-[#FFA000] text-black text-xs font-bold uppercase tracking-wider rounded-full shadow-[0_0_20px_rgba(255,215,0,0.4)] whitespace-nowrap">⭐ MOST POPULAR</div>
                  <div className="mt-4 mb-2 inline-block text-[#FFD700] text-xs font-bold uppercase tracking-wider">⭐ MOST POPULAR CHOICE</div>
                  <h3 className="text-2xl font-bold text-white mb-2">Premium Annual Plan</h3>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-white">₹5,999</span>
                    <span className="text-[#FFD700]/70 font-medium">/ Year</span>
                  </div>
                  <p className="text-[#FFD700]/80 text-sm font-medium mb-6">Only around ₹16 per day</p>
                  <div className="space-y-4 mb-8 flex-1">
                    {['1 Store Login', 'Virtual Try-On Experience', 'Loyalty Card System', 'AI Promotional Videos', 'Online Booking System', 'Smart Product Categories', 'Live Customer Notifications', 'Free Feature Updates', 'Priority Support'].map((f, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-[#FFD700]/20 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-[#FFD700]" />
                        </div>
                        <span className="text-sm font-medium text-white/90">{f}</span>
                      </div>
                    ))}
                    <div className="pt-4 mt-4 border-t border-white/10 space-y-3">
                      {['Low investment', 'High return potential', 'Ideal for growing clothing stores', 'Recover cost with just a few extra sales', 'Recommended for 80% of store owners'].map((b, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <span className="text-[#FFD700]/60 shrink-0 text-sm">•</span>
                          <span className="text-xs text-white/70">{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-[#FFD700] to-[#FFA000] text-black hover:opacity-90 h-14 text-lg font-bold shadow-[0_0_30px_rgba(255,215,0,0.3)] transition-all group-hover:shadow-[0_0_50px_rgba(255,215,0,0.5)]">
                    Start Growing Your Store
                  </Button>
                </div>
              </motion.div>

              {/* LIFETIME */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                whileHover={{ scale: 1.05 }}
                className="flex-[1.1] w-full max-w-md lg:w-[28%] relative rounded-2xl p-[1px] group z-10 lg:mt-4"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-[#00FF88] to-[#FFD700] rounded-2xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
                <div className="relative h-full bg-gradient-to-b from-[#002211] to-[#1A1A00] border border-[#00FF88]/30 rounded-2xl p-8 flex flex-col shadow-[0_0_40px_rgba(0,255,136,0.1)]">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-[#00FF88] to-[#00CC66] text-black text-xs font-bold uppercase tracking-wider rounded-full shadow-[0_0_20px_rgba(0,255,136,0.4)] whitespace-nowrap">💎 BEST VALUE</div>
                  <div className="mt-4 mb-2 inline-block text-[#00FF88] text-xs font-bold uppercase tracking-wider">🏆 HIGHEST VALUE</div>
                  <h3 className="text-2xl font-bold text-white mb-2">Lifetime Business Plan</h3>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#00FF88] to-white">₹9,999</span>
                    <span className="text-[#00FF88]/70 font-medium text-sm">One-Time</span>
                  </div>
                  <p className="text-[#00FF88]/80 text-sm font-medium mb-6">Pay Once. Use Forever.</p>
                  <div className="bg-[#00FF88]/10 border border-[#00FF88]/20 rounded-lg p-3 mb-6 flex items-center justify-center">
                    <span className="text-[#00FF88] font-semibold text-sm">🔥 Save ₹8,000+ Compared To Renewing Every Year</span>
                  </div>
                  <div className="space-y-4 mb-8 flex-1">
                    {['Everything in Premium Annual', 'Lifetime Access, No Renewal Ever', '1,000 Web Media Hub Coins Included', 'Future Feature Updates', 'Priority Support'].map((f, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-[#00FF88]/20 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-[#00FF88]" />
                        </div>
                        <span className="text-sm font-medium text-white/90">{f}</span>
                      </div>
                    ))}
                    <div className="pt-4 mt-4 border-t border-white/10 space-y-3">
                      {['One-time investment', 'No yearly payments', 'Better ROI after first year', 'Business asset for life', 'Long-term savings'].map((b, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <span className="text-[#00FF88]/60 shrink-0 text-sm">•</span>
                          <span className="text-xs text-white/70">{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-[#00FF88] to-[#00CC66] text-black hover:opacity-90 h-14 text-lg font-bold shadow-[0_0_30px_rgba(0,255,136,0.3)] transition-all group-hover:shadow-[0_0_50px_rgba(0,255,136,0.5)]">
                    Get Lifetime Access
                  </Button>
                </div>
              </motion.div>

              {/* ENTERPRISE */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                whileHover={{ scale: 1.05 }}
                className="flex-1 w-full max-w-sm lg:w-[22%] relative rounded-2xl p-[1px] group z-10 mt-8 lg:mt-12"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-[#FF2D2D] to-[#8B0000] rounded-2xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
                <div className="relative h-full bg-gradient-to-b from-[#1A0000] to-[#0D0000] border border-[#FF2D2D]/30 rounded-2xl p-8 flex flex-col shadow-[0_0_40px_rgba(255,45,45,0.1)]">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-[#FF2D2D] to-[#CC0000] text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-[0_0_20px_rgba(255,45,45,0.5)] whitespace-nowrap">🔴 ENTERPRISE</div>
                  <div className="mt-4 mb-2 inline-block text-[#FF2D2D] text-xs font-bold uppercase tracking-wider">👑 PREMIUM BRAND</div>
                  <h3 className="text-2xl font-bold text-white mb-2">Enterprise Plan</h3>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#FF2D2D] to-white">₹17,999</span>
                    <span className="text-[#FF2D2D]/70 font-medium text-sm">One-Time</span>
                  </div>
                  <p className="text-[#FF2D2D]/80 text-sm font-medium mb-6">Designed for large stores and premium brands.</p>
                  <div className="space-y-4 mb-8 flex-1">
                    {['Everything in Lifetime Plan', '7,000 Web Media Hub Coins', 'Premium AI Resources', 'Early Access Features', 'VIP Support'].map((f, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-[#FF2D2D]/20 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-[#FF2D2D]" />
                        </div>
                        <span className="text-sm font-medium text-white/90">{f}</span>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full bg-gradient-to-r from-[#FF2D2D] to-[#CC0000] text-white hover:opacity-90 h-12 text-base font-bold shadow-[0_0_30px_rgba(255,45,45,0.3)] transition-all group-hover:shadow-[0_0_50px_rgba(255,45,45,0.5)]">
                    Upgrade To Enterprise
                  </Button>
                </div>
              </motion.div>

            </div>
          </section>

          {/* TRUST */}
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
            <p className="text-white/40 text-sm font-medium tracking-wider uppercase">
              Web Media Hub — AI Powered Store Growth Platform
            </p>
          </footer>

        </main>
      </div>
    </div>
  );
}
