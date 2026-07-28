import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { useInactivityLogout } from "@/hooks/use-inactivity-logout";
import { ErrorBoundary } from "@/components/error-boundary";
import Login from "@/pages/login";
import Admins from "@/pages/admins";
import Stores from "@/pages/stores";
import StoreDetail from "@/pages/store-detail";
import Renewals from "@/pages/renewals";
import AddCity from "@/pages/add-city";
import Cities from "@/pages/cities";
import CityStores from "@/pages/city-stores";
import LegalLog from "@/pages/legal-log";
import Revenue from "@/pages/revenue";
import PricingConfig from "@/pages/pricing-config";
import MarketingAnalytics from "@/pages/marketing";
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
      <Route path="/stores">
        <ProtectedRoute>
          <Stores />
        </ProtectedRoute>
      </Route>
      <Route path="/stores/:id">
        <ProtectedRoute>
          <StoreDetail />
        </ProtectedRoute>
      </Route>
      <Route path="/renewals">
        <ProtectedRoute>
          <Renewals />
        </ProtectedRoute>
      </Route>
      <Route path="/add-city">
        <ProtectedRoute>
          <AddCity />
        </ProtectedRoute>
      </Route>
      <Route path="/cities">
        <ProtectedRoute>
          <Cities />
        </ProtectedRoute>
      </Route>
      <Route path="/cities/:state">
        <ProtectedRoute>
          <CityStores />
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
            <ErrorBoundary>
              <Router />
            </ErrorBoundary>
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
