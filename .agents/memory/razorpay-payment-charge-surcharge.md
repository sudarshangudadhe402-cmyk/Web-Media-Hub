---
name: Razorpay payment charge surcharge
description: How the 2% payment gateway surcharge is applied to first payments and autopay renewals
---

The 2% payment charge shown to the user (and actually billed) is always computed server-side from the base plan price (discounted price for the first payment, `originalPlanPrice` for autopay renewals), never trusted as a final total sent by the client.

**Why:** the frontend only sends the base plan price to `create-order`/`create-subscription`; if the client computed and sent the final surcharged total instead, a tampered request could set an arbitrary charge amount. Keeping the 2% calculation identical (`Math.round(base * 0.02)`) on both frontend (for display) and backend (for the actual Razorpay amount) keeps what the user sees matching what they're charged.

**How to apply:** if the surcharge percentage or calculation ever changes, update it in all three places: `artifacts/clothing-store/src/pages/create-store.tsx` (`paymentBreakdown` display), `artifacts/api-server/src/routes/payments.ts` `create-order` (first payment), and `create-subscription` (recurring autopay renewal amount).
