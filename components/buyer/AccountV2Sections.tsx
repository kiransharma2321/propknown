"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, Bookmark, FileText, Trash2 } from "lucide-react";

// M2 sections on My PropKnown: price watchlist, saved searches, Fair-Price Reports.
const GOLD = "#8a6a2e";
interface Watch { id: string; kind: string; location: string; projectName: string | null; propertyType: string; lastPrice: number | null; lastCapturedAt: string | null; active: boolean }
interface Search { id: string; name: string; path: string; createdAt: string }
interface Report { id: string; location: string; propertyType: string | null; createdAt: string; url: string }

const day = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");

export default function AccountV2Sections() {
  const [watches, setWatches] = useState<Watch[]>([]);
  const [searches, setSearches] = useState<Search[]>([]);
  const [reports, setReports] = useState<{ verified: boolean; reports: Report[] }>({ verified: false, reports: [] });

  useEffect(() => {
    fetch("/api/buyer/watches").then((r) => r.json()).then((j) => setWatches(j.watches ?? [])).catch(() => null);
    fetch("/api/buyer/searches").then((r) => r.json()).then((j) => setSearches(j.searches ?? [])).catch(() => null);
    fetch("/api/buyer/reports").then((r) => r.json()).then((j) => setReports({ verified: !!j.verified, reports: j.reports ?? [] })).catch(() => null);
  }, []);

  const del = async (url: string, id: string) => fetch(url, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });

  return (
    <>
      <section className="mt-12">
        <div className="flex items-center gap-2 mb-2"><BellRing size={16} style={{ color: GOLD }} /><h2 className="text-lg font-bold text-gray-900">Price watchlist ({watches.filter((w) => w.active).length})</h2></div>
        <p className="text-gray-500 text-xs mb-4">We email you when a watched asking price moves 3% or more. Add areas from any area price page, and projects from Project Check.</p>
        {watches.length === 0 ? <p className="text-gray-500 text-sm">Nothing watched yet. <Link href="/area-prices" className="underline" style={{ color: GOLD }}>Browse area prices</Link>.</p> : (
          <div className="space-y-2">
            {watches.map((w) => (
              <div key={w.id} className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg px-4 py-2.5">
                <div className="text-sm text-gray-700 min-w-0">
                  <p className="font-semibold truncate">{w.projectName ? `${w.projectName}, ` : ""}{w.location} · {w.propertyType}{!w.active && <span className="text-gray-500 font-normal"> (alerts stopped)</span>}</p>
                  <p className="text-xs text-gray-500">{w.lastPrice ? `Last figure ₹${Math.round(w.lastPrice).toLocaleString("en-IN")}/sq.ft, captured ${day(w.lastCapturedAt)}` : "No sourced price yet; we'll start tracking when one appears."}</p>
                </div>
                <button aria-label="Remove from watchlist" onClick={() => { setWatches((x) => x.filter((y) => y.id !== w.id)); del("/api/buyer/watches", w.id); }} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <div className="flex items-center gap-2 mb-4"><Bookmark size={16} style={{ color: GOLD }} /><h2 className="text-lg font-bold text-gray-900">Saved searches ({searches.length})</h2></div>
        {searches.length === 0 ? <p className="text-gray-500 text-sm">No saved searches. Use &quot;Save this search&quot; on <Link href="/buy" className="underline" style={{ color: GOLD }}>Buy</Link>.</p> : (
          <div className="space-y-2">
            {searches.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg px-4 py-2.5">
                <Link href={s.path} className="text-sm font-semibold text-gray-800 hover:underline truncate">{s.name}</Link>
                <button aria-label="Delete saved search" onClick={() => { setSearches((x) => x.filter((y) => y.id !== s.id)); del("/api/buyer/searches", s.id); }} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <div className="flex items-center gap-2 mb-4"><FileText size={16} style={{ color: GOLD }} /><h2 className="text-lg font-bold text-gray-900">My Fair-Price Reports ({reports.reports.length})</h2></div>
        {!reports.verified ? (
          <p className="text-gray-500 text-sm">To see reports sent to your email, log out and log back in with an emailed code. This proves the address is yours.</p>
        ) : reports.reports.length === 0 ? (
          <p className="text-gray-500 text-sm">No reports yet. <Link href="/price-check#report" className="underline" style={{ color: GOLD }}>Get a free Fair-Price Report</Link>.</p>
        ) : (
          <div className="space-y-2">
            {reports.reports.map((r) => (
              <a key={r.id} href={r.url} className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-2.5 hover:border-[#D6A63E]">
                <span className="text-sm text-gray-800">{r.location}{r.propertyType ? ` · ${r.propertyType}` : ""}</span>
                <span className="text-xs text-gray-500">{day(r.createdAt)} · Download PDF</span>
              </a>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
