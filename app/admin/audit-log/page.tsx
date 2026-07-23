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
    <div className="min-h-screen" style={{ background: "var(--navy)" }}>
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin/dashboard" className="text-zinc-400 hover:text-white"><ArrowLeft size={18} /></Link>
          <PKLogo dark />
        </div>
        <h1 className="font-playfair text-white text-xl font-bold mb-1 flex items-center gap-2"><History size={18} style={{ color: "var(--gold)" }} /> Audit Trail</h1>
        <p className="text-zinc-400 text-sm mb-6">Logs Settings/credential changes, AI scoring runs, and new user creation. Not yet wired into every action across the CRM — see report for scope.</p>

        {loading ? <p className="text-zinc-500 text-sm">Loading…</p> : logs.length === 0 ? (
          <p className="text-zinc-600 text-sm text-center py-10">No logged actions yet.</p>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            {logs.map(l => (
              <div key={l.id} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 text-sm">
                <span className="text-zinc-600 text-xs w-36 shrink-0">{new Date(l.createdAt).toLocaleString("en-IN")}</span>
                <span className="text-white">{l.actorName ?? "System"}</span>
                <span className="text-zinc-500">{l.action}</span>
                {l.entity && <span className="text-zinc-600 text-xs">{l.entity}{l.entityId ? `:${l.entityId.slice(0, 8)}` : ""}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
