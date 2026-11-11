import { prisma } from "@/lib/db";

// Daily outbound API usage for the admin "Engine Health" page. One row per provider per UTC day
// in api_usage. Recording is fire-and-forget and never throws -- usage tracking must not slow
// down or break a price lookup.

export type ApiProvider = "gemini" | "tavily" | "rapidapi"
  // Own Engine (free tiers only): AI router, search layer, page fetcher.
  | "groq" | "cerebras" | "openrouter" | "searxng" | "brave" | "serper" | "fetch";
export type CallOutcome = "ok" | "error" | "rate_limited";

export function utcDay(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function recordApiCall(provider: ApiProvider, outcome: CallOutcome): void {
  const day = utcDay();
  const errors = outcome === "ok" ? 0 : 1;
  const rateLimited = outcome === "rate_limited" ? 1 : 0;
  prisma.apiUsage.upsert({
    where: { day_provider: { day, provider } },
    create: { day, provider, calls: 1, errors, rateLimited },
    update: { calls: { increment: 1 }, errors: { increment: errors }, rateLimited: { increment: rateLimited } },
  }).catch((e) => console.warn(`[engine] usage record failed (${provider}):`, e instanceof Error ? e.message : e));
}

// Quotas the Engine Health page measures against. Defaults are the free-tier limits as of
// Nov 2026; override with env vars when a plan changes. `period` says which window the limit
// applies to (Tavily's free plan is monthly credits, the others are per day).
export interface Quota { provider: ApiProvider; label: string; limit: number; period: "day" | "month"; note: string }

export function quotas(): Quota[] {
  const num = (v: string | undefined, d: number) => (v && Number(v) > 0 ? Number(v) : d);
  return [
    { provider: "gemini", label: "Gemini API", period: "day", limit: num(process.env.GEMINI_DAILY_QUOTA, 1500),
      note: "Requests per day across all models. Set GEMINI_DAILY_QUOTA to your AI Studio limit." },
    { provider: "tavily", label: "Tavily search", period: "month", limit: num(process.env.TAVILY_MONTHLY_QUOTA, 1000),
      note: "Free plan = 1,000 credits/month. Set TAVILY_MONTHLY_QUOTA if you upgrade." },
    { provider: "rapidapi", label: "RapidAPI (Bayut)", period: "day", limit: num(process.env.RAPIDAPI_DAILY_QUOTA, 100),
      note: "Bayut lookups are switched off: the bayut14 API no longer exists on RapidAPI." },
    // Own Engine free tiers (limits as published Nov 2026; override with env vars).
    { provider: "groq", label: "Groq (free)", period: "day", limit: num(process.env.GROQ_DAILY_QUOTA, 1000), note: "Free tier, per-model daily request limit. GROQ_API_KEY." },
    { provider: "cerebras", label: "Cerebras (free)", period: "day", limit: num(process.env.CEREBRAS_DAILY_QUOTA, 14400), note: "Free tier. CEREBRAS_API_KEY." },
    { provider: "openrouter", label: "OpenRouter (free models)", period: "day", limit: num(process.env.OPENROUTER_DAILY_QUOTA, 50), note: "Free models only: 50 requests/day (1,000/day after a one-time $10 credit top-up). OPENROUTER_API_KEY." },
    { provider: "searxng", label: "SearXNG (self-hosted)", period: "day", limit: num(process.env.SEARXNG_DAILY_QUOTA, 5000), note: "Your own search instance, no per-query cost. SEARXNG_URL." },
    { provider: "brave", label: "Brave Search (free)", period: "month", limit: num(process.env.BRAVE_MONTHLY_QUOTA, 2000), note: "Free plan monthly queries. BRAVE_API_KEY." },
    { provider: "serper", label: "Serper (free credits)", period: "month", limit: num(process.env.SERPER_MONTHLY_QUOTA, 2500), note: "One-time 2,500 free queries. SERPER_API_KEY." },
    { provider: "fetch", label: "Page fetcher (own)", period: "day", limit: num(process.env.FETCH_DAILY_QUOTA, 5000), note: "Our own page fetches, robots.txt respected. No cost." },
  ];
}

export const USAGE_WARN_RATIO = 0.8;

// Every Own Engine provider runs on its free tier, so its cost is Rs 0. A paid plan is never
// called automatically; if one is ever added, its per-call cost (INR) goes here.
export const COST_PER_CALL_INR: Partial<Record<ApiProvider, number>> = {};
