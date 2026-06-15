import { useEffect, useRef } from "react";
import { useAuth } from "./use-auth";
import { refreshGate } from "@/lib/gate";

const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes of inactivity

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
  "wheel",
] as const;

export function useInactivityLogout() {
  const { logout, user } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;

    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      refreshGate();
      timerRef.current = setTimeout(() => {
        logout();
      }, TIMEOUT_MS);
    };

    ACTIVITY_EVENTS.forEach((e) =>
      window.addEventListener(e, reset, { passive: true })
    );

    reset();

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, reset));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user, logout]);
}
