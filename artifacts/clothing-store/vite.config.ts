import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT;
const port = rawPort && !Number.isNaN(Number(rawPort)) && Number(rawPort) > 0
  ? Number(rawPort)
  : 5173;

const basePath = process.env.BASE_PATH ?? "/";

// Plugin: when running as the shopping-page artifact (port 21648),
// serve a client-side redirect at "/" so the browser navigates to /shoping-page.
// A server-side 302 is not enough because Replit's reverse proxy follows it internally,
// keeping the browser URL at "/" and making React Router render the wrong route.
function shoppingPageRedirectPlugin() {
  return {
    name: "shopping-page-redirect",
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url === "/" || req.url === "") {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(
            `<!doctype html><html><head>` +
            `<meta http-equiv="refresh" content="0;url=/shoping-page">` +
            `</head><body><script>window.location.replace('/shoping-page')</script></body></html>`
          );
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(port === 21648 ? [shoppingPageRedirectPlugin()] : []),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
      "framer-motion": path.resolve(import.meta.dirname, "node_modules/framer-motion"),
      "lucide-react": path.resolve(import.meta.dirname, "node_modules/lucide-react"),
    },
    dedupe: ["react", "react-dom"],
    preserveSymlinks: false,
  },

  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: false,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
    fs: {
      strict: true,
      allow: [
        path.resolve(import.meta.dirname),
        path.resolve(import.meta.dirname, "../../lib/pricing/src"),
        path.resolve(import.meta.dirname, "../../lib/api-client-react/src"),
        path.resolve(import.meta.dirname, "../../node_modules"),
      ],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
