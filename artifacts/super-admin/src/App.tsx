import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { useInactivityLogout } from "@/hooks/use-inactivity-logout";
import Login from "@/pages/login";
import Admins from "@/pages/admins";
import LegalLog from "@/pages/legal-log";
import Revenue from "@/pages/revenue";
import PricingConfig from "@/pages/pricing-config";
import MarketingAnalytics from "@/pages/marketing";
import PartnershipPage from "@/pages/partnership";
import Layout from "@/components/layout";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  useInactivityLogout();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <Layout>{children}</Layout>;
}

function Router() {
  const { user, isLoading } = useAuth();

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        {isLoading ? null : user ? (
          <Redirect to="/admins" />
        ) : (
          <Redirect to="/login" />
        )}
      </Route>
      <Route path="/admins">
        <ProtectedRoute>
          <Admins />
        </ProtectedRoute>
      </Route>
      <Route path="/revenue">
        <ProtectedRoute>
          <Revenue />
        </ProtectedRoute>
      </Route>
      <Route path="/legal-log">
        <ProtectedRoute>
          <LegalLog />
        </ProtectedRoute>
      </Route>
      <Route path="/pricing-config">
        <ProtectedRoute>
          <PricingConfig />
        </ProtectedRoute>
      </Route>
      <Route path="/marketing">
        <ProtectedRoute>
          <MarketingAnalytics />
        </ProtectedRoute>
      </Route>
      <Route path="/partnership/:type/:code" component={PartnershipPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={(import.meta.env.BASE_URL || "").replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
