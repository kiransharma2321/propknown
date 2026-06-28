import { NextRequest, NextResponse } from "next/server";

const GEMINI_MODEL = "gemini-2.5-flash";

const SYSTEM_PROMPT = `You are Jarvis, the AI assistant for PropKnown Infra Pvt Ltd — India's first AI-powered, fully verified real estate platform.

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
- AI Intelligence: real-time market valuations for any location
- Verified listings: RERA-registered, legally clear
- Property management: rent collection, tenant management, maintenance
- Land services: agricultural land, HMDA/DTCP plots, layout verification
- Legal verification: title search, encumbrance certificate, due diligence
- Construction: vetted contractors, project management

GUIDELINES:
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

  // Convert history to Gemini format, skip the welcome bot message (index 0)
  for (let i = 0; i < history.length; i++) {
    const msg = history[i];
    // Skip the hardcoded welcome message
    if (i === 0 && msg.role === "bot") continue;
    contents.push({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    });
  }

  // Ensure we don't end on a "model" turn before adding the new user message
  // (Gemini requires alternating roles, can't have two model turns in a row)
  if (contents.length > 0 && contents[contents.length - 1].role === "model") {
    // Fine — now we add the user message
  }

  // Add the current user message
  contents.push({ role: "user", parts: [{ text: currentMessage }] });

  return contents;
}

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

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const contents = buildContents(history, message.trim());

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error("Gemini Jarvis error:", errData);
      throw new Error(`Gemini ${res.status}`);
    }

    const data = await res.json();
    const reply = (data?.candidates?.[0]?.content?.parts?.[0]?.text as string)?.trim();

    if (!reply) throw new Error("Empty Gemini response");

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Jarvis route error:", err);
    return NextResponse.json({
      reply: "Sorry, I had trouble there. Please try again, or WhatsApp us on 97017 71333 for instant help!",
    });
  }
}
