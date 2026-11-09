import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { geminiJson } from "@/lib/ai/gemini";
import { getMarketPrice, INTERACTIVE_TIMEOUT_MS } from "@/lib/engine";
import { priceVerdict } from "@/lib/engine/verdict";
import { normaliseChecklist, CHECKLIST_ITEMS } from "@/lib/listings/checklist";

// AI-drafted listings for the Approval Queue. The AI only *extracts* what the given text says;
// anything the text doesn't state stays empty. A price is kept only when the text states it,
// and is then tied to that text's source link and capture date.

export type DraftOrigin = "quick_add_text" | "quick_add_url" | "rera_feed";

export class DraftError extends Error {}

interface Extracted {
  projectName?: string | null; builder?: string | null; location?: string | null; city?: string | null;
  state?: string | null; propertyType?: string | null; configuration?: string | null; sizeText?: string | null;
  sizeSqft?: number | null; projectStatus?: string | null; possessionDate?: string | null; reraNumber?: string | null;
  totalPrice?: number | null; currency?: string | null; priceQuote?: string | null; description?: string | null;
}

const TYPES = ["apartment", "villa", "house", "plot", "commercial", "agriculture"];

// Server-side fetch of a page the admin pasted. Public http(s) only -- no localhost/private
// addresses -- with a size cap; returns readable text with tags stripped.
export async function fetchPageText(url: string): Promise<string> {
  let u: URL;
  try { u = new URL(url); } catch { throw new DraftError("That isn't a valid link."); }
  if (!/^https?:$/.test(u.protocol)) throw new DraftError("Only http(s) links can be read.");
  if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[?::1\]?$|169\.254\.)/i.test(u.hostname) || u.hostname.endsWith(".local")) {
    throw new DraftError("That address can't be read.");
  }
  const res = await fetch(u, { headers: { "User-Agent": "PropKnownBot/1.0 (+https://www.propknown.com)" }, signal: AbortSignal.timeout(15_000), redirect: "follow" })
    .catch(() => { throw new DraftError("Couldn't reach that page."); });
  if (!res.ok) throw new DraftError(`That page answered ${res.status}.`);
  const type = res.headers.get("content-type") ?? "";
  if (!/text\/html|text\/plain/.test(type)) throw new DraftError("Only web pages can be read (for a PDF brochure, paste its text).");
  const html = (await res.text()).slice(0, 600_000);
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#8377;|&#x20b9;/gi, "₹")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 20_000);
}

function prompt(text: string): string {
  return `Extract real-estate project/listing facts from the text below. Return ONLY JSON with these keys:
projectName, builder, location (locality), city, state, propertyType (one of ${TYPES.join(", ")}), configuration (e.g. "2 & 3 BHK"),
sizeText (as written, e.g. "1,250 - 1,890 sq.ft"), sizeSqft (one representative carpet/saleable area in sq.ft as a number, or null),
projectStatus (e.g. "under construction", "ready to move", "new launch"), possessionDate (as written), reraNumber,
totalPrice (number in full units, e.g. 12500000 for 1.25 Cr, or null), currency (INR/AED/USD), priceQuote (the exact words the price came from, or null),
description (2-3 neutral sentences using only facts in the text; no marketing superlatives).

RULES: Use ONLY what the text states. If a fact is not in the text, use null -- never guess, never use outside knowledge.
totalPrice must be null unless the text states a price for this property. "Starting from" prices are allowed only with priceQuote showing those words.

TEXT:
"""${text.slice(0, 15_000)}"""`;
}

