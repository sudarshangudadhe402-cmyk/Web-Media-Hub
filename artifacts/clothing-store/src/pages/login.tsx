import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { AlertTriangle, Eye, EyeOff } from "lucide-react";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  function getRemainingLockout(): string {
    if (!lockoutUntil) return "";
    const ms = lockoutUntil - Date.now();
    if (ms <= 0) return "";
    const min = Math.ceil(ms / 60000);
    return `${min} minute${min !== 1 ? "s" : ""}`;
  }

  const remainingLockout = getRemainingLockout();
  const isCurrentlyLocked = !!remainingLockout;

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    if (isCurrentlyLocked) {
      toast({
        variant: "destructive",
        title: "Account Locked",
        description: `Please wait ${remainingLockout} before trying again.`,
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email.trim(), password: values.password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg: string = data?.error || "Login failed";
        const isLocked = res.status === 429 || msg.toLowerCase().includes("locked");
        const isInactive = msg.toLowerCase().includes("not-active");
        const isAnotherDevice = msg.toLowerCase().includes("another device");
        const isMultiDeviceBlocked =
          msg.toLowerCase().includes("multy-device not allowed") ||
          msg.toLowerCase().includes("multi-device not allowed");

        if (isLocked && data?.lockedUntil) {
          setLockoutUntil(data.lockedUntil);
        }

        toast({
          variant: "destructive",
          title: isLocked
            ? "Account Locked"
            : isInactive
            ? "Account Inactive"
            : isAnotherDevice
            ? "Logged In Elsewhere"
            : isMultiDeviceBlocked
            ? "Multi-Device Not Allowed"
            : "Login Failed",
          description: msg,
          duration: isLocked || isInactive || isAnotherDevice ? 8000 : 4000,
        });
        return;
      }

      if (data.user?.role === "super_admin") {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "Super admins must use the dedicated Super Admin portal to login.",
        });
        return;
      }

      setLockoutUntil(null);
      login(data.token);
      toast({ title: "Logged in successfully" });
      setLocation("/");
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
      <Card className="w-full max-w-md shadow-lg border-primary/10">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Web Media Hub</CardTitle>
          <CardDescription>Enter your credentials to access your store</CardDescription>
        </CardHeader>
        <CardContent>
          {isCurrentlyLocked && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Too many failed attempts. Account locked for{" "}
                <strong>{remainingLockout}</strong>.
              </span>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="admin@example.com"
                        autoComplete="email"
                        disabled={isLoading || isCurrentlyLocked}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          autoComplete="current-password"
                          disabled={isLoading || isCurrentlyLocked}
                          className="pr-10"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((p) => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || isCurrentlyLocked}
              >
                {isLoading
                  ? "Logging in..."
                  : isCurrentlyLocked
                  ? `Locked — wait ${remainingLockout}`
                  : "Login"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
