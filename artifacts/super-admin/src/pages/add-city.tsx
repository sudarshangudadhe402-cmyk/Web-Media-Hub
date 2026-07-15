import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Building2, Plus, Check, X } from "lucide-react";
import { authFetch } from "@/lib/admin-api";
import { INDIA_STATES } from "@/lib/india-locations";

interface CityRow {
  id: string;
  name: string;
  state: string;
}

export default function AddCity() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [cityName, setCityName] = useState("");
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: cities = [], isLoading } = useQuery<CityRow[]>({
    queryKey: ["cities", "all"],
    queryFn: async () => {
      const res = await authFetch("/api/cities");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 15_000,
  });

  const countByState = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of cities) map[c.state] = (map[c.state] ?? 0) + 1;
    return map;
  }, [cities]);

  const addCity = useMutation({
    mutationFn: async () => {
      const res = await authFetch("/api/cities", {
        method: "POST",
        body: JSON.stringify({ name: cityName.trim(), state: selectedState }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to add city");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cities"] });
      setCityName("");
      setSelectedState(null);
      setShowForm(false);
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err?.message || "Failed to add city");
    },
  });

  const canSubmit = cityName.trim().length > 0 && !!selectedState && !addCity.isPending;

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
          <Building2 className="w-5 h-5" style={{ color: "#d97706" }} />
          <h1 className="text-lg font-bold" style={{ color: "#1e1b4b" }}>Add City</h1>
        </div>
      </div>

      {/* Add City toggle / form */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold text-white mb-6 transition-transform hover:-translate-y-0.5"
          style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)", boxShadow: "0 4px 12px rgba(217,119,6,0.3)" }}
        >
          <Plus className="w-4 h-4" />
          Add City
        </button>
      ) : (
        <div
          className="bg-white rounded-2xl p-4 mb-6"
          style={{ border: "1px solid #f0f0f5", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold" style={{ color: "#1e1b4b" }}>New City</h2>
            <button
              onClick={() => {
                setShowForm(false);
                setCityName("");
                setSelectedState(null);
                setFormError(null);
              }}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* City name input */}
          <input
            autoFocus
            placeholder="Type city name..."
            value={cityName}
            onChange={(e) => setCityName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none mb-4 focus:border-amber-400 transition-colors"
            style={{ borderColor: "#e5e7eb" }}
          />

          {/* State selection */}
          <p className="text-xs font-semibold text-gray-500 mb-2">Select a state</p>
          <div
            className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto mb-4 pr-1"
          >
            {INDIA_STATES.map((state) => {
              const isSelected = selectedState === state;
              return (
                <button
                  key={state}
                  onClick={() => setSelectedState(state)}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-colors"
                  style={{
                    border: `1px solid ${isSelected ? "#d97706" : "#e5e7eb"}`,
                    background: isSelected ? "rgba(217,119,6,0.08)" : "white",
                  }}
                >
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      border: `2px solid ${isSelected ? "#d97706" : "#d1d5db"}`,
                      background: isSelected ? "#d97706" : "transparent",
                    }}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                  </span>
                  <span className="text-xs font-medium truncate" style={{ color: isSelected ? "#92400e" : "#374151" }}>
                    {state}
                  </span>
                </button>
              );
            })}
          </div>

          {formError && (
            <p className="text-xs font-medium text-red-500 mb-3">{formError}</p>
          )}

          <button
            disabled={!canSubmit}
            onClick={() => addCity.mutate()}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity"
            style={{
              background: canSubmit ? "linear-gradient(135deg, #d97706, #f59e0b)" : "#d1d5db",
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}
          >
            {addCity.isPending ? "Adding..." : "Add City"}
          </button>
        </div>
      )}

      {/* States → City count table */}
      <div
        className="bg-white rounded-2xl overflow-hidden"
        style={{ border: "1px solid #f0f0f5", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}
      >
        <div className="grid grid-cols-2" style={{ borderBottom: "1px solid #f0f0f5" }}>
          <div className="px-4 py-3 text-xs font-bold uppercase tracking-wide" style={{ color: "#1e1b4b", borderRight: "1px solid #f0f0f5" }}>
            States
          </div>
          <div className="px-4 py-3 text-xs font-bold uppercase tracking-wide" style={{ color: "#1e1b4b" }}>
            City
          </div>
        </div>
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 rounded-lg animate-pulse" style={{ background: "#f0f0f5" }} />
            ))}
          </div>
        ) : (
          INDIA_STATES.map((state, i) => (
            <div
              key={state}
              className="grid grid-cols-2"
              style={{
                borderBottom: i === INDIA_STATES.length - 1 ? "none" : "1px solid #f5f5f9",
                background: i % 2 === 1 ? "#fafafd" : "white",
              }}
            >
              <div className="px-4 py-2.5 text-sm text-gray-700 truncate" style={{ borderRight: "1px solid #f0f0f5" }}>
                {state}
              </div>
              <div className="px-4 py-2.5 text-sm font-semibold" style={{ color: "#7c3aed" }}>
                {countByState[state] ?? 0}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
