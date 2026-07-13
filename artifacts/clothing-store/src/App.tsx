import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { useInactivityLogout } from "@/hooks/use-inactivity-logout";
import NotFound from "@/pages/not-found";
import { useEffect, useState } from "react";

import Login from "@/pages/login";
import CreateStore from "@/pages/create-store";
import Dashboard from "@/pages/dashboard";
import Products from "@/pages/products";
import Categories from "@/pages/categories";
import MyStore from "@/pages/my-store";
import MarketingGrowth from "@/pages/marketing-growth";
import UsernamePassword from "@/pages/username-password";
import ManageAdmins from "@/pages/manage-admins";
import AdminsPage from "@/pages/admins";
import PublicStore from "@/pages/public-store";
import LegalAgreement from "@/pages/legal-agreement";
import MarketingSourceSelect from "@/pages/marketing-source-select";
import SalesLedger from "@/pages/sales-ledger";
import DemoStore from "@/pages/demo-store";
import PartnershipPage from "@/pages/partnership";
import PlanRenewal from "@/pages/plan-renewal";
import { Layout } from "@/components/layout";

const queryClient = new QueryClient();

// Global fetch interceptor: any 403 SUBSCRIPTION_EXPIRED → redirect to /plan-renewal
(function patchFetch() {
  const origFetch = window.fetch.bind(window);
  window.fetch = async function (...args) {
    const res = await origFetch(...args);
    if (res.status === 403) {
      try {
        const clone = res.clone();
        const data = await clone.json();
        if (data?.code === "SUBSCRIPTION_EXPIRED") {
          const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
          window.location.replace(base + "/plan-renewal");
          // Return a never-resolving response so callers don't proceed
          return new Promise(() => {});
        }
      } catch {}
    }
    return res;
  };
})();

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

interface SourceStatus { needsSelection: boolean; sources?: { key: string; label: string; color: string }[] }

function useSourceStatus(userId: string | undefined, role: string | undefined, legalDone: boolean | null) {
  const [sourceStatus, setSourceStatus] = useState<SourceStatus | null>(null);

  useEffect(() => {
    if (!userId || role === "super_admin" || legalDone !== true) {
      return;
    }
    const token = localStorage.getItem("wmh_token");
    fetch("/api/legal/source-status", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => setSourceStatus(data))
      .catch(() => setSourceStatus({ needsSelection: false }));
  }, [userId, role, legalDone]);

  return sourceStatus;
}

function isSubscriptionExpired(user: any): boolean {
  if (!user || user.role !== "admin") return false;
  const end = user.subscriptionEndDate;
  if (!end) return false;
  return new Date(end) < new Date();
}

function ProtectedRoute({ component: Component, adminOnly = false }: { component: any; adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();
  const [_, setLocation] = useLocation();
  const { legalDone } = useLegalStatus(user?.id, user?.role);
  const sourceStatus = useSourceStatus(user?.id, user?.role, legalDone);
  useInactivityLogout();

  useEffect(() => {
    if (isLoading) return;
    if (!user) { setLocation("/login"); return; }
    if (adminOnly && user.role !== "super_admin") { setLocation("/"); return; }
    if (!adminOnly && user.role === "super_admin") { setLocation("/manage-admins"); return; }
    if (!adminOnly && isSubscriptionExpired(user)) { setLocation("/plan-renewal"); return; }
    if (legalDone === false) { setLocation("/legal-agreement"); return; }
    if (legalDone === true && sourceStatus?.needsSelection) { setLocation("/marketing-source-select"); return; }
  }, [user, isLoading, setLocation, adminOnly, legalDone, sourceStatus]);

  if (isLoading || legalDone === null) {
    return <div className="h-screen w-full flex items-center justify-center">Loading...</div>;
  }

  if (!user) return null;
  if (adminOnly && user.role !== "super_admin") return null;
  if (!adminOnly && user.role === "super_admin") return null;
  if (!adminOnly && isSubscriptionExpired(user)) return null;
  if (legalDone === false) return null;
  if (sourceStatus?.needsSelection) return null;

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function PlanRenewalRoute() {
  const { user, isLoading } = useAuth();
  const [_, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (!user) { setLocation("/login"); return; }
    if (user.role === "super_admin") { setLocation("/manage-admins"); return; }
    if (!isSubscriptionExpired(user)) { setLocation("/"); return; }
  }, [user, isLoading, setLocation]);

  if (isLoading) return <div className="h-screen w-full flex items-center justify-center">Loading...</div>;
  if (!user || !isSubscriptionExpired(user)) return null;

  return <PlanRenewal />;
}

function MarketingSourceSelectRoute() {
  const { user, isLoading } = useAuth();
  const [_, setLocation] = useLocation();
  const { legalDone } = useLegalStatus(user?.id, user?.role);
  const sourceStatus = useSourceStatus(user?.id, user?.role, legalDone);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { setLocation("/login"); return; }
    if (legalDone === false) { setLocation("/legal-agreement"); return; }
    if (legalDone === true && sourceStatus && !sourceStatus.needsSelection) { setLocation("/"); return; }
  }, [user, isLoading, legalDone, sourceStatus]);

  if (isLoading || legalDone === null || sourceStatus === null) {
    return <div className="h-screen w-full flex items-center justify-center">Loading...</div>;
  }
  if (!user || !sourceStatus.needsSelection) return null;

  return <MarketingSourceSelect sources={sourceStatus.sources || []} />;
}

function CreateStoreRoute() {
  const { user, isLoading } = useAuth();
  const [, nav] = useLocation();
  useEffect(() => {
    if (isLoading) return;
    if (user && isSubscriptionExpired(user)) nav("/plan-renewal");
  }, [user, isLoading, nav]);
  if (isLoading) return <div className="h-screen w-full flex items-center justify-center">Loading...</div>;
  if (user && isSubscriptionExpired(user)) return null;
  return <CreateStore />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/create-store" component={CreateStoreRoute} />
      <Route path="/plan-renewal">
        {() => <PlanRenewalRoute />}
      </Route>
      <Route path="/legal-agreement" component={LegalAgreement} />
      <Route path="/marketing-source-select">
        {() => <MarketingSourceSelectRoute />}
      </Route>
      <Route path="/">
        {() => <ProtectedRoute component={SalesLedger} />}
      </Route>
      <Route path="/dashboard">
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
        {() => <ProtectedRoute component={MarketingGrowth} />}
      </Route>
      <Route path="/marketing-growth">
        {() => <ProtectedRoute component={MarketingGrowth} />}
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
      <Route path="/sales-ledger">
        {() => <ProtectedRoute component={SalesLedger} />}
      </Route>
      <Route path="/demo" component={DemoStore} />
      <Route path="/store/:slug" component={PublicStore} />
      <Route path="/partnership/:type/:code" component={PartnershipPage} />
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
