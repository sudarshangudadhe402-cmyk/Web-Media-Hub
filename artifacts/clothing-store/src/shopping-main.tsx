/**
 * Standalone entry point for the Store Discovery (shopping-page) artifact.
 * No router, no auth, no login — just FindStores directly.
 * Used when Vite runs on port 21648 (VITE env: transformIndexHtml swaps main.tsx → this file).
 */
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import FindStores from "@/pages/find-stores";
import "./index.css";

const queryClient = new QueryClient();

function ShoppingApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <FindStores />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

createRoot(document.getElementById("root")!).render(<ShoppingApp />);
