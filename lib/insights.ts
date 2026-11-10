import { prisma } from "@/lib/db";

// M11: business-intelligence numbers for the admin dashboard. Counts only from our own records
// (leads, AI tool queries, emails) -- nothing estimated or projected.

export type Count = { label: string; n: number };
const sortDesc = (a: Count[]) => a.sort((x, y) => y.n - x.n);

// Lead sources were written in several spellings over time ("ai_intelligence", "ai-intelligence");
// group them for reading, keep the raw value available in the CSV.
export function normaliseSource(s: string): string {
  const t = s.toLowerCase().replace(/[_\s]+/g, "-");
  if (t.startsWith("price-check")) return "price-check";
  return t.replace(/-page$/, "");
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const cell = (v: unknown) => {
    const s = v instanceof Date ? v.toISOString() : v == null ? "" : String(v);
    // Quote, double inner quotes, and neutralise spreadsheet formulas (CSV injection).
    // A leading +/- followed by a digit is a number (e.g. +91 phone numbers), not a formula.
    const safe = /^[=@\t\r]/.test(s) || /^[+-](?![\d\s])/.test(s) ? `'${s}` : s;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\r\n");
}

export async function loadInsights(days: number) {
  const since = new Date(Date.now() - days * 86_400_000);
  const [leads, aiByTool, aiByResult, aiLocations, emails, watches, docs] = await Promise.all([
    prisma.lead.findMany({ where: { createdAt: { gte: since } }, select: { source: true, status: true, utmSource: true, utmCampaign: true, createdAt: true } }),
    prisma.aiQuery.groupBy({ by: ["tool"], where: { createdAt: { gte: since } }, _count: true }),
    prisma.aiQuery.groupBy({ by: ["result"], where: { createdAt: { gte: since } }, _count: true }),
    prisma.aiQuery.groupBy({ by: ["location"], where: { createdAt: { gte: since }, location: { not: null } }, _count: true, orderBy: { _count: { location: "desc" } }, take: 10 }),
    prisma.emailLog.groupBy({ by: ["kind", "status"], where: { createdAt: { gte: since } }, _count: true }),
    prisma.priceWatch.count({ where: { active: true } }).catch(() => null),
    prisma.documentCheck.count().catch(() => null),
  ]);

  const tally = (vals: string[]) => sortDesc(Object.entries(vals.reduce<Record<string, number>>((a, v) => ({ ...a, [v]: (a[v] ?? 0) + 1 }), {})).map(([label, n]) => ({ label, n })));
  const byWeek = tally(leads.map((l) => { const d = new Date(l.createdAt); d.setUTCDate(d.getUTCDate() - d.getUTCDay()); return d.toISOString().slice(0, 10); })).sort((a, b) => a.label.localeCompare(b.label));

  return {
    days, since,
    leads: {
      total: leads.length,
      bySource: tally(leads.map((l) => normaliseSource(l.source))),
      byStatus: tally(leads.map((l) => l.status)),
      byUtm: tally(leads.map((l) => l.utmSource ? `${l.utmSource}${l.utmCampaign ? ` / ${l.utmCampaign}` : ""}` : "(direct / none)")),
      byWeek,
    },
    ai: {
      total: aiByTool.reduce((a, r) => a + r._count, 0),
      byTool: sortDesc(aiByTool.map((r) => ({ label: r.tool, n: r._count }))),
      byResult: sortDesc(aiByResult.map((r) => ({ label: r.result, n: r._count }))),
      topLocations: aiLocations.map((r) => ({ label: r.location ?? "", n: r._count })),
    },
    emails: emails.map((e) => ({ label: `${e.kind} · ${e.status}`, n: e._count })),
    watches, docs,
  };
}
