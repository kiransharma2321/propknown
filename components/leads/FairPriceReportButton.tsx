"use client";

import { useState } from "react";
import { FileDown, Loader2, CheckCircle2, MessageCircle } from "lucide-react";
import { COUNTRY_CODES } from "@/components/leads/ReportLeadForm";
import { readAttribution } from "@/lib/attribution";

// "Download Free Report" -> name / phone / email + consent -> branded Fair-Price Report PDF,
// emailed and downloadable, with a WhatsApp share of the (public) area page.

const CONSENT_TEXT = "Email me this report. PropKnown may follow up by email or phone about it; I can unsubscribe any time.";

export default function FairPriceReportButton({ location, propertyType, unit }: { location: string; propertyType?: string; unit?: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [cc, setCc] = useState(/dubai|uae/i.test(location) ? "+971" : "+91");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [result, setResult] = useState<{ downloadUrl: string; shareUrl: string; locationName: string; emailed: boolean } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending"); setMsg("");
    try {
      const res = await fetch("/api/fair-price-report", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, email, consent, location, propertyType, unit,
          phone: `${cc}${phone.replace(/\D/g, "").replace(/^0+/, "")}`,
          attribution: readAttribution(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setState("error"); setMsg(data.error ?? "Couldn't make the report right now — please try again."); return; }
      setResult(data); setState("done");
    } catch {
      setState("error"); setMsg("Couldn't make the report right now — please try again.");
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-primary w-full sm:w-auto justify-center">
        <FileDown size={16} /> Download Free Report (PDF)
      </button>
    );
  }

  if (state === "done" && result) {
    const share = `https://wa.me/?text=${encodeURIComponent(`Property prices for ${result.locationName}, with sources and a confidence level: ${result.shareUrl}`)}`;
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
        <p className="flex items-center gap-2 text-green-800 font-semibold text-sm"><CheckCircle2 size={16} /> Your Fair-Price Report is ready{result.emailed ? " and on its way to your inbox" : ""}.</p>
        <div className="flex flex-wrap gap-2">
          <a href={result.downloadUrl} className="btn-primary text-sm"><FileDown size={14} /> Download PDF</a>
          <a href={share} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm"><MessageCircle size={14} /> Share on WhatsApp</a>
        </div>
      </div>
    );
  }

  const inp = "input-dark text-sm py-2.5 px-3 w-full";
  return (
    <form onSubmit={submit} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm">
      <p className="font-semibold text-gray-900 text-sm">Free Fair-Price Report for {location}</p>
      <p className="text-xs text-gray-500">PDF with today&apos;s price, range, confidence, government value, 5-year trend, true cost and every source with its date.</p>
      <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" aria-label="Your name" className={inp} />
      <div className="flex gap-2">
        <select value={cc} onChange={(e) => setCc(e.target.value)} aria-label="Country code" className="input-dark text-sm py-2.5 px-2 w-28">
          {COUNTRY_CODES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
        </select>
        <input required inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" aria-label="Phone" className={inp} />
      </div>
      <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" aria-label="Email" className={inp} />
      <label className="flex items-start gap-2 text-xs text-gray-600">
        <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" style={{ accentColor: "var(--gold)" }} />
        <span>{CONSENT_TEXT} See our <a href="/privacy" className="underline">privacy policy</a>.</span>
      </label>
      <button type="submit" disabled={state === "sending"} className="btn-primary w-full justify-center disabled:opacity-60">
        {state === "sending" ? <><Loader2 size={15} className="animate-spin" /> Preparing your report…</> : <><FileDown size={15} /> Get my free report</>}
      </button>
      {state === "error" && <p className="text-sm text-red-700">{msg}</p>}
    </form>
  );
}
