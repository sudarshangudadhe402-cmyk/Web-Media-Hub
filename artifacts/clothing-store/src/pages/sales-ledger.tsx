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
  Check,
  Pencil,
} from "lucide-react";

const LEDGER_KEY = ["ledger"];

type PaymentStatus = "Paid" | "Pending";

interface LedgerRow {
  id: string;
  adminId: string;
  date: string | null;
  customerName: string;
  productName: string;
  productCost: number | null;
  paymentStatus: PaymentStatus;
  confirmed: boolean;
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
  // IDs of confirmed rows that are currently in edit mode
  const [editingIds, setEditingIds] = useState<Set<string>>(new Set());

  const hasInitialized = useRef(false);
  const activeRowRef = useRef<HTMLInputElement>(null);

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
        body: JSON.stringify({ date: null, customerName: "", productName: "", productCost: null, paymentStatus: "Pending", confirmed: false }),
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

  // Save all local changes + mark confirmed
  function handleConfirm(rowId: string) {
    const local = localValues[rowId] ?? {};
    updateRow.mutate(
      { id: rowId, data: { ...local, confirmed: true } },
      {
        onSuccess: () => {
          setEditingIds((prev) => {
            const next = new Set(prev);
            next.delete(rowId);
            return next;
          });
        },
      }
    );
  }

  // Enter edit mode for a confirmed row
  function handleEdit(rowId: string) {
    setEditingIds((prev) => new Set(prev).add(rowId));
  }

