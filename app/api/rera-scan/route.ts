import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getReraState } from "@/lib/reraStates";

// Reuses the exact same RERA data this site already has -- the admin-verified reraNumber /
// verificationFlags on Property and PropertySubmission records (same source VerificationBadge
// and the submission detail page use) -- and the same format-sanity regex the Legal Shield
// Fraud Checker already applies. This is honestly PropKnown's own verified-database check,
// checked first; if it doesn't match, we fall through to a public web search (see below) --
// neither is a live government RERA portal lookup (TS-RERA's own search form requires solving
// an image CAPTCHA per request, which rules out reliable automation -- investigated directly
// before building this, not assumed).
const RERA_FORMAT = /^[A-Z]{1,5}\d*\/?[A-Z0-9\/-]{3,}$/i;

const GEMINI_MODEL = "gemini-2.5-flash";

interface TavilyResult { title: string; url: string; content: string; }
interface TavilyResponse { answer?: string; results?: TavilyResult[]; }

async function fetchTavilyContext(reraNumber: string, apiKey: string): Promise<{ snippets: string; hasData: boolean }> {
  // Tuned against two real, independently-verified RERA numbers before settling on this --
  // NOT the state-suffixed version this used to be. Padding with generic words ("project
  // registration developer builder") diluted the results into a generic non-answer. A bare
  // number with no context surfaced the right page but ranked unrelated junk (patent-number
  // databases) alongside it. Quoting the number plus "RERA" (no state name) scored the correct
  // project page at ~0.89 relevance for BOTH a Maharashtra number (Lodha Park, P51900001339)
  // and a Telangana number (Amerispace, P02400007888).
  //
  // Appending the state name was tried and reverted: for the Maharashtra case it made no
  // measurable difference (0.887 vs 0.897), but for the Telangana case it was actively harmful
  // -- "Telangana" as a query term pulled the whole result set toward the state RERA
  // authority's own generic pages (homepage, FAQ, "how to check" blog posts, aggregator
  // project-list dumps mentioning dozens of OTHER RERA numbers) at scores of 0.35-0.59,
  // pushing the actual project page (Housing.com/99acres/NoBroker/ghar.tv, score 0.89 without
  // the state name) out of the top results entirely. Confirmed via direct side-by-side Tavily
  // calls, not assumed.
  const query = `"${reraNumber}" RERA`;
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "advanced",
      include_answer: true,
      max_results: 6,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Tavily ${res.status}`);

  const data: TavilyResponse = await res.json();
  const parts: string[] = [];
  if (data.answer?.trim()) parts.push(`SUMMARY:\n${data.answer.trim()}`);
  if (Array.isArray(data.results)) {
    // 1200 chars/result, top 4 only -- found by inspecting a real result directly: the
    // concrete facts (builder name, exact price range, precise locality) on real-estate
    // listing-aggregator pages consistently show up in a structured FAQ/spec block AFTER an
    // introductory marketing paragraph, not before it. This route's original 400-char cutoff
    // was truncating every result mid-intro-paragraph, discarding the builder/price/location
    // data that was actually present in the same snippet just past that cutoff (confirmed by
    // reading result[0]'s full, untruncated content for the Amerispace test case -- "By:
    // Amerispace Private Limited" and "21.24 L - 52.99 L" both appeared at ~750-900 chars in).
    const snippets = data.results
      .slice(0, 4)
      .filter(r => r.content?.trim())
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.content.slice(0, 1200).trim()}\nSource: ${r.url}`)
      .join("\n\n");
    if (snippets) parts.push(`SEARCH RESULTS:\n${snippets}`);
  }
  const combined = parts.join("\n\n");
  // Require the RERA number itself to actually appear somewhere in what came back -- a Tavily
  // "answer" can be a generic non-answer ("I couldn't find information about...") that still
  // passes a bare length check; without this a truly unknown number could get treated as if
  // real search content existed for it.
  const hasData = combined.length > 60 && combined.toLowerCase().includes(reraNumber.toLowerCase());
  return { snippets: combined, hasData };
}

interface ExtractedRera {
  found: boolean;
  projectName?: string;
  builder?: string;
  location?: string;
  priceRange?: string;
  startDate?: string;
}

function parseGeminiJson(text: string): Record<string, unknown> {
  const t = text.trim();
  if (t.startsWith("{")) { try { return JSON.parse(t); } catch { /* fall through */ } }
  const fenced = t.match(/```(?:json)?\s*([\s\S]+?)```/);
  if (fenced) { try { return JSON.parse(fenced[1].trim()); } catch { /* fall through */ } }
  const obj = t.match(/(\{[\s\S]+\})/);
  if (obj) { try { return JSON.parse(obj[1]); } catch { /* fall through */ } }
  throw new Error("No valid JSON in Gemini response");
}

