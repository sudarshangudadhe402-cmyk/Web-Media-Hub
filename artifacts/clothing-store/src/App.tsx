import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Products from "@/pages/products";
import Categories from "@/pages/categories";
import MyStore from "@/pages/my-store";
import AiVideo from "@/pages/ai-video";
import UsernamePassword from "@/pages/username-password";
import ManageAdmins from "@/pages/manage-admins";
import PublicStore from "@/pages/public-store";
import { Layout } from "@/components/layout";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, adminOnly = false }: { component: any, adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();
  const [_, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    } else if (!isLoading && user && adminOnly && user.role !== "super_admin") {
      setLocation("/");
    } else if (!isLoading && user && user.role === "super_admin" && !adminOnly) {
      setLocation("/manage-admins");
    }
  }, [user, isLoading, setLocation, adminOnly]);

  if (isLoading) {
    return <div className="h-screen w-full flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  if (adminOnly && user.role !== "super_admin") {
    return null;
  }

  if (!adminOnly && user.role === "super_admin") {
    return null;
  }

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
