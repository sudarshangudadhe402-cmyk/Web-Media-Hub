import { useState } from "react";
import { BookMarked, MessageCircle, ShoppingBag, User } from "lucide-react";
import CustomerChat from "@/components/chat/CustomerChat";

interface SavedBooking {
  id: string;
  productName: string;
  productImage: string;
  tryOnImage?: string;
  customerName: string;
  city: string;
  whatsapp: string;
  selectedSize: string;
  bookedAt: string;
}

interface MyBookingTabProps {
  myBookings: SavedBooking[];
  seenStatus: Record<string, boolean>;
  completedStatus: Record<string, boolean>;
  storeSlug?: string;
  storeName?: string;
  customerAccount?: { id: string; name: string } | null;
  onNeedLogin?: () => void;
}

export default function MyBookingTab({
  myBookings,
  seenStatus,
  completedStatus,
  storeSlug,
  storeName,
  customerAccount,
  onNeedLogin,
}: MyBookingTabProps) {
  const [bookingFilter, setBookingFilter] = useState<"all" | "completed">("all");
  const [chatOpen, setChatOpen] = useState(false);

  const completedCount = myBookings.filter((b) => completedStatus[b.id]).length;

  const visibleBookings =
    bookingFilter === "completed"
      ? myBookings.filter((b) => completedStatus[b.id])
      : myBookings.filter((b) => !completedStatus[b.id]);

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "#f8f8f8" }}>
      {/* Customer Chat overlay */}
      {chatOpen && customerAccount && storeSlug && (
        <CustomerChat
          storeSlug={storeSlug}
          storeName={storeName ?? "Store"}
          customerId={customerAccount.id}
          customerName={customerAccount.name}
          onClose={() => setChatOpen(false)}
        />
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 px-4 pt-4 pb-3" style={{ background: "#f8f8f8" }}>
        <h2
          className="font-black text-gray-900 text-lg mb-3"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          My Bookings
        </h2>

        {/* Chat with Store button — shown above the filter tabs */}
        {storeSlug && (
          <button
            onClick={() => {
              if (!customerAccount) {
                onNeedLogin?.();
              } else {
                setChatOpen(true);
              }
            }}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl mb-3 transition-all active:opacity-80"
            style={{
              background: "linear-gradient(135deg, #1a1a1a, #333)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.12)" }}
              >
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <p
                  className="text-sm font-bold text-white leading-tight"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  Chat with Store
                </p>
                {!customerAccount ? (
                  <p className="text-[10px] text-white/50 mt-0.5">
                    Create an account to chat
                  </p>
                ) : (
                  <p className="text-[10px] text-white/50 mt-0.5">
                    Ask questions, get updates
                  </p>
                )}
              </div>
            </div>
            {!customerAccount ? (
              <div
                className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }}
              >
                <User className="w-3 h-3" />
                Login
              </div>
            ) : (
              <span className="text-[11px] text-white/50 flex-shrink-0">Open →</span>
            )}
          </button>
        )}

        {/* Filter tabs — Active / Done */}
        <div
          className="relative rounded-2xl p-1"
          style={{
            background: "#ffffff",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <div
            className="absolute top-1 bottom-1 rounded-xl transition-all"
            style={{
              width: "calc(50% - 3px)",
              left: bookingFilter === "all" ? "4px" : "calc(50%)",
              transition: "left 0.3s cubic-bezier(0.4,0,0.2,1)",
              background: "linear-gradient(135deg,#1a1a1a,#333)",
            }}
          />
          <div className="relative flex">
            {([
              {
                key: "all" as const,
                icon: <BookMarked className="w-3 h-3" />,
                label: "Active",
                count: myBookings.filter((b) => !completedStatus[b.id]).length,
              },
              {
                key: "completed" as const,
                icon: <span className="text-[11px]">✅</span>,
                label: "Done",
                count: completedCount,
              },
            ]).map(({ key, icon, label, count }) => (
              <button
                key={key}
                onClick={() => setBookingFilter(key)}
                className="flex-1 py-2.5 text-[11px] font-bold z-10 flex flex-col items-center gap-0.5 rounded-xl"
                style={{
                  color:
                    bookingFilter === key ? "white" : "rgba(0,0,0,0.4)",
                  fontFamily: "'Montserrat', sans-serif",
                  transition: "color 0.25s",
                }}
              >
                {icon}
                {label}
                <span className="text-[9px] font-extrabold opacity-80">
                  ({count})
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Booking list */}
      <div className="px-4 space-y-3 pb-32">
        {visibleBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            {bookingFilter === "completed" ? (
              <>
                <span className="text-5xl mb-3 opacity-30">✅</span>
                <p className="text-gray-400 text-sm">No completed orders yet</p>
              </>
            ) : (
              <>
                <ShoppingBag className="w-12 h-12 mb-3 text-gray-200" />
                <p className="text-gray-400 text-sm font-medium">
                  No bookings yet
                </p>
                <p className="text-gray-300 text-xs mt-1">
                  Products you book will appear here
                </p>
              </>
            )}
          </div>
        ) : (
          visibleBookings.map((bk) => {
            const seen = seenStatus[bk.id] ?? false;
            return (
              <div
                key={bk.id}
                className="rounded-2xl p-3.5 flex gap-3"
                style={{
                  background: "#ffffff",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                  border: "1px solid transparent",
                }}
              >
                {bk.tryOnImage || bk.productImage ? (
                  <img
                    src={bk.tryOnImage || bk.productImage}
                    className="w-16 h-20 object-cover rounded-xl flex-shrink-0"
                    alt={bk.productName}
                  />
                ) : (
                  <div
                    className="w-16 h-20 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "#f5f5f5" }}
                  >
                    <ShoppingBag className="w-6 h-6 text-gray-200" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className="font-bold text-gray-900 text-sm line-clamp-1 mb-0.5"
                    style={{ fontFamily: "'Poppins', sans-serif" }}
                  >
                    {bk.productName}
                  </p>
                  {bk.selectedSize && (
                    <span
                      className="inline-block text-[10px] rounded-lg px-2 py-0.5 font-semibold mb-1"
                      style={{ background: "#f5f5f5", color: "#666" }}
                    >
                      Size: {bk.selectedSize}
                    </span>
                  )}
                  <p className="text-xs text-gray-500">
                    {bk.customerName}
                    {bk.city ? ` · ${bk.city}` : ""}
                  </p>
                  <p className="text-xs text-gray-400">{bk.whatsapp}</p>
                  <p className="text-[10px] text-gray-300 mt-1">
                    {new Date(bk.bookedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex-shrink-0 flex flex-col items-center justify-end gap-0.5">
                  <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
                    <path
                      d="M1 7L5.5 11.5L13 3"
                      stroke={seen ? "#53bdeb" : "#aaa"}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M7 7L11.5 11.5L19 3"
                      stroke={seen ? "#53bdeb" : "#aaa"}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <p
                    className="text-[9px]"
                    style={{ color: seen ? "#53bdeb" : "#aaa" }}
                  >
                    {seen ? "Seen" : "Sent"}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
