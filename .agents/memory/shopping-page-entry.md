---
name: Shopping page entry point isolation
description: How to reliably serve shopping-main.tsx instead of main.tsx for the shopping-page artifact in Vite dev mode
---

# Shopping page entry point isolation

## The rule
Use `configureServer` with `server.transformIndexHtml(url, html)` (reading from a physical `shopping.html`) — NOT `transformIndexHtml` plugin hook, NOT URL rewriting via middleware, NOT port-number detection.

## Why
- `transformIndexHtml` plugin hook silently fails — Vite's `vite:import-analysis` then re-processes the HTML as JS and throws a 500 error.
- URL rewriting (`req.url = '/shopping.html'`) causes the same `vite:import-analysis` JS-parse error.
- Port-number detection (`port === 21648`) is fragile; Vite picks a different port if 21648 is busy.

## How to apply
In `vite.shopping.config.ts`, the plugin uses:
```ts
configureServer(server) {
  server.middlewares.use(async (req, res, next) => {
    const url = req.url ?? "/";
    if (hasExtension(url) || isViteInternal(url) || isApiRequest(url)) return next();
    let html = fs.readFileSync(shoppingHtmlPath, "utf-8");
    html = await server.transformIndexHtml(url, html);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(html);
  });
}
```
And for production builds: `rollupOptions.input = shoppingHtmlPath`.

## Key files
- `artifacts/clothing-store/vite.shopping.config.ts` — dedicated config
- `artifacts/clothing-store/shopping.html` — entry HTML pointing to shopping-main.tsx
- `artifacts/clothing-store/src/shopping-main.tsx` — standalone app (no auth, no ProtectedRoute)
- Workflow: `PORT=21648 BASE_PATH=/ pnpm --filter @workspace/clothing-store run dev:shopping`
