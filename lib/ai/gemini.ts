import { GEMINI_MODEL } from "@/lib/marketIntel";
import { recordApiCall } from "@/lib/engine/usage";

// Ungrounded Gemini call in JSON mode, for extraction/drafting tasks (listing drafts, news and
// podcast drafts). Usage is recorded for the Engine Health page. Throws on any failure -- callers
// decide what to show instead; nothing here ever invents a fallback value.

export class GeminiError extends Error {}

export async function geminiJson<T = Record<string, unknown>>(
  prompt: string,
  opts: { timeoutMs?: number; model?: string; temperature?: number } = {},
): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiError("GEMINI_API_KEY not configured");
  const model = opts.model ?? GEMINI_MODEL;
  const thinking = model.startsWith("gemini-2.5") ? { thinkingBudget: 0 } : { thinkingLevel: "minimal" };

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: opts.temperature ?? 0.2, responseMimeType: "application/json", thinkingConfig: thinking },
    }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
  }).catch((e) => { recordApiCall("gemini", "error"); throw e; });
  recordApiCall("gemini", res.ok ? "ok" : res.status === 429 ? "rate_limited" : "error");

  const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[]; error?: { message?: string } };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
  if (!res.ok || !text) throw new GeminiError(`${model} ${res.status}: ${data.error?.message ?? "empty response"}`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new GeminiError(`${model}: response was not valid JSON`);
  }
}
