import { NextRequest, NextResponse } from "next/server";
import { getMarketPrice, remaining, ENGINE_TIMEOUT_MS, UNAVAILABLE_MESSAGE } from "@/lib/engine";
import { reraGuidance, type ReraGuidance } from "@/lib/engine/rera";

// Same model as AI Intelligence — kept independent of jarvis's flash-lite so a spike in chat
// traffic can't starve this feature's quota, and vice versa.
const GEMINI_MODEL = "gemini-2.5-flash";

type RiskLevel = "Low" | "Medium" | "High";

interface RedFlagResult {
  riskLevel: RiskLevel;
  areaAvgPrice: number | null;
  areaAvgUnit: string | null;
  areaAvgCurrency: string | null;
  areaAvgSymbol: string | null;
  priceComparisonNote: string;
  rera: ReraGuidance;
  aiAnalysis: "ok" | "unavailable";
  aiNote?: string;
  redFlags: { flag: string; explanation: string }[];
  whatToVerifyNext: string[];
  educationalNote: string;
  summary: string;
}

interface ShieldRequest {
  location?: string;
  propertyType?: string;
  unit?: string;
  askingPrice?: number;
  reraNumber?: string;
  listingSource?: string;
  sellerClaims?: string;
}

// ── Rule-based heuristics (always run, regardless of whether Gemini succeeds) ──────────────

const PRESSURE_WORDS = [
  "hurry", "urgent", "today only", "last chance", "book now", "limited time",
  "only one left", "act fast", "immediate decision", "expires today", "cash only", "no documentation",
];

function detectHeuristicFlags(body: ShieldRequest, areaAvg: number | null): { flag: string; explanation: string }[] {
  const flags: { flag: string; explanation: string }[] = [];

  if (areaAvg && body.askingPrice && body.askingPrice < areaAvg * 0.6) {
    flags.push({
      flag: "Price far below area average",
      explanation: `This asking price is well under 60% of the typical rate for this area/type. Unusually cheap listings are a classic bait tactic — or can signal a title/legal problem the seller wants to offload quickly.`,
    });
  }

  const rera = reraGuidance({ location: body.location, reraNumber: body.reraNumber });
  const isUae = rera.jurisdiction.startsWith("Dubai");
  if (rera.format === "missing") {
    flags.push({ flag: isUae ? "No DLD permit number provided" : "No RERA number provided", explanation: rera.formatNote });
  } else if (rera.format === "unusual_format") {
    flags.push({ flag: isUae ? "Permit number format looks unusual" : "RERA number format looks unusual", explanation: rera.formatNote });
  }

  const claims = (body.sellerClaims ?? "").toLowerCase();
  if (PRESSURE_WORDS.some(w => claims.includes(w))) {
    flags.push({
      flag: "Urgency / pressure language",
      explanation: "Phrases pushing you to decide immediately are a common scam pattern — legitimate sellers rarely need to rush a buyer into skipping due diligence.",
    });
  }
  if (claims.includes("cash") && (claims.includes("only") || claims.includes("no bank") || claims.includes("no loan"))) {
    flags.push({
      flag: "Cash-only demand",
      explanation: "Insisting on cash and refusing bank transfer or a home loan route is a red flag — it avoids paper trails and blocks the due diligence a bank would normally require before disbursing a loan.",
    });
  }
  const sourceLower = (body.listingSource ?? "").toLowerCase();
  if (sourceLower.includes("unverified") || sourceLower.includes("social media") || sourceLower.includes("whatsapp forward")) {
    flags.push({
      flag: "Unverifiable listing source",
      explanation: "Listings sourced from forwarded messages or unknown social pages can't be traced back to an accountable party — always confirm the seller's identity and ownership independently.",
    });
  }

  return flags;
}

function riskLevelFromFlagCount(n: number): RiskLevel {
  if (n >= 3) return "High";
  if (n >= 1) return "Medium";
  return "Low";
}

const DISCLAIMER = "This is an educational red-flag check, not legal advice; always verify with professionals and PropKnown.";

interface AreaAvg { price: number | null; unit: string | null; currency: string | null; symbol: string | null }

