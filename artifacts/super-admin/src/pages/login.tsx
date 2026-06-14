import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ShieldCheck, Eye, EyeOff, Lock } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!username.trim() || !password.trim() || !accessCode.trim()) {
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
        body: JSON.stringify({ username: username.trim(), password, accessCode: accessCode.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg: string = data?.error || "Login failed";
        const isAnotherDevice = msg.toLowerCase().includes("another device");
        const isAccessCode = msg.toLowerCase().includes("access code");
        toast({
          variant: "destructive",
          title: isAnotherDevice ? "Session Replaced" : isAccessCode ? "Invalid Access Code" : "Login Failed",
          description: msg,
          duration: 6000,
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

      login(data.token);
      toast({ title: "Welcome, Super Admin!" });
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-2">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Web Media Hub</h1>
          <p className="text-muted-foreground text-sm">Super Admin Portal</p>
        </div>

        <Card className="shadow-lg border-primary/10">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-semibold">Sign in</CardTitle>
            <CardDescription>Enter your super admin credentials and access code</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="super_admin"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
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
                    disabled={isLoading}
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
                    disabled={isLoading}
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

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign in"}
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
