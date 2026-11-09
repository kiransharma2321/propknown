import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  report: "Report", day2: "Day 2 · Prices near", day5: "Day 5 · Consultation", hot_alert: "Hot-lead alert",
  newsletter: "Market Pulse", listing_verify: "Listing verification", listing_approved: "Listing approved",
  listing_rejected: "Listing rejected", callback_alert: "Callback alert", test: "Test",
};
const STEP_LABEL = ["Not started", "Report sent", "Day 2 sent", "Complete"];
const fmt = (d: Date) => d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });

export default async function SequencesPage({ searchParams }: { searchParams: { kind?: string } }) {
  const kind = searchParams.kind && KIND_LABEL[searchParams.kind] ? searchParams.kind : undefined;

  const [leads, log, counts, suppressed] = await Promise.all([
    prisma.lead.findMany({
      where: { OR: [{ sequenceStep: { gt: 0 } }, { emailLogs: { some: {} } }] },
      orderBy: { createdAt: "desc" }, take: 50,
      include: { emailLogs: { orderBy: { createdAt: "asc" } } },
    }),
    prisma.emailLog.findMany({ where: kind ? { kind } : undefined, orderBy: { createdAt: "desc" }, take: 100, include: { lead: { select: { name: true } } } }),
    prisma.emailLog.groupBy({ by: ["kind", "status"], _count: { _all: true } }),
    prisma.emailSuppression.count(),
  ]);

  const sentOf = (k: string) => counts.filter((c) => c.kind === k && c.status === "sent").reduce((a, c) => a + c._count._all, 0);

  return (
    <div>
      <h1 className="heading-h3">Sequences</h1>
      <p className="text-gray-500 text-sm mb-5">Report → Day 2 &ldquo;Prices near [location]&rdquo; → Day 5 &ldquo;Free consultation&rdquo;. Sent daily by the lead-sequences cron; unsubscribed addresses are skipped automatically.</p>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[["Reports sent", sentOf("report")], ["Day 2 sent", sentOf("day2")], ["Day 5 sent", sentOf("day5")], ["Hot alerts", sentOf("hot_alert")], ["Unsubscribed", suppressed]].map(([l, v]) => (
          <div key={l as string} className="card-dark p-4"><p className="text-[11px] uppercase tracking-wider text-gray-400">{l}</p><p className="text-2xl font-bold tabular-nums mt-1">{v}</p></div>
        ))}
      </div>

      <section className="card-dark p-5 mb-6 overflow-x-auto">
        <h2 className="font-semibold text-sm mb-3">Leads in the sequence</h2>
        {leads.length === 0 ? <p className="text-gray-400 text-sm">No report requests yet.</p> : (
          <table className="w-full text-xs min-w-[720px]">
            <thead><tr className="text-left text-gray-400"><th className="py-1.5">Lead</th><th>Searched</th><th>Stage</th><th>Emails received</th></tr></thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-t border-gray-100 align-top">
                  <td className="py-2 pr-3">
                    <Link href={`/crm/leads/${l.id}`} className="font-semibold text-gray-900 hover:underline">{l.name}</Link>
                    <div className="text-gray-500">{l.email}</div>
                    <div className="text-gray-400">{l.phone}{l.leadScore != null ? ` · score ${Math.round(l.leadScore)}` : ""}{l.hotAlertAt ? " · 🔥 hot" : ""}</div>
                  </td>
                  <td className="pr-3 text-gray-600">{l.source}</td>
                  <td className="pr-3">{l.marketingOptOut ? <span className="text-amber-700">Unsubscribed</span> : STEP_LABEL[l.sequenceStep] ?? l.sequenceStep}</td>
                  <td>
                    <ul className="space-y-0.5">
                      {l.emailLogs.map((e) => (
                        <li key={e.id} className={e.status === "sent" ? "text-gray-700" : "text-amber-700"}>
                          {KIND_LABEL[e.kind] ?? e.kind} — {fmt(e.createdAt)}{e.status !== "sent" ? ` (${e.status}${e.error ? `: ${e.error}` : ""})` : ""}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card-dark p-5 overflow-x-auto">
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <h2 className="font-semibold text-sm mr-2">Email log</h2>
          <a href="?" className={`text-[11px] px-2.5 py-1 rounded-full border ${!kind ? "bg-gray-900 text-white" : "bg-white"}`}>All</a>
          {Object.entries(KIND_LABEL).map(([k, v]) => (
            <a key={k} href={`?kind=${k}`} className={`text-[11px] px-2.5 py-1 rounded-full border ${kind === k ? "bg-gray-900 text-white" : "bg-white"}`}>{v}</a>
          ))}
        </div>
        <table className="w-full text-xs min-w-[640px]">
          <thead><tr className="text-left text-gray-400"><th className="py-1.5">When</th><th>To</th><th>Lead</th><th>Email</th><th>Status</th></tr></thead>
          <tbody>
            {log.map((e) => (
              <tr key={e.id} className="border-t border-gray-100">
                <td className="py-1.5 whitespace-nowrap text-gray-500">{fmt(e.createdAt)}</td>
                <td>{e.to}</td>
                <td>{e.lead?.name ?? "—"}</td>
                <td>{KIND_LABEL[e.kind] ?? e.kind}</td>
                <td className={e.status === "sent" ? "text-green-700" : "text-amber-700"}>{e.status}{e.error ? ` — ${e.error}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
