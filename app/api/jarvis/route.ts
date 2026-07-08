import { NextRequest, NextResponse } from "next/server";

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

Contact: WhatsApp/Phone: 97017 71333 | Email: kiranpropservices@gmail.com | Office: Shop No 3, Venkateswara Nilayam, Opp Vertex Prime, Nizampet Road, Hyderabad 500090.

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
- Area analysis for Hyderabad: Kokapet (high-growth IT corridor, premium plots ₹40K-90K/sq.yd), Gachibowli (IT hub, apartments ₹8K-16K/sqft), Nallagandla/Tellapur (emerging, good connectivity), Medchal (outer ring, affordable ₹3K-6K/sqft), Financial District (premium commercial+residential), Nizampet/Bachupally (mid-budget residential), Shamshabad (airport zone, logistics/industrial)

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

3. After educating, warmly route to Raghu: "For specific verified recommendations matched to your exact budget, timeline, and needs — I'd suggest a quick chat with Raghu on WhatsApp 97017 71333. He personally visits and verifies projects and builders before listing them on PropKnown."

4. NEVER fabricate rankings, claim one builder is objectively best, or invent reviews or ratings.

This rule applies to: "Which builder is good?", "Is XYZ builder good?", "Which community is best?", "Which project should I buy in?", "Recommend me a township", "Which developer can I trust?" etc.

═══════════════════════════════════════
GENERAL GUIDELINES:
- Be warm, professional, and specific (3-5 sentences usually; longer when detail is needed)
- Give REAL, USEFUL answers — if asked about an area, give genuine pricing insights and pros/cons. If asked to calculate EMI, show the actual calculation.
- Use proper Indian currency formatting: ₹X lakhs, ₹X crores
- When asked for live prices you cannot guarantee, give a realistic estimate range and mention: "For exact current pricing, use PropKnown's AI Intelligence tool or WhatsApp Raghu on 97017 71333"
- For serious enquiries (buying/selling/investing), offer to connect: "WhatsApp Raghu directly on 97017 71333 for a personalised consultation"
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
  temperature = 0.7
): Promise<{ reply: string | null; blocked: boolean; reason: string; quotaExceeded?: boolean; transient?: boolean }> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
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
    signal: AbortSignal.timeout(22000),
  });

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

For specific verified recommendations tailored to your exact needs, I'd suggest a quick chat with Raghu on WhatsApp **97017 71333**. He personally visits and verifies projects before recommending them.`;

const QUOTA_FALLBACK = "I'm busy right now, please WhatsApp Raghu on 97017 71333 — he responds within minutes!";

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
      reply: "I'm having trouble connecting right now. Please WhatsApp Raghu directly on 97017 71333 — he responds within minutes!",
    });
  }

  const contents = buildContents(history, message.trim());
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

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    if (attempt.delayMs > 0) await sleep(attempt.delayMs);

    try {
      const r = await callGemini(attempt.endpoint, attempt.contents, attempt.temperature);
      if (r.reply) return NextResponse.json({ reply: r.reply });

      if (r.blocked) {
        // Safety block: return a curated helpful answer instead of a generic error
        return NextResponse.json({ reply: SAFETY_FALLBACK });
      }

      if (r.quotaExceeded) {
        // Retrying won't help — quota is exhausted for the window. Fail fast with a friendly message.
        console.warn(`[KnownAI] Attempt ${i + 1}: quota exceeded — skipping remaining retries:`, r.reason);
        return NextResponse.json({ reply: QUOTA_FALLBACK });
      }

      console.warn(`[KnownAI] Attempt ${i + 1} failed (transient=${!!r.transient}):`, r.reason);
    } catch (e) {
      console.error(`[KnownAI] Attempt ${i + 1} threw:`, e);
    }
  }

  // Final fallback — only reached after all 3 attempts (across 2 models) genuinely failed
  return NextResponse.json({
    reply: "I'm having a moment of difficulty right now. For immediate help on this question, please WhatsApp Raghu on **97017 71333** — he responds within minutes and can answer any property question directly!",
  });
}
