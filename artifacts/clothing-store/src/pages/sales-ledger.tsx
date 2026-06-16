import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Download,
  Printer,
  Search,
  X,
  Trash2,
  Users,
  TrendingUp,
  Clock,
  CheckCircle2,
  BookOpen,
} from "lucide-react";

const LEDGER_KEY = ["ledger"];

type PaymentStatus = "Paid" | "Pending";

interface LedgerRow {
  id: string;
  adminId: string;
  date: string | null;
  customerName: string;
  productCost: number | null;
  paymentStatus: PaymentStatus;
  createdAt: string;
}

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

function formatIndian(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n);
}

function isoToDisplay(date: string | null): string {
  if (!date) return "—";
  const parts = date.split("-");
  if (parts.length !== 3) return date;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export default function SalesLedger() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [localValues, setLocalValues] = useState<Record<string, Partial<LedgerRow>>>({});

  const hasInitialized = useRef(false);

  const { data: serverRows = [], isLoading } = useQuery<LedgerRow[]>({
    queryKey: LEDGER_KEY,
    queryFn: async () => {
      const res = await authFetch("/api/ledger");
      if (!res.ok) throw new Error("Failed to fetch ledger");
      return res.json();
    },
  });

  const bulkCreate = useMutation({
    mutationFn: async (count: number) => {
      const res = await authFetch("/api/ledger/bulk", {
        method: "POST",
        body: JSON.stringify({ count }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LEDGER_KEY }),
  });

  useEffect(() => {
    if (!isLoading && !hasInitialized.current) {
      hasInitialized.current = true;
      if (serverRows.length === 0) bulkCreate.mutate(5);
    }
  }, [isLoading, serverRows.length]);

  const createRow = useMutation({
    mutationFn: async () => {
      const res = await authFetch("/api/ledger", {
        method: "POST",
        body: JSON.stringify({ date: null, customerName: "", productCost: null, paymentStatus: "Pending" }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<LedgerRow>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LEDGER_KEY }),
  });

  const updateRow = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<LedgerRow> }) => {
      const res = await authFetch(`/api/ledger/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (_, variables) => {
      setLocalValues((prev) => {
        const next = { ...prev };
        delete next[variables.id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: LEDGER_KEY });
    },
  });

  const deleteRow = useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/api/ledger/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEDGER_KEY });
      setDeleteId(null);
      toast({ title: "Row deleted" });
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  function getRow(serverRow: LedgerRow): LedgerRow {
    const local = localValues[serverRow.id];
    if (!local || Object.keys(local).length === 0) return serverRow;
    return { ...serverRow, ...local };
  }

  function setLocal(rowId: string, key: keyof LedgerRow, value: any) {
    setLocalValues((prev) => ({
      ...prev,
      [rowId]: { ...prev[rowId], [key]: value },
    }));
  }

  function handleBlurSave(rowId: string) {
    const local = localValues[rowId];
    if (!local || Object.keys(local).length === 0) return;
    updateRow.mutate({ id: rowId, data: local });
  }

  const displayRows = serverRows
    .map(getRow)
    .filter((row) => {
      if (searchQuery && !row.customerName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (dateFrom && row.date && row.date < dateFrom) return false;
      if (dateTo && row.date && row.date > dateTo) return false;
      return true;
    });

  const allMerged = serverRows.map(getRow);
  const totalSales = allMerged.reduce((s, r) => s + (r.productCost ?? 0), 0);
  const paidAmount = allMerged
    .filter((r) => r.paymentStatus === "Paid")
    .reduce((s, r) => s + (r.productCost ?? 0), 0);
  const pendingAmount = allMerged
    .filter((r) => r.paymentStatus === "Pending")
    .reduce((s, r) => s + (r.productCost ?? 0), 0);
  const totalCustomers = allMerged.filter((r) => r.customerName.trim()).length;

  const displayTotalCost = displayRows.reduce((s, r) => s + (r.productCost ?? 0), 0);
  const displayCustomerCount = displayRows.filter((r) => r.customerName.trim()).length;

  function exportCSV() {
    const header = ["Sr No", "Date", "Customer Name", "Product Cost", "Payment Status"];
    const dataRows = serverRows.map((r, i) => {
      const row = getRow(r);
      return [
        String(i + 1),
        isoToDisplay(row.date),
        row.customerName,
        row.productCost != null ? String(row.productCost) : "",
        row.paymentStatus,
      ];
    });
    const totalRow = [
      "Total",
      `${totalCustomers} Customers`,
      "",
      String(totalSales),
      "",
    ];
    const all = [header, ...dataRows, totalRow];
    const csv = all.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const cellCls = "border border-[hsl(var(--border))] text-sm bg-background";
  const thCls =
    "border border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider px-3 py-2 whitespace-nowrap";
  const inputCls =
    "w-full h-full border-0 bg-transparent text-sm outline-none focus:outline-none focus:ring-0 px-3 py-[7px] rounded-none placeholder:text-[hsl(var(--muted-foreground))]/40 disabled:opacity-50";

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .ledger-table-wrapper { max-height: none !important; overflow: visible !important; }
          .ledger-print-title { display: block !important; }
        }
        .ledger-print-title { display: none; }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"] { -moz-appearance: textfield; }
        input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0.5; cursor: pointer; }
      `}</style>

      <div className="space-y-5 pb-16">
        <div className="ledger-print-title text-xl font-bold mb-4">Sales Ledger</div>

        {/* Header */}
        <div className="flex items-center justify-between no-print">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary" /> Sales Ledger
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Track customer sales and payment status
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
              <Download className="w-4 h-4" /> Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
              <Printer className="w-4 h-4" /> Print
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 no-print">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground font-medium">Total Sales</span>
              </div>
              <p className="text-xl font-bold">₹{formatIndian(totalSales)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-xs text-muted-foreground font-medium">Paid</span>
              </div>
              <p className="text-xl font-bold text-green-600">₹{formatIndian(paidAmount)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="text-xs text-muted-foreground font-medium">Pending</span>
              </div>
              <p className="text-xl font-bold text-amber-600">₹{formatIndian(pendingAmount)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-muted-foreground font-medium">Customers</span>
              </div>
              <p className="text-xl font-bold text-blue-600">{totalCustomers}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap no-print">
          <div className="relative flex-1 min-w-44">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-36 text-sm"
            />
            <span className="text-muted-foreground text-sm">to</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-36 text-sm"
            />
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => { setDateFrom(""); setDateTo(""); }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div
          className="rounded-lg border border-border overflow-hidden shadow-sm"
          style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}
        >
          <div className="overflow-x-auto">
            <div
              className="ledger-table-wrapper"
              style={{ maxHeight: "62vh", overflowY: "auto", overscrollBehavior: "contain" }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
                <thead>
                  <tr>
                    <th className={thCls} style={{ position: "sticky", top: 0, zIndex: 10, width: 56, textAlign: "center" }}>
                      Sr No
                    </th>
                    <th className={thCls} style={{ position: "sticky", top: 0, zIndex: 10, width: 148, textAlign: "center" }}>
                      Date
                    </th>
                    <th className={thCls} style={{ position: "sticky", top: 0, zIndex: 10, minWidth: 180, textAlign: "left" }}>
                      Customer Name
                    </th>
                    <th className={thCls} style={{ position: "sticky", top: 0, zIndex: 10, width: 148, textAlign: "left" }}>
                      Product Cost
                    </th>
                    <th className={thCls} style={{ position: "sticky", top: 0, zIndex: 10, width: 130, textAlign: "center" }}>
                      Payment Status
                    </th>
                    <th
                      className={`${thCls} no-print`}
                      style={{ position: "sticky", top: 0, zIndex: 10, width: 44, textAlign: "center" }}
                    ></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={6}
                        style={{ textAlign: "center", padding: "60px 0", color: "hsl(var(--muted-foreground))", fontSize: 14, borderBottom: "1px solid hsl(var(--border))" }}
                      >
                        Loading...
                      </td>
                    </tr>
                  ) : displayRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        style={{ textAlign: "center", padding: "60px 0", color: "hsl(var(--muted-foreground))", fontSize: 14, borderBottom: "1px solid hsl(var(--border))" }}
                      >
                        {searchQuery || dateFrom || dateTo ? "No matching records found" : "No records yet"}
                      </td>
                    </tr>
                  ) : (
                    displayRows.map((row, idx) => {
                      const localRow = localValues[row.id] ?? {};
                      const isPaid = row.paymentStatus === "Paid";
                      return (
                        <tr
                          key={row.id}
                          style={{ background: idx % 2 === 0 ? "transparent" : "hsl(var(--muted)/0.3)" }}
                        >
                          {/* Sr No */}
                          <td
                            className={cellCls}
                            style={{ textAlign: "center", padding: "0", userSelect: "none", color: "hsl(var(--muted-foreground))", fontSize: 12, fontFamily: "monospace" }}
                          >
                            <div style={{ padding: "8px 10px" }}>{idx + 1}</div>
                          </td>

                          {/* Date */}
                          <td className={cellCls} style={{ padding: 0 }}>
                            <input
                              type="date"
                              value={
                                localRow.date !== undefined
                                  ? (localRow.date ?? "")
                                  : (row.date ?? "")
                              }
                              onChange={(e) => setLocal(row.id, "date", e.target.value || null)}
                              onBlur={() => handleBlurSave(row.id)}
                              className={inputCls}
                              style={{ textAlign: "center" }}
                            />
                          </td>

                          {/* Customer Name */}
                          <td className={cellCls} style={{ padding: 0 }}>
                            <input
                              type="text"
                              value={localRow.customerName !== undefined ? localRow.customerName : row.customerName}
                              onChange={(e) => setLocal(row.id, "customerName", e.target.value)}
                              onBlur={() => handleBlurSave(row.id)}
                              className={inputCls}
                              placeholder="Customer name"
                            />
                          </td>

                          {/* Product Cost */}
                          <td className={cellCls} style={{ padding: 0 }}>
                            <div style={{ display: "flex", alignItems: "center" }}>
                              <span style={{ paddingLeft: 10, color: "hsl(var(--muted-foreground))", fontSize: 13, flexShrink: 0 }}>
                                ₹
                              </span>
                              <input
                                type="number"
                                inputMode="numeric"
                                value={
                                  localRow.productCost !== undefined
                                    ? (localRow.productCost ?? "")
                                    : (row.productCost ?? "")
                                }
                                onChange={(e) =>
                                  setLocal(
                                    row.id,
                                    "productCost",
                                    e.target.value === "" ? null : Number(e.target.value)
                                  )
                                }
                                onBlur={() => handleBlurSave(row.id)}
                                className={inputCls}
                                style={{ paddingLeft: 4, flex: 1 }}
                                placeholder="0"
                                min="0"
                              />
                            </div>
                          </td>

                          {/* Payment Status */}
                          <td className={cellCls} style={{ padding: 0 }}>
                            <select
                              value={row.paymentStatus}
                              onChange={(e) => {
                                const val = e.target.value as PaymentStatus;
                                updateRow.mutate({ id: row.id, data: { paymentStatus: val } });
                              }}
                              className={inputCls}
                              style={{
                                cursor: "pointer",
                                textAlign: "center",
                                fontWeight: 600,
                                fontSize: 12,
                                color: isPaid
                                  ? "hsl(142 71% 34%)"
                                  : "hsl(38 93% 42%)",
                              }}
                            >
                              <option value="Paid">✅ Paid</option>
                              <option value="Pending">⏳ Pending</option>
                            </select>
                          </td>

                          {/* Delete */}
                          <td className={`${cellCls} no-print`} style={{ padding: 0 }}>
                            <button
                              onClick={() => setDeleteId(row.id)}
                              style={{
                                width: "100%",
                                height: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "8px 0",
                                color: "hsl(var(--muted-foreground)/0.4)",
                                transition: "color 0.15s",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = "hsl(var(--destructive))")}
                              onMouseLeave={(e) => (e.currentTarget.style.color = "hsl(var(--muted-foreground)/0.4)")}
                            >
                              <Trash2 style={{ width: 13, height: 13 }} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td
                      style={{
                        position: "sticky",
                        bottom: 0,
                        zIndex: 9,
                        background: "hsl(var(--muted))",
                        border: "1px solid hsl(var(--border))",
                        padding: "9px 12px",
                        fontWeight: 700,
                        fontSize: 13,
                        textAlign: "center",
                        color: "hsl(var(--foreground))",
                      }}
                    >
                      Total
                    </td>
                    <td
                      style={{
                        position: "sticky",
                        bottom: 0,
                        zIndex: 9,
                        background: "hsl(var(--muted))",
                        border: "1px solid hsl(var(--border))",
                        padding: "9px 12px",
                        fontWeight: 600,
                        fontSize: 12,
                        textAlign: "center",
                        color: "hsl(var(--muted-foreground))",
                      }}
                    >
                      {displayCustomerCount} Customer{displayCustomerCount !== 1 ? "s" : ""}
                    </td>
                    <td
                      style={{
                        position: "sticky",
                        bottom: 0,
                        zIndex: 9,
                        background: "hsl(var(--muted))",
                        border: "1px solid hsl(var(--border))",
                      }}
                    ></td>
                    <td
                      style={{
                        position: "sticky",
                        bottom: 0,
                        zIndex: 9,
                        background: "hsl(var(--muted))",
                        border: "1px solid hsl(var(--border))",
                        padding: "9px 12px",
                        fontWeight: 700,
                        fontSize: 13,
                        color: "hsl(var(--foreground))",
                      }}
                    >
                      ₹{formatIndian(displayTotalCost)}
                    </td>
                    <td
                      style={{
                        position: "sticky",
                        bottom: 0,
                        zIndex: 9,
                        background: "hsl(var(--muted))",
                        border: "1px solid hsl(var(--border))",
                      }}
                    ></td>
                    <td
                      className="no-print"
                      style={{
                        position: "sticky",
                        bottom: 0,
                        zIndex: 9,
                        background: "hsl(var(--muted))",
                        border: "1px solid hsl(var(--border))",
                      }}
                    ></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Add Row Button */}
        <div className="flex justify-center no-print">
          <Button
            variant="outline"
            onClick={() => createRow.mutate()}
            disabled={createRow.isPending}
            className="gap-2 border-dashed border-2 hover:border-primary hover:text-primary transition-colors px-8"
          >
            <Plus className="w-4 h-4" />
            {createRow.isPending ? "Adding..." : "+ Add New Row"}
          </Button>
        </div>

        {/* Delete Confirmation */}
        <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="w-5 h-5" /> Delete Row
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this row? This action cannot be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDeleteId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => deleteId && deleteRow.mutate(deleteId)}
                disabled={deleteRow.isPending}
              >
                {deleteRow.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
