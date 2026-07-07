import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import DynamicPricingOverlay, { SelectedPlan } from "@/components/dynamic-pricing-overlay";
import { useAuth } from "@/hooks/use-auth";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const GOLD_BG = "#F5A623";
const BG = "#FAF6EE";
const LABEL = "#1A1A1A";
const HINT = "#9A9485";

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.getElementById("razorpay-sdk")) { resolve(true); return; }
    const s = document.createElement("script");
    s.id = "razorpay-sdk";
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function PlanRenewal() {
  const { logout, user } = useAuth();
  const [, setLocation] = useLocation();
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  const handleSelectPlan = useCallback(async (plan: SelectedPlan) => {
    setPaymentError(null);
    setPaymentLoading(true);

    try {
      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded) {
        setPaymentError("Failed to load payment gateway. Please check your internet connection.");
        setPaymentLoading(false);
        return;
      }

      const token = localStorage.getItem("wmh_token");
      const orderRes = await fetch("/api/payments/renewal-create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planPrice: plan.price, planName: plan.name }),
      });

      if (!orderRes.ok) {
        const data = await orderRes.json().catch(() => ({}));
        setPaymentError(data.error ?? "Failed to create payment order.");
        setPaymentLoading(false);
        return;
      }

      const { orderId, amount, currency, keyId } = await orderRes.json();

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: keyId,
          amount,
          currency,
          order_id: orderId,
          name: "Web Media Hub",
          description: `Plan Renewal — ${plan.name}`,
          prefill: { email: user?.email ?? "" },
          theme: { color: GOLD_BG },
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            try {
              const verifyRes = await fetch("/api/payments/renewal-verify", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  planKey: plan.planKey,
                  planName: plan.name,
                  planPrice: plan.price,
                  planPeriod: plan.period,
                  planBadge: plan.badge,
                  planColor: plan.color,
                }),
              });

              if (!verifyRes.ok) {
                const data = await verifyRes.json().catch(() => ({}));
                reject(new Error(data.error ?? "Payment verification failed."));
                return;
              }

              setPaid(true);
              resolve();
            } catch (err: any) {
              reject(err);
            }
          },
          modal: {
            ondismiss: () => {
              reject(new Error("Payment cancelled"));
            },
          },
        });
        rzp.open();
      });

      setTimeout(() => {
        logout();
        setLocation("/login");
      }, 2500);
    } catch (err: any) {
      if (err?.message !== "Payment cancelled") {
        setPaymentError(err?.message ?? "Payment failed. Please try again.");
      }
    } finally {
      setPaymentLoading(false);
    }
  }, [user, logout, setLocation]);

  if (paid) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{ background: BG }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
          style={{ background: `${GOLD_BG}20`, border: `2px solid ${GOLD_BG}` }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke={GOLD_BG} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-xl font-extrabold mb-2" style={{ color: LABEL }}>Plan Activated!</p>
        <p className="text-sm" style={{ color: HINT }}>Your store is now active. Logging you out…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: BG }}>
      {/* Error / loading strip */}
      {(paymentError || paymentLoading) && (
        <div
          className="px-5 py-2.5 text-center text-xs font-medium"
          style={{
            background: paymentError ? "#FEF2F2" : "#FFFBEB",
            borderBottom: `1px solid ${paymentError ? "#FECACA" : "#FDE68A"}`,
            color: paymentError ? "#DC2626" : "#92400E",
          }}
        >
          {paymentLoading ? "Processing payment…" : paymentError}
        </div>
      )}

      <DynamicPricingOverlay
        onBack={() => {}}
        onSelectPlan={handleSelectPlan}
        renewalMode={true}
      />
    </div>
  );
}
