import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession, canRole } from "@/lib/rbac";
import { computeMarketIntel } from "@/lib/marketIntel";
import { logAudit } from "@/lib/auditLog";

// Property Inventory AI scores (Section 5 / Q). Reuses the existing AI Intelligence engine
// (computeMarketIntel, the same function /api/market-intel and the hot-markets cron call
// directly) for price prediction, and calls the existing /api/legal-shield endpoint for the
// legal score -- no second, parallel pricing/legal system built. Writes into Property's
// existing aiScore field (previously unused) plus the new aiPricePrediction/legalScore/
// roiAnalysis fields. Manually triggered per property, same pattern as AI Lead Scoring.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session || !(await canRole(session.role, "properties"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const property = await prisma.property.findUnique({ where: { id: params.id } });
  if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

  const marketData = await computeMarketIntel(
    `${property.location}, ${property.city}`,
    property.propertyType,
    "sqft"
  ) as Record<string, unknown>;

  if (marketData.available === false) {
    return NextResponse.json({ error: "Live market data unavailable for this location right now — try again shortly." }, { status: 200 });
  }

  const origin = new URL(req.url).origin;
  let legalScore: number | null = null;
  let legalSummary: string | null = null;
  try {
    const legalRes = await fetch(`${origin}/api/legal-shield`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: `${property.location}, ${property.city}`, propertyType: property.propertyType,
        askingPrice: property.price, reraNumber: property.reraNumber ?? undefined,
      }),
    });
    if (legalRes.ok) {
      const legal = await legalRes.json() as { riskLevel: "Low" | "Medium" | "High"; summary: string };
      legalScore = legal.riskLevel === "Low" ? 85 : legal.riskLevel === "Medium" ? 55 : 25;
      legalSummary = legal.summary;
    }
  } catch { /* legal score stays null if the call fails -- honest, not fabricated */ }

  const currentPricePerSqft = marketData.currentPricePerSqft as number | undefined;
  const growthRate = marketData.growthRate as number | undefined;
  const rentalYield = marketData.rentalYield as number | undefined;
  const investmentRating = marketData.investmentRating as number | undefined;

  const roiAnalysis = {
    currentPricePerSqft, growthRate, rentalYield,
    projectedValue5yr: currentPricePerSqft && growthRate ? Math.round(currentPricePerSqft * Math.pow(1 + growthRate / 100, 5)) : null,
    trend: marketData.trend,
  };

  // Prisma's Json input type rejects `undefined` values (only `null` is valid for "absent"),
  // so round-trip through JSON to strip any undefined fields before writing.
  const aiPricePrediction = JSON.parse(JSON.stringify({
    currentPricePerSqft: currentPricePerSqft ?? null,
    priceRangeMin: marketData.priceRangeMin ?? null,
    priceRangeMax: marketData.priceRangeMax ?? null,
    forecast5yr: marketData.priceForecast5yr ?? null,
  }));
  const roiAnalysisClean = JSON.parse(JSON.stringify(roiAnalysis));

  await prisma.property.update({
    where: { id: params.id },
    data: {
      aiScore: investmentRating ?? null,
      aiPricePrediction,
      legalScore,
      roiAnalysis: roiAnalysisClean,
      aiScoredAt: new Date(),
    },
  });

  logAudit({ actorId: session.userId, actorName: session.name, action: "property.ai_score", entity: "Property", entityId: params.id, details: { aiScore: investmentRating, legalScore } }).catch(() => null);
  return NextResponse.json({ ok: true, aiScore: investmentRating, roiAnalysis, legalScore, legalSummary, marketData });
}
