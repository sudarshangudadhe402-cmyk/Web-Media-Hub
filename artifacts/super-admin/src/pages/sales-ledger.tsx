import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  IndianRupee,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  TrendingUp,
  BookOpen,
  Save,
  X,
  Loader2,
} from "lucide-react";

const TOKEN_KEY = "wmh_super_token";

function authFetch(url: string, options?: RequestInit) {
  const token = sessionStorage.getItem(TOKEN_KEY);
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });
}

const API = "/api";

interface LedgerEntry {
  id: string;
  adminId: string;
  date: string | null;
  customerName: string;
  productCost: number | null;
  paymentStatus: "Paid" | "Pending";
  confirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

function useLedger() {
  return useQuery<LedgerEntry[]>({
    queryKey: ["ledger"],
    queryFn: async () => {
      const res = await authFetch(`${API}/ledger`);
      if (!res.ok) throw new Error("Failed to fetch ledger");
      return res.json();
    },
  });
}

export default function SalesLedger() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: entries = [], isLoading } = useLedger();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<LedgerEntry>>({});

  const addRow = useMutation({
    mutationFn: async () => {
      const res = await authFetch(`${API}/ledger`, {
        method: "POST",
        body: JSON.stringify({
          date: new Date().toISOString().split("T")[0],
          customerName: "",
          productCost: null,
          paymentStatus: "Pending",
        }),
      });
      if (!res.ok) throw new Error("Failed to add entry");
      return res.json() as Promise<LedgerEntry>;
    },
    onSuccess: (entry) => {
      qc.invalidateQueries({ queryKey: ["ledger"] });
      setEditingId(entry.id);
      setEditValues({
        date: entry.date ?? "",
        customerName: "",
        productCost: null,
        paymentStatus: "Pending",
      });
    },
    onError: () => toast({ title: "Error", description: "Could not add row.", variant: "destructive" }),
  });

  const saveRow = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<LedgerEntry> }) => {
      const res = await authFetch(`${API}/ledger/${id}`, {
        method: "PATCH",
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ledger"] });
      setEditingId(null);
      setEditValues({});
      toast({ title: "Saved", description: "Entry updated successfully." });
    },
    onError: () => toast({ title: "Error", description: "Could not save.", variant: "destructive" }),
  });

  const deleteRow = useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`${API}/ledger/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ledger"] });
      toast({ title: "Deleted", description: "Entry removed." });
    },
    onError: () => toast({ title: "Error", description: "Could not delete.", variant: "destructive" }),
  });

  const toggleConfirm = useMutation({
    mutationFn: async ({ id, confirmed }: { id: string; confirmed: boolean }) => {
      const res = await authFetch(`${API}/ledger/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ confirmed }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ledger"] }),
    onError: () => toast({ title: "Error", description: "Could not update.", variant: "destructive" }),
  });

  function startEdit(entry: LedgerEntry) {
    setEditingId(entry.id);
    setEditValues({
      date: entry.date ?? "",
      customerName: entry.customerName,
      productCost: entry.productCost,
      paymentStatus: entry.paymentStatus,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValues({});
  }

  function commitSave(id: string) {
    saveRow.mutate({ id, values: editValues });
  }

  const totalSales = entries.reduce((sum, e) => sum + (e.productCost ?? 0), 0);
  const paidEntries = entries.filter((e) => e.paymentStatus === "Paid");
  const pendingEntries = entries.filter((e) => e.paymentStatus === "Pending");
  const paidAmount = paidEntries.reduce((sum, e) => sum + (e.productCost ?? 0), 0);
  const pendingAmount = pendingEntries.reduce((sum, e) => sum + (e.productCost ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Sales & Ledger</h1>
            <p className="text-sm text-muted-foreground">Track all sales and payment records</p>
          </div>
        </div>
        <Button
          onClick={() => addRow.mutate()}
          disabled={addRow.isPending}
          size="sm"
          className="gap-2"
        >
          {addRow.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add Entry
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Sales</p>
              <p className="text-lg font-bold text-foreground flex items-center gap-0.5">
                <IndianRupee className="h-4 w-4" />
                {totalSales.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-muted-foreground">{entries.length} entries</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Paid</p>
              <p className="text-lg font-bold text-foreground flex items-center gap-0.5">
                <IndianRupee className="h-4 w-4" />
                {paidAmount.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-muted-foreground">{paidEntries.length} entries</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Clock className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Pending</p>
              <p className="text-lg font-bold text-foreground flex items-center gap-0.5">
                <IndianRupee className="h-4 w-4" />
                {pendingAmount.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-muted-foreground">{pendingEntries.length} entries</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="border border-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-muted-foreground font-medium">No entries yet</p>
              <p className="text-sm text-muted-foreground/60">Click "Add Entry" to record your first sale</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">#</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Customer Name</th>
                    <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Amount (₹)</th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Confirmed</th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entries.map((entry, idx) => {
                    const isEditing = editingId === entry.id;
                    return (
                      <tr
                        key={entry.id}
                        className={`transition-colors ${isEditing ? "bg-primary/5" : "hover:bg-muted/20"}`}
                      >
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{idx + 1}</td>

                        {/* Date */}
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <Input
                              type="date"
                              value={editValues.date ?? ""}
                              onChange={(e) => setEditValues((v) => ({ ...v, date: e.target.value }))}
                              className="h-8 text-sm w-36"
                            />
                          ) : (
                            <span
                              className="cursor-pointer hover:text-primary transition-colors"
                              onClick={() => startEdit(entry)}
                            >
                              {entry.date
                                ? new Date(entry.date).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : <span className="text-muted-foreground/50 italic">—</span>}
                            </span>
                          )}
                        </td>

                        {/* Customer Name */}
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <Input
                              value={editValues.customerName ?? ""}
                              onChange={(e) => setEditValues((v) => ({ ...v, customerName: e.target.value }))}
                              placeholder="Customer name"
                              className="h-8 text-sm w-44"
                            />
                          ) : (
                            <span
                              className="cursor-pointer hover:text-primary transition-colors font-medium"
                              onClick={() => startEdit(entry)}
                            >
                              {entry.customerName || <span className="text-muted-foreground/50 italic font-normal">—</span>}
                            </span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3 text-right">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editValues.productCost ?? ""}
                              onChange={(e) =>
                                setEditValues((v) => ({
                                  ...v,
                                  productCost: e.target.value === "" ? null : Number(e.target.value),
                                }))
                              }
                              placeholder="0"
                              className="h-8 text-sm w-28 text-right ml-auto"
                            />
                          ) : (
                            <span
                              className="cursor-pointer hover:text-primary transition-colors font-medium"
                              onClick={() => startEdit(entry)}
                            >
                              {entry.productCost != null ? (
                                <span className="flex items-center justify-end gap-0.5">
                                  <IndianRupee className="h-3 w-3" />
                                  {entry.productCost.toLocaleString("en-IN")}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/50 italic">—</span>
                              )}
                            </span>
                          )}
                        </td>

                        {/* Payment Status */}
                        <td className="px-4 py-3 text-center">
                          {isEditing ? (
                            <Select
                              value={editValues.paymentStatus ?? "Pending"}
                              onValueChange={(val) =>
                                setEditValues((v) => ({ ...v, paymentStatus: val as "Paid" | "Pending" }))
                              }
                            >
                              <SelectTrigger className="h-8 text-sm w-28 mx-auto">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Paid">Paid</SelectItem>
                                <SelectItem value="Pending">Pending</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge
                              variant="outline"
                              className={`cursor-pointer text-xs ${
                                entry.paymentStatus === "Paid"
                                  ? "border-green-500/40 text-green-600 bg-green-500/10"
                                  : "border-yellow-500/40 text-yellow-600 bg-yellow-500/10"
                              }`}
                              onClick={() => startEdit(entry)}
                            >
                              {entry.paymentStatus === "Paid" ? (
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                              ) : (
                                <Clock className="h-3 w-3 mr-1" />
                              )}
                              {entry.paymentStatus}
                            </Badge>
                          )}
                        </td>

                        {/* Confirmed */}
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleConfirm.mutate({ id: entry.id, confirmed: !entry.confirmed })}
                            className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto transition-colors ${
                              entry.confirmed
                                ? "bg-green-500/20 text-green-600 hover:bg-green-500/30"
                                : "bg-muted text-muted-foreground hover:bg-muted/70"
                            }`}
                            title={entry.confirmed ? "Confirmed — click to unconfirm" : "Click to confirm"}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 px-2 gap-1 text-xs"
                                onClick={() => commitSave(entry.id)}
                                disabled={saveRow.isPending}
                              >
                                {saveRow.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Save className="h-3 w-3" />
                                )}
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2"
                                onClick={cancelEdit}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => deleteRow.mutate(entry.id)}
                              disabled={deleteRow.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {entries.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/20">
                      <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Total ({entries.length} entries)
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-foreground flex items-center justify-end gap-0.5">
                        <IndianRupee className="h-3.5 w-3.5" />
                        {totalSales.toLocaleString("en-IN")}
                      </td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
