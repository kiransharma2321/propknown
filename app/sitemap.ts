import type { MetadataRoute } from "next";
import { ALL_LISTINGS } from "@/lib/listings";

const BASE = "https://www.propknown.com";

export default function sitemap(): MetadataRoute.Sitemap {
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
  ];

  const propertyPages: MetadataRoute.Sitemap = ALL_LISTINGS.map(l => ({
    url: `${BASE}/buy/${l.id}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.85,
  }));

  return [...staticPages, ...propertyPages];
}
