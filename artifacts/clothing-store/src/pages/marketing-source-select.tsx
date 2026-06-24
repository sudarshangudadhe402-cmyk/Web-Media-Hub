import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Megaphone } from "lucide-react";

interface Source {
  key: string;
  label: string;
  color: string;
}

export default function MarketingSourceSelect({ sources }: { sources: Source[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  async function handleContinue() {
    if (!selected || submitting) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem("wmh_token");
      const res = await fetch("/api/legal/source-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ source: selected }),
      });
      if (!res.ok) throw new Error("Failed");
      setLocation("/");
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Could not save. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Megaphone className="w-5 h-5 text-primary shrink-0" />
          <h2 className="text-base font-semibold text-foreground">
            How did you hear about Web Media Hub?
          </h2>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {sources.map((src) => {
            const isSelected = selected === src.key;
            return (
              <button
                key={src.key}
                onClick={() => setSelected(src.key)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-all font-medium
                  ${isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background text-foreground border-border hover:border-primary/60 hover:bg-muted"
                  }`}
              >
                {src.label}
              </button>
            );
          })}
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleContinue}
            disabled={!selected || submitting}
            className="px-6"
          >
            {submitting ? "Saving..." : "Continue →"}
          </Button>
        </div>
      </div>
    </div>
  );
}
