import { GEMINI_MODEL } from "@/lib/marketIntel";
import { recordApiCall } from "@/lib/engine/usage";

// Ungrounded Gemini call in JSON mode, for extraction/drafting tasks (listing drafts, project
// checks, news and podcast drafts). Usage is recorded for the Engine Health page. If a model is
// out of quota / overloaded / missing (429/503/404) the next model in the chain is tried, the
// same fallback idea as the price engine. Throws on any other failure -- callers decide what to
// show instead; nothing here ever invents a fallback value.

export class GeminiError extends Error {}

const FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

async function callOnce<T>(model: string, apiKey: string, prompt: string, opts: { timeoutMs?: number; temperature?: number }): Promise<{ ok: true; value: T } | { ok: false; retryNext: boolean; error: string }> {
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
  if (!res.ok || !text) return { ok: false, retryNext: [404, 429, 503].includes(res.status), error: `${model} ${res.status}: ${data.error?.message ?? "empty response"}` };
  try {
    return { ok: true, value: JSON.parse(text) as T };
  } catch {
    return { ok: false, retryNext: false, error: `${model}: response was not valid JSON` };
  }
}

export async function geminiJson<T = Record<string, unknown>>(
  prompt: string,
  opts: { timeoutMs?: number; model?: string; temperature?: number } = {},
): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiError("GEMINI_API_KEY not configured");
  const first = opts.model ?? GEMINI_MODEL;
  const chain = [first, ...FALLBACK_MODELS.filter((m) => m !== first)];
  let lastError = "";
  for (const model of chain) {
    const r = await callOnce<T>(model, apiKey, prompt, opts);
    if (r.ok) return r.value;
    lastError = r.error;
    if (!r.retryNext) break;
  }
  throw new GeminiError(lastError);
}
