"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Printer } from "lucide-react";
import type { DDReport } from "@/lib/dueDiligence";

// M6: view one Due Diligence Report (owner only). Printable.
type Ctx = { report: DDReport; review: { by: string; at: string; notes: string; checklist: Record<string, string> } | null };
const day = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const STATUS: Record<string, string> = { verified: "Verified by PropKnown (original seen)", pending: "Not yet checked", na: "Not applicable" };

export default function DueDiligenceReport({ id }: { id: string }) {
  const [c, setC] = useState<Ctx | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { fetch(`/api/due-diligence/${id}`).then(async (r) => { if (!r.ok) throw new Error(r.status === 401 ? "Please log in to see this report." : "Report not found."); return r.json(); }).then(setC).catch((e) => setErr(e.message)); }, [id]);
  if (err) return <p className="text-gray-700">{err} <Link href={`/account/login?next=/due-diligence/${id}`} className="underline">Log in</Link></p>;
  if (!c) return <p className="text-gray-500">Loading…</p>;
  const r = c.report;
  const H = ({ children }: { children: React.ReactNode }) => <h2 className="heading-h3 mt-8 mb-3">{children}</h2>;

  return (
    <article className="text-sm text-gray-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs uppercase tracking-widest text-[#7A5C1A]">Preliminary due diligence report</p><h1 className="heading-h2">{r.title}</h1><p className="text-gray-500">Generated {day(r.generatedAt)} · {r.input.propertyType}</p></div>
        <button onClick={() => window.print()} className="btn-secondary text-sm print:hidden"><Printer size={14} /> Print / save PDF</button>
      </div>
      <p className={`mt-4 border rounded-lg px-3 py-2 ${c.review ? "bg-green-50 border-green-200 text-green-900" : "bg-amber-50 border-amber-200 text-amber-900"}`}>{c.review ? `Reviewed by ${c.review.by} on ${day(c.review.at)}.` : "Awaiting review by a PropKnown reviewer. Don't rely on this report until it's reviewed."}</p>
      {c.review && <p className="mt-2 whitespace-pre-line">{c.review.notes}</p>}

      {r.redFlags.length > 0 && <><H>Red flags</H><ul className="list-disc pl-5 text-red-800 space-y-1">{r.redFlags.map((f, i) => <li key={i}>{f}</li>)}</ul></>}

      <H>Price</H>
      <dl className="grid sm:grid-cols-3 gap-3">
        <div className="card-dark p-3"><dt className="text-xs text-gray-500">Area typical asking (AI estimate)</dt><dd className="font-semibold">{r.price.area ? `${r.price.area.symbol}${r.price.area.value.toLocaleString("en-IN")}/${r.price.area.unit}` : "No sourced price yet"}</dd>{r.price.area && <dd className="text-[11px] text-gray-500">{r.price.area.sources} websites · {r.price.area.confidence} · {day(r.price.area.capturedAt)}</dd>}</div>
        <div className="card-dark p-3"><dt className="text-xs text-gray-500">Project asking (listings)</dt><dd className="font-semibold">{r.price.project ? `${inr(r.price.project.min)}–${inr(r.price.project.max)}/sq.ft` : "—"}</dd>{r.price.project && <dd className="text-[11px] text-gray-500">median {inr(r.price.project.median)} · {r.price.project.sources} websites · {day(r.price.project.capturedAt)}</dd>}</div>
        <div className="card-dark p-3"><dt className="text-xs text-gray-500">Your quote</dt><dd className="font-semibold">{r.price.quote ? `${inr(r.price.quote.value)}/sq.ft` : "—"}</dd>{r.price.quote && <dd className="text-[11px] text-gray-500">{r.price.quote.vsProject != null ? `${r.price.quote.vsProject}% vs project` : ""} {r.price.quote.vsArea != null ? `${r.price.quote.vsArea}% vs area` : ""}</dd>}</div>
      </dl>

      {r.project && <><H>Project facts (from sources)</H><ul className="space-y-1">{r.project.facts.map((f, i) => <li key={i}><span className="text-gray-500 capitalize">{f.label}:</span> {f.value} <a href={f.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex text-gray-500"><ExternalLink size={11} /></a></li>)}</ul></>}

      <H>RERA</H>
      <p>{r.rera.stated ? <>Number stated by a source: <b>{r.rera.stated}</b> (not verified by PropKnown). </> : "No RERA number found in sources. "}{r.rera.formatNote}</p>
      {r.rera.portalUrl && <p className="mt-1">Check it yourself: <a href={r.rera.portalUrl} target="_blank" rel="noopener noreferrer" className="underline">{r.rera.authority}</a></p>}

      {r.documents.length > 0 && <><H>Your documents (preliminary AI readings)</H><ul className="space-y-2">{r.documents.map((d) => <li key={d.id} className="border border-gray-200 rounded-lg p-2"><b>{d.fileName}</b> · risk {d.risk ?? "—"} · {d.reviewed ? "reviewed" : "awaiting review"}{d.flags.length > 0 && <ul className="list-disc pl-5 text-gray-700 mt-1">{d.flags.map((f, i) => <li key={i}>[{f.severity}] {f.issue}</li>)}</ul>}</li>)}</ul></>}

      {r.trueCost && <><H>True cost ({r.trueCost.sqft} sq.ft)</H><table className="w-full max-w-md"><tbody>{r.trueCost.lines.map((l) => <tr key={l.label} className="border-t border-gray-100"><td className="py-1">{l.label}</td><td className="py-1 text-right">{inr(l.amount)}</td></tr>)}<tr className="border-t font-semibold"><td className="py-1">Total</td><td className="py-1 text-right">{inr(r.trueCost.total)}</td></tr></tbody></table><p className="text-[11px] text-gray-500 mt-1">{r.trueCost.gstNote}. Government guidance value not included.</p></>}

      {r.score && <><H>Investment Score</H><p>{r.score.score != null ? <><b>{r.score.score}/100 ({r.score.band})</b>, {r.score.basedOn}.</> : r.score.basedOn} <Link href="/investment-score#method" className="underline">How it&apos;s calculated</Link></p></>}

      <H>Legal checklist</H>
      <table className="w-full"><tbody>{r.checklist.map((i) => <tr key={i.key} className="border-t border-gray-100 align-top"><td className="py-2 pr-3 font-semibold">{i.label}<span className="block font-normal text-[11px] text-gray-500">{i.why}</span></td><td className="py-2 text-right whitespace-nowrap">{STATUS[c.review?.checklist?.[i.key] ?? "pending"]}</td></tr>)}</tbody></table>

      <H>How this report was built</H>
      <ol className="list-decimal pl-5 space-y-1">{r.steps.map((s, i) => <li key={i}><b>{s.step}</b>: {s.detail} <span className="text-gray-500">({s.status === "done" ? "checked" : s.status === "no_data" ? "no data" : "skipped"}{s.source ? `; ${s.source}` : ""})</span></li>)}</ol>

      <p className="text-[11px] text-gray-500 mt-8 border-t pt-3">{r.disclaimer}</p>
    </article>
  );
}
