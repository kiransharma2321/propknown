"use client";

import { useState } from "react";
import { Upload, CheckCircle, XCircle, AlertTriangle, Download, ArrowLeft } from "lucide-react";
import Link from "next/link";

const CSV_TEMPLATE = `title,propType,bhk,size,sizeUnit,priceDisplay,city,area,description,ownerName,ownerPhone,ownerEmail,features,reraNumber,approve
"3BHK Flat in Kokapet","apartment","3BHK","1850","sqft","₹1.85 Cr","Hyderabad","Kokapet","Spacious 3BHK in gated community","Ramesh Kumar","9876543210","ramesh@example.com","Pool,Gym","P01234","no"
"Plot 200 sq.yd Nallagandla","plot","","200","sqyard","₹60 L","Hyderabad","Nallagandla","Corner plot, East facing","Suresh Reddy","9876543211","suresh@example.com","","","yes"`;

interface ImportRow {
  title: string;
  propType?: string;
  bhk?: string;
  size?: string;
  sizeUnit?: string;
  priceDisplay: string;
  city: string;
  area: string;
  description?: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  approve?: string;
}

interface ResultRow {
  row: number;
  status: string;
  id?: string;
  error?: string;
}

const REQUIRED_COLS = ["title", "pricedisplay", "city", "ownername", "ownerphone"];