// Rule-based result: real checks on what the buyer entered, no invented figures. Used on its own
// when the Gemini narrative is unavailable -- clearly labelled as such via aiAnalysis.
function fallbackResult(body: ShieldRequest, avg: AreaAvg, aiNote?: string): RedFlagResult {
  const flags = detectHeuristicFlags(body, avg.price);
  const risk = riskLevelFromFlagCount(flags.length);
  const rera = reraGuidance({ location: body.location, reraNumber: body.reraNumber });
  return {
    riskLevel: risk,
    areaAvgPrice: avg.price,
    areaAvgUnit: avg.unit,
    areaAvgCurrency: avg.currency,
    areaAvgSymbol: avg.symbol,
    rera,
    aiAnalysis: aiNote ? "unavailable" : "ok",
    aiNote,
    priceComparisonNote: avg.price && body.askingPrice
      ? `Asking price is ${Math.round((body.askingPrice / avg.price) * 100)}% of the area average.`
      : `Area average: ${UNAVAILABLE_MESSAGE}`,
    redFlags: flags,
    whatToVerifyNext: [
      ...rera.steps.slice(0, 1),
      rera.jurisdiction.startsWith("Dubai")
        ? "Request the title deed (or Oqood for off-plan) and confirm the seller's identity matches DLD records before paying anything."
        : "Request the original sale deed, encumbrance certificate (EC), and property tax receipts before paying anything.",
      "Meet the seller in person (or via verified video call) and confirm their identity matches the ownership documents.",
      "Never pay a booking amount or advance before a lawyer or PropKnown has reviewed the title chain.",
    ],
    educationalNote: "Common Indian real estate scams include: selling the same plot to multiple buyers, forged or photocopied documents, impersonating the real owner, fake RERA numbers, and pressuring buyers into cash deals to avoid a paper trail. A few hours of due diligence can save you from a dispute that takes years to resolve in court.",
    summary: `Based on the details provided, this listing shows ${flags.length} potential red flag${flags.length === 1 ? "" : "s"}. ${DISCLAIMER}`,
  };
}

// ── Gemini-enhanced analysis (adds plain-language framing on top of the heuristic flags) ──

async function fetchAreaAverage(location: string, propertyType: string, unit: string, timeoutMs: number): Promise<AreaAvg> {
  const m = await getMarketPrice({ location, propertyType, unit, tool: "legal_shield", timeoutMs });
  if (!m.available) return { price: null, unit: null, currency: null, symbol: null };
  return {
    price: Number(m.currentPricePerSqft) || null,
    unit: (m.pricePerSqftUnit as string) ?? null,
    currency: (m.currency as string) ?? null,
    symbol: (m.currencySymbol as string) ?? null,
  };
}

function parseGeminiJson(text: string): Record<string, unknown> | null {
  const t = text.trim();
  try {
    if (t.startsWith("{")) return JSON.parse(t);
    const fenced = t.match(/```(?:json)?\s*([\s\S]+?)```/);
    if (fenced) return JSON.parse(fenced[1].trim());
    const obj = t.match(/(\{[\s\S]+\})/);
    if (obj) return JSON.parse(obj[1]);
  } catch { /* fall through to null */ }
  return null;
}

