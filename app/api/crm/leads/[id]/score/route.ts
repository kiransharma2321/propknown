import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession, canRole } from "@/lib/rbac";
import { logAudit } from "@/lib/auditLog";

// AI Lead Scoring (Section 3). Manually triggered per lead ("Score this lead"), never automatic.
// Grounded entirely in what's actually stored on the lead -- message, notes, timeline, source,
// tags, follow-up history -- plus a real list of currently available properties, so
// recommendedPropertyId points at something real instead of an invented ID. Follow-up
// suggestions are drafted text only; nothing here sends anything.
const GEMINI_MODEL = "gemini-2.5-flash";

interface ScoreResult {
  leadScore: number; buyingIntent: string; financialStrength: string; urgencyLevel: string;
  conversionProbability: number; bestFollowUpTime: string; recommendedPropertyId: string | null;
  nextBestAction: string; aiSummary: string; draftFollowUpMessage: string;
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await canRole(session.role, "lead_detail"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const lead = await prisma.lead.findUnique({ where: { id: params.id } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI scoring is temporarily unavailable — no Gemini API key configured." }, { status: 503 });

  const properties = await prisma.property.findMany({
    where: { status: "approved" }, take: 15,
    select: { id: true, title: true, city: true, propertyType: true, price: true, beds: true },
  });

  const daysSinceCreated = Math.round((Date.now() - lead.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  const timelineEntries = Array.isArray(lead.timeline) ? lead.timeline : [];

  const prompt = `You are a real estate CRM analyst scoring a lead for a sales team. Base your analysis STRICTLY on the real data below -- do not invent facts about this person that aren't implied by what's given. If the data is too sparse to judge something confidently, say so honestly in that field rather than guessing with false confidence.

LEAD DATA:
- Name: ${lead.name}
- Source: ${lead.source}
- Current stage: ${lead.status}
- Message/enquiry: ${lead.message ?? "(none provided)"}
- Notes on file: ${lead.notes ?? "(none)"}
- Tags / stated interests: ${lead.tags.join(", ") || "(none)"}
- Lead age: ${daysSinceCreated} day(s) since first contact
- Recorded interaction history: ${timelineEntries.length > 0 ? JSON.stringify(timelineEntries).slice(0, 1500) : "(no interactions logged yet)"}
- Follow-up currently scheduled: ${lead.followUpDate ? new Date(lead.followUpDate).toDateString() : "(none scheduled)"}

AVAILABLE PROPERTIES (only recommend from this real list, or null if none genuinely fit):
${properties.map(p => `- id:"${p.id}" | ${p.title} | ${p.city} | ${p.propertyType} | ₹${p.price} | ${p.beds ?? "?"} BHK`).join("\n") || "(no approved properties currently in inventory)"}

Respond with ONLY this JSON shape, no markdown fences:
{
  "leadScore": <0-100 number>,
  "buyingIntent": "<Low|Medium|High, one short phrase why>",
  "financialStrength": "<Unknown|Low|Medium|High -- say Unknown if nothing in the data implies budget>",
  "urgencyLevel": "<Low|Medium|High>",
  "conversionProbability": <0-100 number>,
  "bestFollowUpTime": "<short honest recommendation, or 'Not enough interaction history to judge' if true>",
  "recommendedPropertyId": <one id string from the list above that genuinely matches, or null>,
  "nextBestAction": "<one concrete short action for the sales rep>",
  "aiSummary": "<2-3 sentence honest summary of this lead>",
  "draftFollowUpMessage": "<a short, ready-to-send follow-up message draft, in a natural human tone -- this will be shown to the rep to review and send manually, never auto-sent>"
}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, thinkingConfig: { thinkingBudget: 0 }, responseMimeType: "application/json" },
        }),
      }
    );
    const data = await res.json() as { candidates?: { content: { parts: { text: string }[] } }[]; error?: { message: string } };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!res.ok || !text) {
      return NextResponse.json({ error: data.error?.message ?? "AI scoring failed." }, { status: 200 });
    }

    const parsed = JSON.parse(text) as ScoreResult;

    await prisma.lead.update({
      where: { id: params.id },
      data: {
        leadScore: parsed.leadScore, buyingIntent: parsed.buyingIntent, financialStrength: parsed.financialStrength,
        urgencyLevel: parsed.urgencyLevel, conversionProbability: parsed.conversionProbability,
        bestFollowUpTime: parsed.bestFollowUpTime, recommendedPropertyId: parsed.recommendedPropertyId,
        nextBestAction: parsed.nextBestAction, aiSummary: parsed.aiSummary, aiScoredAt: new Date(),
      },
    });

    logAudit({ actorId: session.userId, actorName: session.name, action: "lead.ai_score", entity: "Lead", entityId: params.id, details: { leadScore: parsed.leadScore } }).catch(() => null);
    return NextResponse.json({ ok: true, ...parsed });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "AI scoring failed." }, { status: 200 });
  }
}
