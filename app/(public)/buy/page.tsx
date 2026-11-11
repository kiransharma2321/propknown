import { prisma } from "@/lib/db";
import BuyPageClient, { type Submission } from "@/components/property/BuyPageClient";

// Matches the existing app/api/submissions/route.ts's own force-dynamic -- without this, Next.js
// could statically bake in whatever submissions existed at build/deploy time and serve that
// stale snapshot to everyone until the next deploy, rather than freshly-approved listings.
export const dynamic = "force-dynamic";

// Verification flags without the internal adminFlag review note.
function publicFlags(v: unknown): Submission["verificationFlags"] {
  const f = { ...((v ?? {}) as Submission["verificationFlags"] & { adminFlag?: string }) };
  delete f.adminFlag;
  return f;
}

function inrDisplay(n: number): string {
  if (n >= 10_000_000) return `₹${+(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000) return `₹${+(n / 100_000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

// Server Component -- fetches approved listings at request time so they're present in the
// initial HTML. Two real sources: owner submissions (/sell) and listings the team adds in
// admin (Quick Add / Properties tab). The hardcoded sample listings are off by default
// (see SHOW_SAMPLE_LISTINGS in lib/listings.ts).
export default async function BuyPage() {
  const [subs, props] = await Promise.all([
    prisma.propertySubmission.findMany({ where: { status: "approved" }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.property.findMany({ where: { status: "approved" }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

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

  // Admin-added listings use the same card. Only fields we actually hold are shown -- no AI
  // score, and verification badges only for rows approved through the 10-point checklist.
  const adminListings: Submission[] = props.map(p => ({
    id:          p.id,
    title:       p.title.trim(),
    propType:    p.propertyType.charAt(0).toUpperCase() + p.propertyType.slice(1),
    bhk:         p.beds ? `${p.beds} BHK` : undefined,
    size:        p.sqft ? String(p.sqft) : undefined,
    sizeUnit:    p.sqft ? "sqft" : undefined,
    // No stated price (e.g. an approved RERA project draft) -> "Price on request", never an estimate.
    priceDisplay: !(p.price > 0) ? "Price on request" : p.currency === "INR" ? inrDisplay(p.price) : `${p.currency} ${p.price.toLocaleString()}`,
    city:        p.city,
    area:        p.location.trim().replace(/^\w/, c => c.toUpperCase()),
    reraNumber:  p.reraNumber?.trim() || undefined,
    // Venture photos are stored as /api/files/<id> (uploaded in the Approval Queue).
    photoIds:    p.images.filter((u) => u.startsWith("/api/files/")).map((u) => u.slice("/api/files/".length)), videoIds: [], videoUrls: [],
    // adminFlag is an internal review note (admin dashboard only) -- never sent to the page.
    verificationFlags: p.verified ? publicFlags(p.verificationFlags) : {},
    createdAt:   p.createdAt.toISOString(),
    detailHref:  null,
    listedBy:    "propknown" as const,
  }));

  return <BuyPageClient initialSubmissions={[...initialSubmissions, ...adminListings]} />;
}
