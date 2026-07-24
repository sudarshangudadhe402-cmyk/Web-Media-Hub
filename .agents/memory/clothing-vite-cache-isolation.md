---
name: Clothing app Vite cache isolation
description: Vite optimize-dependency cache behavior when the admin and shopping entry points run concurrently
---

The clothing-store admin entry point and shopping entry point run as separate Vite servers from the same package. They must use distinct Vite `cacheDir` directories.

**Why:** When both configs used the default package-level `.vite` directory, one server rewrote the optimized dependency manifest while the other was serving it. The browser then received missing-chunk 404s or `504 Outdated Optimize Dep` responses and rendered a blank page.

**How to apply:** Keep separate cache directories such as `.vite-admin` and `.vite-shopping`, and clear all old shared `.vite` artifacts after changing the config before restarting both workflows.