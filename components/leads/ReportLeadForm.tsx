"use client";

import { useEffect, useState } from "react";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { rememberSearch } from "@/lib/whatsapp";

export const COUNTRY_CODES = [
  { code: "+91", label: "🇮🇳 +91" },
  { code: "+971", label: "🇦🇪 +971" },
  { code: "+1", label: "🇺🇸 +1" },
  { code: "+44", label: "🇬🇧 +44" },
  { code: "+65", label: "🇸🇬 +65" },
  { code: "+974", label: "🇶🇦 +974" },
  { code: "+966", label: "🇸🇦 +966" },
  { code: "+61", label: "🇦🇺 +61" },
];

export interface ReportLeadFormProps {
  tool: "price_check" | "ai_intel" | "legal_shield" | "seo_page";
  location: string;
  propertyType?: string;
  unit?: string;
  askingPricePerUnit?: number;
  reraNumber?: string;
  riskLevel?: string;
  defaultCountryCode?: string;
  projectName?: string;
}

// "Email me the full report + 5-year forecast" -- shown under every Price Check, AI
// Intelligence and Fraud Check result, and on every /prices page. Saves a CRM lead (source =
// tool + location), emails the report instantly and starts the Day 2 / Day 5 follow-up.
export default function ReportLeadForm(props: ReportLeadFormProps) {
  const [name, setName] = useState("");
  const [cc, setCc] = useState(props.defaultCountryCode ?? (/dubai|uae/i.test(props.location) ? "+971" : "+91"));
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    rememberSearch({ tool: props.tool, location: props.location, propertyType: props.propertyType });
  }, [props.tool, props.location, props.propertyType]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending"); setMessage("");
    try {
      const res = await fetch("/api/report-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, email, phone: `${cc}${phone.replace(/\D/g, "").replace(/^0+/, "")}`,
          tool: props.tool, location: props.location, propertyType: props.propertyType, unit: props.unit,
          askingPricePerUnit: props.askingPricePerUnit, reraNumber: props.reraNumber, riskLevel: props.riskLevel,
          projectName: props.projectName,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setState("error"); setMessage(data.error ?? "Couldn't send right now — please try again."); return; }
      setState("done");
      setMessage(data.emailed
        ? `Sent! Your report is on its way to ${email} — check your inbox (and spam folder).`
        : "Saved — we couldn't email the report just now, so our team will send it to you shortly.");
    } catch {
      setState("error"); setMessage("Couldn't send right now — please try again.");
    }
  };

  if (state === "done") {
    return (
      <div className="mt-5 border border-green-200 bg-green-50 rounded-xl p-4 flex items-start gap-2.5">
        <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" />
        <p className="text-sm text-green-800">{message}</p>
      </div>
    );
  }

  const inp = "input-dark text-sm px-3 py-2.5";
  return (
    <form onSubmit={submit} className="mt-5 border border-gray-200 rounded-xl p-4 sm:p-5 bg-gray-50">
      <p className="font-semibold text-sm text-gray-900 flex items-center gap-2 mb-1">
        <Mail size={15} style={{ color: "var(--gold-text)" }} /> Email me the full report + 5-year forecast
      </p>
      <p className="text-xs text-gray-500 mb-3">Free. We&apos;ll also send two short follow-ups — unsubscribe any time with one click.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" className={inp} aria-label="Your name" />
        <div className="flex gap-1.5">
          <select value={cc} onChange={(e) => setCc(e.target.value)} className="input-dark text-sm px-2 py-2.5 w-[92px] shrink-0" aria-label="Country code">
            {COUNTRY_CODES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
          <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" inputMode="tel" autoComplete="tel-national" className={`${inp} min-w-0`} aria-label="Phone number" />
        </div>
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoComplete="email" className={inp} aria-label="Email" />
      </div>
      {state === "error" && <p className="error-text mt-2">{message}</p>}
      <button type="submit" disabled={state === "sending"} className="btn-primary w-full justify-center py-3 mt-3 disabled:opacity-60">
        {state === "sending" ? <><Loader2 size={15} className="animate-spin" /> Sending your report…</> : <><Mail size={15} /> Email me the report</>}
      </button>
    </form>
  );
}
