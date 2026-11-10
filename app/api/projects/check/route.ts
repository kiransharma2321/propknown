import { NextRequest, NextResponse } from "next/server";
import { checkProject } from "@/lib/projects";
import { logAiQuery } from "@/lib/engine";

export const maxDuration = 60;

// Project price check: project facts + current asking price from real dated sources, compared
// with the locality range, and optionally with the visitor's quoted price per sq.ft.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const name = String(body.name ?? "").trim();
  const area = String(body.area ?? "").trim();
  if (name.length < 2 || area.length < 2) return NextResponse.json({ error: "Enter the project name and its area." }, { status: 400 });
  const started = Date.now();
  const r = await checkProject({ name, area, propertyType: body.propertyType ? String(body.propertyType) : undefined });
  const quoted = Number(body.quotedPricePerSqft) || 0;
  const quote = quoted > 0 && r.price
    ? { pricePerSqft: quoted, pctVsProject: Math.round(((quoted - r.price.median) / r.price.median) * 1000) / 10 }
    : null;
  await logAiQuery({ tool: "price_check", location: `${name}, ${area}`, locationKey: `project`, propertyType: r.query.propertyType, result: r.found && r.price ? "ok" : "unavailable", pricePerUnit: r.price?.median ?? null, unit: "sqft", currency: r.price?.currency ?? null, cached: r.cached, durationMs: Date.now() - started });
  return NextResponse.json({ ...r, quote });
}
