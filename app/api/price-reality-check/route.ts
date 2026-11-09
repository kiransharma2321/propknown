import { NextRequest, NextResponse } from "next/server";
import { getUsageStatus, checkAndConsume } from "@/lib/usageLimit";
import { getMarketPrice, INTERACTIVE_TIMEOUT_MS, UNAVAILABLE_MESSAGE } from "@/lib/engine";
import { priceVerdict } from "@/lib/engine/verdict";

// A Google-Search-grounded Gemini call takes ~20-30s; Vercel's default would cut it off.
export const maxDuration = 60;

// Same shared engine as every other AI feature -- this route only adds the verdict on top.
// If the engine can't produce a live-grounded price within its 10s deadline, the answer is an
// honest "live data unavailable", never a guessed verdict.
export async function POST(req: NextRequest) {
  const body = await req.json() as {
    price?: number; location?: string; areaSize?: number; unit?: string; propertyType?: string;
  };
  const { price, location, areaSize, unit, propertyType } = body;

  if (!price || price <= 0) {
    return NextResponse.json({ error: "A valid price is required" }, { status: 400 });
  }
  if (!location?.trim()) {
    return NextResponse.json({ error: "Location is required" }, { status: 400 });
  }
  if (!areaSize || areaSize <= 0) {
    return NextResponse.json({ error: "A valid area size is required" }, { status: 400 });
  }

  // Read-only gate check; a check is only consumed on a genuine verdict (see below).
  let usage = await getUsageStatus();
  if (!usage.allowed) {
    return NextResponse.json({ error: "usage_limit", ...usage }, { status: 403 });
  }
  const respond = (b: Record<string, unknown>) => NextResponse.json({ ...b, usage });

  const resolvedUnit = unit ?? "sqft";
  const resolvedType = propertyType ?? "apartment";
  const pricePerUnit = price / areaSize;

  const market = await getMarketPrice({ location: location.trim(), propertyType: resolvedType, unit: resolvedUnit, tool: "price_check", timeoutMs: INTERACTIVE_TIMEOUT_MS });

  if (!market.available) {
    return respond({
      available:    true,
      confident:    false,
      verdict:      "insufficient_data",
      pricePerUnit: Math.round(pricePerUnit),
      unit:         resolvedUnit,
      location:     location.trim(),
      propertyType: resolvedType,
      message:      `${UNAVAILABLE_MESSAGE} We won't guess a verdict for ${location.trim()} without real market data — or WhatsApp our team on 70130 16003 for a manual opinion.`,
    });
  }

  const { verdict, message, min, max } = priceVerdict(pricePerUnit, market);

  usage = await checkAndConsume();
  return respond({
    available:       true,
    confident:       true,
    verdict,
    pricePerUnit:    Math.round(pricePerUnit),
    unit:            resolvedUnit,
    realisticMin:    min,
    realisticMax:    max,
    currentPricePerSqft: market.currentPricePerSqft,
    currency:        market.currency,
    currencySymbol:  market.currencySymbol,
    locationName:    market.locationName,
    location:        location.trim(),
    propertyType:    resolvedType,
    dataSourceLabel: market.dataSourceLabel,
    fetchedAt:       market.fetchedAt,
    growthRate:      market.growthRate,
    rentalYield:     market.rentalYield,
    priceForecast5yr: market.priceForecast5yr,
    message,
  });
}
