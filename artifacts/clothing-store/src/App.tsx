import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { useInactivityLogout } from "@/hooks/use-inactivity-logout";
import NotFound from "@/pages/not-found";
import { useEffect, useState } from "react";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Products from "@/pages/products";
import Categories from "@/pages/categories";
import MyStore from "@/pages/my-store";
import AiVideo from "@/pages/ai-video";
import UsernamePassword from "@/pages/username-password";
import ManageAdmins from "@/pages/manage-admins";
import AdminsPage from "@/pages/admins";
import PublicStore from "@/pages/public-store";
import LegalAgreement from "@/pages/legal-agreement";
import StoreRequest from "@/pages/store-request";
import SalesLedger from "@/pages/sales-ledger";
import { Layout } from "@/components/layout";

const queryClient = new QueryClient();

function useLegalStatus(userId: string | undefined, role: string | undefined) {
  const [legalDone, setLegalDone] = useState<boolean | null>(null);

  useEffect(() => {
    if (!userId || role === "super_admin") {
      setLegalDone(true);
      return;
    }
    const token = localStorage.getItem("wmh_token");
    fetch("/api/legal/status", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => setLegalDone(data.completed))
      .catch(() => setLegalDone(true));
  }, [userId, role]);

  return { legalDone, setLegalDone };
}

function ProtectedRoute({ component: Component, adminOnly = false }: { component: any; adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();
  const [_, setLocation] = useLocation();
  const { legalDone } = useLegalStatus(user?.id, user?.role);
  useInactivityLogout();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      setLocation("/login");
      return;
    }
    if (adminOnly && user.role !== "super_admin") {
      setLocation("/");
      return;
    }
    if (!adminOnly && user.role === "super_admin") {
      setLocation("/manage-admins");
      return;
    }
    if (legalDone === false) {
      setLocation("/legal-agreement");
    }
  }, [user, isLoading, setLocation, adminOnly, legalDone]);

  if (isLoading || legalDone === null) {
    return <div className="h-screen w-full flex items-center justify-center">Loading...</div>;
  }

  if (!user) return null;
  if (adminOnly && user.role !== "super_admin") return null;
  if (!adminOnly && user.role === "super_admin") return null;
  if (legalDone === false) return null;

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/legal-agreement" component={LegalAgreement} />
      <Route path="/">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/products">
        {() => <ProtectedRoute component={Products} />}
      </Route>
      <Route path="/categories">
        {() => <ProtectedRoute component={Categories} />}
      </Route>
      <Route path="/my-store">
        {() => <ProtectedRoute component={MyStore} />}
      </Route>
      <Route path="/ai-video">
        {() => <ProtectedRoute component={AiVideo} />}
      </Route>
      <Route path="/username-password">
        {() => <ProtectedRoute component={UsernamePassword} />}
      </Route>
      <Route path="/manage-admins">
        {() => <ProtectedRoute component={ManageAdmins} adminOnly={true} />}
      </Route>
      <Route path="/admins">
        {() => <ProtectedRoute component={AdminsPage} adminOnly={true} />}
      </Route>
      <Route path="/store-request">
        {() => <ProtectedRoute component={StoreRequest} />}
      </Route>
      <Route path="/sales-ledger">
        {() => <ProtectedRoute component={SalesLedger} />}
      </Route>
      <Route path="/store/:slug" component={PublicStore} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "") || ""}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