export async function createDraft(rawText: string, opts: { origin: DraftOrigin; sourceUrl?: string | null; sourceName?: string | null }) {
  const text = rawText.trim();
  if (text.length < 40) throw new DraftError("Paste more of the brochure or listing text (at least a couple of sentences).");
  const x = await geminiJson<Extracted>(prompt(text), { timeoutMs: 40_000 }).catch((e) => {
    throw new DraftError(`AI couldn't read that text right now (${e instanceof Error ? e.message : "error"}). Try again shortly.`);
  });

  const reraNumber = x.reraNumber?.trim().toUpperCase() || null;
  if (reraNumber) {
    const existing = await prisma.listingDraft.findUnique({ where: { reraNumber } });
    if (existing) return { draft: existing, duplicate: true };
  }

  const now = new Date();
  const hasPrice = typeof x.totalPrice === "number" && x.totalPrice > 0 && !!x.priceQuote;
  const draft = await prisma.listingDraft.create({
    data: {
      origin: opts.origin, sourceName: opts.sourceName ?? null, sourceUrl: opts.sourceUrl ?? null, fetchedAt: now,
      rawText: text.slice(0, 50_000), reraNumber,
      projectName: x.projectName?.trim() || "Untitled project (edit me)",
      builder: x.builder ?? null, location: x.location ?? null, city: x.city ?? null, state: x.state ?? null,
      propertyType: x.propertyType && TYPES.includes(x.propertyType) ? x.propertyType : "apartment",
      configuration: x.configuration ?? null, sizeText: x.sizeText ?? null,
      sizeSqft: typeof x.sizeSqft === "number" && x.sizeSqft > 0 ? x.sizeSqft : null,
      projectStatus: x.projectStatus ?? null, possessionDate: x.possessionDate ?? null,
      price: hasPrice ? x.totalPrice! : null, currency: x.currency || "INR",
      priceSourceUrl: hasPrice ? (opts.sourceUrl ?? null) : null, priceSourceDate: hasPrice ? now : null,
      description: [x.description, hasPrice ? `Price as stated in the source: "${x.priceQuote}".` : null].filter(Boolean).join("\n\n") || null,
      checklist: CHECKLIST_ITEMS.map(() => false),
    },
  });
  await runPriceCheck(draft.id).catch(() => null);
  return { draft: await prisma.listingDraft.findUniqueOrThrow({ where: { id: draft.id } }), duplicate: false };
}

// AI price check: the stated price per sq.ft against the engine's area price. Skipped (with a
// reason) when the draft has no stated price, size or location -- never estimated.
export async function runPriceCheck(id: string) {
  const d = await prisma.listingDraft.findUniqueOrThrow({ where: { id } });
  let check: Record<string, unknown>;
  if (!d.price || !d.sizeSqft || !(d.location || d.city)) {
    check = { status: "skipped", reason: "Needs a stated price, a size and a location to compare.", checkedAt: new Date().toISOString() };
  } else {
    const location = [d.location, d.city].filter(Boolean).join(", ");
    const market = await getMarketPrice({ location, propertyType: d.propertyType, unit: "sqft", tool: "listing_check", timeoutMs: INTERACTIVE_TIMEOUT_MS });
    const perSqft = d.price / d.sizeSqft;
    if (!market.available) {
      check = { status: "no_data", reason: "No market data for this area yet.", perSqft: Math.round(perSqft), checkedAt: new Date().toISOString() };
    } else {
      const v = priceVerdict(perSqft, market);
      check = {
        status: "done", verdict: v.verdict, message: v.message, perSqft: Math.round(perSqft),
        marketPerSqft: market.currentPricePerSqft, range: [v.min, v.max], marketFetchedAt: market.fetchedAt,
        confidence: market.confidence ?? null, checkedAt: new Date().toISOString(),
      };
    }
  }
  return prisma.listingDraft.update({ where: { id }, data: { aiPriceCheck: check as Prisma.InputJsonValue } });
}

// Approve: only with all 10 checklist items ticked. Creates the public Property (approved +
// verified) so it shows on /buy with the Verified badge.
export async function approveDraft(id: string, reviewer: string) {
  const d = await prisma.listingDraft.findUniqueOrThrow({ where: { id } });
  if (d.reviewStatus !== "draft") throw new DraftError("This draft was already reviewed.");
  if (!normaliseChecklist(d.checklist).every(Boolean)) throw new DraftError("Tick all 10 checklist items before approving.");
  if (!d.location && !d.city) throw new DraftError("Add a location before approving.");

  const property = await prisma.property.create({
    data: {
      title: [d.projectName, d.configuration].filter(Boolean).join(" — "),
      description: d.description, location: d.location ?? d.city ?? "", city: d.city ?? "", state: d.state ?? "",
      price: d.price ?? 0, currency: d.currency, sqft: d.sizeSqft, propertyType: d.propertyType, listingType: "sale",
      reraNumber: d.reraNumber, images: [], amenities: [], status: "approved",
      verified: true, reraVerified: !!d.reraNumber, accuratePrice: !!d.price, ownerConsent: true,
      expectedCompletion: d.possessionDate,
      verificationFlags: {
        propknownVerified: true, titleVerified: true,
        ...(d.reraNumber ? { reraVerified: true, reraNumber: d.reraNumber } : {}),
      },
    },
  });
  await prisma.listingDraft.update({
    where: { id },
    data: { reviewStatus: "approved", reviewedBy: reviewer, reviewedAt: new Date(), propertyId: property.id },
  });
  return property;
}

export async function rejectDraft(id: string, reviewer: string, reason: string) {
  if (!reason.trim()) throw new DraftError("Give a reason for rejecting.");
  return prisma.listingDraft.update({
    where: { id },
    data: { reviewStatus: "rejected", rejectReason: reason.trim().slice(0, 500), reviewedBy: reviewer, reviewedAt: new Date() },
  });
}
