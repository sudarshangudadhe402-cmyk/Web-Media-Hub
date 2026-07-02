---
name: Openapi/orval hook removal checklist
description: What to check when removing backend routes/schemas that have generated React Query hooks via orval, in this Web Media Hub monorepo.
---

When removing a backend route in `artifacts/api-server`, the corresponding operation must also be removed from `lib/api-spec/openapi.yaml` (path + any schemas only used by that path), then rerun the orval codegen so `@workspace/api-client-react` hooks are regenerated and stale hooks disappear.

**Why:** Frontend files can import a generated hook name that was never actually backed by an openapi operation (a stale/dead import left over from earlier refactors) — this only surfaces as a TS error at `pnpm --filter <artifact> run typecheck` time, not via a simple grep of the openapi spec. Relying on "the hook exists in generated output" isn't enough; you must grep hook usage across every artifact's `src/`, not just the ones you intentionally touched.

**How to apply:** After editing openapi.yaml and rerunning codegen, grep the whole `artifacts/` tree for the old hook/operationId names before declaring done, then run `pnpm --filter <artifact> run typecheck` for every frontend artifact (not just the one you think you changed) to catch cross-cutting breakage (e.g. a shared `layout.tsx` used by multiple pages).
