import { prisma } from "@/lib/db";

// Official government guidance value for a locality (Telangana IGRS first), from the
// hand-entered guidance_rates table. Returns null when no row exists -- the UI then says
// "not available for this area yet" rather than estimating one.

export interface GuidanceValue {
  ratePerUnit: number;      // in the unit requested by the caller
  unit: string;
  currency: string;
  locality: string;
  state: string;
  sourceName: string;
  sourceUrl: string | null;
  effectiveDate: string;    // ISO date the published rate took effect
}

const UNIT_SQFT: Record<string, number> = { sqft: 1, sqyard: 9, sqm: 10.764, acres: 43560, acre: 43560 };

export async function getGuidanceValue(locationKey: string | undefined, propertyType: string, outUnit: string): Promise<GuidanceValue | null> {
  if (!locationKey) return null;
  try {
    const row = await prisma.guidanceRate.findFirst({
      where: { localityKey: locationKey, propertyType },
      orderBy: { effectiveDate: "desc" },
    });
    if (!row) return null;
    const from = UNIT_SQFT[row.unit], to = UNIT_SQFT[outUnit];
    const rate = from && to ? Math.round(row.ratePerUnit * (to / from)) : row.ratePerUnit;
    return {
      ratePerUnit: rate, unit: from && to ? outUnit : row.unit, currency: row.currency,
      locality: row.locality, state: row.state, sourceName: row.sourceName, sourceUrl: row.sourceUrl,
      effectiveDate: row.effectiveDate.toISOString().slice(0, 10),
    };
  } catch (e) {
    // Table not created yet, or DB hiccup: the AI estimate still shows, just without this line.
    console.warn("[engine] guidance value lookup failed:", e instanceof Error ? e.message : e);
    return null;
  }
}