  // Scroll and focus the next fillable row
  function scrollToNextFillable() {
    if (activeRowRef.current) {
      activeRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => activeRowRef.current?.focus(), 200);
    }
  }

  const allRows = serverRows.map(getRow);

  // Auto-add: always keep at least 1 unfilled row
  useEffect(() => {
    if (!isLoading && allRows.length > 0 && allRows.every((r) => r.confirmed) && !createRow.isPending) {
      createRow.mutate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRows.map((r) => r.confirmed + r.id).join(","), isLoading]);

  // For table: show all rows (both confirmed and draft), filtered by search/date
  // Order: newest at top (descending createdAt)
  const displayRows = allRows
    .filter((row) => {
      if (searchQuery && !row.customerName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (dateFrom && row.date && row.date < dateFrom) return false;
      if (dateTo && row.date && row.date > dateTo) return false;
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // The "next fillable" = unconfirmed row with lowest Sr No (last in displayRows since table is newest-first).
  // Use displayRows directly so visual Sr No and nextFillable always stay in sync.
  const nextFillableId = displayRows.slice().reverse().find((r) => !r.confirmed)?.id ?? null;

  // Stats: ONLY confirmed rows
  const confirmedRows = allRows.filter((r) => r.confirmed);
  const totalSales = confirmedRows.reduce((s, r) => s + (r.productCost ?? 0), 0);
  const paidAmount = confirmedRows
    .filter((r) => r.paymentStatus === "Paid")
    .reduce((s, r) => s + (r.productCost ?? 0), 0);
  const pendingAmount = confirmedRows
    .filter((r) => r.paymentStatus === "Pending")
    .reduce((s, r) => s + (r.productCost ?? 0), 0);
  const totalCustomers = confirmedRows.filter((r) => r.customerName.trim()).length;

  // Total row: confirmed rows matching current filter
  const confirmedDisplayRows = displayRows.filter((r) => r.confirmed);
  const displayTotalCost = confirmedDisplayRows.reduce((s, r) => s + (r.productCost ?? 0), 0);
  const displayCustomerCount = confirmedDisplayRows.filter((r) => r.customerName.trim()).length;

  function exportCSV() {
    const header = ["Sr No", "Date", "Customer Name", "Product Name", "Product Cost", "Payment Status"];
    const dataRows = confirmedRows.map((r, i) => [
      String(i + 1),
      isoToDisplay(r.date),
      r.customerName,
      r.productName ?? "",
      r.productCost != null ? String(r.productCost) : "",
      r.paymentStatus,
    ]);
    const totalRow = ["Total", `${totalCustomers} Customers`, "", "", String(totalSales), ""];
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

  const thCls =
    "border border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider px-3 py-2 whitespace-nowrap";
  const cellCls = "border border-[hsl(var(--border))] text-sm";
  const inputCls =
    "w-full h-full border-0 bg-transparent text-sm outline-none focus:outline-none focus:ring-0 px-3 py-[7px] rounded-none placeholder:text-[hsl(var(--muted-foreground))]/40";
  const readCls: React.CSSProperties = {
    padding: "8px 12px",
    fontSize: 13,
    color: "hsl(var(--foreground))",
    display: "flex",
    alignItems: "center",
    minHeight: 36,
  };

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
        .confirm-btn { transition: background 0.15s, transform 0.1s; }
        .confirm-btn:hover { transform: scale(1.05); }
        .confirm-btn:active { transform: scale(0.97); }
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
              Fill row → click ✅ to save · Click ✏️ to edit a saved entry
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

        {/* Summary Cards — only confirmed rows */}
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
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36 text-sm" />
            <span className="text-muted-foreground text-sm">to</span>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36 text-sm" />
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => { setDateFrom(""); setDateTo(""); }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <Button
              size="sm"
              onClick={() => createRow.mutate()}
              disabled={createRow.isPending}
              className="gap-1.5 bg-green-600 hover:bg-green-700 text-white border-0"
            >
              <Plus className="w-4 h-4" />
              {createRow.isPending ? "Adding..." : "Add Row"}
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border overflow-hidden shadow-sm" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
          <div className="overflow-x-auto">
            <div className="ledger-table-wrapper" style={{ maxHeight: "62vh", overflowY: "auto", overscrollBehavior: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                <thead>
                  <tr>
                    <th className={thCls} style={{ position: "sticky", top: 0, zIndex: 10, width: 40, textAlign: "center" }}>Sr No</th>
                    <th className={thCls} style={{ position: "sticky", top: 0, zIndex: 10, width: 90, textAlign: "center" }}>Date</th>
                    <th className={thCls} style={{ position: "sticky", top: 0, zIndex: 10, width: 140, textAlign: "left" }}>Customer Name</th>
                    <th className={thCls} style={{ position: "sticky", top: 0, zIndex: 10, width: 120, textAlign: "left" }}>Product Name</th>
                    <th className={thCls} style={{ position: "sticky", top: 0, zIndex: 10, width: 110, textAlign: "left" }}>Product Cost</th>
                    <th className={thCls} style={{ position: "sticky", top: 0, zIndex: 10, width: 110, textAlign: "center" }}>Payment Status</th>
                    <th className={`${thCls} no-print`} style={{ position: "sticky", top: 0, zIndex: 10, width: 60, textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "60px 0", color: "hsl(var(--muted-foreground))", fontSize: 14 }}>
                        Loading...
                      </td>
                    </tr>
                  ) : displayRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "60px 0", color: "hsl(var(--muted-foreground))", fontSize: 14 }}>
                        {searchQuery || dateFrom || dateTo ? "No matching records found" : "No records yet"}
                      </td>
                    </tr>
                  ) : (
                    displayRows.map((row, idx) => {
                      const localRow = localValues[row.id] ?? {};
                      const isConfirmed = row.confirmed;
                      const isEditing = editingIds.has(row.id);
                      const isNextFillable = row.id === nextFillableId;
                      const isFutureDraft = !isConfirmed && !isNextFillable;
                      // Only the next-in-line unconfirmed row is editable; future drafts are locked
                      const isEditable = (!isConfirmed && isNextFillable) || isEditing;
                      const isPaid = row.paymentStatus === "Paid";
                      const rowBg = isConfirmed
                        ? idx % 2 === 0 ? "hsl(142 71% 98%)" : "hsl(142 71% 96%)"
                        : isNextFillable
                          ? "hsl(215 100% 97%)"
                          : idx % 2 === 0 ? "transparent" : "hsl(var(--muted)/0.25)";

                      return (
                        <tr
                          key={row.id}
                          style={{
                            background: rowBg,
                            opacity: isFutureDraft ? 0.42 : 1,
                            cursor: isFutureDraft ? "pointer" : "default",
                            transition: "opacity 0.15s",
                          }}
                          onClick={isFutureDraft ? scrollToNextFillable : undefined}
                          title={isFutureDraft ? "Complete the current row first" : undefined}
                        >
                          {/* Sr No — bottom row = 1, increases upward */}
                          <td className={cellCls} style={{ textAlign: "center", padding: 0, userSelect: "none", color: "hsl(var(--muted-foreground))", fontSize: 12, fontFamily: "monospace" }}>
                            <div style={{ padding: "8px 6px" }}>{displayRows.length - idx}</div>
                          </td>

                          {/* Date */}
                          <td className={cellCls} style={{ padding: 0, borderLeft: isNextFillable ? "3px solid hsl(215 100% 60%)" : undefined }}>
                            {isEditable ? (
                              <input
                                ref={isNextFillable ? activeRowRef : undefined}
                                type="date"
                                value={localRow.date !== undefined ? (localRow.date ?? "") : (row.date ?? "")}
                                onChange={(e) => setLocal(row.id, "date", e.target.value || null)}
                                className={inputCls}
                                style={{ textAlign: "center" }}
                              />
                            ) : (
                              <div style={{ ...readCls, justifyContent: "center", color: row.date ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}>
                                {isoToDisplay(row.date)}
                              </div>
                            )}
                          </td>

                          {/* Customer Name */}
                          <td className={cellCls} style={{ padding: 0 }}>
                            {isEditable ? (
                              <input
                                type="text"
                                value={localRow.customerName !== undefined ? localRow.customerName : row.customerName}
                                onChange={(e) => setLocal(row.id, "customerName", e.target.value)}
                                className={inputCls}
                                placeholder="Customer name"
                                maxLength={20}
                              />
                            ) : (
                              <div style={{ ...readCls, fontWeight: row.customerName ? 500 : 400, color: row.customerName ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}>
                                {row.customerName ? (row.customerName.length > 20 ? row.customerName.slice(0, 20) + "…" : row.customerName) : "—"}
                              </div>
                            )}
                          </td>

                          {/* Product Name */}
                          <td className={cellCls} style={{ padding: 0 }}>
                            {isEditable ? (
                              <input
                                type="text"
                                value={localRow.productName !== undefined ? localRow.productName : (row.productName ?? "")}
                                onChange={(e) => setLocal(row.id, "productName", e.target.value)}
                                className={inputCls}
                                placeholder="Product name"
                                maxLength={15}
                              />
                            ) : (
                              <div style={{ ...readCls, fontWeight: row.productName ? 500 : 400, color: row.productName ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}>
                                {row.productName ? (row.productName.length > 15 ? row.productName.slice(0, 15) + "…" : row.productName) : "—"}
                              </div>
                            )}
                          </td>

                          {/* Product Cost */}
                          <td className={cellCls} style={{ padding: 0 }}>
                            {isEditable ? (
                              <div style={{ display: "flex", alignItems: "center" }}>
                                <span style={{ paddingLeft: 10, color: "hsl(var(--muted-foreground))", fontSize: 13, flexShrink: 0 }}>₹</span>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  value={localRow.productCost !== undefined ? (localRow.productCost ?? "") : (row.productCost ?? "")}
                                  onChange={(e) => setLocal(row.id, "productCost", e.target.value === "" ? null : Number(e.target.value))}
                                  className={inputCls}
                                  style={{ paddingLeft: 4, flex: 1 }}
                                  placeholder="0"
                                  min="0"
                                />
                              </div>
                            ) : (
                              <div style={readCls}>
                                <span style={{ color: "hsl(var(--muted-foreground))", marginRight: 2, fontSize: 12 }}>₹</span>
                                <span style={{ fontWeight: 600 }}>
                                  {row.productCost != null ? formatIndian(row.productCost) : "—"}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Payment Status */}
                          <td className={cellCls} style={{ padding: 0 }}>
                            {isEditable ? (
                              <select
                                value={localRow.paymentStatus !== undefined ? localRow.paymentStatus : row.paymentStatus}
                                onChange={(e) => setLocal(row.id, "paymentStatus", e.target.value as PaymentStatus)}
                                className={inputCls}
                                style={{ cursor: "pointer", textAlign: "center", fontWeight: 600, fontSize: 12 }}
                              >
                                <option value="Paid">✅ Paid</option>
                                <option value="Pending">⏳ Pending</option>
                              </select>
                            ) : (
                              <div style={{ ...readCls, justifyContent: "center" }}>
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    padding: "2px 10px",
                                    borderRadius: 20,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    background: isPaid ? "hsl(142 71% 92%)" : "hsl(38 93% 92%)",
                                    color: isPaid ? "hsl(142 71% 30%)" : "hsl(38 93% 35%)",
                                  }}
                                >
                                  {isPaid ? "✅ Paid" : "⏳ Pending"}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Action Column */}
                          <td className={`${cellCls} no-print`} style={{ padding: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "4px 6px" }}>
                              {/* Case 1: Confirmed, not editing → show ✏️ */}
                              {isConfirmed && !isEditing && (
                                <button
                                  onClick={() => handleEdit(row.id)}
                                  title="Edit this row"
                                  className="confirm-btn"
                                  style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 6,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    background: "hsl(221 83% 95%)",
                                    color: "hsl(221 83% 45%)",
                                    border: "1.5px solid hsl(221 83% 80%)",
                                    cursor: "pointer",
                                  }}
                                >
                                  <Pencil style={{ width: 13, height: 13 }} />
                                </button>
                              )}

                              {/* Case 2: Draft (unconfirmed) next-fillable only → show ✅ */}
                              {!isConfirmed && isNextFillable && (
                                <button
                                  onClick={() => handleConfirm(row.id)}
                                  title="Save this row"
                                  disabled={updateRow.isPending}
                                  className="confirm-btn"
                                  style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 6,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    background: "hsl(142 71% 45%)",
                                    color: "white",
                                    border: "none",
                                    cursor: "pointer",
                                    opacity: updateRow.isPending ? 0.6 : 1,
                                  }}
                                >
                                  <Check style={{ width: 14, height: 14, strokeWidth: 3 }} />
                                </button>
                              )}

                              {/* Case 3: Confirmed + editing → show ✅ (save) + 🗑️ (delete) */}
                              {isConfirmed && isEditing && (
                                <>
                                  <button
                                    onClick={() => handleConfirm(row.id)}
                                    title="Save changes"
                                    disabled={updateRow.isPending}
                                    className="confirm-btn"
                                    style={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: 6,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      background: "hsl(142 71% 45%)",
                                      color: "white",
                                      border: "none",
                                      cursor: "pointer",
                                      opacity: updateRow.isPending ? 0.6 : 1,
                                    }}
                                  >
                                    <Check style={{ width: 14, height: 14, strokeWidth: 3 }} />
                                  </button>
                                  <button
                                    onClick={() => setDeleteId(row.id)}
                                    title="Delete this row"
                                    className="confirm-btn"
                                    style={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: 6,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      background: "hsl(0 84% 95%)",
                                      color: "hsl(0 84% 50%)",
                                      border: "1.5px solid hsl(0 84% 80%)",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <Trash2 style={{ width: 13, height: 13 }} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  {(["Total", `${displayCustomerCount} Customer${displayCustomerCount !== 1 ? "s" : ""}`, "", "", `₹${formatIndian(displayTotalCost)}`, "", ""] as string[]).map((val, i) => (
                    <td
                      key={i}
                      className={i === 6 ? "no-print" : ""}
                      style={{
                        position: "sticky",
                        bottom: 0,
                        zIndex: 9,
                        background: "hsl(var(--muted))",
                        border: "1px solid hsl(var(--border))",
                        padding: val ? "9px 12px" : "9px 6px",
                        fontWeight: i === 0 || i === 4 ? 700 : 600,
                        fontSize: 12,
                        textAlign: i === 0 || i === 1 ? "center" : "left",
                        color: i === 4 ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {val}
                    </td>
                  ))}
                </tfoot>
              </table>
            </div>
          </div>
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
              <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>
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
