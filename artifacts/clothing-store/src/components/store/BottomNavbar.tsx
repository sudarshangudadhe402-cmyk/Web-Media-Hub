import { Home, ShoppingBag, CalendarDays, Heart, User } from "lucide-react";

export type TabType = "home" | "shop" | "mybookings" | "wishlist" | "profile";

interface BottomNavbarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  bookingCount?: number;
  wishlistCount?: number;
}

const tabs = [
  { key: "home" as const, label: "Home", Icon: Home },
  { key: "shop" as const, label: "Shop", Icon: ShoppingBag },
  { key: "mybookings" as const, label: "My Booking", Icon: CalendarDays },
  { key: "wishlist" as const, label: "Wishlist", Icon: Heart },
  { key: "profile" as const, label: "Profile", Icon: User },
];

export default function BottomNavbar({ activeTab, onTabChange, bookingCount = 0, wishlistCount = 0 }: BottomNavbarProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{ background: "#ffffff", borderColor: "#e8e8e8", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch">
        {tabs.map(({ key, label, Icon }) => {
          const isActive = activeTab === key;
          const badge = key === "mybookings" ? bookingCount : key === "wishlist" ? wishlistCount : 0;
          return (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 relative transition-all active:scale-95"
            >
              <div className="relative">
                <Icon
                  className="w-5 h-5 transition-all"
                  style={{
                    color: isActive ? "#000000" : "#9ca3af",
                    fill: isActive && (key === "home" || key === "wishlist") ? (key === "wishlist" ? "#ef4444" : "#000000") : "none",
                    strokeWidth: isActive ? 2.5 : 1.8,
                  }}
                />
                {badge > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                    style={{ background: "#000000", color: "white" }}
                  >
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </div>
              <span
                className="text-[10px] font-medium transition-all leading-none"
                style={{ color: isActive ? "#000000" : "#9ca3af", fontFamily: "'Inter', sans-serif", fontWeight: isActive ? 700 : 500 }}
              >
                {label}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full" style={{ background: "#000000" }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
