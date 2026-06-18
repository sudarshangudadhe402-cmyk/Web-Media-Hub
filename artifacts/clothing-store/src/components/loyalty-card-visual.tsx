interface LoyaltyCardVisualProps {
  storeName: string;
  address?: string | null;
  phone?: string | null;
  mini?: boolean;
}

export function LoyaltyCardVisual({ storeName, address, phone, mini = false }: LoyaltyCardVisualProps) {
  if (mini) {
    return (
      <div
        className="flex-shrink-0 overflow-hidden"
        style={{
          width: 112,
          height: 64,
          borderRadius: 10,
          background: "linear-gradient(135deg,#1a1a2e 0%,#16213e 40%,#0f3460 100%)",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "7px 9px",
        }}
      >
        {/* Gold shimmer bar top */}
        <div style={{ height: 2, borderRadius: 2, background: "linear-gradient(90deg,transparent,#e2b96f,transparent)", marginBottom: 3 }} />

        {/* Store name */}
        <p style={{
          fontFamily: "'Montserrat',sans-serif",
          fontWeight: 800,
          fontSize: 10,
          color: "#e2b96f",
          lineHeight: 1.2,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          letterSpacing: 0.3,
        }}>
          {storeName || "Store"}
        </p>

        {/* Address */}
        {address && (
          <p style={{
            fontSize: 7,
            color: "rgba(255,255,255,0.55)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            lineHeight: 1.2,
          }}>
            {address}
          </p>
        )}

        {/* Phone */}
        {phone && (
          <p style={{
            fontSize: 7,
            color: "rgba(255,255,255,0.55)",
            lineHeight: 1.2,
          }}>
            {phone}
          </p>
        )}

        {/* Gold shimmer bar bottom */}
        <div style={{ height: 2, borderRadius: 2, background: "linear-gradient(90deg,transparent,#e2b96f,transparent)", marginTop: 3 }} />

        {/* Decorative circle */}
        <div style={{
          position: "absolute",
          right: -14,
          top: -14,
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "rgba(226,185,111,0.08)",
          border: "1.5px solid rgba(226,185,111,0.15)",
        }} />
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        borderRadius: 20,
        background: "linear-gradient(135deg,#1a1a2e 0%,#16213e 45%,#0f3460 100%)",
        position: "relative",
        overflow: "hidden",
        padding: "24px 22px 20px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
        minHeight: 160,
      }}
    >
      {/* Background decorative circles */}
      <div style={{
        position: "absolute", right: -30, top: -30,
        width: 140, height: 140, borderRadius: "50%",
        background: "rgba(226,185,111,0.07)",
        border: "1.5px solid rgba(226,185,111,0.12)",
      }} />
      <div style={{
        position: "absolute", right: 20, bottom: -40,
        width: 100, height: 100, borderRadius: "50%",
        background: "rgba(226,185,111,0.05)",
        border: "1px solid rgba(226,185,111,0.1)",
      }} />
      <div style={{
        position: "absolute", left: -20, bottom: -20,
        width: 80, height: 80, borderRadius: "50%",
        background: "rgba(40,116,240,0.08)",
      }} />

      {/* Gold top line */}
      <div style={{
        height: 2, borderRadius: 2,
        background: "linear-gradient(90deg,transparent,#e2b96f,#f5d08a,#e2b96f,transparent)",
        marginBottom: 16,
      }} />

      {/* LOYALTY CARD label */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 2.5,
          color: "rgba(226,185,111,0.7)",
          textTransform: "uppercase",
          fontFamily: "'Montserrat',sans-serif",
        }}>
          LOYALTY CARD
        </span>
        {/* Chip icon */}
        <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
          <rect x="0.5" y="0.5" width="27" height="19" rx="3.5" fill="#2a2a1a" stroke="#e2b96f" strokeOpacity="0.5"/>
          <rect x="5" y="5" width="18" height="10" rx="1.5" fill="none" stroke="#e2b96f" strokeOpacity="0.4" strokeWidth="0.8"/>
          <line x1="14" y1="5" x2="14" y2="15" stroke="#e2b96f" strokeOpacity="0.3" strokeWidth="0.8"/>
          <line x1="5" y1="10" x2="23" y2="10" stroke="#e2b96f" strokeOpacity="0.3" strokeWidth="0.8"/>
        </svg>
      </div>

      {/* Store Name */}
      <h2 style={{
        fontFamily: "'Montserrat',sans-serif",
        fontWeight: 800,
        fontSize: 20,
        color: "#e2b96f",
        letterSpacing: 0.5,
        marginBottom: 6,
        lineHeight: 1.2,
        textShadow: "0 2px 8px rgba(226,185,111,0.3)",
      }}>
        {storeName || "Your Store"}
      </h2>

      {/* Address + Phone */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 16 }}>
        {address && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 5 }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ marginTop: 1, flexShrink: 0 }}>
              <path d="M5 0.5C3.07 0.5 1.5 2.07 1.5 4C1.5 6.5 5 9.5 5 9.5C5 9.5 8.5 6.5 8.5 4C8.5 2.07 6.93 0.5 5 0.5ZM5 5.25C4.31 5.25 3.75 4.69 3.75 4C3.75 3.31 4.31 2.75 5 2.75C5.69 2.75 6.25 3.31 6.25 4C6.25 4.69 5.69 5.25 5 5.25Z" fill="rgba(226,185,111,0.6)"/>
            </svg>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", lineHeight: 1.4, fontFamily: "'Inter',sans-serif" }}>
              {address}
            </span>
          </div>
        )}
        {phone && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
              <path d="M2 1H4L5 3.5L3.5 4.5C4.17 5.85 5.15 6.83 6.5 7.5L7.5 6L10 7V9C10 9.55 9.55 10 9 10C4.03 10 0 5.97 0 1C0 0.45 0.45 0 1 0H3L2 1Z" fill="rgba(226,185,111,0.6)" transform="translate(0,0) scale(1)"/>
            </svg>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily: "'Inter',sans-serif" }}>
              {phone}
            </span>
          </div>
        )}
      </div>

      {/* Gold bottom line */}
      <div style={{
        height: 1.5, borderRadius: 2,
        background: "linear-gradient(90deg,transparent,#e2b96f,#f5d08a,#e2b96f,transparent)",
        opacity: 0.6,
      }} />
    </div>
  );
}
