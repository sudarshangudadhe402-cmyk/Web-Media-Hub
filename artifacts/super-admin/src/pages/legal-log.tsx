import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { FileText, Search, Download, Shield, Monitor, Globe, Calendar, Clock } from "lucide-react";

interface LegalRecord {
  _id: string;
  admin_id: string;
  admin_name: string;
  accepted_date: string;
  accepted_time: string;
  accepted_timestamp: string;
  device_type: string;
  browser_name: string;
  ip_address: string;
  final_acceptance: boolean;
  terms_accepted: boolean;
  privacy_accepted: boolean;
  refund_accepted: boolean;
  disclaimer_accepted: boolean;
}

function getToken() {
  return localStorage.getItem("wmh_token");
}

async function fetchAcceptances(search: string, from: string, to: string): Promise<LegalRecord[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const token = getToken();
  const res = await fetch(`/api/legal/acceptances?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch records");
  return res.json();
}

export default function LegalLog() {
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");

  const { data: records, isLoading, refetch } = useQuery({
    queryKey: ["legal-acceptances", appliedSearch, appliedFrom, appliedTo],
    queryFn: () => fetchAcceptances(appliedSearch, appliedFrom, appliedTo),
  });

  function handleFilter() {
    setAppliedSearch(search);
    setAppliedFrom(from);
    setAppliedTo(to);
  }

  function handleReset() {
    setSearch("");
    setFrom("");
    setTo("");
    setAppliedSearch("");
    setAppliedFrom("");
    setAppliedTo("");
  }

  async function handleExport() {
    const token = getToken();
    const res = await fetch("/api/legal/acceptances/export", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `legal-acceptances-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const count = records?.length ?? 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Legal Agreements Log</h1>
          <p className="text-muted-foreground text-sm mt-1">Track admin legal policy acceptances</p>
        </div>
        <Button onClick={handleExport} variant="outline" className="gap-2 shrink-0">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by admin name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFilter()}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-36 text-sm"
                  placeholder="From"
                />
              </div>
              <span className="text-muted-foreground text-sm">to</span>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-36 text-sm"
                placeholder="To"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleFilter} className="gap-1.5">
              <Search className="w-3.5 h-3.5" />
              Apply Filter
            </Button>
            {(appliedSearch || appliedFrom || appliedTo) && (
              <Button size="sm" variant="ghost" onClick={handleReset} className="text-muted-foreground">
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Acceptance Records</h2>
          {!isLoading && <Badge className="ml-1">{count}</Badge>}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : count === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center text-muted-foreground">
              <Shield className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No records found</p>
              <p className="text-sm mt-1">
                {appliedSearch || appliedFrom || appliedTo
                  ? "Try adjusting your filters."
                  : "No admins have completed legal acceptance yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {records?.map((record) => (
              <Card key={record._id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold uppercase shrink-0">
                      {record.admin_name.substring(0, 2)}
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{record.admin_name}</span>
                        <Badge
                          variant={record.final_acceptance ? "default" : "destructive"}
                          className="text-[10px]"
                        >
                          {record.final_acceptance ? "Completed" : "Incomplete"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3 shrink-0" />
                          <span>{record.accepted_date || "—"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>{record.accepted_time || "—"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Monitor className="w-3 h-3 shrink-0" />
                          <span>{record.device_type || "—"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Globe className="w-3 h-3 shrink-0" />
                          <span>{record.browser_name || "—"}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="font-mono bg-muted rounded px-1.5 py-0.5">{record.ip_address || "—"}</span>
                        <span className="text-muted-foreground/50">·</span>
                        <span className="text-muted-foreground/70 text-[10px]">ID: {record.admin_id}</span>
                      </div>
                    </div>

                    <div className="flex gap-1.5 flex-wrap shrink-0">
                      {[
                        { label: "T&C", val: record.terms_accepted },
                        { label: "Privacy", val: record.privacy_accepted },
                        { label: "Refund", val: record.refund_accepted },
                        { label: "Disclaimer", val: record.disclaimer_accepted },
                      ].map(({ label, val }) => (
                        <span
                          key={label}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            val
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
