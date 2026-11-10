import { getMarketPrice } from "@/lib/engine";
import { findCachedProject } from "@/lib/projects";
import { sourceHosts } from "@/lib/engine/sources";
import { signValue, verifySigned } from "@/lib/emails/send";

// M2 price watchlist. Prices come ONLY from the cache (the same sourced, dated figures the site
// shows); this never triggers a paid search/AI call. A watch alerts when the published price
// moves by ALERT_PCT or more since the last figure we told the customer about.

export const ALERT_PCT = 3;
export const WATCH_KINDS = ["area", "project"] as const;
export type WatchKind = (typeof WATCH_KINDS)[number];
export const MAX_WATCHES = 25;

export interface WatchInput { kind: WatchKind; location: string; projectName?: string | null; propertyType?: string }

export function normaliseWatch(i: WatchInput): Required<Omit<WatchInput, "projectName">> & { projectName: string | null } {
  const clean = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 120);
  return {
    kind: i.kind,
    location: clean(i.location),
    projectName: i.kind === "project" && i.projectName ? clean(i.projectName) : null,
    propertyType: (i.propertyType || "apartment").toLowerCase().slice(0, 30),
  };
}

export function watchKey(i: WatchInput): string {
  const n = normaliseWatch(i);
  return [n.kind, n.location, n.projectName ?? "", n.propertyType].join("|").toLowerCase();
}

export interface WatchPrice { price: number; capturedAt: Date | null; sources: number; confidence: string | null }

// Current published price for a watch, or null if we don't have a sourced one.
export async function currentWatchPrice(w: { kind: string; location: string; projectName: string | null; propertyType: string }): Promise<WatchPrice | null> {
  if (w.kind === "project" && w.projectName) {
    const r = await findCachedProject(w.projectName, w.location, w.propertyType);
    if (!r?.found || !r.price || !r.price.sources.length) return null;
    return { price: r.price.median, capturedAt: r.price.capturedAt ? new Date(r.price.capturedAt) : null, sources: new Set(r.price.sources.map((s) => s.host)).size, confidence: r.confidence?.level ?? null };
  }
  const r = await getMarketPrice({ location: w.location, propertyType: w.propertyType, tool: "seo_page", cacheOnly: true, skipLog: true }).catch(() => null);
  if (!r?.available || !(Number(r.currentPricePerSqft) > 0)) return null;
  const hosts = sourceHosts(r.sourceUrls);
  if (!hosts.length) return null;
  return { price: Number(r.currentPricePerSqft), capturedAt: r.fetchedAt ? new Date(String(r.fetchedAt)) : null, sources: hosts.length, confidence: (r.confidence as { level?: string } | undefined)?.level ?? null };
}

export function changePct(prev: number, next: number): number {
  return Math.round(((next - prev) / prev) * 1000) / 10;
}

// Alert only on a real move of a newer figure (a re-read of the same capture never alerts).
export function shouldAlert(prev: { price: number | null; capturedAt: Date | null }, next: WatchPrice): boolean {
  if (!prev.price || prev.price <= 0) return false;
  if (prev.capturedAt && next.capturedAt && next.capturedAt.getTime() <= prev.capturedAt.getTime()) return false;
  return Math.abs(changePct(prev.price, next.price)) >= ALERT_PCT;
}

// One-click "stop this alert" link: signed watch id, no login needed.
export const stopToken = (watchId: string) => signValue(`watch-stop:${watchId}`);
export const verifyStopToken = (watchId: string, t: string) => verifySigned(`watch-stop:${watchId}`, t);
