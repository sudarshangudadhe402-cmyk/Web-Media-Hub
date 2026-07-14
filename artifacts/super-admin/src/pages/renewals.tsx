import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, RefreshCw, IndianRupee, Store } from "lucide-react";
import { authFetch } from "@/lib/admin-api";

interface RenewalAdminRow {
  adminId: string;
  storeName: string;
  planName: string;
  planColor: string;
  renewalCount: number;
  renewalRevenue: number;
}

interface RenewalsDetail {
  totalRenewalCount: number;
  totalRenewalRevenue: number;
  perAdmin: RenewalAdminRow[];
}

function rupees(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function Renewals() {
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery<RenewalsDetail>({
    queryKey: ["renewals-detail"],
    queryFn: async () => {
      const res = await authFetch("/api/marketing/renewals-detail");
      if (!res.ok) throw new Error("Failed to load renewals detail");
      return res.json();
    },
    staleTime: 30_000,
  });

  const totalRenewalCount = data?.totalRenewalCount ?? 0;
  const totalRenewalRevenue = data?.totalRenewalRevenue ?? 0;
  const perAdmin = data?.perAdmin ?? [];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => setLocation("/admins")}
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border hover:bg-gray-50 transition-colors shrink-0"
          style={{ borderColor: "#e5e7eb" }}
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5" style={{ color: "#7c3aed" }} />
          <h1 className="text-lg font-bold" style={{ color: "#1e1b4b" }}>Total Renewals</h1>
        </div>
      </div>

      {/* Top summary boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div
          className="bg-white rounded-2xl p-5 flex items-center gap-4"
          style={{ border: "1px solid #f0f0f5", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(124,58,237,0.10)" }}
          >
            <RefreshCw className="w-6 h-6" style={{ color: "#7c3aed" }} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Total Renewals</p>
            <p className="text-2xl font-bold" style={{ color: "#1e1b4b" }}>
              {isLoading ? "—" : totalRenewalCount.toLocaleString()}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">Every renewal, across all admins</p>
          </div>
        </div>

        <div
          className="bg-white rounded-2xl p-5 flex items-center gap-4"
          style={{ border: "1px solid #f0f0f5", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(5,150,105,0.10)" }}
          >
            <IndianRupee className="w-6 h-6" style={{ color: "#059669" }} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Total Renewal Revenue</p>
            <p className="text-2xl font-bold" style={{ color: "#1e1b4b" }}>
              {isLoading ? "—" : rupees(totalRenewalRevenue)}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">Revenue collected from renewals</p>
          </div>
        </div>
      </div>

      {/* Per-admin renewal list */}
      <h2 className="text-sm font-bold mb-3" style={{ color: "#1e1b4b" }}>Renewals by Admin</h2>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "#f0f0f5" }} />
          ))}
        </div>
      ) : perAdmin.length === 0 ? (
        <div className="py-16 text-center">
          <RefreshCw className="w-10 h-10 mx-auto mb-3 opacity-15" style={{ color: "#7c3aed" }} />
          <p className="text-sm font-medium text-gray-500">No renewals yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {perAdmin.map((row) => (
            <div
              key={row.adminId}
              className="bg-white rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
              style={{ border: "1px solid #f0f0f5", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(124,58,237,0.10)" }}
                >
                  <Store className="w-4 h-4" style={{ color: "#7c3aed" }} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "#1e1b4b" }}>
                    {row.storeName}
                  </p>
                  {row.planName && (
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded mt-0.5 inline-block"
                      style={{
                        background: row.planColor ? row.planColor + "18" : "rgba(124,58,237,0.08)",
                        color: row.planColor || "#7c3aed",
                      }}
                    >
                      {row.planName}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold" style={{ color: "#7c3aed" }}>
                  {row.renewalCount} renewal{row.renewalCount === 1 ? "" : "s"}
                </p>
                <p className="text-[11px] text-gray-400">{rupees(row.renewalRevenue)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
