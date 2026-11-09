import { NextRequest, NextResponse } from "next/server";
import { getMarketPrice, logAiQuery, remaining, unitLabel, ENGINE_TIMEOUT_MS, UNAVAILABLE_MESSAGE, type EngineResult } from "@/lib/engine";
import { matchLocality } from "@/lib/localities";
import { wantsAnalysis, analyseQuestion, analysisFacts, type KnownAIAnalysis } from "@/lib/knownai/analysis";
import { recordApiCall } from "@/lib/engine/usage";

// flash-lite: much higher free-tier daily quota than flash — good fit for short chat replies.
// flash is used as a cross-model fallback on the final retry — an "UNAVAILABLE / high demand"
// error is often specific to one model, so switching models is a real mitigation, not just
// a repeat of the same failure.
const GEMINI_MODEL_PRIMARY  = "gemini-2.5-flash-lite";
const GEMINI_MODEL_FALLBACK = "gemini-2.5-flash";

function sleep(ms: number) { return new Promise((res) => setTimeout(res, ms)); }

function geminiEndpoint(model: string, apiKey: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
}

const SYSTEM_PROMPT = `You are KnownAI, the AI assistant for PropKnown Infra Pvt Ltd — India's first AI-powered, fully verified real estate platform.

Founded by Pinnelli Raghu Kiran (ISB Alumni, IIM PG Diploma, BITS Pilani, 20+ years in Product Management and Real Estate). PropKnown provides verified listings, AI market intelligence, property management, land services, legal verification, construction services, and NRI investment support.

Contact: WhatsApp/Phone: 70130 16003 | Email: kiranpropservices@gmail.com | Office: Shop No 3, Venkateswara Nilayam, Opp Vertex Prime, Nizampet Road, Hyderabad 500090.

You are a knowledgeable, warm, and genuinely helpful assistant. Answer ANY question the user asks clearly and intelligently — including:

REAL ESTATE EXPERTISE:
- Buying, selling, renting, investing in India and globally
- RERA (Real Estate Regulatory Authority) — registration, complaints, project verification, builder accountability
- HMDA vs DTCP plots — HMDA = Hyderabad Metropolitan Development Authority (municipal limits, stricter, more expensive), DTCP = Directorate of Town and Country Planning (peri-urban, cheaper, still valid but check layout approval carefully)
- Home loans, EMI calculations, interest rates, eligibility, bank comparisons
- Property registration, stamp duty, encumbrance certificates, mutation, khata
- Legal verification — title deed, patta, FMB, EC, occupancy certificate
- NRI investment: FEMA rules, repatriation, NRO/NRE accounts, TDS on NRI property
- Market trends: price appreciation, rental yields, upcoming corridors
- Area analysis for Hyderabad: Kokapet (high-growth IT corridor), Gachibowli (IT hub), Nallagandla/Tellapur (emerging, good connectivity), Medchal (outer ring, more affordable), Financial District (premium commercial+residential), Nizampet/Bachupally (mid-budget residential), Shamshabad (airport zone, logistics/industrial)

EMI FORMULA: EMI = P × r × (1+r)^n / ((1+r)^n - 1) where P = principal, r = monthly rate (annual%/1200), n = tenure in months. Always calculate and show the actual EMI when asked.

PROPKNOWN SERVICES:
- AI Intelligence: AI-analyzed market valuations for any location, based on live web search (not individual listing quotes)
- Verified listings: RERA-registered, legally clear
- Property management: rent collection, tenant management, maintenance
- Land services: agricultural land, HMDA/DTCP plots, layout verification
- Legal verification: title search, encumbrance certificate, due diligence
- Construction: vetted contractors, project management

═══════════════════════════════════════
BUILDER / COMMUNITY / "BEST" QUESTIONS — CRITICAL RULE
═══════════════════════════════════════
When anyone asks you to judge, rank, endorse, or name the "best" or "good" specific builder, developer, community, township, or project:

1. NEVER name a specific builder or project as the best, or make a direct endorsement or ranking.
2. EDUCATE them on what makes a trustworthy builder and a good community — this is genuinely helpful:

For evaluating a BUILDER, tell clients to check:
   • RERA registration (verify at rera.telangana.gov.in or respective state RERA)
   • Track record of ON-TIME project completion — check their past delivered projects
   • Construction quality — visit a completed project, check materials, workmanship
   • Customer reviews and reputation — talk to past buyers, check online forums
   • Financial stability — check if the builder has taken construction finance from reputed banks
   • Clear legal titles — verify ownership, land conversion, HMDA/DTCP approval
   • Transparent pricing — no hidden charges, clear payment milestones

For evaluating a COMMUNITY / PROJECT, tell clients to check:
   • Location and connectivity — distance to workplace, schools, hospitals, metro
   • Legal approvals — RERA registered? HMDA/DTCP layout approved? Clear title?
   • Builder's track record — have they delivered similar projects before, on time?
   • Amenities vs maintenance cost — grand amenities mean high maintenance bills
   • Resale and rental potential — is this area growing? Who are the end users?
   • Occupancy level — in completed projects, how many units are occupied?

3. After educating, warmly route to WhatsApp: "For specific verified recommendations matched to your exact budget, timeline, and needs — I'd suggest a quick chat with our team on WhatsApp 70130 16003. We personally visit and verify projects and builders before listing them on PropKnown."

4. NEVER fabricate rankings, claim one builder is objectively best, or invent reviews or ratings.

This rule applies to: "Which builder is good?", "Is XYZ builder good?", "Which community is best?", "Which project should I buy in?", "Recommend me a township", "Which developer can I trust?" etc.

═══════════════════════════════════════
GENERAL GUIDELINES:
- Be warm, professional, and specific (3-5 sentences usually; longer when detail is needed)
- Give REAL, USEFUL answers — if asked about an area, give genuine pros/cons. If asked to calculate EMI, show the actual calculation.
- Use proper Indian currency formatting: ₹X lakhs, ₹X crores
- PRICES — STRICT RULE: never state a property price, rate per sqft/sq.yd, rental yield or growth figure from your own knowledge. Only quote figures that appear in a "LIVE PRICE DATA" block in this conversation, exactly as given, and say they are an AI estimate from PropKnown's live engine. If there is no such block, say you can't quote a price right now and point to PropKnown's AI Intelligence tool (propknown.com/ai-intelligence) or WhatsApp 70130 16003.
- For serious enquiries (buying/selling/investing), offer to connect: "WhatsApp our team directly on 70130 16003 for a personalised consultation"
- For general knowledge questions unrelated to real estate, answer helpfully and concisely, then relate back if relevant
- Never invent fake RERA numbers, fake listing prices, or fake project names
- If you're unsure about something specific, say so honestly and offer the verified route`;

