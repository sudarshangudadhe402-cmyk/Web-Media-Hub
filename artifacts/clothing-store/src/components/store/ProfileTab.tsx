import { MapPin, Clock, CalendarDays, MessageCircle, ShoppingBag, Phone, Star, Shield } from "lucide-react";

interface StoreData {
  id: string;
  name: string;
  address: string | null;
  whatsappNumber: string | null;
  openingTime: string | null;
  openDays: string | null;
  bannerImage: string | null;
  description: string | null;
  publicSlug: string;
}

interface ProfileTabProps {
  data: StoreData;
}

export default function ProfileTab({ data }: ProfileTabProps) {
  const waLink = data.whatsappNumber
    ? `https://wa.me/${data.whatsappNumber.replace(/\D/g, "")}`
    : null;

  const DAY_FULL: Record<string, string> = {
    Sun: "Sunday", Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday",
    Thu: "Thursday", Fri: "Friday", Sat: "Saturday",
  };
  const openDaySet = new Set((data.openDays ?? "").split(",").map((d) => d.trim()).filter(Boolean));

  return (
    <div className="flex-1 overflow-y-auto pb-24" style={{ background: "#f8f8f8" }}>

      {/* Store Banner / Hero */}
      <div className="relative w-full" style={{ height: 200, background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)" }}>
        {data.bannerImage ? (
          <img src={data.bannerImage} alt={data.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-20 h-20 text-white/10" />
          </div>
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)" }} />
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-white font-black text-2xl leading-tight" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            {data.name}
          </h1>
          {data.publicSlug && (
            <p className="text-white/60 text-xs mt-0.5">@{data.publicSlug}</p>
          )}
        </div>
      </div>

      {/* Store Info Cards */}
      <div className="px-4 mt-4 space-y-3">

        {/* Quick Info */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "#ffffff", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: "#f0f0f0" }}>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Store Info</p>
          </div>

          <div className="divide-y" style={{ borderColor: "#f5f5f5" }}>
            {data.address && (
              <div className="flex items-start gap-3 px-4 py-3.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "#f5f5f5" }}>
                  <MapPin className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Address</p>
                  <p className="text-sm text-gray-800 font-medium leading-snug">{data.address}</p>
                </div>
              </div>
            )}

            {data.openingTime && (
              <div className="flex items-start gap-3 px-4 py-3.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#f5f5f5" }}>
                  <Clock className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Timings</p>
                  <p className="text-sm text-gray-800 font-medium">{data.openingTime}</p>
                </div>
              </div>
            )}

            {data.openDays && (
              <div className="flex items-start gap-3 px-4 py-3.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "#f5f5f5" }}>
                  <CalendarDays className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Open Days</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((abbr) => {
                      const isOpen = openDaySet.has(DAY_FULL[abbr]);
                      return (
                        <span
                          key={abbr}
                          className="text-[10px] font-bold px-2 py-1 rounded-lg"
                          style={isOpen
                            ? { background: "#000000", color: "white" }
                            : { background: "#f0f0f0", color: "#d0d0d0" }
                          }
                        >
                          {abbr}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {data.whatsappNumber && (
              <div className="flex items-start gap-3 px-4 py-3.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#f5f5f5" }}>
                  <Phone className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">WhatsApp</p>
                  <p className="text-sm text-gray-800 font-medium">{data.whatsappNumber}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {data.description && (
          <div className="rounded-2xl p-4" style={{ background: "#ffffff", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">About Store</p>
            <p className="text-sm text-gray-600 leading-relaxed">{data.description}</p>
          </div>
        )}

        {/* Features */}
        <div className="rounded-2xl p-4" style={{ background: "#ffffff", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Why Shop With Us</p>
          <div className="space-y-3">
            {[
              { icon: "🪞", title: "Virtual Try-On", desc: "See how clothes look on you before booking" },
              { icon: "🎫", title: "Loyalty Card", desc: "Earn rewards on every purchase" },
              { icon: "⚡", title: "Easy Booking", desc: "Book in seconds, pay at store" },
              { icon: "📱", title: "Digital Catalog", desc: "Browse full collection anytime, anywhere" },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex items-center gap-3">
                <span className="text-xl">{icon}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{title}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ratings placeholder */}
        <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: "#000000" }}>
          <div className="flex flex-col items-center">
            <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
            <p className="text-white font-black text-xl">4.8</p>
            <p className="text-white/50 text-[10px]">Rating</p>
          </div>
          <div className="w-px h-12 bg-white/10" />
          <div className="flex-1">
            <p className="text-white font-bold text-sm">Trusted Store</p>
            <p className="text-white/50 text-xs mt-0.5">Powered by Web Media Hub</p>
          </div>
          <Shield className="w-8 h-8 text-white/20" />
        </div>

        {/* WhatsApp CTA */}
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl font-bold text-sm"
            style={{ background: "#25D366", color: "white", fontFamily: "'Montserrat', sans-serif" }}
          >
            <MessageCircle className="w-5 h-5" />
            Chat on WhatsApp
          </a>
        )}

        <p className="text-center text-xs text-gray-300 pb-2">
          Powered by <span className="font-bold text-gray-400">Web Media Hub</span>
        </p>
      </div>
    </div>
  );
}
