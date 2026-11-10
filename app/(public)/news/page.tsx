import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { OG_IMAGE } from "@/app/layout";

export const revalidate = 1800;

const title = "Real Estate News for Home Buyers";
const description = "Approved, original summaries of RBI decisions, RERA notices, infrastructure news and market reports, with what each means for buyers in Hyderabad, Bengaluru, Mumbai, Pune and Dubai.";
export const metadata: Metadata = { title, description, alternates: { canonical: "https://www.propknown.com/news" }, openGraph: { title, description, images: [OG_IMAGE] } };

const day = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default async function NewsPage() {
  const posts = await prisma.blogPost.findMany({ where: { status: "published" }, orderBy: { publishedAt: "desc" }, take: 50 }).catch(() => []);
  return (
    <div className="pt-28 sm:pt-32 pb-20 bg-white min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <p className="text-sm tracking-widest uppercase mb-2 font-semibold" style={{ color: "var(--gold-text)" }}>Market News</p>
        <h1 className="heading-h1 mb-3">{title}</h1>
        <p className="text-gray-500 mb-8">{description}</p>
        {posts.length === 0 && <p className="text-gray-400">No articles published yet.</p>}
        <div className="space-y-4">
          {posts.map((p) => (
            <Link key={p.id} href={`/news/${p.slug}`} className="block border border-gray-200 rounded-2xl p-5 hover:border-gray-400">
              <p className="text-xs text-gray-400 mb-1">{p.kind === "market_pulse" ? "Market Pulse" : "News"} · {p.publishedAt ? day(p.publishedAt) : ""}</p>
              <h2 className="font-semibold text-gray-900 text-lg">{p.title}</h2>
              <p className="text-sm text-gray-500 mt-1">{p.excerpt}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
