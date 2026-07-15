import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2 } from "lucide-react";
import { authFetch } from "@/lib/admin-api";
import { INDIA_STATES } from "@/lib/india-locations";

export default function Cities() {
  const [, setLocation] = useLocation();

  // Backend responds with a plain map: { [state]: count }
  const { data: countByState = {}, isLoading } = useQuery<Record<string, number>>({
    queryKey: ["cities-counts-by-state"],
    queryFn: async () => {
      const res = await authFetch("/api/cities/counts-by-state");
      if (!res.ok) return {};
      return res.json();
    },
    staleTime: 15_000,
  });

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
          <Building2 className="w-5 h-5" style={{ color: "#0891b2" }} />
          <h1 className="text-lg font-bold" style={{ color: "#1e1b4b" }}>Total Cities</h1>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "#f0f0f5" }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {INDIA_STATES.map((state) => (
            <button
              key={state}
              onClick={() => setLocation(`/cities/${encodeURIComponent(state)}`)}
              className="text-left bg-white rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              style={{ border: "1px solid #f0f0f5", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}
            >
              <p className="text-base font-bold leading-tight truncate" style={{ color: "#1e1b4b" }}>
                {state}
              </p>
              <p className="text-sm font-medium mt-1" style={{ color: "#0891b2" }}>
                City = {String(countByState[state] ?? 0).padStart(3, "0")}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
