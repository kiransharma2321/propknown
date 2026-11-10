import { NextRequest, NextResponse } from "next/server";
import { FEATURES } from "@/lib/features";
import { scoreFor } from "@/lib/investmentScoreData";

// M4: Investment Score for an area (or a project in it), from cached data only.
// GET /api/investment-score?location=Kokapet, Hyderabad&type=apartment[&project=Name]
export async function GET(req: NextRequest) {
  if (!FEATURES.investmentScore) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const q = req.nextUrl.searchParams;
  const location = (q.get("location") ?? "").trim().slice(0, 120);
  if (!location) return NextResponse.json({ error: "location required" }, { status: 400 });
  const type = (q.get("type") ?? "apartment").toLowerCase().slice(0, 30);
  const project = (q.get("project") ?? "").trim().slice(0, 100) || null;
  const r = await scoreFor(location, type, project);
  return NextResponse.json(r);
}
