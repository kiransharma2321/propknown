// First-touch lead attribution: where a visitor first came from (UTM tags, referrer, landing
// page), kept in a first-party cookie for 90 days and sent with every lead form. Nothing else is
// captured. The capture side is components/AttributionCapture.tsx.

export const ATTRIBUTION_COOKIE = "pk_ft";
export const ATTRIBUTION_DAYS = 90;
export const ATTRIBUTION_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "referrer", "landing_page"] as const;
export type Attribution = Partial<Record<(typeof ATTRIBUTION_KEYS)[number], string>>;

/** Browser only: the stored first-touch values, or null. */
export function readAttribution(): Attribution | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie.split("; ").find((c) => c.startsWith(`${ATTRIBUTION_COOKIE}=`));
  if (!raw) return null;
  try {
    return cleanAttribution(JSON.parse(decodeURIComponent(raw.slice(ATTRIBUTION_COOKIE.length + 1))));
  } catch {
    return null;
  }
}

/** Keeps only the known keys, as short strings. Used on both client and server. */
export function cleanAttribution(v: unknown): Attribution | null {
  if (!v || typeof v !== "object") return null;
  const out: Attribution = {};
  for (const k of ATTRIBUTION_KEYS) {
    const x = (v as Record<string, unknown>)[k];
    if (typeof x === "string" && x.trim()) out[k] = x.trim().slice(0, k === "landing_page" || k === "referrer" ? 300 : 120);
  }
  return Object.keys(out).length ? out : null;
}
