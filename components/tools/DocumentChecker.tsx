"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FileSearch, Trash2, Download, ShieldAlert } from "lucide-react";
import { useBuyer } from "@/components/buyer/BuyerProvider";
import { DOC_DISCLAIMER, DOC_TYPES, type DocResult } from "@/lib/documentCheckerShared";

// M5: upload a property document for a preliminary AI reading; private vault of past checks.
interface VaultDoc { id: string; fileName: string; docType: string; status: string; reviewStatus: string; expiresAt: string; createdAt: string; risk: string | null }
interface Detail { id: string; fileName: string; status: string; result: DocResult | null; error: string | null; reviewStatus: string; reviewNotes: string | null; reviewedAt: string | null; expiresAt: string }

const day = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");
const RISK: Record<string, [string, string]> = {
  high: ["High: serious points to clear first", "bg-red-50 text-red-800 border-red-200"],
  medium: ["Medium: some points to check", "bg-amber-50 text-amber-800 border-amber-200"],
  low: ["Low: minor points noted", "bg-blue-50 text-blue-800 border-blue-200"],
  none_found: ["No red flags found in this preliminary reading", "bg-gray-50 text-gray-800 border-gray-200"],
};

export default function DocumentChecker() {
  const { buyer, loading } = useBuyer();
  const [docs, setDocs] = useState<VaultDoc[]>([]);
  const [open, setOpen] = useState<Detail | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState("sale_deed");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => { fetch("/api/documents").then((r) => r.json()).then((j) => setDocs(j.documents ?? [])).catch(() => null); }, []);
  useEffect(() => { if (buyer) load(); }, [buyer, load]);
  const show = async (id: string) => { const j = await fetch(`/api/documents/${id}`).then((r) => r.json()).catch(() => null); if (j?.document) setOpen(j.document); };

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setBusy(true); setError("");
    const fd = new FormData(); fd.append("file", file); fd.append("docType", docType);
    const r = await fetch("/api/documents", { method: "POST", body: fd }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    if (!r || (!r.ok && r.status !== 202)) { setError(j.error ?? "Upload failed. Please try again."); return; }
    if (r.status === 202) setError(j.error ?? "");
    setFile(null); load(); if (j.id) show(j.id);
  };
  const remove = async (id: string) => {
    setDocs((d) => d.filter((x) => x.id !== id)); if (open?.id === id) setOpen(null);
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
  };

  if (loading) return null;
  if (!buyer) return (
    <div className="card-dark p-6 text-center">
      <p className="text-gray-700 mb-4">Log in to check documents. Your documents stay private to your account and are deleted after 30 days.</p>
      <Link href="/account/login?next=/document-checker" className="btn-primary text-sm">Log in or sign up</Link>
    </div>
  );

  const r = open?.result;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <div className="space-y-6">
        <form onSubmit={upload} className="card-dark p-5 space-y-3">
          <label className="block text-xs font-semibold text-gray-600">Document type
            <select value={docType} onChange={(e) => setDocType(e.target.value)} className="input-dark text-sm py-2.5 px-3 w-full mt-1">
              {Object.entries(DOC_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="block text-xs font-semibold text-gray-600">File (PDF, JPG, PNG; up to 10 MB)
            <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm mt-1" />
          </label>
          {error && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>}
          <button type="submit" disabled={!file || busy} className="btn-primary text-sm w-full justify-center disabled:opacity-50"><FileSearch size={15} /> {busy ? "Reading your document… (up to a minute)" : "Check this document"}</button>
          <p className="text-[11px] text-gray-500">English, Telugu and Hindi. Stored privately; deleted automatically after 30 days, or now with the bin icon.</p>
        </form>

        <div>
          <h2 className="heading-h3 mb-3">My document vault ({docs.length})</h2>
          {docs.length === 0 ? <p className="text-sm text-gray-500">No documents yet.</p> : (
            <ul className="space-y-2">
              {docs.map((d) => (
                <li key={d.id} className={`flex items-center justify-between gap-2 border rounded-lg px-3 py-2 ${open?.id === d.id ? "border-[#D6A63E]" : "border-gray-200"}`}>
                  <button onClick={() => show(d.id)} className="text-left min-w-0">
                    <p className="text-sm font-semibold truncate">{d.fileName}</p>
                    <p className="text-[11px] text-gray-500">{DOC_TYPES[d.docType as keyof typeof DOC_TYPES] ?? d.docType} · {d.reviewStatus === "reviewed" ? "Reviewed" : "Awaiting review"} · deletes {day(d.expiresAt)}</p>
                  </button>
                  <span className="flex gap-2 shrink-0">
                    <a href={`/api/documents/${d.id}/file`} aria-label="Download" className="text-gray-500 hover:text-gray-900"><Download size={14} /></a>
                    <button aria-label="Delete now" onClick={() => remove(d.id)} className="text-gray-500 hover:text-red-600"><Trash2 size={14} /></button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card-dark p-5 min-h-[200px]">
        {!open ? <p className="text-sm text-gray-500">Choose a document to see its reading.</p> : open.status === "failed" || !r ? (
          <p className="text-sm text-gray-700">We couldn&apos;t read <b>{open.fileName}</b> automatically. A PropKnown reviewer will look at it.</p>
        ) : (
          <div className="space-y-4 text-sm">
            <p className="text-xs text-gray-500">{open.fileName} · {r.documentType} · {r.language}</p>
            <p className={`border rounded-lg px-3 py-2 font-semibold ${RISK[r.risk]?.[1]}`}>{RISK[r.risk]?.[0]}</p>
            {r.embeddedInstructions && <p className="flex gap-2 text-red-800 bg-red-50 border border-red-200 rounded-lg p-2"><ShieldAlert size={16} className="shrink-0" /> This document contains text aimed at automated systems. Treat it with extra care.</p>}
            <p className="text-gray-700">{r.summary}</p>
            {r.redFlags.length > 0 && <div><h3 className="font-semibold mb-1">Points to check</h3><ul className="space-y-2">{r.redFlags.map((f, i) => <li key={i} className="border-l-2 pl-3" style={{ borderColor: f.severity === "high" ? "#b91c1c" : f.severity === "medium" ? "#b45309" : "#1d4ed8" }}><b>{f.issue}</b><span className="block text-gray-600">{f.why}</span>{f.quote && <span className="block text-gray-500 italic">“{f.quote}”</span>}</li>)}</ul></div>}
            {r.keyFields.length > 0 && <div><h3 className="font-semibold mb-1">What the document says</h3><dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">{r.keyFields.map((k, i) => <div key={i} className="contents"><dt className="text-gray-500">{k.label}</dt><dd>{k.value}</dd></div>)}</dl></div>}
            {r.unclear.length > 0 && <div><h3 className="font-semibold mb-1">Missing or unclear</h3><ul className="list-disc pl-5 text-gray-700">{r.unclear.map((u, i) => <li key={i}>{u}</li>)}</ul></div>}
            {r.whatToVerify.length > 0 && <div><h3 className="font-semibold mb-1">Verify with the original documents</h3><ul className="list-disc pl-5 text-gray-700">{r.whatToVerify.map((u, i) => <li key={i}>{u}</li>)}</ul></div>}
            <div className="border-t pt-3">
              <h3 className="font-semibold mb-1">PropKnown review</h3>
              {open.reviewStatus === "reviewed" ? <p className="text-gray-700">{open.reviewNotes} <span className="text-xs text-gray-500">({day(open.reviewedAt)})</span></p> : <p className="text-gray-500">Awaiting review by a PropKnown reviewer. Don&apos;t rely on the AI reading alone.</p>}
            </div>
            <p className="text-[11px] text-gray-500">{DOC_DISCLAIMER}</p>
          </div>
        )}
      </div>
    </div>
  );
}
