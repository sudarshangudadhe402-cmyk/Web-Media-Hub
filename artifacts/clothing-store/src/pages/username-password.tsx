import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useChangePassword } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const credentialsSchema = z.object({
  currentPassword: z.string().optional(),
  newUsername: z.string().optional(),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional()
}).refine(data => {
  if (data.newPassword && data.newPassword !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
}).refine(data => {
  if ((data.newPassword || data.newUsername) && !data.currentPassword) {
    return false;
  }
  return true;
}, {
  message: "Current password is required to make changes",
  path: ["currentPassword"]
});

export default function UsernamePassword() {
  const { user } = useAuth();
  const { toast } = useToast();
  const changePassword = useChangePassword();

  const form = useForm<z.infer<typeof credentialsSchema>>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      currentPassword: "",
      newUsername: "",
      newPassword: "",
      confirmPassword: ""
    }
  });

  const onSubmit = (values: z.infer<typeof credentialsSchema>) => {
    if (!values.currentPassword || (!values.newUsername && !values.newPassword)) {
      toast({ title: "Nothing to change", description: "Please enter new details and your current password." });
      return;
    }

    const payload: any = { currentPassword: values.currentPassword };
    if (values.newUsername) payload.username = values.newUsername;
    if (values.newPassword) payload.newPassword = values.newPassword;

    changePassword.mutate({ data: payload }, {
      onSuccess: () => {
        toast({ title: "Credentials updated successfully" });
        form.reset();
      },
      onError: (err: any) => {
        toast({ 
          variant: "destructive", 
          title: "Update failed", 
          description: err.message || "Please check your current password and try again." 
        });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Credentials</h1>
        <p className="text-muted-foreground">Update your login credentials.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Change Login Details</CardTitle>
          <CardDescription>
            Your current username is <strong className="text-foreground">{user?.username}</strong>.
            You must provide your current password to make changes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="newUsername" render={({ field }) => (
                <FormItem>
                  <FormLabel>New Username (Optional)</FormLabel>
                  <FormControl><Input placeholder="Leave blank to keep current" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="newPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password (Optional)</FormLabel>
                  <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="pt-4 border-t mt-4">
                <FormField control={form.control} name="currentPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input type="password" placeholder="Required to save changes" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <Button type="submit" className="w-full" disabled={changePassword.isPending}>
                Save Changes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}