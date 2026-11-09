import { NextRequest, NextResponse } from "next/server";
import { findCity, findLocality, localityPath, cityPath } from "@/lib/localities";

// There are no /prices pages -- the area price pages live under /ai-intelligence. Old /prices
// links (already-sent emails, anything indexed) get a permanent 301 to the matching page:
//   /prices                 -> /ai-intelligence
//   /prices/[city]          -> /ai-intelligence?city=City
//   /prices/[city]/[area]   -> /ai-intelligence/[city]/[area], or the pre-filled tool
function target(slug: string[] = []): string {
  const [citySlug, areaSlug] = slug;
  if (citySlug && areaSlug) {
    const loc = findLocality(citySlug, areaSlug);
    if (loc) return localityPath(loc);
  }
  if (citySlug) {
    const city = findCity(citySlug);
    if (city) return cityPath(city);
  }
  return "/ai-intelligence";
}

export function GET(req: NextRequest, { params }: { params: { slug?: string[] } }) {
  return NextResponse.redirect(new URL(target(params.slug), req.url), 301);
}
