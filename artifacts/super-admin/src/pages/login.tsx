import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ShieldCheck, Eye, EyeOff, Lock, AlertTriangle } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  function getRemainingLockout(): string {
    if (!lockoutUntil) return "";
    const ms = lockoutUntil - Date.now();
    if (ms <= 0) return "";
    const min = Math.ceil(ms / 60000);
    return `${min} minute${min !== 1 ? "s" : ""}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (lockoutUntil && Date.now() < lockoutUntil) {
      toast({
        variant: "destructive",
        title: "Account Locked",
        description: `Please wait ${getRemainingLockout()} before trying again.`,
      });
      return;
    }

    if (!identifier.trim() || !password.trim() || !accessCode.trim()) {
      toast({
        variant: "destructive",
        title: "All fields required",
        description: "Please fill in all fields including the access code.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: identifier.trim(), email: identifier.trim(), password, accessCode: accessCode.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg: string = data?.error || "Login failed";
        const isLocked = res.status === 429 || msg.toLowerCase().includes("locked");
        const isAnotherDevice = msg.toLowerCase().includes("another device");
        const isAccessCode = msg.toLowerCase().includes("access code");

        if (isLocked && data?.lockedUntil) {
          setLockoutUntil(data.lockedUntil);
        }

        toast({
          variant: "destructive",
          title: isLocked
            ? "Account Locked"
            : isAnotherDevice
            ? "Session Replaced"
            : isAccessCode
            ? "Invalid Access Code"
            : "Login Failed",
          description: msg,
          duration: isLocked ? 10000 : 6000,
        });
        return;
      }

      if (data.user?.role !== "super_admin") {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "This portal is only for super admins.",
        });
        return;
      }

      setLockoutUntil(null);
      login(data.token);
      toast({ title: "Welcome, Mr_Sid_55!" });
      setLocation("/manage-admins");
    } catch {
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Could not reach the server. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const remainingLockout = getRemainingLockout();
  const isCurrentlyLocked = !!remainingLockout;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-2">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Mr_Sid_55</h1>
          <p className="text-muted-foreground text-sm">Super Admin Portal</p>
        </div>

        <Card className="shadow-lg border-primary/10">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-semibold">Sign in</CardTitle>
            <CardDescription>Enter your username or email along with password and access code</CardDescription>
          </CardHeader>
          <CardContent>
            {isCurrentlyLocked && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Account temporarily locked. Try again in{" "}
                  <strong>{remainingLockout}</strong>.
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="identifier">Username or Email</Label>
                <Input
                  id="identifier"
                  placeholder="super_admin or email@example.com"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={isLoading || isCurrentlyLocked}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading || isCurrentlyLocked}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="accessCode" className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-primary" />
                  Secret Access Code
                </Label>
                <div className="relative">
                  <Input
                    id="accessCode"
                    type={showCode ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    disabled={isLoading || isCurrentlyLocked}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCode((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">Required for all super admin logins</p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || isCurrentlyLocked}
              >
                {isLoading ? "Signing in..." : isCurrentlyLocked ? `Locked — wait ${remainingLockout}` : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Secured portal — unauthorized access is prohibited
        </p>
      </div>
    </div>
  );
}
