# Web Media Hub

A multi-store clothing management platform. Store owners create and manage their online clothing stores; customers browse products, manage wishlists, and book appointments.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/clothing-store run dev` — run the customer-facing store
- `pnpm --filter @workspace/super-admin run dev` — run the super-admin panel
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Required Secrets

| Secret | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `SESSION_SECRET` | JWT signing secret (also read as `JWT_SECRET`) |
| `SUPER_ADMIN_ACCESS_CODE` | Required access code for super-admin login |
| `VITE_GATE_CODE` | Frontend gate code for super-admin panel |

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- **API:** Express 5, MongoDB (Mongoose)
- **Frontend:** React 19, Vite 7, Tailwind CSS 4, Wouter, TanStack Query
- **Validation:** Zod, OpenAPI spec-first with Orval codegen
- **Build:** esbuild (API), Vite (frontends)

## Where things live

- `artifacts/api-server/` — Express API, MongoDB models in `src/models/`
- `artifacts/clothing-store/` — Customer-facing store (preview: `/`)
- `artifacts/super-admin/` — Platform admin panel (preview: `/super-admin/`)
- `lib/api-spec/openapi.yaml` — Source-of-truth API contract
- `lib/api-client-react/` — Generated React hooks (run codegen to update)
- `lib/pricing/` — Shared pricing components

## Architecture decisions

- Spec-first API: `openapi.yaml` drives all generated client hooks and Zod schemas via Orval. Always update the spec before adding API endpoints.
- MongoDB is the primary database. The `lib/db` Drizzle/Postgres setup is a placeholder (schema is empty) — not in active use.
- JWTs are signed with `SESSION_SECRET`. Super-admin tokens expire in 4h; store-owner tokens in 7d.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `SUPER_ADMIN_ACCESS_CODE` is required at API startup — the server will refuse to boot without it.
- Vite dev server reads `PORT` and `BASE_PATH` from env; both have safe defaults if unset.
- After changing the OpenAPI spec, run `pnpm --filter @workspace/api-spec run codegen` to regenerate client hooks.
- `MONGODB_URI` is not currently set — the API server runs without a database until it's added, so admin/manager data won't load.
- In the super-admin dashboard's "Managers Overview" row (`artifacts/super-admin/src/pages/admins.tsx`), the per-manager "Stores" and "Active" counts are placeholder `0` values by request — real per-manager store/active counts aren't wired up yet.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
