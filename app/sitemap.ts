import type { MetadataRoute } from "next";
import { PUBLIC_LISTINGS } from "@/lib/listings";
import { prisma } from "@/lib/db";
import { areaPagesWithData } from "@/lib/areaPages";
import { GUIDES } from "@/lib/guides";

const BASE = "https://www.propknown.com";

// Rebuilt hourly so new cached area prices show up without a deploy.
export const revalidate = 3600;

// Static pages carry no lastModified: we don't know when each last changed, and stamping
// "today" on every crawl tells search engines nothing true.
const STATIC: { path: string; changeFrequency: "weekly" | "monthly" | "yearly"; priority: number }[] = [
  { path: "",                 changeFrequency: "weekly",  priority: 1.0 },
  { path: "/buy",             changeFrequency: "weekly",  priority: 0.95 },
  { path: "/sell",            changeFrequency: "monthly", priority: 0.85 },
  { path: "/services",        changeFrequency: "monthly", priority: 0.80 },
  { path: "/ai-intelligence", changeFrequency: "weekly",  priority: 0.90 },
  { path: "/invest",          changeFrequency: "weekly",  priority: 0.90 },
  { path: "/builders",        changeFrequency: "monthly", priority: 0.75 },
  { path: "/about",           changeFrequency: "monthly", priority: 0.65 },
  { path: "/contact",         changeFrequency: "monthly", priority: 0.70 },
  { path: "/pricing",         changeFrequency: "monthly", priority: 0.60 },
  { path: "/privacy",         changeFrequency: "yearly",  priority: 0.30 },
  { path: "/terms",           changeFrequency: "yearly",  priority: 0.30 },
  { path: "/disclaimer",      changeFrequency: "yearly",  priority: 0.30 },
  { path: "/true-cost",       changeFrequency: "monthly", priority: 0.70 },
  { path: "/verified",        changeFrequency: "monthly", priority: 0.65 },
  { path: "/nri",             changeFrequency: "monthly", priority: 0.80 },
  { path: "/legal-shield",    changeFrequency: "monthly", priority: 0.75 },
  { path: "/price-check",     changeFrequency: "monthly", priority: 0.80 },
  { path: "/podcast",         changeFrequency: "monthly", priority: 0.55 },
  { path: "/guides",          changeFrequency: "weekly",  priority: 0.70 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = STATIC.map((s) => ({ url: `${BASE}${s.path}`, changeFrequency: s.changeFrequency, priority: s.priority }));

  // Only area pages with at least one real cached price; dated by their newest cache row.
  const areaPages: MetadataRoute.Sitemap = (await areaPagesWithData()).map((p) => ({
    url: `${BASE}${p.path}`, lastModified: p.lastModified, changeFrequency: "weekly", priority: 0.85,
  }));

  // Sample listings appear only when the flag is on; they have no real change date.
  const propertyPages: MetadataRoute.Sitemap = PUBLIC_LISTINGS.map((l) => ({
    url: `${BASE}/buy/${l.id}`, changeFrequency: "monthly", priority: 0.85,
  }));

  // Admin-approved owner listings at /buy/submission/[id].
  const submissions = await prisma.propertySubmission.findMany({ where: { status: "approved" }, select: { id: true, updatedAt: true } });
  const submissionPages: MetadataRoute.Sitemap = submissions.map((s) => ({
    url: `${BASE}/buy/submission/${s.id}`, lastModified: s.updatedAt, changeFrequency: "monthly", priority: 0.80,
  }));

  // Guides only once the author has reviewed every claim (drafts are noindex).
  const guidePages: MetadataRoute.Sitemap = GUIDES.filter((g) => g.reviewed).map((g) => ({
    url: `${BASE}/guides/${g.slug}`, lastModified: new Date(g.updated), changeFrequency: "monthly", priority: 0.70,
  }));

  return [...staticPages, ...areaPages, ...guidePages, ...propertyPages, ...submissionPages];
}