async function callGeminiForRiskNarrative(
  apiKey: string,
  body: ShieldRequest,
  heuristicFlags: { flag: string; explanation: string }[],
  avg: AreaAvg,
  rera: ReraGuidance,
  timeoutMs: number
): Promise<Partial<RedFlagResult> | null> {
  const prompt = `You are KnownAI, PropKnown's real estate assistant, helping a buyer sanity-check a property listing for common real estate scam signals (Indian or UAE, depending on the location). Be honest, plain-language, and never give false legal certainty — this is educational guidance, not a legal verdict.

LISTING DETAILS PROVIDED BY BUYER:
- Location: ${body.location || "not provided"}
- Property type: ${body.propertyType || "not provided"}
- Asking price: ${body.askingPrice ?? "not provided"} ${avg.currency ?? ""} per ${body.unit ?? "sqft"}
- RERA number given: ${body.reraNumber || "none provided"}
- Listing source: ${body.listingSource || "not provided"}
- Seller claims / notes from buyer: ${body.sellerClaims || "none provided"}

REFERENCE DATA:
- Area average price for this location/type (PropKnown live engine): ${avg.price ? `${avg.currency} ${avg.price} per ${avg.unit}` : "not available — do NOT estimate or mention any area price"}
- Registration jurisdiction: ${rera.jurisdiction} (${rera.authority}); number format check: ${rera.format} — ${rera.formatNote}

ALREADY-DETECTED RULE-BASED FLAGS (do not contradict these, incorporate them):
${heuristicFlags.length ? heuristicFlags.map(f => `- ${f.flag}: ${f.explanation}`).join("\n") : "(none detected by rules)"}

Return ONLY a valid JSON object, no markdown/code fences:
{
  "riskLevel": "Low" | "Medium" | "High",
  "priceComparisonNote": "1 sentence comparing asking price to area average, or noting it wasn't available",
  "additionalRedFlags": ["any additional plain-language red flag phrases you notice beyond the rule-based ones, or empty array"],
  "whatToVerifyNext": ["3-5 concrete, specific next steps the buyer should take"],
  "educationalNote": "2-3 sentences educating on common Indian real estate scam patterns relevant to this case",
  "summary": "2-3 sentence honest overall summary of the risk level and why"
}

Never claim certainty about fraud — always frame as "signals to check", not accusations. If almost nothing looks wrong, say so honestly rather than inventing concerns. Never state any price or number that isn't given above.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } },
    }),
    signal: AbortSignal.timeout(Math.max(500, timeoutMs)),
  });

  const data = await res.json();
  if (!res.ok) {
    const quotaExceeded = res.status === 429 || data.error?.status === "RESOURCE_EXHAUSTED";
    throw new Error(quotaExceeded ? "quota" : (data.error?.message ?? `Gemini ${res.status}`));
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
  if (!text) return null;
  return parseGeminiJson(text) as Partial<RedFlagResult> | null;
}

export async function POST(req: NextRequest) {
  let body: ShieldRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.location?.trim()) {
    return NextResponse.json({ error: "Location is required" }, { status: 400 });
  }

  const propertyType = body.propertyType || "apartment";
  const unit = body.unit || "sqft";
  // One 10s budget for the whole check: up to ~5.5s for the area average (usually an instant
  // cache hit), the rest for the Gemini narrative. Whatever doesn't finish in time is reported
  // as unavailable -- the rule-based checks always come back.
  const deadlineAt = Date.now() + ENGINE_TIMEOUT_MS - 300;

  const avg = await fetchAreaAverage(body.location!.trim(), propertyType, unit, 5500);
  const heuristicFlags = detectHeuristicFlags(body, avg.price);
  const rera = reraGuidance({ location: body.location, reraNumber: body.reraNumber });
  const aiDown = "KnownAI's written analysis is unavailable right now — the rule-based checks below still ran. Try again in a moment for the full analysis.";

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "ADD-YOUR-GEMINI-KEY-HERE" || remaining(deadlineAt) < 1500) {
    return NextResponse.json(fallbackResult(body, avg, aiDown));
  }

  try {
    const aiResult = await callGeminiForRiskNarrative(apiKey, body, heuristicFlags, avg, rera, remaining(deadlineAt));
    if (!aiResult) {
      return NextResponse.json(fallbackResult(body, avg, aiDown));
    }

    const extra = (aiResult as Record<string, unknown>).additionalRedFlags;
    const additionalFlags = Array.isArray(extra) ? (extra as string[]).map(f => ({ flag: f, explanation: "" })) : [];

    const allFlags = [...heuristicFlags, ...additionalFlags];
    const riskLevel: RiskLevel = ["Low", "Medium", "High"].includes(aiResult.riskLevel as string)
      ? (aiResult.riskLevel as RiskLevel)
      : riskLevelFromFlagCount(allFlags.length);
    const base = fallbackResult(body, avg);

    const result: RedFlagResult = {
      ...base,
      riskLevel,
      priceComparisonNote: (aiResult.priceComparisonNote as string) || base.priceComparisonNote,
      redFlags: allFlags,
      whatToVerifyNext: Array.isArray(aiResult.whatToVerifyNext) && aiResult.whatToVerifyNext.length
        ? [...rera.steps.slice(0, 1), ...(aiResult.whatToVerifyNext as string[])]
        : base.whatToVerifyNext,
      educationalNote: (aiResult.educationalNote as string) || base.educationalNote,
      summary: `${(aiResult.summary as string) || `This listing shows ${allFlags.length} potential red flag(s).`} ${DISCLAIMER}`,
    };

    return NextResponse.json(result);
  } catch (e) {
    console.error("[legal-shield] Gemini analysis failed, returning rule-based checks only:", e);
    return NextResponse.json(fallbackResult(body, avg, aiDown));
  }
}
