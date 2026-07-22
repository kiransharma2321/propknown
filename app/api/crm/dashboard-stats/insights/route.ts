import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/rbac";

// AI Dashboard Insights (Section 16). Manually triggered ("Generate Insights" button), not run
// automatically on every page load -- same "no surprise Gemini calls" pattern as AI Lead
// Scoring. Takes the real stats already computed by /api/crm/dashboard-stats and asks Gemini to
// summarise what's actually notable -- it never sees or could report numbers beyond what's
// passed in, so it can't fabricate metrics that don't exist.
const GEMINI_MODEL = "gemini-2.5-flash";

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stats = await req.json() as Record<string, unknown>;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI insights are temporarily unavailable." }, { status: 503 });

  const prompt = `You are a real estate CRM analyst. Given ONLY this real, current dashboard data (JSON below), write 2-4 short, plain-language bullet points about what's actually notable -- trends, gaps, or things worth the sales team's attention today. Do not invent any number not present in this data. If the data is too sparse to say anything meaningful (e.g. very few leads, no campaigns with spend), say that honestly instead of padding with generic advice.

DATA:
${JSON.stringify(stats)}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, thinkingConfig: { thinkingBudget: 0 } },
        }),
      }
    );
    const data = await res.json() as { candidates?: { content: { parts: { text: string }[] } }[]; error?: { message: string } };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!res.ok || !text) {
      return NextResponse.json({ error: data.error?.message ?? "AI insights are temporarily unavailable." }, { status: 200 });
    }
    return NextResponse.json({ insights: text.trim() });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Request failed" }, { status: 200 });
  }
}
