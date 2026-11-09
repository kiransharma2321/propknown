import { COMPANY } from "@/lib/utils";

// Every WhatsApp button on the site goes through here so the message is always pre-filled
// with what the visitor was actually doing ("Hi, I checked Kokapet apartment prices on
// PropKnown.") instead of a blank chat.
export function waLink(text: string, number: string = COMPANY.whatsapp): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export interface SearchContext { tool: string; location: string; propertyType?: string }

const TOOL_VERB: Record<string, string> = {
  price_check: "checked",
  ai_intel: "looked up AI market intelligence for",
  legal_shield: "ran a fraud/RERA check on",
  seo_page: "was viewing",
};

const TYPE_WORD: Record<string, string> = {
  apartment: "apartment", villa: "villa", house: "independent house", plot: "plot",
  commercial: "commercial", agriculture: "farm land",
};

export function searchContextText(ctx: SearchContext): string {
  const type = ctx.propertyType ? `${TYPE_WORD[ctx.propertyType] ?? ctx.propertyType} ` : "";
  const verb = TOOL_VERB[ctx.tool] ?? "checked";
  if (ctx.tool === "legal_shield") return `Hi, I ${verb} a ${type}listing in ${ctx.location} on PropKnown.`;
  return `Hi, I ${verb} ${ctx.location} ${type}prices on PropKnown.`;
}

// Last AI search, remembered for the session so the floating WhatsApp button can reference it.
const KEY = "pk:lastSearch";
export const SEARCH_EVENT = "pk:search";
export function rememberSearch(ctx: SearchContext) {
  try { sessionStorage.setItem(KEY, JSON.stringify(ctx)); } catch { /* storage unavailable */ }
  try { window.dispatchEvent(new CustomEvent(SEARCH_EVENT)); } catch { /* SSR */ }
}
export function lastSearch(): SearchContext | null {
  try { const v = sessionStorage.getItem(KEY); return v ? JSON.parse(v) as SearchContext : null; } catch { return null; }
}