type GeminiRole = "user" | "model";
interface GeminiPart { text: string; }
interface GeminiContent { role: GeminiRole; parts: GeminiPart[]; }

interface IncomingMessage { role: "user" | "bot"; text: string; }

function buildContents(history: IncomingMessage[], currentMessage: string): GeminiContent[] {
  const contents: GeminiContent[] = [];

  for (let i = 0; i < history.length; i++) {
    const msg = history[i];
    if (i === 0 && msg.role === "bot") continue;
    contents.push({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    });
  }

  contents.push({ role: "user", parts: [{ text: currentMessage }] });
  return contents;
}

const SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_ONLY_HIGH" },
  { category: "HARM_CATEGORY_HATE_SPEECH",        threshold: "BLOCK_ONLY_HIGH" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",  threshold: "BLOCK_ONLY_HIGH" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT",  threshold: "BLOCK_ONLY_HIGH" },
];

async function callGemini(
  endpoint: string,
  contents: GeminiContent[],
  temperature = 0.7,
  timeoutMs = 9000,
  extraSystem = ""
): Promise<{ reply: string | null; blocked: boolean; reason: string; quotaExceeded?: boolean; transient?: boolean }> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: extraSystem ? `${SYSTEM_PROMPT}\n\n${extraSystem}` : SYSTEM_PROMPT }] },
      contents,
      safetySettings: SAFETY_SETTINGS,
      generationConfig: {
        temperature,
        // gemini-2.5-flash-lite spends part of maxOutputTokens on internal "thinking" before the
        // visible reply, which was silently truncating longer answers mid-sentence.
        // Disabling thinking gives the full budget to the actual response.
        maxOutputTokens: 1024,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
    signal: AbortSignal.timeout(Math.max(500, timeoutMs)),
  });

  recordApiCall("gemini", res.ok ? "ok" : res.status === 429 ? "rate_limited" : "error");
  const data = await res.json().catch(() => ({})) as {
    candidates?: {
      content?: { parts?: { text?: string }[] };
      finishReason?: string;
    }[];
    promptFeedback?: { blockReason?: string };
    error?: { message?: string; status?: string };
  };

  if (!res.ok) {
    const msg = data.error?.message ?? `Gemini HTTP ${res.status}`;
    const quotaExceeded = res.status === 429 || data.error?.status === "RESOURCE_EXHAUSTED";
    // 503/UNAVAILABLE ("high demand") is a transient overload on Google's side, not a real
    // failure of our request — worth distinguishing so the caller knows a delayed retry or
    // a different model is worth trying, rather than treating it like a hard error.
    const transient = res.status === 503 || res.status === 500 || data.error?.status === "UNAVAILABLE";
    console.error("[KnownAI] API error:", msg, data);
    return { reply: null, blocked: false, reason: msg, quotaExceeded, transient };
  }

  // Log the full response structure for debugging
  const finishReason  = data.candidates?.[0]?.finishReason;
  const blockReason   = data.promptFeedback?.blockReason;

  if (blockReason || finishReason === "SAFETY") {
    console.warn("[KnownAI] Safety block:", { blockReason, finishReason });
    return { reply: null, blocked: true, reason: `Safety: ${blockReason ?? finishReason}` };
  }

  if (finishReason && finishReason !== "STOP" && finishReason !== "MAX_TOKENS") {
    console.warn("[KnownAI] Unexpected finishReason:", finishReason, data);
    return { reply: null, blocked: false, reason: `finishReason=${finishReason}` };
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  if (!text) {
    console.warn("[KnownAI] Empty text, full response:", JSON.stringify(data).slice(0, 500));
    return { reply: null, blocked: false, reason: "empty text" };
  }

  return { reply: text, blocked: false, reason: "ok" };
}

