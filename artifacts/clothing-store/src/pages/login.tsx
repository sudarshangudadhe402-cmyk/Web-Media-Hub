import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLogin } from "@workspace/api-client-react";
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

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const loginMutation = useLogin();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  function onSubmit(values: z.infer<typeof loginSchema>) {
    loginMutation.mutate({ data: values }, {
      onSuccess: (response) => {
        if (response.user.role === "super_admin") {
          toast({
            variant: "destructive",
            title: "Access Denied",
            description: "Super admins must use the dedicated Super Admin portal to login.",
          });
          return;
        }
        login(response.token);
        toast({
          title: "Logged in successfully",
        });
        setLocation("/");
      },
      onError: (error: any) => {
        const msg: string = error?.data?.error || error?.message || "Invalid credentials";
        const isInactive = msg.toLowerCase().includes("not-active");
        const isAnotherDevice = msg.toLowerCase().includes("another device");
        toast({
          variant: "destructive",
          title: isInactive ? "Account Inactive" : isAnotherDevice ? "Logged In Elsewhere" : "Login failed",
          description: isInactive
            ? "Admin is currently not-active, please contact to super-admin"
            : isAnotherDevice
            ? "You have been logged in from another device. Please login again or contact super admin to enable multi-device access."
            : msg,
          duration: (isInactive || isAnotherDevice) ? 7000 : 4000,
        });
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md shadow-lg border-primary/10">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Web Media Hub</CardTitle>
          <CardDescription>
            Enter your credentials to access your store
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="admin" {...field} />
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
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? "Logging in..." : "Login"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
