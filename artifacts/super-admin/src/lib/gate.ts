const GATE_KEY = "wmh_gate";
export const GATE_TIMEOUT_MS = 30 * 60 * 1000;

export function isGateOpen(): boolean {
  try {
    const val = sessionStorage.getItem(GATE_KEY);
    if (!val) return false;
    const ts = parseInt(val, 10);
    if (isNaN(ts)) return false;
    return Date.now() - ts < GATE_TIMEOUT_MS;
  } catch { return false; }
}

export function openGate(): void {
  try { sessionStorage.setItem(GATE_KEY, String(Date.now())); } catch {}
}

export function refreshGate(): void {
  try {
    if (isGateOpen()) sessionStorage.setItem(GATE_KEY, String(Date.now()));
  } catch {}
}

export function closeGate(): void {
  try { sessionStorage.removeItem(GATE_KEY); } catch {}
}
