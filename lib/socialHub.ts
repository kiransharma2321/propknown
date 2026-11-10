import { SITE_URL } from "@/lib/site";

// Task J: Social Media Hub helpers. Captions are the drafts already stored on each published
// blog post / podcast episode (written only from that item's title and summary). The hub never
// posts by itself: it builds tracked links and the platforms' own share URLs, and the admin posts
// from their own account. (Direct API posting needs Meta / LinkedIn app setup -- not done.)

export const PLATFORMS = {
  linkedin: { label: "LinkedIn", limit: 3000 },
  instagram: { label: "Instagram", limit: 2200 },
  whatsapp: { label: "WhatsApp", limit: 1000 },
  x: { label: "X (Twitter)", limit: 280 },
} as const;
export type Platform = keyof typeof PLATFORMS;

// UTM-tagged link so visits from each platform show up in Business Insights.
export function trackedUrl(path: string, platform: Platform, campaign: string): string {
  const u = new URL(path, SITE_URL);
  u.searchParams.set("utm_source", platform);
  u.searchParams.set("utm_medium", "social");
  u.searchParams.set("utm_campaign", campaign.slice(0, 60));
  return u.toString();
}

// The platforms' public share pages (no API keys, the admin's own login).
export function shareUrl(platform: Platform, text: string, link: string): string | null {
  if (platform === "linkedin") return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`;
  if (platform === "x") return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text.slice(0, 230))}&url=${encodeURIComponent(link)}`;
  if (platform === "whatsapp") return `https://wa.me/?text=${encodeURIComponent(`${text}\n\n${link}`)}`;
  return null; // Instagram has no web share: copy the caption and post from the app.
}

export interface HubItem { kind: "post" | "episode"; id: string; title: string; path: string; publishedAt: string | null; captions: Partial<Record<Platform | "reelScript", string>> }

// Pick the caption for a platform; X reuses the LinkedIn text, cut to fit with the link.
export function captionFor(item: HubItem, p: Platform): string {
  const c = item.captions;
  const raw = p === "x" ? (c.x ?? c.linkedin ?? item.title) : (c[p] ?? (p === "whatsapp" ? c.linkedin : undefined) ?? item.title);
  return p === "x" && raw.length > 250 ? `${raw.slice(0, 247).replace(/\s+\S*$/, "")}…` : raw;
}
