import { useState } from "react";
import {
  useListAdmins,
  useDeleteAdmin,
  getListAdminsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  Users,
  ChevronRight,
  Eye,
  EyeOff,
  Trash2,
  Phone,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Admins() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: admins, isLoading } = useListAdmins();
  const deleteAdmin = useDeleteAdmin();

  const [selectedAdmin, setSelectedAdmin] = useState<NonNullable<typeof admins>[number] | null>(null);
  const [adminDetailOpen, setAdminDetailOpen] = useState(false);
  const [adminActive, setAdminActive] = useState<Record<string, boolean>>({});
  const [showPass, setShowPass] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  function openAdminDetail(admin: NonNullable<typeof admins>[number]) {
    setSelectedAdmin(admin);
    setAdminDetailOpen(true);
    setShowPass(false);
  }

  function handleDelete(id: string) {
    deleteAdmin.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Admin deleted" });
          queryClient.invalidateQueries({ queryKey: getListAdminsQueryKey() });
          setAdminDetailOpen(false);
          setDeleteConfirmId(null);
        },
        onError: () => toast({ variant: "destructive", title: "Failed to delete admin" }),
      }
    );
  }

  const adminCount = admins?.length ?? 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin History</h1>
        <p className="text-muted-foreground text-sm mt-1">All admin accounts created so far</p>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">All Admins</h2>
          <Badge className="ml-1">{adminCount}</Badge>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : adminCount === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Shield className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>No admins yet. Add one from Manage Admins.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {admins?.map((admin) => {
              const isActive = adminActive[admin.id] !== false;
              return (
                <button
                  key={admin.id}
                  onClick={() => openAdminDetail(admin)}
                  className="w-full text-left"
                >
                  <Card className="hover:border-primary/40 transition-colors cursor-pointer">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold uppercase shrink-0">
                        {admin.username.substring(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold truncate">{admin.username}</span>
                          <Badge variant={admin.role === "super_admin" ? "default" : "outline"} className="capitalize text-[10px]">
                            {admin.role.replace("_", " ")}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className={`text-xs font-medium ${isActive ? "text-green-600" : "text-muted-foreground"}`}>
                            {isActive ? "Active" : "Inactive"}
                          </span>
                          {admin.createdAt && (
                            <span className="text-xs text-muted-foreground">
                              Added {new Date(admin.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          )}
                          {(admin as any).adminNumber && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              +91 {(admin as any).adminNumber}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Admin Detail Dialog */}
      <Dialog open={adminDetailOpen} onOpenChange={setAdminDetailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Admin Information
            </DialogTitle>
          </DialogHeader>
          {selectedAdmin && (
            <div className="space-y-5 pt-2">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl uppercase">
                  {selectedAdmin.username.substring(0, 2)}
                </div>
                <div>
                  <p className="font-bold text-lg">{selectedAdmin.username}</p>
                  <Badge variant={selectedAdmin.role === "super_admin" ? "default" : "outline"} className="capitalize text-xs mt-1">
                    {selectedAdmin.role.replace("_", " ")}
                  </Badge>
                </div>
              </div>
              <div className="bg-muted rounded-xl divide-y divide-border">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Username</span>
                  <span className="text-sm font-medium">{selectedAdmin.username}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Password</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium font-mono">
                      {showPass ? ((selectedAdmin as any).plainPassword || "—") : "••••••••"}
                    </span>
                    <button onClick={() => setShowPass((p) => !p)} className="text-muted-foreground hover:text-foreground">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Admin Number
                  </span>
                  <span className="text-sm font-medium">
                    {(selectedAdmin as any).adminNumber
                      ? `+91 ${(selectedAdmin as any).adminNumber}`
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Added</span>
                  <span className="text-sm font-medium">
                    {selectedAdmin.createdAt
                      ? new Date(selectedAdmin.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                      : "—"}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between bg-muted rounded-xl px-4 py-3">
                <div>
                  <p className="font-medium text-sm">Active Admin</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(adminActive[selectedAdmin.id] !== false) ? "Admin is currently active" : "Admin is currently inactive"}
                  </p>
                </div>
                <Switch
                  checked={adminActive[selectedAdmin.id] !== false}
                  onCheckedChange={(val) => setAdminActive((p) => ({ ...p, [selectedAdmin.id]: val }))}
                />
              </div>

              {selectedAdmin.role !== "super_admin" && (
                deleteConfirmId === selectedAdmin.id ? (
                  <div className="space-y-2">
                    <p className="text-sm text-destructive font-medium text-center">Are you sure you want to delete this admin?</p>
                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
                      <Button
                        className="flex-1 bg-destructive hover:bg-destructive/90 text-white"
                        onClick={() => handleDelete(selectedAdmin.id)}
                        disabled={deleteAdmin.isPending}
                      >
                        {deleteAdmin.isPending ? "Deleting..." : "Yes, Delete"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => setDeleteConfirmId(selectedAdmin.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Admin
                  </Button>
                )
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
