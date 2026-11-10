import { NextRequest, NextResponse } from "next/server";
import { FEATURES } from "@/lib/features";
import { MAX_COMPARE, compareItems, parseItem, type CompareItem } from "@/lib/compare";

// M3: compare up to 4 items (cache-only; never a paid lookup). Body: { items: ["area|Kokapet, Hyderabad|apartment", ...] }
export async function POST(req: NextRequest) {
  if (!FEATURES.compare) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { items } = (await req.json().catch(() => ({}))) as { items?: unknown };
  if (!Array.isArray(items)) return NextResponse.json({ error: "items required" }, { status: 400 });
  const parsed = items.slice(0, MAX_COMPARE).map((x) => (typeof x === "string" ? parseItem(x) : null)).filter((x): x is CompareItem => !!x);
  if (!parsed.length) return NextResponse.json({ error: "Add at least one area, project or listing." }, { status: 400 });
  return NextResponse.json({ results: await compareItems(parsed) });
}
