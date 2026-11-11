import { prisma } from "@/lib/db";
import { CHECKLIST_ITEMS } from "@/lib/listings/checklist";
import type { ProjectResult } from "@/lib/projects";

// Auto Project Finder (allowed source): PropKnown's own sourced project checks become drafts in
// the Approval Queue. The RERA portals themselves can't be fetched (CAPTCHA / terms), so every
// fact here is exactly what a cited website stated -- no AI call, nothing guessed. No price is
// set on the draft (the checks hold per-sq.ft asking rates, not a unit's total price); the rates
// and their sources go in the description for the reviewer.

const STATE: [RegExp, string][] = [
  [/hyderabad|telangana/i, "Telangana"], [/bangalore|bengaluru/i, "Karnataka"], [/mumbai|pune|thane/i, "Maharashtra"],
  [/chennai/i, "Tamil Nadu"], [/gurugram|gurgaon/i, "Haryana"], [/dubai|abu dhabi/i, "UAE"],
];

export function draftFromCheck(p: ProjectResult) {
  if (!p.found || !p.price?.sources.length) return null;
  const [location, city] = (p.query.area ?? "").split(",").map((x) => x.trim());
  const hosts = Array.from(new Set(p.price.sources.map((s) => s.host)));
  const sym = p.price.currency === "INR" ? "₹" : `${p.price.currency} `;
  const basis = p.price.basis === "builder" ? "builder asking price" : p.price.basis === "resale" ? "resale listings" : "listing asking prices";
  const rera = p.facts.reraNumber;
  const reraHost = rera ? (() => { try { return new URL(rera.sourceUrl).hostname.replace(/^www\./, ""); } catch { return "a source"; } })() : null;
  return {
    origin: "project_check", sourceName: `PropKnown project check (${hosts.length} website${hosts.length === 1 ? "" : "s"})`, sourceUrl: p.price.sources[0].url,
    fetchedAt: new Date(p.price.capturedAt), projectName: p.name, builder: p.facts.builder?.value ?? null,
    location: location || null, city: city || null, state: STATE.find(([re]) => re.test(p.query.area ?? ""))?.[1] ?? null,
    propertyType: "apartment", projectStatus: p.facts.status?.value ?? null, possessionDate: p.facts.possession?.value ?? null,
    reraNumber: rera?.value.trim().toUpperCase() || null, currency: p.price.currency, price: null,
    description: [
      `Asking rates found: ${sym}${p.price.min.toLocaleString("en-IN")}–${sym}${p.price.max.toLocaleString("en-IN")}/${p.price.unit} (${basis}) from ${hosts.join(", ")}, captured ${new Date(p.price.capturedAt).toLocaleDateString("en-IN")}.`,
      rera ? `RERA number as stated by ${reraHost}: ${rera.value}. Verify it on the RERA portal before approving.` : "No RERA number found in the sources. Approval details pending.",
      "Sources: " + p.price.sources.map((s) => s.url).join(" , "),
    ].join("\n\n"),
    checklist: CHECKLIST_ITEMS.map(() => false),
  };
}

// One draft per project: the same name + builder is the same project (a missing builder matches
// any). A check that places it somewhere else is not a new draft -- that location and its sources
// are added to the existing draft so the reviewer sees every location the websites gave.
const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export function sameProject(a: { projectName: string; builder?: string | null }, b: { projectName: string; builder?: string | null }) {
  return norm(a.projectName) === norm(b.projectName) && (!a.builder || !b.builder || norm(a.builder) === norm(b.builder));
}

export async function draftsFromProjectChecks(): Promise<{ created: string[]; merged: string[]; skipped: number }> {
  const rows = await prisma.locationMarketCache.findMany({ where: { locationKey: { startsWith: "project/" } }, select: { data: true } });
  const existing = await prisma.listingDraft.findMany({ where: { reviewStatus: { not: "rejected" } }, select: { id: true, projectName: true, builder: true, location: true, city: true, reraNumber: true, description: true } });
  const created: string[] = [], merged: string[] = [];
  let skipped = 0;
  for (const r of rows) {
    const d = draftFromCheck(r.data as unknown as ProjectResult);
    if (!d) { skipped++; continue; }
    const match = existing.find((e) => sameProject(e, d) || (d.reraNumber && e.reraNumber === d.reraNumber));
    if (match) {
      const where = [d.location, d.city].filter(Boolean).join(", ");
      const known = [match.location, match.city].filter(Boolean).join(", ");
      if (where && norm(where) !== norm(known) && !(match.description ?? "").includes(`location "${where}"`)) {
        const note = `Another check gave the location "${where}" (${d.sourceName}): ${d.sourceUrl}. Confirm the correct location before approving.`;
        match.description = [match.description, note].filter(Boolean).join("\n\n");
        await prisma.listingDraft.update({ where: { id: match.id }, data: { description: match.description } });
        merged.push(`${d.projectName}: added location ${where} to the existing draft`);
      } else skipped++;
      continue;
    }
    const row = await prisma.listingDraft.create({ data: d });
    existing.push({ id: row.id, projectName: d.projectName, builder: d.builder, location: d.location, city: d.city, reraNumber: d.reraNumber, description: d.description });
    created.push(`${d.projectName} (${d.location}, ${d.city})${d.reraNumber ? ` RERA ${d.reraNumber}` : ""}`);
  }
  return { created, merged, skipped };
}
