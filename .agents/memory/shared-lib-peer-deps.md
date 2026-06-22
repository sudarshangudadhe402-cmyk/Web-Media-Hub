---
name: Shared lib package dependency resolution
description: How to correctly set up dependencies for lib/ packages consumed by Vite artifacts in this pnpm monorepo
---

When creating a shared `lib/` package (e.g. `lib/pricing`) that is consumed by Vite artifact apps:

**Rule:** Declare `framer-motion`, `lucide-react`, and any React component library as actual `dependencies` (not `peerDependencies`) in the lib package's `package.json`.

**Why:** pnpm's strict isolation mode does NOT hoist packages. When Vite processes files from `lib/pricing/src/`, it resolves bare imports (`framer-motion`, `lucide-react`) walking up the directory tree from `lib/pricing/src/`. If those packages are only peerDependencies, pnpm won't create `lib/pricing/node_modules/` entries for them, so resolution fails. Declaring them as actual `dependencies` causes pnpm to link them in `lib/pricing/node_modules/`, making them resolvable.

**Re-export pattern:** Local artifact files that re-export from a shared package must use named exports, not `default`:
- WRONG: `export { default } from "@workspace/pricing"`
- RIGHT: `export { PricingOverlay as default } from "@workspace/pricing"`

**`fs.allow`:** Add the lib package src path to Vite's `server.fs.allow` array in the artifact's vite config so Vite can serve those files.

**`optimizeDeps.include` with `> ` syntax does NOT work** for workspace packages — it fails silently.
