import { prisma } from "@/lib/db";
import BuyPageClient, { type Submission } from "@/components/property/BuyPageClient";

// Matches the existing app/api/submissions/route.ts's own force-dynamic -- without this, Next.js
// could statically bake in whatever submissions existed at build/deploy time and serve that
// stale snapshot to everyone until the next deploy, rather than freshly-approved listings.
export const dynamic = "force-dynamic";

// Server Component -- fetches approved submissions at request time so they're present in the
// initial HTML (previously fetched client-side via useEffect in what's now BuyPageClient.tsx,
// meaning owner-submitted listings were invisible in the server-rendered page and only
// appeared after hydration). The static curated LISTINGS array inside BuyPageClient.tsx was
// already fully server-rendered despite that file being "use client" -- Next.js SSRs client
// components' initial output by default; "use client" only opts into hydration/interactivity,
// it doesn't skip SSR -- confirmed directly against the built HTML before touching any of this,
// so submissions were the one genuine gap, not the whole page.
export default async function BuyPage() {
  const subs = await prisma.propertySubmission.findMany({
    where:   { status: "approved" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const initialSubmissions: Submission[] = subs.map(s => ({
    id:          s.id,
    title:       s.title,
    propType:    s.propType,
    bhk:         s.bhk ?? undefined,
    size:        s.size ?? undefined,
    sizeUnit:    s.sizeUnit ?? undefined,
    priceDisplay: s.priceDisplay,
    city:        s.city,
    area:        s.area,
    reraNumber:  s.reraNumber ?? undefined,
    photoIds:    JSON.parse(s.photoIds  || "[]"),
    videoIds:    JSON.parse(s.videoIds  || "[]"),
    videoUrls:   JSON.parse(s.videoUrls || "[]"),
    verificationFlags: s.verificationFlags as Submission["verificationFlags"],
    constructionPct: s.constructionPct ?? undefined,
    createdAt:   s.createdAt.toISOString(),
  }));

  return <BuyPageClient initialSubmissions={initialSubmissions} />;
}
