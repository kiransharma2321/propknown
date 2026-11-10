"use client";

import { useEffect, useState } from "react";

interface Row { source: string; medium: string; campaign: string; leads: number; won: number }

// Leads grouped by first-touch source, for /crm/campaigns.
export default function LeadSourcesTable() {
  const [data, setData] = useState<{ rows: Row[]; total: number } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    fetch("/api/crm/lead-sources").then((r) => (r.ok ? r.json() : Promise.reject())).then(setData).catch(() => setError(true));
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6">
      <h2 className="font-semibold text-gray-900 mb-1">Leads by source</h2>
      <p className="text-xs text-gray-500 mb-3">First-touch: the campaign tag or referring site from a lead&apos;s first visit (stored for 90 days). Leads from before tracking started show as direct / unknown.</p>
      {error && <p className="text-sm text-red-700">Couldn&apos;t load lead sources.</p>}
      {!data && !error && <p className="text-sm text-gray-400">Loading…</p>}
      {data && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-400"><th className="py-2 pr-3">Source</th><th className="pr-3">Medium</th><th className="pr-3">Campaign</th><th className="pr-3 text-right">Leads</th><th className="text-right">Won</th></tr></thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={`${r.source}|${r.medium}|${r.campaign}`} className="border-t border-gray-100">
                  <td className="py-2 pr-3">{r.source}</td><td className="pr-3">{r.medium}</td><td className="pr-3">{r.campaign}</td>
                  <td className="pr-3 text-right tabular-nums">{r.leads}</td><td className="text-right tabular-nums">{r.won}</td>
                </tr>
              ))}
              <tr className="border-t border-gray-200 font-semibold"><td className="py-2" colSpan={3}>Total</td><td className="pr-3 text-right tabular-nums">{data.total}</td><td /></tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
