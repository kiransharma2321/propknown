import Link from "next/link";
import { prisma } from "@/lib/db";
import { StudioTop, ShowSettings } from "./forms";

export const dynamic = "force-dynamic";

const day = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const STATUSES = ["idea", "draft", "published"] as const;

export default async function PodcastStudioPage({ searchParams }: { searchParams: { status?: string } }) {
  const status = STATUSES.includes(searchParams.status as (typeof STATUSES)[number]) ? searchParams.status! : "draft";
  const [episodes, show] = await Promise.all([
    prisma.podcastEpisode.findMany({ where: { status }, orderBy: { createdAt: "desc" }, take: 100 }).catch(() => null),
    prisma.podcastShow.findUnique({ where: { id: "show" } }).catch(() => null),
  ]);

  return (
    <div>
      <h1 className="heading-h3">Podcast Studio</h1>
      <p className="text-gray-500 text-sm mb-5 max-w-3xl">
        Upload your recorded MP3; AI drafts the transcript, title, show notes, chapters and SEO description for you to edit. Nothing goes live until you click Approve &amp; Publish.
        RSS feed for Spotify / Apple / YouTube Music: <a href="/podcast/feed.xml" className="underline" target="_blank">/podcast/feed.xml</a>.
      </p>
      {episodes === null && <p className="mb-4 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">The podcast tables haven&apos;t been created yet: run the pending database update first.</p>}
      <StudioTop />

      <div className="flex gap-2 mb-3">
        {STATUSES.map((s) => (
          <Link key={s} href={`?status=${s}`} className={`text-xs px-3 py-1 rounded-full border capitalize ${s === status ? "bg-gray-900 text-white border-gray-900" : "border-gray-300 text-gray-600"}`}>{s === "idea" ? "Ideas" : s}</Link>
        ))}
      </div>
      <div className="space-y-2 mb-8">
        {episodes?.length === 0 && <p className="text-sm text-gray-400">Nothing here yet.</p>}
        {episodes?.map((e) => (
          <Link key={e.id} href={`/admin/automation/podcast-studio/${e.id}`} className="card-dark p-3 block hover:border-gray-400">
            <p className="font-semibold text-gray-900">{e.title}</p>
            <p className="text-xs text-gray-500">{e.topic ?? "No topic"} · {e.audioUrl ? "audio uploaded" : "no audio yet"} · {day(e.createdAt)}{e.publishedAt ? ` · published ${day(e.publishedAt)}` : ""}</p>
          </Link>
        ))}
      </div>

      <ShowSettings show={{ title: show?.title ?? "The PropKnown Podcast", description: show?.description ?? "", coverUrl: show?.coverUrl ?? "", ownerName: show?.ownerName ?? "Pinnelli Raghukiran", ownerEmail: show?.ownerEmail ?? "", category: show?.category ?? "Business" }} />
    </div>
  );
}
