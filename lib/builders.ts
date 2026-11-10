import { prisma } from "@/lib/db";
import type { ProjectResult } from "@/lib/projects";

// M8: builder profiles, built ONLY from our sourced project checks (each fact links to the
// page it came from). No ratings, reviews or claims are invented.
//
// Builder Trust Score: method defined here, but it is NOT shown publicly until a legal /
// defamation review (feature flag builderTrustScore stays OFF). It also refuses to score a
// builder without enough verified factors -- which today is every builder, because delivery
// record, RERA complaints and litigation need verified data we don't hold yet.

export interface BuilderProject { name: string; area: string; status: string | null; possession: string | null; rera: string | null; priceMin: number | null; priceMax: number | null; sourceUrl: string; checkedAt: string }
export interface BuilderProfile { slug: string; name: string; projects: BuilderProject[] }

export const builderSlug = (name: string) => name.toLowerCase()
  .replace(/\b(pvt|private|ltd|limited|llp|infra|projects|developers|constructions|group|realty|homes)\b\.?/g, " ")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

// Pure: group project checks by builder (exported for tests).
export function groupBuilders(rows: { data: unknown; fetchedAt: Date }[]): BuilderProfile[] {
  const map = new Map<string, BuilderProfile>();
  for (const r of rows) {
    const p = r.data as ProjectResult | null;
    const b = p?.facts?.builder;
    if (!p?.found || !b?.value) continue;
    const slug = builderSlug(b.value);
    if (!slug) continue;
    const prof = map.get(slug) ?? { slug, name: b.value, projects: [] };
    if (b.value.length > prof.name.length) prof.name = b.value; // keep the fullest spelling
    // Same project if the name matches, or the same RERA number (spelling variants: Kousalya / Kowsalya).
    const rera = p.facts.reraNumber?.value ?? null;
    if (!prof.projects.some((x) => x.name.toLowerCase() === p.name.toLowerCase() || (rera && x.rera === rera))) {
      prof.projects.push({
        name: p.name, area: p.facts.location?.value ?? p.query.area, status: p.facts.status?.value ?? null, possession: p.facts.possession?.value ?? null,
        rera: p.facts.reraNumber?.value ?? null, priceMin: p.price?.min ?? null, priceMax: p.price?.max ?? null,
        sourceUrl: b.sourceUrl, checkedAt: r.fetchedAt.toISOString(),
      });
    }
    map.set(slug, prof);
  }
  return Array.from(map.values()).sort((a, b) => b.projects.length - a.projects.length || a.name.localeCompare(b.name));
}

export async function loadBuilders(): Promise<BuilderProfile[]> {
  const rows = await prisma.locationMarketCache.findMany({ where: { locationKey: { startsWith: "project/" } }, select: { data: true, fetchedAt: true } }).catch(() => []);
  return groupBuilders(rows);
}

// ---- Trust Score (NOT public until legal review) ----
export const TRUST_MIN_FACTORS = 3;
export const TRUST_FACTORS = {
  reraDisclosure: { label: "RERA numbers disclosed", weight: 25, how: "Share of the builder's checked projects whose RERA number appears in a source." },
  delivery: { label: "On-time delivery", weight: 35, how: "Projects handed over by the RERA-registered completion date. Needs verified completion data (not held yet)." },
  complaints: { label: "RERA complaints", weight: 25, how: "Upheld RERA complaints per project. Needs data from the RERA authority (not held yet)." },
  litigation: { label: "Litigation", weight: 15, how: "Pending court cases about the builder's projects. Needs verified legal data (not held yet)." },
} as const;

export function trustScore(p: BuilderProfile): { score: number | null; basedOn: string; factors: { key: string; label: string; points: number | null; note: string }[] } {
  const n = p.projects.length;
  const disclosed = p.projects.filter((x) => x.rera).length;
  const factors = [
    { key: "reraDisclosure", label: TRUST_FACTORS.reraDisclosure.label, points: n ? Math.round((disclosed / n) * 100) : null, note: n ? `${disclosed} of ${n} checked projects` : "No projects checked" },
    { key: "delivery", label: TRUST_FACTORS.delivery.label, points: null, note: "No verified data" },
    { key: "complaints", label: TRUST_FACTORS.complaints.label, points: null, note: "No verified data" },
    { key: "litigation", label: TRUST_FACTORS.litigation.label, points: null, note: "No verified data" },
  ];
  const have = factors.filter((f) => f.points != null);
  if (have.length < TRUST_MIN_FACTORS) return { score: null, basedOn: `Not enough verified data (${have.length} of 4 factors).`, factors };
  const w = (k: string) => TRUST_FACTORS[k as keyof typeof TRUST_FACTORS].weight;
  const total = have.reduce((a, f) => a + w(f.key), 0);
  return { score: Math.round(have.reduce((a, f) => a + (f.points as number) * w(f.key), 0) / total), basedOn: `Based on ${have.length} of 4 factors`, factors };
}
