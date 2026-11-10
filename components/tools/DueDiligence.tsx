"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { useBuyer } from "@/components/buyer/BuyerProvider";
import { FEATURES } from "@/lib/features";

// M6: request a preliminary Due Diligence Report; list my reports.
interface Doc { id: string; fileName: string }
interface Mine { id: string; title: string; createdAt: string; reviewed: boolean }

export default function DueDiligenceForm() {
  const { buyer, loading } = useBuyer();
  const router = useRouter();
  const [f, setF] = useState({ projectName: "", location: "", propertyType: "apartment", quotedPricePerSqft: "", sizeSqft: "", phone: "" });
  const [docs, setDocs] = useState<Doc[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [mine, setMine] = useState<Mine[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!buyer) return;
    fetch("/api/due-diligence").then((r) => r.json()).then((j) => setMine(j.reports ?? [])).catch(() => null);
    if (FEATURES.docChecker) fetch("/api/documents").then((r) => r.json()).then((j) => setDocs(j.documents ?? [])).catch(() => null);
  }, [buyer]);

  if (loading) return null;
  if (!buyer) return <div className="card-dark p-6 text-center"><p className="text-gray-700 mb-4">Log in to request a due diligence report.</p><Link href="/account/login?next=/due-diligence" className="btn-primary text-sm">Log in or sign up</Link></div>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError("");
    const r = await fetch("/api/due-diligence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, quotedPricePerSqft: Number(f.quotedPricePerSqft) || undefined, sizeSqft: Number(f.sizeSqft) || undefined, documentIds: picked }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    if (!r?.ok) { setError(j.error ?? "Couldn't create the report. Please try again."); return; }
    router.push(`/due-diligence/${j.id}`);
  };
  const inp = "input-dark text-sm py-2.5 px-3 w-full mt-1";
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <form onSubmit={submit} className="card-dark p-5 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-gray-600">Project name (optional)<input value={f.projectName} onChange={set("projectName")} className={inp} /></label>
        <label className="text-xs font-semibold text-gray-600">Area, City<input required value={f.location} onChange={set("location")} placeholder="e.g. Bachupally, Hyderabad" className={inp} /></label>
        <label className="text-xs font-semibold text-gray-600">Property type<select value={f.propertyType} onChange={set("propertyType")} className={inp}><option value="apartment">Apartment</option><option value="villa">Villa</option><option value="plot">Plot</option><option value="commercial">Commercial</option></select></label>
        <label className="text-xs font-semibold text-gray-600">Quoted price per sq.ft (₹, optional)<input inputMode="numeric" value={f.quotedPricePerSqft} onChange={set("quotedPricePerSqft")} className={inp} /></label>
        <label className="text-xs font-semibold text-gray-600">Size in sq.ft (optional)<input inputMode="numeric" value={f.sizeSqft} onChange={set("sizeSqft")} className={inp} /></label>
        <label className="text-xs font-semibold text-gray-600">Phone (a reviewer will call)<input required inputMode="tel" value={f.phone} onChange={set("phone")} className={inp} /></label>
        {docs.length > 0 && (
          <fieldset className="sm:col-span-2 text-xs text-gray-600"><legend className="font-semibold mb-1">Include documents from my vault</legend>
            {docs.map((d) => <label key={d.id} className="mr-4 inline-flex items-center gap-1"><input type="checkbox" checked={picked.includes(d.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, d.id] : picked.filter((x) => x !== d.id))} /> {d.fileName}</label>)}
          </fieldset>
        )}
        {error && <p className="sm:col-span-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary text-sm sm:col-span-2 justify-center"><ClipboardCheck size={15} /> {busy ? "Running the checks…" : "Create my preliminary report"}</button>
      </form>
      <div>
        <h2 className="heading-h3 mb-3">My reports</h2>
        {mine.length === 0 ? <p className="text-sm text-gray-500">None yet.</p> : (
          <ul className="space-y-2">{mine.map((m) => <li key={m.id}><Link href={`/due-diligence/${m.id}`} className="block border border-gray-200 rounded-lg px-3 py-2 hover:border-[#D6A63E]"><span className="font-semibold text-sm">{m.title}</span><span className="block text-[11px] text-gray-500">{new Date(m.createdAt).toLocaleDateString("en-IN")} · {m.reviewed ? "Reviewed" : "Awaiting review"}</span></Link></li>)}</ul>
        )}
      </div>
    </div>
  );
}
