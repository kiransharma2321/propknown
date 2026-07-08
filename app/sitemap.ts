import type { MetadataRoute } from "next";
import { ALL_LISTINGS } from "@/lib/listings";
import { prisma } from "@/lib/db";

const BASE = "https://www.propknown.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE,                            lastModified: new Date(), changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE}/buy`,                   lastModified: new Date(), changeFrequency: "weekly",  priority: 0.95 },
    { url: `${BASE}/sell`,                  lastModified: new Date(), changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/services`,              lastModified: new Date(), changeFrequency: "monthly", priority: 0.80 },
    { url: `${BASE}/ai-intelligence`,       lastModified: new Date(), changeFrequency: "weekly",  priority: 0.90 },
    { url: `${BASE}/invest`,                lastModified: new Date(), changeFrequency: "weekly",  priority: 0.90 },
    { url: `${BASE}/builders`,              lastModified: new Date(), changeFrequency: "monthly", priority: 0.75 },
    { url: `${BASE}/about`,                 lastModified: new Date(), changeFrequency: "monthly", priority: 0.65 },
    { url: `${BASE}/contact`,               lastModified: new Date(), changeFrequency: "monthly", priority: 0.70 },
    { url: `${BASE}/pricing`,               lastModified: new Date(), changeFrequency: "monthly", priority: 0.60 },
    { url: `${BASE}/privacy`,               lastModified: new Date(), changeFrequency: "yearly",  priority: 0.30 },
    { url: `${BASE}/terms`,                 lastModified: new Date(), changeFrequency: "yearly",  priority: 0.30 },
    { url: `${BASE}/disclaimer`,            lastModified: new Date(), changeFrequency: "yearly",  priority: 0.30 },
    { url: `${BASE}/cost-calculator`,       lastModified: new Date(), changeFrequency: "monthly", priority: 0.70 },
    { url: `${BASE}/verified`,              lastModified: new Date(), changeFrequency: "monthly", priority: 0.65 },
    { url: `${BASE}/nri`,                   lastModified: new Date(), changeFrequency: "monthly", priority: 0.80 },
    { url: `${BASE}/legal-shield`,          lastModified: new Date(), changeFrequency: "monthly", priority: 0.75 },
    { url: `${BASE}/price-check`,           lastModified: new Date(), changeFrequency: "monthly", priority: 0.80 },
    { url: `${BASE}/podcast`,               lastModified: new Date(), changeFrequency: "monthly", priority: 0.55 },
  ];

  const propertyPages: MetadataRoute.Sitemap = ALL_LISTINGS.map(l => ({
    url: `${BASE}/buy/${l.id}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.85,
  }));

  // Admin-approved user submissions are real, unique, publicly viewable listings at
  // /buy/submission/[id] -- previously absent here entirely since this only ever read the
  // static ALL_LISTINGS array, so Google had no sitemap signal to crawl them even though
  // they're linked from /buy.
  const submissions = await prisma.propertySubmission.findMany({
    where: { status: "approved" },
    select: { id: true, updatedAt: true },
  });
  const submissionPages: MetadataRoute.Sitemap = submissions.map(s => ({
    url: `${BASE}/buy/submission/${s.id}`,
    lastModified: s.updatedAt,
    changeFrequency: "monthly",
    priority: 0.80,
  }));

  return [...staticPages, ...propertyPages, ...submissionPages];
}
