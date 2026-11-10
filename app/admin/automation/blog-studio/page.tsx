import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const day = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const STATUSES = ["draft", "published", "rejected"] as const;

export default async function BlogStudioPage({ searchParams }: { searchParams: { status?: string } }) {
  const status = STATUSES.includes(searchParams.status as (typeof STATUSES)[number]) ? searchParams.status! : "draft";
  const [posts, items] = await Promise.all([
    prisma.blogPost.findMany({ where: { status }, orderBy: { createdAt: "desc" }, take: 100 }).catch(() => null),
    prisma.newsItem.findMany({ orderBy: { fetchedAt: "desc" }, take: 30 }).catch(() => null),
  ]);

  return (
    <div>
      <h1 className="heading-h3">Blog Studio</h1>
      <p className="text-gray-500 text-sm mb-5 max-w-3xl">
        The daily news cron collects developments from approved sources (RBI, TG RERA notices, PIB/report/news headlines via search) and drafts original articles here. Weekly Market Pulse drafts come from our own price data on Mondays. Nothing is public until you click Approve &amp; Publish.
      </p>
      {posts === null && <p className="mb-4 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">The blog tables haven&apos;t been created yet: run the pending database update first.</p>}

      <div className="flex gap-2 mb-3">
        {STATUSES.map((s) => (
          <Link key={s} href={`?status=${s}`} className={`text-xs px-3 py-1 rounded-full border capitalize ${s === status ? "bg-gray-900 text-white border-gray-900" : "border-gray-300 text-gray-600"}`}>{s}</Link>
        ))}
      </div>
      <div className="space-y-2 mb-10">
        {posts?.length === 0 && <p className="text-sm text-gray-400">Nothing {status} yet.</p>}
        {posts?.map((p) => (
          <Link key={p.id} href={`/admin/automation/blog-studio/${p.id}`} className="card-dark p-3 block hover:border-gray-400">
            <p className="font-semibold text-gray-900">{p.title}</p>
            <p className="text-xs text-gray-500">{p.kind === "market_pulse" ? "Market Pulse" : "News"} · {day(p.createdAt)}{p.publishedAt ? ` · published ${day(p.publishedAt)}` : ""}</p>
          </Link>
        ))}
      </div>

      <h2 className="font-semibold text-gray-900 mb-2">Latest collected items</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-400"><th className="py-2 pr-3">Headline</th><th className="pr-3">Source</th><th className="pr-3">Markets</th><th className="pr-3">Score</th><th>Used</th></tr></thead>
          <tbody>
            {(items ?? []).map((i) => (
              <tr key={i.id} className="border-t border-gray-100">
                <td className="py-2 pr-3"><a href={i.url} target="_blank" rel="noopener noreferrer" className="underline">{i.title}</a></td>
                <td className="pr-3 whitespace-nowrap">{i.sourceName}</td><td className="pr-3">{i.markets.join(", ") || "—"}</td>
                <td className="pr-3 tabular-nums">{i.relevance}</td><td>{i.postId ? "✓" : ""}</td>
              </tr>
            ))}
            {items?.length === 0 && <tr><td colSpan={5} className="py-3 text-gray-400">Nothing collected yet. The cron runs daily at 02:00 UTC.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
