import { NextRequest, NextResponse } from "next/server";
import { getUsageStatus, checkAndConsume } from "@/lib/usageLimit";

// Reuses the exact same live pricing engine as AI Intelligence (/api/market-intel) rather
// than a second pricing implementation — this route only adds the "compare submitted price
// against the realistic range" verdict logic on top of that shared source of truth. If
// market-intel can't produce a live-grounded price for this area/type, this is honest about
// having no reliable comparison rather than guessing a verdict anyway.
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

  // Every call here is a deliberate, user-initiated check (unlike market-intel, which also
  // serves a passive background widget) -- always counts against the anonymous free-check
  // limit, but only on a confirmed genuine verdict, not an "insufficient data" attempt (see
  // below) -- gate check here is read-only.
  let usage = await getUsageStatus();
  if (!usage.allowed) {
    return NextResponse.json({ error: "usage_limit", ...usage }, { status: 403 });
  }

  // Attaches the honest "X of 3 free checks used" status to whatever this returns.
  const respond = (body: Record<string, unknown>) => NextResponse.json({ ...body, usage });

  const resolvedUnit = unit ?? "sqft";
  const resolvedType = propertyType ?? "apartment";
  const pricePerUnit = price / areaSize;

  const marketRes = await fetch(`${req.nextUrl.origin}/api/market-intel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ location: location.trim(), propertyType: resolvedType, unit: resolvedUnit }),
  });
  const market = await marketRes.json();

  if (!market.available) {
    return respond({
      available:   true,
      confident:   false,
      verdict:     "insufficient_data",
      pricePerUnit: Math.round(pricePerUnit),
      unit:        resolvedUnit,
      message:     `We don't have reliable live market data for ${location.trim()} right now, so we can't confidently assess this price. Please try again in a moment, or WhatsApp Raghu on 97017 71333 for a manual opinion.`,
    });
  }

  const { currentPricePerSqft, priceRangeMin, priceRangeMax, currencySymbol, locationName, dataSourceLabel } = market;
  const min = priceRangeMin ?? Math.round(currentPricePerSqft * 0.85);
  const max = priceRangeMax ?? Math.round(currentPricePerSqft * 1.25);

  let verdict: "fair" | "overpriced" | "underpriced";
  let message: string;
  if (pricePerUnit > max) {
    const pct = Math.round(((pricePerUnit - currentPricePerSqft) / currentPricePerSqft) * 100);
    verdict = "overpriced";
    message = `This works out to ${currencySymbol}${Math.round(pricePerUnit).toLocaleString()}/${resolvedUnit}, which is about ${pct}% above the current realistic rate for ${locationName} (${currencySymbol}${min.toLocaleString()}–${currencySymbol}${max.toLocaleString()}/${resolvedUnit}). Worth negotiating or asking the seller to justify the premium.`;
  } else if (pricePerUnit < min) {
    const pct = Math.round(((currentPricePerSqft - pricePerUnit) / currentPricePerSqft) * 100);
    verdict = "underpriced";
    message = `This works out to ${currencySymbol}${Math.round(pricePerUnit).toLocaleString()}/${resolvedUnit}, which is about ${pct}% below the current realistic rate for ${locationName} (${currencySymbol}${min.toLocaleString()}–${currencySymbol}${max.toLocaleString()}/${resolvedUnit}). Could be a genuine good deal — but verify the listing, title, and legal status carefully before proceeding, since an unusually low price can also signal an issue.`;
  } else {
    verdict = "fair";
    message = `This works out to ${currencySymbol}${Math.round(pricePerUnit).toLocaleString()}/${resolvedUnit}, which sits within the current realistic range for ${locationName} (${currencySymbol}${min.toLocaleString()}–${currencySymbol}${max.toLocaleString()}/${resolvedUnit}).`;
  }

  // Only now, on a confirmed genuine verdict, actually consume one of the visitor's free
  // checks -- the "insufficient_data" branch above never reaches here.
  usage = await checkAndConsume();
  return respond({
    available:      true,
    confident:       true,
    verdict,
    pricePerUnit:    Math.round(pricePerUnit),
    unit:            resolvedUnit,
    realisticMin:    min,
    realisticMax:    max,
    currentPricePerSqft,
    currencySymbol,
    locationName,
    dataSourceLabel,
    message,
  });
}