const SAFETY_FALLBACK = `Great question! When evaluating builders and communities, here's what really matters:

**For Builders — check:**
• RERA registration (verify at rera.telangana.gov.in)
• Track record of on-time project delivery
• Construction quality — visit a completed project
• Customer reviews from actual buyers
• Clear legal titles and HMDA/DTCP approvals

**For Communities — check:**
• Location: distance to your workplace, schools, hospitals
• Legal approvals: RERA number, HMDA/DTCP layout sanction
• Builder reputation: past delivered projects
• Resale potential and occupancy rates

Every buyer's "best" depends on their budget, timeline, and location preference — there's no one-size-fits-all.

For specific verified recommendations tailored to your exact needs, I'd suggest a quick chat with our team on WhatsApp **70130 16003**. We personally visit and verify projects before recommending them.`;

// ─── Price grounding ───────────────────────────────────────────────────────
// Price questions are answered ONLY from the shared engine (lib/engine) -- the same number
// Price Check, AI Intelligence and the /prices pages show. No engine data => an honest
// "unavailable" reply with no numbers, without asking Gemini (which would otherwise be
// tempted to fill the gap from stale training data).

const PRICE_INTENT = /\b(price|prices|pricing|rate|rates|cost|costs|per\s*sq|sq\.?\s?ft|sqft|sq\.?\s?y(?:ar)?d|gaj|how much|valuation|worth|psf|rental yield)\b/i;

function detectPropertyType(t: string): string {
  if (/\b(plot|plots|land|site|open plot|gaj|sq\.?\s?y(?:ar)?d)\b/i.test(t)) return /\b(farm|agri)/i.test(t) ? "agriculture" : "plot";
  if (/\bvilla/i.test(t)) return "villa";
  if (/\b(independent house|individual house)\b/i.test(t)) return "house";
  if (/\b(commercial|office|shop)\b/i.test(t)) return "commercial";
  if (/\b(farm ?land|agricultur)/i.test(t)) return "agriculture";
  return "apartment";
}

