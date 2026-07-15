import { useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin } from "lucide-react";
import { authFetch } from "@/lib/admin-api";

interface CityRow {
  id: string;
  name: string;
  state: string;
}

export default function CityStores() {
  const [, setLocation] = useLocation();
  const params = useParams<{ state: string }>();
  const state = decodeURIComponent(params.state || "");

  const { data: cities = [], isLoading } = useQuery<CityRow[]>({
    queryKey: ["cities", state],
    queryFn: async () => {
      const res = await authFetch(`/api/cities?state=${encodeURIComponent(state)}`);
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 15_000,
  });

  // Store count per city — the linking function is not built yet, so every
  // city shows 0 stores for now. Kept sorted by store count (desc) so the
  // ordering is already correct once the real counts are wired in.
  const rows = useMemo(() => {
    return cities
      .map((c) => ({ ...c, storeCount: 0 }))
      .sort((a, b) => b.storeCount - a.storeCount);
  }, [cities]);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Sticky state header */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 mb-5 py-2 -mx-4 px-4"
        style={{ background: "#f8f8fc" }}
      >
        <button
          onClick={() => setLocation("/cities")}
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border hover:bg-gray-50 transition-colors shrink-0"
          style={{ borderColor: "#e5e7eb" }}
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="w-5 h-5 shrink-0" style={{ color: "#0891b2" }} />
          <h1 className="text-xl font-bold truncate" style={{ color: "#1e1b4b" }}>{state}</h1>
        </div>
      </div>

      <div
        className="bg-white rounded-2xl overflow-hidden"
        style={{ border: "1px solid #f0f0f5", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}
      >
        <div className="grid grid-cols-[64px_1fr_1fr]" style={{ borderBottom: "1px solid #f0f0f5" }}>
          <div className="px-3 py-3 text-xs font-bold uppercase tracking-wide" style={{ color: "#1e1b4b" }}>Sr.No</div>
          <div className="px-4 py-3 text-xs font-bold uppercase tracking-wide" style={{ color: "#1e1b4b" }}>City</div>
          <div className="px-4 py-3 text-xs font-bold uppercase tracking-wide" style={{ color: "#1e1b4b" }}>Store</div>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-9 rounded-lg animate-pulse" style={{ background: "#f0f0f5" }} />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center">
            <MapPin className="w-9 h-9 mx-auto mb-2 opacity-15" style={{ color: "#0891b2" }} />
            <p className="text-sm font-medium text-gray-500">No cities added under {state} yet</p>
          </div>
        ) : (
          rows.map((row, i) => (
            <div
              key={row.id}
              className="grid grid-cols-[64px_1fr_1fr]"
              style={{
                borderBottom: i === rows.length - 1 ? "none" : "1px solid #f5f5f9",
                background: i % 2 === 1 ? "#fafafd" : "white",
              }}
            >
              <div className="px-3 py-2.5 text-sm text-gray-500">{i + 1}</div>
              <div className="px-4 py-2.5 text-sm font-medium truncate" style={{ color: "#1e1b4b" }}>{row.name}</div>
              <div className="px-4 py-2.5 text-sm font-semibold" style={{ color: "#059669" }}>{row.storeCount}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
