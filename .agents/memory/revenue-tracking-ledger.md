---
name: Revenue tracking ledger (signup vs renewal)
description: Why platform revenue is tracked via a RevenuePayment event ledger instead of deriving "this month" from User.createdAt.
---

Super-admin "Growth & Marketing Analytics" dashboard originally derived all revenue (including "This Month") from `User.createdAt` + current `planPrice`. This meant renewals never showed up in the month they were actually paid — money was permanently attributed to the original signup month.

**Why:** User explicitly chose to track signup revenue and renewal revenue as two separate metrics rather than switching "This Month" to follow renewal dates only. Real money-flow events happen in three places: `payments.ts` `/payments/verify-and-register` (first payment), the Razorpay `subscription.charged` webhook (autopay renewal), and `admins.ts` `/admins/:id/renew-subscription` (manual renewal by super-admin) — none of these were logged anywhere before.

**How to apply:** A `RevenuePayment` model (`adminId`, `type: "signup"|"renewal"`, `amount`, `planName`, `createdAt`) is now written at all three of those call sites. `/marketing/dashboard` computes `newSignupsRevenue` and `renewalsRevenue` for the current calendar month from this ledger (not from `User.createdAt`). `totalRevenue` (all-time, all-admins) still uses the old current-plan-price snapshot logic — only the "this month" split was changed. If a new revenue-generating code path is added (e.g. a new payment flow), it must also insert a `RevenuePayment` record or the dashboard split will silently miss it.
