import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useListAdmins } from "@workspace/api-client-react";
import { ArrowLeft, Store, Search, CalendarDays } from "lucide-react";

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Stores() {
  const [, setLocation] = useLocation();
  const { data: admins = [], isLoading } = useListAdmins();
  const [search, setSearch] = useState("");

  const adminsArr = admins as any[];

  const filteredAdmins = useMemo(() => {
    const q = search.trim().toLowerCase();
    return adminsArr.filter(
      (a) =>
        !q ||
        (a.storeName ?? "").toLowerCase().includes(q) ||
        (a.username ?? "").toLowerCase().includes(q) ||
        (a.email ?? "").toLowerCase().includes(q) ||
        (a.adminNumber ?? "").toLowerCase().includes(q)
    );
  }, [adminsArr, search]);

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
          <Store className="w-5 h-5" style={{ color: "#7c3aed" }} />
          <h1 className="text-lg font-bold" style={{ color: "#1e1b4b" }}>All Stores</h1>
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(124,58,237,0.10)", color: "#7c3aed" }}
          >
            {filteredAdmins.length}
          </span>
        </div>
      </div>

      {/* Search */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl border mb-5 max-w-sm"
        style={{ borderColor: "#e5e7eb", background: "#f9f9fc" }}
      >
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          placeholder="Search by name, city or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-0 text-sm bg-transparent outline-none text-gray-600 placeholder-gray-400"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "#f0f0f5" }} />
          ))}
        </div>
      ) : filteredAdmins.length === 0 ? (
        <div className="py-16 text-center">
          <Store className="w-10 h-10 mx-auto mb-3 opacity-15" style={{ color: "#7c3aed" }} />
          <p className="text-sm font-medium text-gray-500">No stores found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredAdmins.map((admin: any) => {
            const isActive = admin.isActive !== false;
            const displayName = admin.storeName || admin.email || "—";
            const planName = admin.planName as string;
            const planColor = admin.planColor as string;
            const endDate = admin.subscriptionEndDate as string | null;
            return (
              <div
                key={admin.id}
                className="bg-white rounded-2xl p-4 flex items-center gap-3 hover:shadow-md transition-all duration-200"
                style={{ border: "1px solid #f0f0f5", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                  style={{
                    background: isActive
                      ? "linear-gradient(135deg, #7c3aed, #a855f7)"
                      : "#d1d5db",
                    color: "white",
                  }}
                >
                  {displayName.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold truncate">{displayName}</span>
                    {!isActive && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {planName && (
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{
                          background: planColor ? planColor + "18" : "rgba(124,58,237,0.08)",
                          color: planColor || "#7c3aed",
                        }}
                      >
                        {planName}
                      </span>
                    )}
                    {endDate && (
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <CalendarDays className="w-2.5 h-2.5" />
                        {fmtDate(endDate)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
