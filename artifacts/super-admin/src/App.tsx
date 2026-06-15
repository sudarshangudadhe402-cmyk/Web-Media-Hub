import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { useInactivityLogout } from "@/hooks/use-inactivity-logout";
import Login from "@/pages/login";
import ManageAdmins from "@/pages/manage-admins";
import Admins from "@/pages/admins";
import LegalLog from "@/pages/legal-log";
import Layout from "@/components/layout";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

// ─── Gateway protection ───────────────────────────────────────────────────────
const GATE_CODE = import.meta.env.VITE_GATE_CODE || "";

function isGateOpen(): boolean {
  try { return sessionStorage.getItem("wmh_gate") === "1"; } catch { return false; }
}

function openGate(): void {
  try { sessionStorage.setItem("wmh_gate", "1"); } catch {}
}
// ─────────────────────────────────────────────────────────────────────────────

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

function LoginRoute() {
  // Check for gateway key in URL
  const params = new URLSearchParams(window.location.search);
  const k = params.get("k");
  if (k && GATE_CODE && k === GATE_CODE) {
    openGate();
    // Remove key from URL bar so it's not visible/copyable
    window.history.replaceState({}, "", window.location.pathname);
  }

  // If gate is not open, show nothing (looks like a dead/404 page)
  if (!isGateOpen()) return <NotFound />;

  return <Login />;
}

function Router() {
  const { user, isLoading } = useAuth();

  return (
    <Switch>
      <Route path="/login" component={LoginRoute} />
      <Route path="/">
        {isLoading ? null : user ? (
          <Redirect to="/manage-admins" />
        ) : (
          <Redirect to="/login" />
        )}
      </Route>
      <Route path="/manage-admins">
        <ProtectedRoute>
          <ManageAdmins />
        </ProtectedRoute>
      </Route>
      <Route path="/admins">
        <ProtectedRoute>
          <Admins />
        </ProtectedRoute>
      </Route>
      <Route path="/legal-log">
        <ProtectedRoute>
          <LegalLog />
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
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