export default function BulkImportPage() {
  const [csv, setCsv]           = useState("");
  const [parsed, setParsed]     = useState<ImportRow[]>([]);
  const [parseErrors, setPErrors] = useState<string[]>([]);
  const [autoApprove, setAuto]  = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults]   = useState<ResultRow[] | null>(null);
  const [summary, setSummary]   = useState<{ ok: number; errors: number; total: number } | null>(null);

  const parseCSV = async () => {
    const lines = csv.trim().split("\n");
    if (lines.length < 2) { setPErrors(["Need at least 1 header row + 1 data row"]); return; }
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+|\"/g, ""));
    const missingCols = REQUIRED_COLS.filter(c => !headers.includes(c));
    if (missingCols.length > 0) {
      setPErrors([`Missing required columns: ${missingCols.join(", ")}`]);
      return;
    }

    const res = await fetch("/api/admin/bulk-import", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv }),
    });
    const d = await res.json() as { rows: ImportRow[]; count: number };
    setParsed(d.rows ?? []);
    setPErrors([]);
    setResults(null);
  };

  const runImport = async () => {
    if (!parsed.length) return;
    setImporting(true);
    try {
      const res = await fetch("/api/admin/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsed, autoApprove }),
      });
      const d = await res.json() as { ok: number; errors: number; total: number; results: ResultRow[] };
      setResults(d.results ?? []);
      setSummary({ ok: d.ok, errors: d.errors, total: d.total });
    } catch { /* noop */ }
    setImporting(false);
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "propknown_bulk_import_template.csv";
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-navy p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin/dashboard" className="text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="font-playfair text-white text-xl font-bold">Bulk Listing Import</h1>
            <p className="text-zinc-500 text-sm">Import multiple property listings via CSV paste or upload</p>
          </div>
        </div>

        {/* Download template */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 flex items-center justify-between">
          <div>
            <p className="text-white text-sm font-semibold mb-1">CSV Format</p>
            <p className="text-zinc-500 text-xs">Required columns: title, priceDisplay, city, ownerName, ownerPhone</p>
            <p className="text-zinc-600 text-xs mt-1">Set approve=yes to auto-approve, or leave blank for pending review</p>
          </div>
          <button onClick={downloadTemplate} className="btn-primary text-sm px-4 py-2.5">
            <Download size={15} /> Download Template
          </button>
        </div>

        {/* Paste area */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-5">
          <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3">Paste CSV Data</label>
          <textarea
            value={csv}
            onChange={e => { setCsv(e.target.value); setParsed([]); setResults(null); }}
            rows={10}
            placeholder={CSV_TEMPLATE}
            className="w-full bg-black/30 border border-white/10 text-white text-xs font-mono rounded-xl px-4 py-3 focus:outline-none focus:border-[#D6A63E] placeholder-zinc-700 resize-none"
          />
          <div className="flex items-center gap-3 mt-3">
            <button onClick={parseCSV} disabled={!csv.trim()} className="btn-primary text-sm px-5 py-2.5 disabled:opacity-40">
              <Upload size={15} /> Parse & Preview
            </button>
            {parseErrors.length > 0 && (
              <div className="flex items-center gap-1.5 text-red-400 text-xs">
                <XCircle size={14} /> {parseErrors[0]}
              </div>
            )}
          </div>
        </div>

        {/* Preview table */}
        {parsed.length > 0 && !results && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-white text-sm font-semibold">{parsed.length} rows ready to import</p>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-zinc-400 text-xs cursor-pointer">
                  <input type="checkbox" checked={autoApprove} onChange={e => setAuto(e.target.checked)}
                    className="rounded" />
                  Auto-approve all
                </label>
                <button onClick={runImport} disabled={importing} className="btn-primary text-sm px-5 py-2.5 disabled:opacity-60">
                  {importing ? "Importing..." : `Import ${parsed.length} Listings`}
                </button>
              </div>
            </div>

            {autoApprove && (
              <div className="flex items-center gap-2 text-amber-400 text-xs bg-amber-900/20 border border-amber-700/30 rounded-xl p-3 mb-4">
                <AlertTriangle size={13} /> Auto-approve will publish all imported listings immediately without review.
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-zinc-500">
                    <th className="text-left py-2 px-2">#</th>
                    <th className="text-left py-2 px-2">Title</th>
                    <th className="text-left py-2 px-2">City / Area</th>
                    <th className="text-left py-2 px-2">Price</th>
                    <th className="text-left py-2 px-2">Owner</th>
                    <th className="text-left py-2 px-2">Phone</th>
                    <th className="text-left py-2 px-2">Approve?</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((r, i) => (
                    <tr key={i} className="border-b border-white/10/50">
                      <td className="py-2 px-2 text-zinc-600">{i + 1}</td>
                      <td className="py-2 px-2 text-white max-w-[180px] truncate">{r.title || <span className="text-red-400">Missing!</span>}</td>
                      <td className="py-2 px-2 text-zinc-400">{r.city} {r.area && `/ ${r.area}`}</td>
                      <td className="py-2 px-2 text-green-400">{r.priceDisplay || <span className="text-red-400">Missing!</span>}</td>
                      <td className="py-2 px-2 text-zinc-400">{r.ownerName || <span className="text-red-400">Missing!</span>}</td>
                      <td className="py-2 px-2 text-zinc-400">{r.ownerPhone || <span className="text-red-400">Missing!</span>}</td>
                      <td className="py-2 px-2">
                        {(autoApprove || r.approve === "yes") ? (
                          <span className="text-green-400">Auto</span>
                        ) : (
                          <span className="text-zinc-500">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Results */}
        {results && summary && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-4 mb-5">
              <div className="flex items-center gap-2 text-green-400 text-sm font-semibold">
                <CheckCircle size={16} /> {summary.ok} imported
              </div>
              {summary.errors > 0 && (
                <div className="flex items-center gap-2 text-red-400 text-sm font-semibold">
                  <XCircle size={16} /> {summary.errors} failed
                </div>
              )}
              <span className="text-zinc-500 text-xs ml-auto">{summary.total} total</span>
            </div>

            <div className="space-y-1.5">
              {results.map(r => (
                <div key={r.row} className={`flex items-center gap-3 text-xs px-3 py-2 rounded-lg ${r.status === "ok" ? "bg-green-900/20 border border-green-700/30" : "bg-red-900/20 border border-red-700/30"}`}>
                  {r.status === "ok"
                    ? <CheckCircle size={12} className="text-green-400 shrink-0" />
                    : <XCircle size={12} className="text-red-400 shrink-0" />}
                  <span className="text-zinc-400">Row {r.row}</span>
                  {r.id && <span className="text-green-400">ID: {r.id}</span>}
                  {r.error && <span className="text-red-400 truncate">{r.error}</span>}
                </div>
              ))}
            </div>

            {summary.ok > 0 && (
              <div className="mt-5 flex gap-3">
                <Link href="/admin/dashboard" className="btn-primary text-sm px-5 py-2.5">
                  Go to Dashboard →
                </Link>
                <button onClick={() => { setResults(null); setSummary(null); setParsed([]); setCsv(""); }}
                  className="btn-secondary-dark text-sm px-5 py-2.5">
                  Import More
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
