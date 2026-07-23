---
name: India map WebGL fallback
description: MapLibre previews may run without WebGL, so IndiaMap must retain a Leaflet/OSM fallback.
---

MapLibre GL JS can fail during construction in Replit preview browsers when WebGL is disabled or unavailable. The shared India map must detect this before construction and render a Leaflet/OSM fallback with the same India bounds, mask, boundary validation, and markers.

**Why:** A hard MapLibre-only dependency turns an otherwise working store discovery or registration page into a runtime error overlay in sandboxed browsers.

**How to apply:** Preserve the fallback whenever changing the shared map implementation or changing tile providers.