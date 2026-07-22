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
// swap main.tsx → shopping-main.tsx in index.html so the app starts
// directly on FindStores with no router, no auth, no login possible.
function shoppingPagePlugin() {
  return {
    name: "shopping-page-entry",
    transformIndexHtml(html: string) {
      return html.replace("/src/main.tsx", "/src/shopping-main.tsx");
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(port === 21648 ? [shoppingPagePlugin()] : []),
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
