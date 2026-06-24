import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { CheckCircle2, TrendingUp } from "lucide-react";

const SOURCE_ICONS: Record<string, string> = {
  ORGANIC: "🌿",
  GOOGLE_AD: "🔍",
  FACEBOOK_AD: "📘",
  INSTAGRAM_AD: "📸",
  YOUTUBE: "▶️",
  REFERRAL: "🤝",
  AMBASSADOR: "🏅",
  INFLUENCER: "⭐",
  AFFILIATE: "🔗",
  WHATSAPP: "💬",
  DIRECT: "🎯",
};

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

  async function handleConfirm() {
    if (!selected) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem("wmh_token");
      const res = await fetch("/api/legal/source-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ source: selected }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Thank you!", description: "Your response has been recorded." });
      setLocation("/");
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Could not save. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-primary" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">One Last Step</p>
          <h1 className="text-2xl font-bold text-foreground">How did you hear about us?</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Please select the channel through which you discovered Web Media Hub.<br />
            <span className="text-primary font-medium">This selection is mandatory.</span>
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {sources.map((src) => {
              const isSelected = selected === src.key;
              return (
                <button
                  key={src.key}
                  onClick={() => setSelected(src.key)}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-sm font-medium
                    ${isSelected
                      ? "border-primary bg-primary/5 shadow-md scale-105"
                      : "border-border bg-muted/30 hover:border-primary/40 hover:bg-muted/60"
                    }`}
                >
                  {isSelected && (
                    <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-primary" />
                  )}
                  <span className="text-2xl">{SOURCE_ICONS[src.key] || "📣"}</span>
                  <span className="text-center leading-tight">{src.label}</span>
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: src.color }}
                  />
                </button>
              );
            })}
          </div>

          {selected && (
            <p className="text-center text-sm text-muted-foreground mb-4">
              You selected: <span className="font-semibold text-foreground">{sources.find(s => s.key === selected)?.label}</span>
            </p>
          )}

          <Button
            className="w-full h-12 text-base font-semibold"
            disabled={!selected || submitting}
            onClick={handleConfirm}
          >
            {submitting ? "Saving..." : "Confirm & Continue to Dashboard →"}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          This information helps us understand where our admins come from and improve our reach.
        </p>
      </div>
    </div>
  );
}
