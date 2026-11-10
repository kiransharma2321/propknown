import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PostEditor, StudioActions } from "../forms";
import type { Citation } from "@/lib/news/draft";

export const dynamic = "force-dynamic";

export default async function BlogPostStudio({ params }: { params: { id: string } }) {
  const p = await prisma.blogPost.findUnique({ where: { id: params.id } }).catch(() => null);
  if (!p) notFound();
  const citations = (p.citations ?? []) as unknown as Citation[];
  const social = (p.socialDrafts ?? null) as { instagram?: string; linkedin?: string } | null;

  return (
    <div>
      <Link href="/admin/automation/blog-studio" className="text-xs text-gray-400 underline">← Blog Studio</Link>
      <h1 className="heading-h3 mt-2 mb-1">{p.title}</h1>
      <p className="text-sm text-gray-500 mb-5">{p.kind === "market_pulse" ? "Market Pulse" : "News"} · status <b>{p.status}</b>{p.status === "published" && <> · <Link href={`/news/${p.slug}`} className="underline">view live</Link></>}</p>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <PostEditor p={{ id: p.id, title: p.title, excerpt: p.excerpt, body: p.body, whatItMeans: p.whatItMeans, status: p.status }} />
        <div className="space-y-4">
          {p.status === "draft" && <StudioActions id={p.id} />}
          <div className="card-dark p-4 text-sm">
            <p className="font-semibold text-gray-900 mb-2">Sources (every fact links here)</p>
            <ul className="space-y-2">
              {citations.map((c) => (
                <li key={c.url}>
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="underline">{c.title}</a>
                  <span className="text-gray-500"> · {c.source}{c.date ? `, ${c.date}` : ""}</span>
                  {c.quote && <p className="text-xs text-gray-500 italic">Quote used: &ldquo;{c.quote}&rdquo;</p>}
                </li>
              ))}
            </ul>
          </div>
          {social && (
            <div className="card-dark p-4 text-sm space-y-2">
              <p className="font-semibold text-gray-900">Social captions (drafts for Content Studio)</p>
              {social.instagram && <p className="whitespace-pre-wrap"><b>Instagram:</b> {social.instagram}</p>}
              {social.linkedin && <p className="whitespace-pre-wrap"><b>LinkedIn:</b> {social.linkedin}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
