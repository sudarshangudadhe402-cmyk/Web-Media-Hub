import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Shield,
  Link as LinkIcon,
  Copy,
  Trash2,
  ExternalLink,
  Pencil,
} from "lucide-react";

export default function ManageAdmins() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [linkInput, setLinkInput] = useState("");
  const [isEditingLink, setIsEditingLink] = useState(false);

  function authFetch(url: string, options?: RequestInit) {
    const token = localStorage.getItem("wmh_token");
    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options?.headers ?? {}),
      },
    });
  }

  const { data: globalLinkData, refetch: refetchGlobalLink } = useQuery({
    queryKey: ["settings", "global-link"],
    queryFn: async () => {
      const res = await authFetch("/api/settings/global-link");
      if (!res.ok) return { globalLink: null };
      return res.json() as Promise<{ globalLink: string | null }>;
    },
    enabled: user?.role === "super_admin",
  });
  const globalLink = globalLinkData?.globalLink ?? null;

  const saveGlobalLink = useMutation({
    mutationFn: async (link: string) => {
      const res = await authFetch("/api/settings/global-link", {
        method: "PUT",
        body: JSON.stringify({ globalLink: link }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Global link saved ✅" });
      refetchGlobalLink();
      setIsEditingLink(false);
      setLinkInput("");
    },
    onError: () => toast({ variant: "destructive", title: "Failed to save link" }),
  });

  const deleteGlobalLink = useMutation({
    mutationFn: async () => {
      const res = await authFetch("/api/settings/global-link", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Global link removed" });
      refetchGlobalLink();
      setIsEditingLink(false);
      setLinkInput("");
    },
    onError: () => toast({ variant: "destructive", title: "Failed to remove link" }),
  });

  if (user?.role !== "super_admin") {
    return (
      <div className="p-8 text-center space-y-3">
        <Shield className="w-12 h-12 mx-auto text-destructive" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">Only super admins can access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manage Admins</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage global settings</p>
      </div>

      {/* ── Global Link Section ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <LinkIcon className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Global Link</h2>
        </div>

        {globalLink && !isEditingLink ? (
          <Card className="border-primary/20">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-2">
                <LinkIcon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <a
                  href={globalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-sm text-primary font-medium underline underline-offset-2 break-all"
                >
                  {globalLink}
                </a>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="flex-1 gap-1.5"
                  onClick={() => { navigator.clipboard.writeText(globalLink); toast({ title: "Link copied!" }); }}>
                  <Copy className="w-3.5 h-3.5" /> Copy
                </Button>
                <Button size="sm" variant="outline" className="flex-1 gap-1.5"
                  onClick={() => window.open(globalLink, "_blank")}>
                  <ExternalLink className="w-3.5 h-3.5" /> Open
                </Button>
                <Button size="sm" variant="outline" className="flex-1 gap-1.5"
                  onClick={() => { setLinkInput(globalLink); setIsEditingLink(true); }}>
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => deleteGlobalLink.mutate()} disabled={deleteGlobalLink.isPending}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed border-2">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                {isEditingLink ? "Update the global link:" : "Paste a link to show on all admin pages:"}
              </p>
              <div className="flex gap-2">
                <Input
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  placeholder="https://example.com/..."
                  className="flex-1"
                />
                <Button
                  onClick={() => { const t = linkInput.trim(); if (!t) return; saveGlobalLink.mutate(t); }}
                  disabled={saveGlobalLink.isPending || !linkInput.trim()}
                  className="bg-primary text-primary-foreground"
                >
                  {saveGlobalLink.isPending ? "Saving..." : isEditingLink ? "Update" : "Save"}
                </Button>
                {isEditingLink && (
                  <Button variant="outline" onClick={() => { setIsEditingLink(false); setLinkInput(""); }}>
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
