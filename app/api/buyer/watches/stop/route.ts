import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SITE_URL } from "@/lib/site";
import { verifyStopToken } from "@/lib/priceWatch";

// One-click "stop alerts for this item" from a price-watch email (signed, no login needed).
// Deliberately not behind the feature flag: links already emailed must keep working.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("w") ?? "";
  const t = req.nextUrl.searchParams.get("t") ?? "";
  if (!id || !verifyStopToken(id, t)) return NextResponse.json({ error: "Invalid link" }, { status: 403 });
  await prisma.priceWatch.updateMany({ where: { id }, data: { active: false } });
  return NextResponse.redirect(`${SITE_URL}/account?watch=stopped`, 303);
}