async function extractReraInfo(reraNumber: string, stateName: string, searchSnippets: string, apiKey: string): Promise<ExtractedRera> {
  const prompt = `You are extracting facts about a specific RERA registration number from web search results. Be strict and honest -- only report a field if it is ACTUALLY present in the search results below for THIS EXACT RERA number "${reraNumber}". Never guess, infer, or invent a value. If the search results don't clearly discuss this specific number, set "found" to false and leave every other field blank.

STATE: ${stateName}
RERA NUMBER: ${reraNumber}

SEARCH RESULTS:
${searchSnippets}

Return ONLY a JSON object, no markdown, no explanation:
{
  "found": <true only if the search results contain real, specific information about this exact RERA number>,
  "projectName": "<project/building name, or omit the field entirely if unknown>",
  "builder": "<developer/promoter/builder name, or omit if unknown>",
  "location": "<city/locality, or omit if unknown>",
  "priceRange": "<asking price range if mentioned, or omit if unknown>",
  "startDate": "<project start/registration date if mentioned, or omit if unknown>"
}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } },
    }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? `Gemini ${res.status}`);
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text as string ?? "";
  const raw = parseGeminiJson(text);
  return {
    found: raw.found === true,
    projectName: typeof raw.projectName === "string" ? raw.projectName : undefined,
    builder: typeof raw.builder === "string" ? raw.builder : undefined,
    location: typeof raw.location === "string" ? raw.location : undefined,
    priceRange: typeof raw.priceRange === "string" ? raw.priceRange : undefined,
    startDate: typeof raw.startDate === "string" ? raw.startDate : undefined,
  };
}

export async function POST(req: NextRequest) {
  const { reraNumber, state } = await req.json() as { reraNumber?: string; state?: string };
  const num = reraNumber?.trim();

  if (!num) {
    return NextResponse.json({ error: "A RERA number is required" }, { status: 400 });
  }

  const stateInfo = state ? getReraState(state) : undefined;
  const statePayload = stateInfo
    ? { stateName: stateInfo.name, stateAuthority: stateInfo.authorityName, statePortalUrl: stateInfo.portalUrl }
    : {};

  const normalised = num.toLowerCase();

  const [properties, submissions] = await Promise.all([
    prisma.property.findMany({
      where: { reraNumber: { not: null } },
      select: { title: true, location: true, reraNumber: true, verificationFlags: true },
    }),
    prisma.propertySubmission.findMany({
      where: { reraNumber: { not: null }, status: "approved" },
      select: { title: true, city: true, area: true, reraNumber: true, verificationFlags: true },
    }),
  ]);

  const match = [
    ...properties.map(p => ({ title: p.title, location: p.location, reraNumber: p.reraNumber, flags: p.verificationFlags as Record<string, unknown> })),
    ...submissions.map(s => ({ title: s.title, location: `${s.area}, ${s.city}`, reraNumber: s.reraNumber, flags: s.verificationFlags as Record<string, unknown> })),
  ].find(r => r.reraNumber?.trim().toLowerCase() === normalised);

  if (match && match.flags?.reraVerified === true) {
    return NextResponse.json({
      status:      "verified",
      message:     `This RERA number is verified in PropKnown's own admin-checked records, associated with "${match.title}" (${match.location}).`,
      propertyTitle: match.title,
      propertyLocation: match.location,
      ...statePayload,
    });
  }

  // A record exists (it's on file, tied to a real listing) but hasn't been through admin
  // verification yet -- this is NOT the same as "we've never heard of this number", and must
  // never be shown as if it were. Saying "pending" here is the honest middle ground: neither
  // a false "verified" nor a false "not found" for a number that's genuinely on our books.
  if (match) {
    return NextResponse.json({
      status:  "pending",
      message: `This RERA number is on file for "${match.title}" (${match.location}), but PropKnown hasn't independently verified it yet. Verification pending — please confirm it directly on your state's official RERA portal in the meantime.`,
      propertyTitle: match.title,
      propertyLocation: match.location,
      ...statePayload,
    });
  }

  if (!RERA_FORMAT.test(num)) {
    return NextResponse.json({
      status:  "flagged",
      message: "This doesn't resemble a typical RERA registration number format. Treat it with caution and confirm directly on your state's official RERA portal before relying on it.",
      ...statePayload,
    });
  }

  // Not in PropKnown's own database -- fall back to a public web search (Tavily) so we can
  // surface whatever's publicly indexed about this number, honestly labeled as public search
  // results, never as a government verification. Skipped entirely if no state was selected
  // (nothing useful to search for) or the search keys aren't configured.
  const tavilyKey = process.env.TAVILY_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (stateInfo && tavilyKey && geminiKey) {
    try {
      const { snippets, hasData } = await fetchTavilyContext(num, tavilyKey);
      if (hasData) {
        const extracted = await extractReraInfo(num, stateInfo.name, snippets, geminiKey);
        if (extracted.found) {
          return NextResponse.json({
            status: "found_public",
            message: `We found publicly available information for this RERA number via web search. This is NOT a government verification — always confirm directly on the official ${stateInfo.authorityName} portal before relying on it.`,
            projectName: extracted.projectName,
            builder: extracted.builder,
            location: extracted.location,
            priceRange: extracted.priceRange,
            startDate: extracted.startDate,
            ...statePayload,
          });
        }
      }
    } catch (e) {
      console.warn("[rera-scan] Public search lookup failed (non-fatal):", e);
      // Falls through to the honest not_found response below -- a search failure must never
      // be presented as if it were a confirmed "not found" or, worse, a "verified" result.
    }
  }

  return NextResponse.json({
    status:  "not_found",
    message: "We don't have any record of this RERA number, and public web search didn't surface reliable public information either. That doesn't necessarily mean it's invalid — please confirm it directly on your state's official RERA portal before relying on it.",
    ...statePayload,
  });
}
