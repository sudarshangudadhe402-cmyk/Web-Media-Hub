import { useState } from "react";
import { useListAdmins, useCreateAdmin, useDeleteAdmin, getListAdminsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Shield, UserPlus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

const adminSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

export default function ManageAdmins() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: admins, isLoading } = useListAdmins();
  const createAdmin = useCreateAdmin();
  const deleteAdmin = useDeleteAdmin();

  const form = useForm<z.infer<typeof adminSchema>>({
    resolver: zodResolver(adminSchema),
    defaultValues: {
      username: "",
      password: ""
    }
  });

  const onSubmit = (values: z.infer<typeof adminSchema>) => {
    createAdmin.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "Admin created successfully" });
        queryClient.invalidateQueries({ queryKey: getListAdminsQueryKey() });
        form.reset();
      },
      onError: (err: any) => {
        toast({ 
          variant: "destructive", 
          title: "Failed to create admin", 
          description: err.message 
        });
      }
    });
  };

  const handleDelete = (id: string) => {
    if (id === user?.id) {
      toast({ variant: "destructive", title: "Cannot delete yourself" });
      return;
    }
    if (window.confirm("Are you sure you want to remove this admin?")) {
      deleteAdmin.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Admin removed" });
          queryClient.invalidateQueries({ queryKey: getListAdminsQueryKey() });
        }
      });
    }
  };

  if (user?.role !== "super_admin") {
    return (
      <div className="p-8 text-center">
        <Shield className="w-12 h-12 mx-auto text-destructive mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">Only super admins can access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manage Admins</h1>
        <p className="text-muted-foreground">Add or remove administrative users for this store.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" /> Add Admin
              </CardTitle>
              <CardDescription>Create a new admin account.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="username" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl><Input placeholder="admin_name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={createAdmin.isPending}>
                    Create Admin
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold">Active Admins</h2>
          
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
            </div>
          ) : admins?.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Shield className="w-12 h-12 mb-4 opacity-20" />
                <p>No other admins found.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {admins?.map(admin => (
                <Card key={admin.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold uppercase">
                        {admin.username.substring(0, 2)}
                      </div>
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {admin.username}
                          {admin.id === user?.id && <Badge variant="secondary" className="text-[10px]">You</Badge>}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={admin.role === "super_admin" ? "default" : "outline"} className="capitalize text-[10px]">
                            {admin.role.replace("_", " ")}
                          </Badge>
                          {admin.createdAt && (
                            <span className="text-xs text-muted-foreground">
                              Added {new Date(admin.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {admin.id !== user?.id && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:bg-destructive/10" 
                        onClick={() => handleDelete(admin.id)}
                        disabled={deleteAdmin.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}