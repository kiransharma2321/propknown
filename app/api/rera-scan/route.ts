import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getReraState } from "@/lib/reraStates";

// Checks ONLY against PropKnown's own admin-verified property records -- the same
// reraNumber/verificationFlags on Property and PropertySubmission that VerificationBadge and
// the submission detail page use. Deliberately does NOT query any third-party search API or
// display/parse content from external real-estate portals (NoBroker, 99acres, Housing.com,
// MagicBricks, etc.) -- an earlier version of this route did that via a Tavily search +
// Gemini-extraction fallback, but that repackaged those sites' own listing data (project name,
// price, location) as if it were PropKnown's own check, which both risks violating their ToS
// (most explicitly prohibit scraping/commercial reuse of listing data) and contradicts the
// "honest, verified" positioning this feature exists for. When a number isn't in our own
// database, the honest answer is to send the user to do their own lookup on the real sources --
// see the googleSearchUrl below -- not to quietly stand in for them.
const RERA_FORMAT = /^[A-Z]{1,5}\d*\/?[A-Z0-9\/-]{3,}$/i;

export async function POST(req: NextRequest) {
  const { reraNumber, state } = await req.json() as { reraNumber?: string; state?: string };
  const num = reraNumber?.trim();

  if (!num) {
    return NextResponse.json({ error: "A RERA number is required" }, { status: 400 });
  }

  const stateInfo = state ? getReraState(state) : undefined;
  const statePayload = stateInfo
    ? { stateName: stateInfo.name, stateAuthority: stateInfo.authorityName, statePortalUrl: stateInfo.portalUrl }
    : {};
  // A plain, unmodified Google search link for the exact number -- points the user at the
  // real source pages (NoBroker/99acres/Housing.com/MagicBricks/etc.) themselves, rather than
  // PropKnown fetching and re-displaying their content on their behalf.
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(num)}`;

  const normalised = num.toLowerCase();

  const [properties, submissions] = await Promise.all([
    prisma.property.findMany({
      where: { reraNumber: { not: null } },
      select: { title: true, location: true, reraNumber: true, verificationFlags: true },
    }),
    prisma.propertySubmission.findMany({
      where: { reraNumber: { not: null }, status: "approved" },
      select: { title: true, city: true, area: true, reraNumber: true, verificationFlags: true },
    }),
  ]);

  const match = [
    ...properties.map(p => ({ title: p.title, location: p.location, reraNumber: p.reraNumber, flags: p.verificationFlags as Record<string, unknown> })),
    ...submissions.map(s => ({ title: s.title, location: `${s.area}, ${s.city}`, reraNumber: s.reraNumber, flags: s.verificationFlags as Record<string, unknown> })),
  ].find(r => r.reraNumber?.trim().toLowerCase() === normalised);

  if (match && match.flags?.reraVerified === true) {
    return NextResponse.json({
      status:      "verified",
      message:     `This RERA number is verified in PropKnown's own admin-checked records, associated with "${match.title}" (${match.location}).`,
      propertyTitle: match.title,
      propertyLocation: match.location,
      ...statePayload,
    });
  }

  // A record exists (it's on file, tied to a real listing) but hasn't been through admin
  // verification yet -- this is NOT the same as "we've never heard of this number", and must
  // never be shown as if it were. Saying "pending" here is the honest middle ground: neither
  // a false "verified" nor a false "not found" for a number that's genuinely on our books.
  if (match) {
    return NextResponse.json({
      status:  "pending",
      message: `This RERA number is on file for "${match.title}" (${match.location}), but PropKnown hasn't independently verified it yet. Verification pending — please confirm it directly on your state's official RERA portal in the meantime.`,
      propertyTitle: match.title,
      propertyLocation: match.location,
      googleSearchUrl,
      ...statePayload,
    });
  }

  if (!RERA_FORMAT.test(num)) {
    return NextResponse.json({
      status:  "flagged",
      message: "This doesn't resemble a typical RERA registration number format. Treat it with caution and confirm directly on your state's official RERA portal before relying on it.",
      googleSearchUrl,
      ...statePayload,
    });
  }

  return NextResponse.json({
    status:  "not_found",
    message: "We don't have this RERA number in PropKnown's own verified database. That doesn't mean it's invalid — search it yourself on Google or check directly on your state's official RERA portal below.",
    googleSearchUrl,
    ...statePayload,
  });
}
