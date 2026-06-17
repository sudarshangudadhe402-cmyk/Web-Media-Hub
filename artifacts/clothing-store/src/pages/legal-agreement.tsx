import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Shield, ChevronRight, FileText, Lock, AlertTriangle, RefreshCcw } from "lucide-react";

const STEPS = [
  {
    id: 1,
    title: "Terms & Conditions",
    icon: FileText,
    checkboxLabel: "I have read and agree to the Terms & Conditions.",
    content: (
      <div className="space-y-4 text-sm leading-relaxed text-foreground/80">
        <p>Welcome to <strong>Web Media Hub</strong>. By accessing and using this platform, you agree to the following Terms & Conditions. Please read them carefully before proceeding.</p>
        <div>
          <h3 className="font-semibold text-foreground mb-2">1. Platform Role</h3>
          <p>Web Media Hub provides store management technology only. The platform is not a seller of any products listed on it. All products are owned, managed, and sold exclusively by the respective store owners and administrators.</p>
        </div>
        <div>
          <h3 className="font-semibold text-foreground mb-2">2. Admin Responsibility</h3>
          <p>The store owner/admin is fully and solely responsible for all products listed on their store, including but not limited to: product quality, pricing, descriptions, images, sizing information, and all customer communications.</p>
        </div>
        <div>
          <h3 className="font-semibold text-foreground mb-2">3. Prohibited Content</h3>
          <p>The listing of illegal, counterfeit, copyrighted, misleading, or otherwise prohibited products is strictly not allowed. Violation of this policy will result in immediate account suspension or permanent termination without notice.</p>
        </div>
        <div>
          <h3 className="font-semibold text-foreground mb-2">4. Platform Liability</h3>
          <p>Web Media Hub is not responsible for any customer complaints, disputes, returns, refunds, or any other issues arising between the store admin and customers. The platform is also not liable for any business losses, loss of revenue, or loss of customers experienced by any admin.</p>
        </div>
        <div>
          <h3 className="font-semibold text-foreground mb-2">5. Account Suspension</h3>
          <p>The platform reserves the right to suspend or permanently terminate any account that is found to be in violation of platform policies, applicable laws, or these Terms & Conditions, at any time and without prior notice.</p>
        </div>
        <div>
          <h3 className="font-semibold text-foreground mb-2">6. Legal Compliance</h3>
          <p>The admin is solely responsible for complying with all applicable local, state, national, and international laws and regulations pertaining to their business operations, product listings, and customer interactions.</p>
        </div>
        <div>
          <h3 className="font-semibold text-foreground mb-2">7. Amendments</h3>
          <p>Web Media Hub reserves the right to amend these Terms & Conditions at any time. Continued use of the platform after changes constitutes acceptance of the revised terms.</p>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    title: "Privacy Policy",
    icon: Lock,
    checkboxLabel: "I have read and agree to the Privacy Policy.",
    content: (
      <div className="space-y-4 text-sm leading-relaxed text-foreground/80">
        <p>This Privacy Policy explains how <strong>Web Media Hub</strong> collects, uses, and protects the information associated with your admin account and store operations.</p>
        <div>
          <h3 className="font-semibold text-foreground mb-2">1. Information We Store</h3>
          <p>The platform collects and stores the following types of information: admin account credentials and profile information, all product information uploaded by admins including images and descriptions, loyalty card data linked to your store, and Virtual Try-On related information when that feature is used.</p>
        </div>
        <div>
          <h3 className="font-semibold text-foreground mb-2">2. Analytics</h3>
          <p>We may use anonymized analytics data to monitor platform performance, identify technical issues, and improve the overall user experience for all admins and their customers.</p>
        </div>
        <div>
          <h3 className="font-semibold text-foreground mb-2">3. Data Security</h3>
          <p>Web Media Hub implements reasonable and industry-standard security measures to protect all stored data from unauthorized access, disclosure, alteration, or destruction. However, no digital system is completely immune to security risks.</p>
        </div>
        <div>
          <h3 className="font-semibold text-foreground mb-2">4. No Data Selling</h3>
          <p>Your admin data and store data will never be sold, rented, or traded to any third party under any circumstances.</p>
        </div>
        <div>
          <h3 className="font-semibold text-foreground mb-2">5. Data Usage</h3>
          <p>Data collected is used exclusively for platform functionality, providing technical support, sending important platform notices, and ensuring the proper operation of your store and associated features.</p>
        </div>
        <div>
          <h3 className="font-semibold text-foreground mb-2">6. Data Retention</h3>
          <p>Your data is retained for as long as your account remains active on the platform. Upon account termination, data may be retained for a limited period as required by applicable law before being permanently deleted.</p>
        </div>
      </div>
    ),
  },
  {
    id: 3,
    title: "Refund Policy",
    icon: RefreshCcw,
    checkboxLabel: "I have read and agree to the Refund Policy.",
    content: (
      <div className="space-y-4 text-sm leading-relaxed text-foreground/80">
        <p>This Refund Policy outlines the terms under which subscription or platform fees paid to <strong>Web Media Hub</strong> may be reviewed for refund consideration.</p>
        <div>
          <h3 className="font-semibold text-foreground mb-2">1. Nature of Fees</h3>
          <p>All subscription fees, onboarding fees, or any other charges paid to Web Media Hub are in exchange for access to the software platform and its associated features and services.</p>
        </div>
        <div>
          <h3 className="font-semibold text-foreground mb-2">2. Non-Refundable Policy</h3>
          <p>All fees paid to Web Media Hub are generally non-refundable. Once a payment is processed and access to the platform is granted, refunds are not issued as a matter of standard policy.</p>
        </div>
        <div>
          <h3 className="font-semibold text-foreground mb-2">3. Individual Review</h3>
          <p>In exceptional circumstances, refund requests may be submitted for individual review at the sole discretion of the platform owner. Submission of a refund request does not guarantee approval or processing of a refund.</p>
        </div>
        <div>
          <h3 className="font-semibold text-foreground mb-2">4. Policy Violations</h3>
          <p>Accounts suspended or terminated due to violations of platform policies, Terms & Conditions, or applicable law are not eligible for any refund of fees paid, regardless of the remaining subscription period.</p>
        </div>
        <div>
          <h3 className="font-semibold text-foreground mb-2">5. Platform Owner Rights</h3>
          <p>Web Media Hub and its platform owner reserve the unconditional right to approve or reject any refund request at their sole and absolute discretion. No appeal process is guaranteed beyond the initial review.</p>
        </div>
        <div>
          <h3 className="font-semibold text-foreground mb-2">6. No Refund on Auto-Renewed Subscriptions</h3>
          <p>If you have enrolled in a subscription plan with autopay enabled, and your subscription is automatically renewed and charged on the renewal date, <strong>no refund will be issued for that auto-renewed payment under any circumstances</strong>. By enabling autopay at the time of your first plan purchase, you expressly acknowledge and agree that all future automatic renewal charges are final, non-disputable, and non-refundable. It is your responsibility to cancel the autopay before the renewal date if you do not wish to continue the subscription.</p>
        </div>
      </div>
    ),
  },
  {
    id: 4,
    title: "Disclaimer",
    icon: AlertTriangle,
    checkboxLabel: "I have read and agree to the Disclaimer.",
    content: (
      <div className="space-y-4 text-sm leading-relaxed text-foreground/80">
        <p>Please read this Disclaimer carefully before using any feature of the <strong>Web Media Hub</strong> platform.</p>
        <div>
          <h3 className="font-semibold text-foreground mb-2">1. Technology Services Only</h3>
          <p>Web Media Hub is a technology service provider only. The platform does not sell any physical or digital products directly. All product transactions occur exclusively between the store admin and their customers.</p>
        </div>
        <div>
          <h3 className="font-semibold text-foreground mb-2">2. No Guarantees</h3>
          <p>Web Media Hub does not guarantee any specific number of sales, customer volume, revenue, or profits for any store operating on the platform. Business performance is entirely dependent on the admin and market conditions.</p>
        </div>
        <div>
          <h3 className="font-semibold text-foreground mb-2">3. Virtual Try-On Feature</h3>
          <p>The Virtual Try-On feature uses AI-generated image processing to provide a visual preview only. These are computer-generated simulations and the actual appearance, fit, color, or texture of real products may differ significantly from the AI-generated previews.</p>
        </div>
        <div>
          <h3 className="font-semibold text-foreground mb-2">4. Customer Claims</h3>
          <p>Web Media Hub is not liable for any claims, complaints, demands, or legal actions made by customers against store owners or admins. All such matters are strictly between the admin and their customers.</p>
        </div>
        <div>
          <h3 className="font-semibold text-foreground mb-2">5. Product Accuracy</h3>
          <p>The platform is not responsible for the accuracy, completeness, or performance of any product listed by an admin. All product information, quality claims, and performance representations are the sole responsibility of the admin.</p>
        </div>
        <div>
          <h3 className="font-semibold text-foreground mb-2">6. Third-Party Actions</h3>
          <p>Web Media Hub is not responsible for the actions, conduct, or inactions of any third party, including but not limited to customers, payment processors, delivery services, or any other external service providers used by store admins.</p>
        </div>
      </div>
    ),
  },
];

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/tablet|ipad/i.test(ua)) return "Tablet";
  if (/mobile|android|iphone/i.test(ua)) return "Mobile";
  return "Desktop";
}

