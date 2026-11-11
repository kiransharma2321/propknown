import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { webSearch } from "@/lib/search";
import { fetchPage } from "@/lib/search/fetcher";
import { sameProject } from "@/lib/listings/finder";
import { CHECKLIST_ITEMS } from "@/lib/listings/checklist";
import { extractCandidates, preQueueChecks } from "./index";
import { redactContacts, isResaleOrSellerPage, type Facts, type FactKey, type ResearchCategory } from "./rules";

// Every 2 weeks each live researched listing is checked again. If a key fact changed (approval
// number, price, possession, status), a "recheck" draft goes back to the Approval Queue with the
// differences; approving it updates the existing listing instead of creating a new one.
export const RECHECK_DAYS = 14;
const WATCH: FactKey[] = ["approvalNumber", "pricePerUnit", "totalPrice", "possession", "status"];

export function factChanges(before: Facts, after: Facts): string[] {
  const out: string[] = [];
  for (const k of WATCH) {
    const a = before[k]?.[0]?.value, b = after[k]?.[0]?.value;
    if (b && a !== b) out.push(`${k}: ${a ?? "(none)"} -> ${b} (source: ${after[k]![0].sourceUrl})`);
  }
  return out;
}

export async function recheckDue(limit = 6, stats: Record<string, number> = {}) {
  const due = await prisma.listingDraft.findMany({
    where: { origin: "research", reviewStatus: "approved", propertyId: { not: null }, lastCheckedAt: { lt: new Date(Date.now() - RECHECK_DAYS * 86_400_000) } },
    orderBy: { lastCheckedAt: "asc" }, take: limit,
  });
  for (const d of due) {
    try {
      const hits = (await webSearch(`"${d.projectName}" ${d.location ?? ""} ${d.city ?? ""} price possession RERA`, { maxResults: 5 })).filter((h) => !isResaleOrSellerPage(h.url));
      const sources: { i: number; url: string; text: string; capturedAt: string }[] = [];
      for (const h of hits.slice(0, 4)) {
        const page = await fetchPage(h.url).catch(() => null);
        const text = redactContacts(page?.text ?? h.content ?? "").slice(0, 7000);
        if (text.length > 80) sources.push({ i: sources.length + 1, url: h.url, text, capturedAt: page?.fetchedAt ?? new Date().toISOString() });
      }
      const found = (await extractCandidates(d.city ?? "", (d.category ?? "apartment") as ResearchCategory, sources, stats))
        .find((c) => sameProject({ projectName: c.facts.name![0].value, builder: c.facts.builder?.[0]?.value }, { projectName: d.projectName, builder: d.builder }));
      await prisma.listingDraft.update({ where: { id: d.id }, data: { lastCheckedAt: new Date() } });
      if (!found) { stats.recheckNotFound = (stats.recheckNotFound ?? 0) + 1; continue; }
      const changes = factChanges((d.facts ?? {}) as Facts, found.facts);
      if (!changes.length) { stats.recheckUnchanged = (stats.recheckUnchanged ?? 0) + 1; continue; }
      const c = await preQueueChecks({ ...((d.facts ?? {}) as Facts), ...found.facts }, (d.category ?? "apartment") as ResearchCategory, d.city ?? "");
      await prisma.listingDraft.create({ data: {
        origin: "recheck", category: d.category, sourceName: "Re-check (every 2 weeks)", sourceUrl: found.facts.name![0].sourceUrl,
        projectName: d.projectName, builder: d.builder, location: d.location, city: d.city, state: d.state, propertyType: d.propertyType,
        configuration: d.configuration, sizeText: d.sizeText, projectStatus: found.facts.status?.[0]?.value ?? d.projectStatus,
        possessionDate: found.facts.possession?.[0]?.value ?? d.possessionDate, currency: d.currency, priceNote: c.priceNote ?? d.priceNote,
        description: [`CHANGES FOUND ON RE-CHECK:\n${changes.join("\n")}`, d.description].filter(Boolean).join("\n\n"),
        facts: c.facts as Prisma.InputJsonValue, checks: c.checks as Prisma.InputJsonValue, confidence: c.confidence,
        recheckOfPropertyId: d.propertyId, lastCheckedAt: new Date(), checklist: CHECKLIST_ITEMS.map(() => false),
      } });
      stats.recheckChanged = (stats.recheckChanged ?? 0) + 1;
    } catch (e) {
      stats.recheckErrors = (stats.recheckErrors ?? 0) + 1;
      console.error("[recheck]", d.projectName, e instanceof Error ? e.message : e);
    }
  }
  return stats;
}
