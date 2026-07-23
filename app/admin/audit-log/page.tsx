"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, History } from "lucide-react";
import PKLogo from "@/components/layout/PKLogo";

interface LogEntry { id: string; actorName: string | null; action: string; entity: string | null; entityId: string | null; details: Record<string, unknown> | null; createdAt: string }

// Audit Trail viewer (Section 14). Only logs actions wired in tonight (Settings/credential
// changes, AI scoring, new user creation) -- an empty list here means nothing has happened yet
// in those specific areas, not that logging is broken.
export default function AuditLogPage() {
  const [logs, setLogs]       = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/audit-log").then(r => r.ok ? r.json() : { logs: [] }).then((d: { logs: LogEntry[] }) => { setLogs(d.logs ?? []); setLoading(false); });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin/dashboard" className="text-gray-400 hover:text-gray-900"><ArrowLeft size={18} /></Link>
          <PKLogo />
        </div>
        <h1 className="heading-h3 mb-1 flex items-center gap-2"><History size={18} style={{ color: "var(--gold-text)" }} /> Audit Trail</h1>
        <p className="text-gray-500 text-sm mb-6">Logs Settings/credential changes, AI scoring runs, and new user creation. Not yet wired into every action across the CRM — see report for scope.</p>

        {loading ? <p className="text-gray-500 text-sm">Loading…</p> : logs.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-10">No logged actions yet.</p>
        ) : (
          <div className="card-dark overflow-hidden">
            {logs.map(l => (
              <div key={l.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 text-sm">
                <span className="text-gray-400 text-xs w-36 shrink-0">{new Date(l.createdAt).toLocaleString("en-IN")}</span>
                <span className="text-gray-900">{l.actorName ?? "System"}</span>
                <span className="text-gray-500">{l.action}</span>
                {l.entity && <span className="text-gray-400 text-xs">{l.entity}{l.entityId ? `:${l.entityId.slice(0, 8)}` : ""}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
