import { prisma } from "@/lib/db";
import { FEATURES } from "@/lib/features";
import { PLATFORMS, captionFor, shareUrl, trackedUrl, type HubItem, type Platform } from "@/lib/socialHub";
import CopyButton from "./CopyButton";

export const dynamic = "force-dynamic";

// Task J: Social Media Hub (master only via the automation layout; flag NEXT_PUBLIC_FEATURE_SOCIAL_HUB).
export default async function SocialHubPage() {
  if (!FEATURES.socialHub) return <p className="text-sm text-gray-500">The Social Media Hub is switched off (feature flag NEXT_PUBLIC_FEATURE_SOCIAL_HUB).</p>;
  const [posts, episodes] = await Promise.all([
    prisma.blogPost.findMany({ where: { status: "published" }, orderBy: { publishedAt: "desc" }, take: 30, select: { id: true, slug: true, title: true, publishedAt: true, socialDrafts: true } }).catch(() => []),
    prisma.podcastEpisode.findMany({ where: { status: "published" }, orderBy: { publishedAt: "desc" }, take: 30, select: { id: true, slug: true, title: true, publishedAt: true, socialDrafts: true } }).catch(() => []),
  ]);
  const items: HubItem[] = [
    ...posts.map((p) => ({ kind: "post" as const, id: p.id, title: p.title, path: `/news/${p.slug}`, publishedAt: p.publishedAt?.toISOString() ?? null, captions: (p.socialDrafts ?? {}) as HubItem["captions"] })),
    ...episodes.map((e) => ({ kind: "episode" as const, id: e.id, title: e.title, path: `/podcast/${e.slug}`, publishedAt: e.publishedAt?.toISOString() ?? null, captions: (e.socialDrafts ?? {}) as HubItem["captions"] })),
  ].sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="heading-h3">Social Media Hub</h1>
        <p className="text-sm text-gray-500">Every published article and episode with its drafted captions and a tracked link for each platform. Check the caption, then post from your own account. Nothing is posted automatically.</p>
      </div>
      {items.length === 0 && <p className="text-sm text-gray-500">Nothing published yet. Captions appear here when a Blog Studio article or a podcast episode is published.</p>}
      {items.map((it) => (
        <div key={`${it.kind}-${it.id}`} className="border border-gray-200 rounded-xl p-4 bg-white">
          <p className="font-semibold">{it.title} <span className="text-xs font-normal text-gray-500">· {it.kind === "post" ? "Article" : "Podcast"} · {it.publishedAt ? new Date(it.publishedAt).toLocaleDateString("en-IN") : ""}</span></p>
          <div className="grid gap-3 md:grid-cols-2 mt-3">
            {(Object.keys(PLATFORMS) as Platform[]).map((p) => {
              const text = captionFor(it, p);
              const link = trackedUrl(it.path, p, it.path.split("/").pop() ?? "content");
              const share = shareUrl(p, text, link);
              const over = text.length > PLATFORMS[p].limit;
              return (
                <div key={p} className="border border-gray-100 rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between gap-2"><b>{PLATFORMS[p].label}</b><span className={`text-xs ${over ? "text-red-700" : "text-gray-500"}`}>{text.length}/{PLATFORMS[p].limit}</span></div>
                  <p className="text-gray-700 whitespace-pre-line mt-1 text-xs">{text}</p>
                  <p className="text-[11px] text-gray-500 break-all mt-1">{link}</p>
                  <div className="flex gap-3 mt-2"><CopyButton text={`${text}\n\n${link}`} label="Copy caption + link" />{share && <a href={share} target="_blank" rel="noopener noreferrer" className="text-xs underline text-[#7A5C1A]">Open {PLATFORMS[p].label} share</a>}</div>
                </div>
              );
            })}
          </div>
          {it.captions.reelScript && <details className="mt-3 text-sm"><summary className="cursor-pointer text-[#7A5C1A]">Reel script</summary><p className="whitespace-pre-line text-xs text-gray-700 mt-1">{it.captions.reelScript}</p><CopyButton text={it.captions.reelScript} /></details>}
        </div>
      ))}
    </div>
  );
}
