---
name: Legacy hardcoded pricing system removed
description: This app previously had two parallel pricing systems; the legacy hardcoded one was fully decommissioned.
---

This project only has ONE pricing system now: `DynamicPricing` model (`_id: "pricing-v2"`) managed via `/api/pricing*` routes and the super-admin pricing-config page. Plans are Mongo subdocuments with their own `_id`.

**Why:** A legacy hardcoded pricing system (`DEFAULT_PRICING_CONFIG`, `PricingSettings` model, `/api/settings/pricing`, `/api/coupons/validate`, and the `@workspace/pricing` lib package with static ₹999/₹4,999/₹15,999/₹19,999 plans) existed in parallel but was never wired into any frontend page — confirmed dead code via grep (no imports anywhere) before removal. It was deleted entirely per user request, along with the `lib/pricing` package and its workspace references.

**How to apply:** If you see references to `planKey` on a `User` document, it now stores the string form of a `DynamicPricing` plan subdocument `_id` (not a legacy key like "demo"/"premium"). `admins.ts` renew-subscription logic resolves `planKey` by looking up `DynamicPricing.findById("pricing-v2").plans` and matching `_id`. Any future admin/plan work should build on this single dynamic system — do not reintroduce a static/hardcoded plan list.
