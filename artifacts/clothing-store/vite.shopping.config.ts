/**
 * Dedicated Vite config for the shopping-page artifact.
 * Uses shopping.html → shopping-main.tsx as the ONLY entry point.
 * No auth, no ProtectedRoute, no login redirect is possible from this build.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "node:fs";
import type { Plugin, ViteDevServer } from "vite";

const rawPort = process.env.PORT;
const port =
  rawPort && !Number.isNaN(Number(rawPort)) && Number(rawPort) > 0
    ? Number(rawPort)
    : 21648;

const basePath = process.env.BASE_PATH ?? "/";
const shoppingHtmlPath = path.resolve(import.meta.dirname, "shopping.html");

/**
 * Plugin that intercepts all HTML-navigation requests and directly serves
 * shopping.html through Vite's own transformIndexHtml pipeline.
 * This avoids URL-rewriting tricks that confuse Vite's import-analysis plugin.
 */
function serveShoppingHtmlPlugin(): Plugin {
  return {
    name: "serve-shopping-html",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? "/";
        // Only intercept navigation requests (no file extension, not an API call, not Vite-internal)
        const hasExtension = /\.[a-zA-Z0-9]+(\?|$)/.test(url);
        const isViteInternal = url.startsWith("/@") || url.startsWith("/__");
        const isApiRequest = url.startsWith("/api");

        if (hasExtension || isViteInternal || isApiRequest) {
          return next();
        }

        try {
          // Read shopping.html and run it through Vite's full HTML transform
          // pipeline (injects HMR client, applies transformIndexHtml hooks, etc.)
          let html = fs.readFileSync(shoppingHtmlPath, "utf-8");
          html = await server.transformIndexHtml(url, html);
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.statusCode = 200;
          res.end(html);
        } catch (e) {
          next(e);
        }
      });
    },
  };
}

export default defineConfig({
  base: basePath,
  appType: "spa",

  plugins: [
    serveShoppingHtmlPlugin(),
    react(),
    tailwindcss(),
  ],

  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "attached_assets",
      ),
      "framer-motion": path.resolve(
        import.meta.dirname,
        "node_modules/framer-motion",
      ),
      "lucide-react": path.resolve(
        import.meta.dirname,
        "node_modules/lucide-react",
      ),
    },
    dedupe: ["react", "react-dom"],
    preserveSymlinks: false,
  },

  root: path.resolve(import.meta.dirname),
  cacheDir: path.resolve(import.meta.dirname, "node_modules/.vite-shopping"),

  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      // Explicitly build from shopping.html — never index.html
      input: shoppingHtmlPath,
    },
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
