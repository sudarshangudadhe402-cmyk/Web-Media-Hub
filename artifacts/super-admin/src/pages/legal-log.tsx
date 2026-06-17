import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import {
  FileText, Search, Download, Shield, Monitor, Globe,
  Calendar, Clock, ChevronDown, ChevronUp, Printer,
} from "lucide-react";

interface LegalRecord {
  _id: string;
  admin_id: string;
  admin_name: string;
  store_name: string;
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
  return sessionStorage.getItem("wmh_super_token");
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

const POLICIES = [
  {
    title: "Terms & Conditions",
    sections: [
      { heading: "1. Platform Role", text: "Web Media Hub provides store management technology only. The platform is not a seller of any products listed on it. All products are owned, managed, and sold exclusively by the respective store owners and administrators." },
      { heading: "2. Admin Responsibility", text: "The store owner/admin is fully and solely responsible for all products listed on their store, including but not limited to: product quality, pricing, descriptions, images, sizing information, and all customer communications." },
      { heading: "3. Prohibited Content", text: "The listing of illegal, counterfeit, copyrighted, misleading, or otherwise prohibited products is strictly not allowed. Violation of this policy will result in immediate account suspension or permanent termination without notice." },
      { heading: "4. Platform Liability", text: "Web Media Hub is not responsible for any customer complaints, disputes, returns, refunds, or any other issues arising between the store admin and customers. The platform is also not liable for any business losses, loss of revenue, or loss of customers experienced by any admin." },
      { heading: "5. Account Suspension", text: "The platform reserves the right to suspend or permanently terminate any account that is found to be in violation of platform policies, applicable laws, or these Terms & Conditions, at any time and without prior notice." },
      { heading: "6. Legal Compliance", text: "The admin is solely responsible for complying with all applicable local, state, national, and international laws and regulations pertaining to their business operations, product listings, and customer interactions." },
      { heading: "7. Amendments", text: "Web Media Hub reserves the right to amend these Terms & Conditions at any time. Continued use of the platform after changes constitutes acceptance of the revised terms." },
    ],
    accepted_field: "terms_accepted" as keyof LegalRecord,
    checkbox_text: "I have read and agree to the Terms & Conditions.",
  },
  {
    title: "Privacy Policy",
    sections: [
      { heading: "1. Information We Store", text: "The platform collects and stores the following types of information: admin account credentials and profile information, all product information uploaded by admins including images and descriptions, loyalty card data linked to your store, and Virtual Try-On related information when that feature is used." },
      { heading: "2. Analytics", text: "We may use anonymized analytics data to monitor platform performance, identify technical issues, and improve the overall user experience for all admins and their customers." },
      { heading: "3. Data Security", text: "Web Media Hub implements reasonable and industry-standard security measures to protect all stored data from unauthorized access, disclosure, alteration, or destruction. However, no digital system is completely immune to security risks." },
      { heading: "4. No Data Selling", text: "Your admin data and store data will never be sold, rented, or traded to any third party under any circumstances." },
      { heading: "5. Data Usage", text: "Data collected is used exclusively for platform functionality, providing technical support, sending important platform notices, and ensuring the proper operation of your store and associated features." },
      { heading: "6. Data Retention", text: "Your data is retained for as long as your account remains active on the platform. Upon account termination, data may be retained for a limited period as required by applicable law before being permanently deleted." },
    ],
    accepted_field: "privacy_accepted" as keyof LegalRecord,
    checkbox_text: "I have read and agree to the Privacy Policy.",
  },
  {
    title: "Refund Policy",
    sections: [
      { heading: "1. Nature of Fees", text: "All subscription fees, onboarding fees, or any other charges paid to Web Media Hub are in exchange for access to the software platform and its associated features and services." },
      { heading: "2. Non-Refundable Policy", text: "All fees paid to Web Media Hub are generally non-refundable. Once a payment is processed and access to the platform is granted, refunds are not issued as a matter of standard policy." },
      { heading: "3. Individual Review", text: "In exceptional circumstances, refund requests may be submitted for individual review at the sole discretion of the platform owner. Submission of a refund request does not guarantee approval or processing of a refund." },
      { heading: "4. Policy Violations", text: "Accounts suspended or terminated due to violations of platform policies, Terms & Conditions, or applicable law are not eligible for any refund of fees paid, regardless of the remaining subscription period." },
      { heading: "5. Platform Owner Rights", text: "Web Media Hub and its platform owner reserve the unconditional right to approve or reject any refund request at their sole and absolute discretion. No appeal process is guaranteed beyond the initial review." },
    ],
    accepted_field: "refund_accepted" as keyof LegalRecord,
    checkbox_text: "I have read and agree to the Refund Policy.",
  },
  {
    title: "Disclaimer",
    sections: [
      { heading: "1. Technology Services Only", text: "Web Media Hub is a technology service provider only. The platform does not sell any physical or digital products directly. All product transactions occur exclusively between the store admin and their customers." },
      { heading: "2. No Guarantees", text: "Web Media Hub does not guarantee any specific number of sales, customer volume, revenue, or profits for any store operating on the platform. Business performance is entirely dependent on the admin and market conditions." },
      { heading: "3. Virtual Try-On Feature", text: "The Virtual Try-On feature uses AI-generated image processing to provide a visual preview only. These are computer-generated simulations and the actual appearance, fit, color, or texture of real products may differ significantly from the AI-generated previews." },
      { heading: "4. Customer Claims", text: "Web Media Hub is not liable for any claims, complaints, demands, or legal actions made by customers against store owners or admins. All such matters are strictly between the admin and their customers." },
      { heading: "5. Product Accuracy", text: "The platform is not responsible for the accuracy, completeness, or performance of any product listed by an admin. All product information, quality claims, and performance representations are the sole responsibility of the admin." },
      { heading: "6. Third-Party Actions", text: "Web Media Hub is not responsible for the actions, conduct, or inactions of any third party, including but not limited to customers, payment processors, delivery services, or any other external service providers used by store admins." },
    ],
    accepted_field: "disclaimer_accepted" as keyof LegalRecord,
    checkbox_text: "I have read and agree to the Disclaimer.",
  },
];

function generateAgreementHTML(record: LegalRecord): string {
  const displayName = record.store_name || record.admin_name;
  const policyHTML = POLICIES.map((policy, index) => `
    <div class="policy-block">
      <h2 class="policy-title">Page ${index + 1} of 4 — ${policy.title}</h2>
      ${policy.sections.map(s => `
        <div class="section">
          <h3>${s.heading}</h3>
          <p>${s.text}</p>
        </div>
      `).join("")}
      <div class="checkbox-row">
        <span class="checkbox-tick">☑</span>
        <span>${policy.checkbox_text}</span>
      </div>
    </div>
  `).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Legal Agreement — ${displayName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Georgia', serif; color: #1a1a1a; background: #fff; padding: 48px 56px; max-width: 860px; margin: 0 auto; }
    .doc-header { text-align: center; border-bottom: 2px solid #1a1a1a; padding-bottom: 24px; margin-bottom: 36px; }
    .doc-header h1 { font-size: 22px; font-weight: bold; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 6px; }
    .doc-header .subtitle { font-size: 13px; color: #555; margin-top: 6px; }
    .admin-info { background: #f7f7f7; border: 1px solid #ddd; border-radius: 6px; padding: 16px 20px; margin-bottom: 36px; }
    .admin-info table { width: 100%; border-collapse: collapse; }
    .admin-info td { padding: 5px 0; font-size: 13px; }
    .admin-info td:first-child { color: #555; width: 140px; }
    .admin-info td:last-child { font-weight: 600; }
    .policy-block { margin-bottom: 40px; page-break-inside: avoid; }
    .policy-title { font-size: 16px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 8px; margin-bottom: 14px; color: #2c2c2c; }
    .section { margin-bottom: 12px; }
    .section h3 { font-size: 13px; font-weight: bold; margin-bottom: 4px; color: #333; }
    .section p { font-size: 12.5px; line-height: 1.7; color: #444; }
    .checkbox-row { margin-top: 14px; padding: 10px 14px; background: #f0f0f0; border-radius: 4px; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
    .checkbox-tick { font-size: 16px; color: #1a7a1a; }
    .final-block { border: 2px solid #1a1a1a; border-radius: 6px; padding: 20px; margin: 36px 0; text-align: center; }
    .final-block p { font-size: 14px; font-style: italic; color: #333; margin-bottom: 14px; }
    .final-block .agree-row { font-size: 15px; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .acceptance-data { margin-top: 40px; border-top: 2px solid #1a1a1a; padding-top: 24px; }
    .acceptance-data h2 { font-size: 15px; font-weight: bold; text-transform: uppercase; margin-bottom: 16px; }
    .acceptance-data table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    .acceptance-data th { background: #1a1a1a; color: #fff; padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    .acceptance-data td { border: 1px solid #ddd; padding: 8px 12px; color: #333; }
    .acceptance-data tr:nth-child(even) td { background: #f9f9f9; }
    .badge-yes { color: #1a7a1a; font-weight: bold; }
    .badge-no { color: #c0392b; font-weight: bold; }
    .footer { margin-top: 36px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 16px; }
    @media print {
      body { padding: 24px 32px; }
      .policy-block { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="doc-header">
    <h1>Legal Agreement of Web Media Hub</h1>
    <div class="subtitle">Official Admin Legal Policy Acceptance Record</div>
  </div>

  <div class="admin-info">
    <table>
      ${record.store_name ? `<tr><td>Store Name</td><td>${record.store_name}</td></tr>` : ""}
      <tr><td>Admin Username</td><td>${record.admin_name}</td></tr>
      <tr><td>Admin ID</td><td>${record.admin_id}</td></tr>
      <tr><td>Agreement Status</td><td>${record.final_acceptance ? "✅ Completed" : "❌ Incomplete"}</td></tr>
    </table>
  </div>

  ${policyHTML}

  <div class="final-block">
    <p>"I confirm that I have read, understood, and accepted all platform policies."</p>
    <div class="agree-row">
      <span class="checkbox-tick">☑</span>
      <span>I Agree To All Policies</span>
    </div>
  </div>

  <div class="acceptance-data">
    <h2>Acceptance Record Data</h2>
    <table>
      <thead>
        <tr>
          <th>Field</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Admin Name</td><td>${record.admin_name}</td></tr>
        <tr><td>Admin ID</td><td>${record.admin_id}</td></tr>
        <tr><td>Date of Acceptance</td><td>${record.accepted_date || "—"}</td></tr>
        <tr><td>Time of Acceptance</td><td>${record.accepted_time || "—"}</td></tr>
        <tr><td>Full Timestamp</td><td>${record.accepted_timestamp ? new Date(record.accepted_timestamp).toLocaleString("en-IN") : "—"}</td></tr>
        <tr><td>Device Type</td><td>${record.device_type || "—"}</td></tr>
        <tr><td>Browser</td><td>${record.browser_name || "—"}</td></tr>
        <tr><td>IP Address</td><td>${record.ip_address || "—"}</td></tr>
        <tr><td>Terms & Conditions</td><td class="${record.terms_accepted ? "badge-yes" : "badge-no"}">${record.terms_accepted ? "Accepted" : "Not Accepted"}</td></tr>
        <tr><td>Privacy Policy</td><td class="${record.privacy_accepted ? "badge-yes" : "badge-no"}">${record.privacy_accepted ? "Accepted" : "Not Accepted"}</td></tr>
        <tr><td>Refund Policy</td><td class="${record.refund_accepted ? "badge-yes" : "badge-no"}">${record.refund_accepted ? "Accepted" : "Not Accepted"}</td></tr>
        <tr><td>Disclaimer</td><td class="${record.disclaimer_accepted ? "badge-yes" : "badge-no"}">${record.disclaimer_accepted ? "Accepted" : "Not Accepted"}</td></tr>
        <tr><td>Final Acceptance</td><td class="${record.final_acceptance ? "badge-yes" : "badge-no"}">${record.final_acceptance ? "Agreed" : "Not Agreed"}</td></tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    This is an official legal agreement record generated by Web Media Hub &nbsp;·&nbsp; Document generated on ${new Date().toLocaleString("en-IN")}
  </div>
</body>
</html>`;
}

function downloadAgreement(record: LegalRecord) {
  const html = generateAgreementHTML(record);
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 600);
}

function AgreementCopy({ record }: { record: LegalRecord }) {
  return (
    <div className="mt-4 border border-border rounded-xl overflow-hidden">
      <div className="bg-primary/5 border-b border-border px-5 py-3 flex items-center gap-2">
        <FileText className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm text-foreground">Legal Agreement of Web Media Hub</span>
        <span className="text-xs text-muted-foreground ml-1">— {record.admin_name}</span>
      </div>

      <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto text-sm">
        {POLICIES.map((policy, index) => (
          <div key={policy.title} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded">
                Page {index + 1} of 4
              </span>
              <h3 className="font-bold text-base text-foreground">{policy.title}</h3>
            </div>
            <div className="space-y-2.5 pl-1">
              {policy.sections.map((s) => (
                <div key={s.heading}>
                  <p className="font-semibold text-foreground text-xs mb-0.5">{s.heading}</p>
                  <p className="text-foreground/70 text-xs leading-relaxed">{s.text}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
              <span className="text-green-600 text-base">☑</span>
              <span className="text-xs font-semibold text-green-700 dark:text-green-400">{policy.checkbox_text}</span>
            </div>
          </div>
        ))}

        <div className="border-2 border-primary/30 rounded-xl p-4 text-center space-y-2">
          <p className="text-xs text-foreground/60 italic">"I confirm that I have read, understood, and accepted all platform policies."</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-green-600 text-base">☑</span>
            <span className="text-sm font-bold text-foreground">I Agree To All Policies</span>
          </div>
        </div>

        <div className="border-t border-border pt-5 space-y-3">
          <h4 className="font-bold text-sm text-foreground uppercase tracking-wide">Acceptance Record Data</h4>
          <div className="bg-muted rounded-xl divide-y divide-border overflow-hidden text-xs">
            {[
              { label: "Admin Name", value: record.admin_name },
              { label: "Admin ID", value: record.admin_id },
              { label: "Date of Acceptance", value: record.accepted_date || "—" },
              { label: "Time of Acceptance", value: record.accepted_time || "—" },
              { label: "Full Timestamp", value: record.accepted_timestamp ? new Date(record.accepted_timestamp).toLocaleString("en-IN") : "—" },
              { label: "Device Type", value: record.device_type || "—" },
              { label: "Browser", value: record.browser_name || "—" },
              { label: "IP Address", value: record.ip_address || "—" },
              { label: "Terms & Conditions", value: record.terms_accepted ? "✅ Accepted" : "❌ Not Accepted" },
              { label: "Privacy Policy", value: record.privacy_accepted ? "✅ Accepted" : "❌ Not Accepted" },
              { label: "Refund Policy", value: record.refund_accepted ? "✅ Accepted" : "❌ Not Accepted" },
              { label: "Disclaimer", value: record.disclaimer_accepted ? "✅ Accepted" : "❌ Not Accepted" },
              { label: "Final Acceptance", value: record.final_acceptance ? "✅ Agreed" : "❌ Not Agreed" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LegalLog() {
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: records, isLoading } = useQuery({
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
                placeholder="Search by store name..."
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
                />
              </div>
              <span className="text-muted-foreground text-sm">to</span>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-36 text-sm"
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
          <div className="space-y-4">
            {records?.map((record) => {
              const isExpanded = expandedId === record._id;
              return (
                <Card key={record._id} className={`transition-colors ${isExpanded ? "border-primary/40" : "hover:border-primary/20"}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold uppercase shrink-0">
                        {(record.store_name || record.admin_name).substring(0, 2)}
                      </div>

                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{record.store_name || record.admin_name}</span>
                          {record.store_name && (
                            <span className="text-xs text-muted-foreground">@{record.admin_name}</span>
                          )}
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

                      <div className="flex flex-col gap-2 shrink-0">
                        <div className="flex gap-1.5 flex-wrap justify-end">
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
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 h-8 text-xs"
                            onClick={() => setExpandedId(isExpanded ? null : record._id)}
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            {isExpanded ? "Hide" : "View Agreement"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 h-8 text-xs"
                            onClick={() => downloadAgreement(record)}
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Download Copy
                          </Button>
                        </div>
                      </div>
                    </div>

                    {isExpanded && <AgreementCopy record={record} />}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