function getBrowserName(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("OPR") || ua.includes("Opera")) return "Opera";
  return "Unknown";
}

export default function LegalAgreement() {
  const { user } = useAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [checked, setChecked] = useState(false);
  const [allAccepted, setAllAccepted] = useState(false);
  const [finalChecked, setFinalChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;
  const isComplete = step === STEPS.length;

  function handleNext() {
    if (isLastStep) {
      setAllAccepted(true);
      setStep(STEPS.length);
      setChecked(false);
    } else {
      setStep((s) => s + 1);
      setChecked(false);
    }
  }

  async function handleComplete() {
    if (!finalChecked) return;
    setIsSubmitting(true);
    try {
      const now = new Date();
      const token = localStorage.getItem("wmh_token");
      const res = await fetch("/api/legal/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          device_type: getDeviceType(),
          browser_name: getBrowserName(),
        }),
      });
      if (!res.ok) throw new Error("Failed to save acceptance");
      toast({ title: "Setup complete!", description: "Welcome to Web Media Hub." });
      setLocation("/");
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Could not save your acceptance. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }

  const progressPercent = isComplete ? 100 : ((step) / STEPS.length) * 100;

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Legal Agreement of Web Media Hub</p>
            <h1 className="text-2xl font-bold text-foreground">Final Confirmation</h1>
            <p className="text-muted-foreground mt-2">You have reviewed all 4 policies. Please confirm your acceptance below.</p>
          </div>

          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-8">
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 mb-6">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Summary of Accepted Policies</h3>
                    <ul className="space-y-1.5 mt-3">
                      {STEPS.map((s) => (
                        <li key={s.id} className="flex items-center gap-2 text-sm text-foreground/80">
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                          {s.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <p className="text-center text-foreground/70 text-sm italic mb-6">
                "I confirm that I have read, understood, and accepted all platform policies."
              </p>

              <div className="flex items-start gap-3 p-4 bg-muted rounded-xl mb-6">
                <Checkbox
                  id="final-check"
                  checked={finalChecked}
                  onCheckedChange={(v) => setFinalChecked(!!v)}
                  className="mt-0.5"
                />
                <label htmlFor="final-check" className="text-sm font-medium text-foreground cursor-pointer select-none leading-relaxed">
                  I Agree To All Policies
                </label>
              </div>

              <Button
                className="w-full h-12 text-base font-semibold"
                disabled={!finalChecked || isSubmitting}
                onClick={handleComplete}
              >
                {isSubmitting ? "Completing Setup..." : "Complete Setup"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const Icon = currentStep.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Legal Agreement of Web Media Hub</p>
          <h1 className="text-2xl font-bold text-foreground">Web Media Hub</h1>
          <p className="text-muted-foreground text-sm mt-1">Legal Agreement Setup — Required Before Access</p>
        </div>

        <div className="sticky top-4 z-10 mb-6 bg-card border border-border rounded-2xl shadow-sm px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground">
              Step {step + 1} of {STEPS.length}
            </span>
            <span className="text-xs text-muted-foreground font-medium">{Math.round(progressPercent)}% complete</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="h-2 bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-3">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary text-primary-foreground ring-2 ring-primary/30" : "bg-muted text-muted-foreground"
                }`}>
                  {i < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.id}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 w-8 sm:w-16 transition-all ${i < step ? "bg-primary" : "bg-muted"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="border-b border-border px-6 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-lg">{currentStep.title}</h2>
              <p className="text-xs text-muted-foreground">Read carefully before proceeding</p>
            </div>
          </div>

          <div className="p-6 max-h-[45vh] overflow-y-auto">
            {currentStep.content}
          </div>

          <div className="border-t border-border px-6 py-5 bg-muted/30">
            <div className="flex items-start gap-3 mb-5 p-4 bg-card rounded-xl border border-border">
              <Checkbox
                id="step-check"
                checked={checked}
                onCheckedChange={(v) => setChecked(!!v)}
                className="mt-0.5"
              />
              <label htmlFor="step-check" className="text-sm font-medium text-foreground cursor-pointer select-none leading-relaxed">
                {currentStep.checkboxLabel}
              </label>
            </div>

            <Button
              className="w-full h-11 font-semibold"
              disabled={!checked}
              onClick={handleNext}
            >
              {isLastStep ? "Review & Complete" : (
                <>
                  Next: {STEPS[step + 1]?.title}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          You must accept all policies to access your dashboard. These agreements cannot be bypassed.
        </p>
      </div>
    </div>
  );
}
