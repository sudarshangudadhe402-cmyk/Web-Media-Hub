/**
 * Standalone entry point for the Store Discovery (shopping-page) artifact.
 * Router is required: FindStores navigates to /store/:slug via wouter.
 */
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Router, Route, Switch } from "wouter";
import FindStores from "@/pages/find-stores";
import PublicStore from "@/pages/public-store";
import "./index.css";

const queryClient = new QueryClient();

function ShoppingApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router>
          <Switch>
            <Route path="/store/:slug" component={PublicStore} />
            <Route component={FindStores} />
          </Switch>
        </Router>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

createRoot(document.getElementById("root")!).render(<ShoppingApp />);
