import { findAreaPage, getAreaPrices, type TypePrice } from "@/lib/areaPages";
import { checkProject, type ProjectResult } from "@/lib/projects";

// Real data for the design previews: cached area prices and one cached project check. Nothing
// here is invented; every figure carries its captured date, exactly as the live site shows it.

export interface PreviewArea { area: string; slug: string; price: TypePrice | null }
export interface PreviewData { areas: PreviewArea[]; project: ProjectResult | null }

const AREAS = ["kokapet", "gachibowli", "kondapur", "financial-district", "medchal", "hitec-city"];

export async function loadPreviewData(): Promise<PreviewData> {
  const areas = await Promise.all(AREAS.map(async (slug) => {
    const page = findAreaPage("hyderabad", slug);
    if (!page) return { area: slug, slug, price: null };
    const prices = await getAreaPrices(page).catch(() => []);
    return { area: page.area, slug, price: prices.find((p) => p.type === "apartment" && p.price) ?? null };
  }));
  const project = await checkProject({ name: "Prestige High Fields", area: "Financial District, Hyderabad", propertyType: "apartment" }).catch(() => null);
  return { areas, project };
}

export const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
