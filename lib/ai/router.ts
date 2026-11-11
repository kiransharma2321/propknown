import { recordApiCall, type ApiProvider } from "@/lib/engine/usage";

// PropKnown Own Engine: AI router across FREE tiers only (no paid AI bills). Ungrounded -- the
// model only reads text we fetched ourselves; it never searches or answers from memory.
// Order: Gemini Flash-Lite (free) -> Groq -> Cerebras -> OpenRouter (":free" models).
// A provider without a key is skipped; on 429 / 5xx / timeout / bad JSON the next one is tried.
// Keys (env): GEMINI_API_KEY, GROQ_API_KEY, CEREBRAS_API_KEY, OPENROUTER_API_KEY.
// Model overrides: GROQ_MODEL, CEREBRAS_MODEL, OPENROUTER_MODEL, GEMINI_LITE_MODEL.

export class AiRouterError extends Error {}

interface Provider { id: ApiProvider; label: string; key: () => string | undefined; call: (prompt: string, o: Opts, key: string) => Promise<Response> }
interface Opts { system?: string; temperature?: number; timeoutMs?: number; json?: boolean; maxTokens?: number; retryWaitMs?: number }

const geminiLiteModels = () => (process.env.GEMINI_LITE_MODELS || "gemini-flash-lite-latest,gemini-3.5-flash-lite,gemini-2.5-flash-lite").split(",").map((m) => m.trim()).filter(Boolean);

const openAiCompatible =(url: string, model: () => string, extraHeaders: Record<string, string> = {}) =>
  (prompt: string, o: Opts, key: string) => fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...extraHeaders },
    body: JSON.stringify({
      model: model(), temperature: o.temperature ?? 0.2, max_tokens: o.maxTokens ?? 2048,
      ...(o.json ? { response_format: { type: "json_object" } } : {}),
      messages: [...(o.system ? [{ role: "system", content: o.system }] : []), { role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(o.timeoutMs ?? 25_000),
  });

export const PROVIDERS: Provider[] = [
  {
    id: "gemini", label: "Gemini Flash-Lite (free tier)", key: () => process.env.GEMINI_API_KEY,
    // Each Flash-Lite model has its own free daily quota: try them in turn (429 / 404 -> next).
    call: async (prompt, o, key) => {
      let last: Response | null = null;
      for (const model of geminiLiteModels()) {
        last = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(o.system ? { system_instruction: { parts: [{ text: o.system }] } } : {}),
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: o.temperature ?? 0.2, maxOutputTokens: o.maxTokens ?? 2048,
              thinkingConfig: model.startsWith("gemini-2.5") ? { thinkingBudget: 0 } : { thinkingLevel: "minimal" },
              ...(o.json ? { responseMimeType: "application/json" } : {}),
            },
          }),
          signal: AbortSignal.timeout(o.timeoutMs ?? 25_000),
        });
        if (last.status !== 429 && last.status !== 404) return last;
      }
      return last!;
    },
  },
  { id: "groq", label: "Groq (free tier)", key: () => process.env.GROQ_API_KEY,
    call: openAiCompatible("https://api.groq.com/openai/v1/chat/completions", () => process.env.GROQ_MODEL || "llama-3.3-70b-versatile") },
  { id: "cerebras", label: "Cerebras (free tier)", key: () => process.env.CEREBRAS_API_KEY,
    call: openAiCompatible("https://api.cerebras.ai/v1/chat/completions", () => process.env.CEREBRAS_MODEL || "llama-3.3-70b") },
  { id: "openrouter", label: "OpenRouter (free models)", key: () => process.env.OPENROUTER_API_KEY,
    call: openAiCompatible("https://openrouter.ai/api/v1/chat/completions", () => process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free",
      { "HTTP-Referer": "https://www.propknown.com", "X-Title": "PropKnown" }) },
];

function textOf(id: ApiProvider, data: Record<string, unknown>): string {
  if (id === "gemini") {
    const c = (data.candidates as { content?: { parts?: { text?: string }[] } }[] | undefined)?.[0];
    return (c?.content?.parts ?? []).map((p) => p.text ?? "").join("");
  }
  return ((data.choices as { message?: { content?: string } }[] | undefined)?.[0]?.message?.content) ?? "";
}

export function parseJsonLoose<T>(text: string): T {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try { return JSON.parse(t) as T; } catch { /* fall through */ }
  const start = t.search(/[[{]/), end = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  if (start >= 0 && end > start) return JSON.parse(t.slice(start, end + 1)) as T;
  throw new Error("not JSON");
}

export interface RouterResult { text: string; provider: ApiProvider }

// Plain text answer from the first free provider that works.
export async function aiText(prompt: string, o: Opts = {}, only?: ApiProvider[]): Promise<RouterResult> {
  const errors: string[] = [];
  for (const p of PROVIDERS) {
    if (only && !only.includes(p.id)) continue;
    const key = p.key();
    if (!key) continue;
    try {
      let res = await p.call(prompt, o, key);
      recordApiCall(p.id, res.ok ? "ok" : res.status === 429 ? "rate_limited" : "error");
      // Free tiers have per-minute limits: wait once and retry the same provider before moving on.
      if ((res.status === 429 || res.status === 503) && (o.retryWaitMs ?? 20_000) > 0) {
        await new Promise((r) => setTimeout(r, o.retryWaitMs ?? 20_000));
        res = await p.call(prompt, o, key);
        recordApiCall(p.id, res.ok ? "ok" : res.status === 429 ? "rate_limited" : "error");
      }
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      const text = res.ok ? textOf(p.id, data) : "";
      if (text.trim()) return { text, provider: p.id };
      errors.push(`${p.id} ${res.status}`);
    } catch (e) {
      recordApiCall(p.id, "error");
      errors.push(`${p.id} ${e instanceof Error ? e.name : "error"}`);
    }
  }
  throw new AiRouterError(errors.length ? `all free AI providers failed: ${errors.join(", ")}` : "no AI provider configured");
}

// JSON answer; a provider that returns invalid JSON counts as failed and the next one is tried.
export async function aiJson<T = Record<string, unknown>>(prompt: string, o: Opts = {}): Promise<{ value: T; provider: ApiProvider }> {
  const errors: string[] = [];
  for (const p of PROVIDERS) {
    if (!p.key()) continue;
    try {
      const r = await aiText(prompt, { ...o, json: true }, [p.id]);
      return { value: parseJsonLoose<T>(r.text), provider: r.provider };
    } catch (e) { errors.push(e instanceof Error ? e.message : String(e)); }
  }
  throw new AiRouterError(errors.join(" | ") || "no AI provider configured");
}

export const configuredProviders = () => PROVIDERS.filter((p) => p.key()).map((p) => p.id);
