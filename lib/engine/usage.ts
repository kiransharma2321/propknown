import { prisma } from "@/lib/db";

// Daily outbound API usage for the admin "Engine Health" page. One row per provider per UTC day
// in api_usage. Recording is fire-and-forget and never throws -- usage tracking must not slow
// down or break a price lookup.

export type ApiProvider = "gemini" | "tavily" | "rapidapi";
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
  ];
}

export const USAGE_WARN_RATIO = 0.8;