function extractLocation(t: string): string | null {
  const known = matchLocality(t);
  if (known) return `${known.name}, ${known.city}`;
  const m = t.match(/\b(?:in|at|near|around|for)\s+([A-Za-z][A-Za-z .'-]{2,50}?)(?=\s*(?:[?.!,]|$|\bfor\b|\bwith\b|\bright now\b|\btoday\b))/i);
  return m ? m[1].trim() : null;
}

function liveDataBlock(d: EngineResult): string {
  const u = unitLabel(d.pricePerSqftUnit as string);
  const sym = String(d.currencySymbol ?? "");
  const fmt = (n: unknown) => (typeof n === "number" ? `${sym}${n.toLocaleString("en-IN")}` : "not available");
  return [
    `LIVE PRICE DATA (PropKnown engine, ${d.dataSourceLabel ?? "AI estimate based on live web search"}, fetched ${d.fetchedAt ? new Date(d.fetchedAt as string).toDateString() : "today"}):`,
    `Location: ${d.locationName}`,
    `Typical rate: ${fmt(d.currentPricePerSqft)}/${u} (range ${fmt(d.priceRangeMin)}–${fmt(d.priceRangeMax)}/${u})`,
    `Annual growth: ${d.growthRate != null ? `${d.growthRate}%` : "not available"}; rental yield: ${d.rentalYield != null ? `${d.rentalYield}%` : "not available"}; trend: ${d.trend ?? "not available"}`,
    d.summary ? `Context: ${d.summary}` : "",
  ].filter(Boolean).join("\n");
}

function plainPriceReply(d: EngineResult): string {
  const u = unitLabel(d.pricePerSqftUnit as string);
  const sym = String(d.currencySymbol ?? "");
  const n = (v: unknown) => `${sym}${Number(v).toLocaleString("en-IN")}`;
  return `PropKnown's live engine puts ${d.locationName} at about **${n(d.currentPricePerSqft)}/${u}** (typical range ${n(d.priceRangeMin)}–${n(d.priceRangeMax)}/${u}). This is an AI estimate from live web data, not a valuation — for a specific property, run a free Price Check on propknown.com/price-check or WhatsApp us on 70130 16003.`;
}

// Deterministic answer from the analysis alone (used when the model can't answer in time).
function plainAnalysisReply(a: KnownAIAnalysis): string {
  const parts = a.areas.map((x) => x.available
    ? `**${x.name}**: about ${x.symbol}${x.price!.toLocaleString("en-IN")}/${x.unit} (${x.confidence?.level ?? "unknown"} confidence)${x.buyableSqft ? `, so your budget buys roughly ${x.buyableSqft.toLocaleString("en-IN")} sq.ft` : ""}`
    : `**${x.name}**: not enough data yet, so I won't guess a price`);
  return [
    "Here's what PropKnown's engine shows:", "", ...parts, "",
    "AI estimate — indicative only, verify with RERA/a lawyer before deciding.",
  ].join("\n");
}

const ANALYSIS_INSTRUCTIONS = `Answer the user's comparison/affordability question in under 140 words, using ONLY the PROPKNOWN ENGINE FACTS above.
- Quote figures exactly as given; never add a price, size, rate or growth figure that is not in the facts.
- For any area marked NOT ENOUGH DATA, say there isn't enough data yet; do not estimate it.
- If EMI rows are "example rate", say they are examples and the user should use their bank's actual rate.
- Mention each area's confidence level. Don't tell the user which to buy; explain the trade-off the numbers show.
- End by offering a free call with a PropKnown expert. The comparison table and sources are shown below your text, so don't list sources.`;

const QUOTA_FALLBACK = "I'm busy right now, please WhatsApp our team on 70130 16003 — we respond within minutes!";

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    message?: string;
    history?: IncomingMessage[];
  };

  const { message, history = [] } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "ADD-YOUR-GEMINI-KEY-HERE") {
    return NextResponse.json({
      reply: "I'm having trouble connecting right now. Please WhatsApp our team directly on 70130 16003 — we respond within minutes!",
    });
  }

  const started = Date.now();
  const deadlineAt = started + ENGINE_TIMEOUT_MS - 300;
  const text = message.trim();

  // Price questions: ground in the shared engine first.
  let extraSystem = "";
  let grounded: boolean | undefined;
  let priceData: EngineResult | null = null;
  let analysis: KnownAIAnalysis | null = null;
  if (wantsAnalysis(text)) {
    // KnownAI 2.0: comparison / affordability from engine data only.
    analysis = await analyseQuestion(text, 5500);
    if (!analysis.areas.some((x) => x.available)) {
      return NextResponse.json({ grounded: false, analysis, reply: `${UNAVAILABLE_MESSAGE} I don't have enough data for ${analysis.areas.map((x) => x.name).join(" or ")} yet, and PropKnown never guesses a price. A PropKnown expert can help directly — tap "Talk to an expert" below or WhatsApp **70130 16003**.` });
    }
    grounded = true;
    extraSystem = `${analysisFacts(analysis)}

${ANALYSIS_INSTRUCTIONS}`;
  } else if (PRICE_INTENT.test(text)) {
    const location = extractLocation(text);
    if (location) {
      const d = await getMarketPrice({ location, propertyType: detectPropertyType(text), tool: "chat", timeoutMs: 5500 });
      if (!d.available) {
        return NextResponse.json({
          grounded: false,
          reply: `${UNAVAILABLE_MESSAGE} I won't guess a price for ${location} — PropKnown only quotes figures from live market data. You can also WhatsApp our team on **70130 16003** for a manual opinion.`,
        });
      }
      priceData = d;
      grounded = true;
      extraSystem = `${liveDataBlock(d)}\n\nAnswer the user's price question using ONLY the LIVE PRICE DATA above. Quote its figures exactly; don't add any other price figures.`;
    } else {
      await logAiQuery({ tool: "chat", result: "no_location", durationMs: Date.now() - started });
    }
  } else {
    await logAiQuery({ tool: "chat", result: "ok", durationMs: Date.now() - started });
  }

  const contents = buildContents(history, text);
  const retryContents: GeminiContent[] = [
    ...contents.slice(0, -1),
    { role: "user", parts: [{ text: `Please answer this real estate question helpfully: ${message.trim()}` }] },
  ];

  // 3 attempts total (original + 2 retries), matching the "give it 2 retries before any
  // fallback" requirement. A transient 503/UNAVAILABLE ("high demand") is Google's model
  // being briefly overloaded, not a real failure of the request — retrying instantly against
  // an overloaded server rarely helps, so transient failures get a short backoff delay, and
  // the final attempt switches to a different model (flash) in case the overload is specific
  // to flash-lite.
  const attempts: { endpoint: string; contents: GeminiContent[]; temperature: number; delayMs: number }[] = [
    { endpoint: geminiEndpoint(GEMINI_MODEL_PRIMARY,  apiKey), contents,      temperature: 0.7, delayMs: 0 },
    { endpoint: geminiEndpoint(GEMINI_MODEL_PRIMARY,  apiKey), contents: retryContents, temperature: 0.4, delayMs: 700 },
    { endpoint: geminiEndpoint(GEMINI_MODEL_FALLBACK, apiKey), contents: retryContents, temperature: 0.5, delayMs: 1200 },
  ];

  // Engine-backed reply without Gemini, used if Gemini can't answer in time -- real numbers only.
  const groundedFallback = () => analysis
    ? NextResponse.json({ grounded: true, analysis, reply: plainAnalysisReply(analysis) })
    : NextResponse.json({ grounded: true, reply: plainPriceReply(priceData!) });

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    // Everything (engine + Gemini retries) must fit in the 10s budget.
    if (remaining(deadlineAt) < attempt.delayMs + 1500) break;
    if (attempt.delayMs > 0) await sleep(attempt.delayMs);

    try {
      const r = await callGemini(attempt.endpoint, attempt.contents, attempt.temperature, remaining(deadlineAt), extraSystem);
      if (r.reply) return NextResponse.json({ reply: r.reply, grounded, ...(analysis ? { analysis } : {}) });

      if (r.blocked) {
        // Safety block: return a curated helpful answer instead of a generic error
        return NextResponse.json({ reply: SAFETY_FALLBACK });
      }

      if (r.quotaExceeded) {
        if (priceData || analysis) return groundedFallback();
        // Retrying won't help — quota is exhausted for the window. Fail fast with a friendly message.
        console.warn(`[KnownAI] Attempt ${i + 1}: quota exceeded — skipping remaining retries:`, r.reason);
        return NextResponse.json({ reply: QUOTA_FALLBACK });
      }

      console.warn(`[KnownAI] Attempt ${i + 1} failed (transient=${!!r.transient}):`, r.reason);
    } catch (e) {
      console.error(`[KnownAI] Attempt ${i + 1} threw:`, e);
    }
  }

  if (priceData || analysis) return groundedFallback();

  // Final fallback — only reached after every attempt that fit in the time budget failed
  return NextResponse.json({
    reply: "I'm having a moment of difficulty right now. For immediate help on this question, please WhatsApp our team on **70130 16003** — we respond within minutes and can answer any property question directly!",
  });
}
