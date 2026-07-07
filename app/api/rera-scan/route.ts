import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Reuses the exact same RERA data this site already has -- the admin-verified reraNumber /
// verificationFlags on Property and PropertySubmission records (same source VerificationBadge
// and the submission detail page use) -- and the same format-sanity regex the Legal Shield
// Fraud Checker already applies. No independent government RERA portal lookup happens here;
// this is honestly PropKnown's own verified-database check, not a live government check.
const RERA_FORMAT = /^[A-Z]{1,5}\d*\/?[A-Z0-9\/-]{3,}$/i;

export async function POST(req: NextRequest) {
  const { reraNumber } = await req.json() as { reraNumber?: string };
  const num = reraNumber?.trim();

  if (!num) {
    return NextResponse.json({ error: "A RERA number is required" }, { status: 400 });
  }

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
    });
  }

  if (!RERA_FORMAT.test(num)) {
    return NextResponse.json({
      status:  "flagged",
      message: "This doesn't resemble a typical RERA registration number format. Treat it with caution and confirm directly on your state's official RERA portal before relying on it.",
    });
  }

  return NextResponse.json({
    status:  "not_found",
    message: "We don't have any record of this RERA number in PropKnown's database. That doesn't necessarily mean it's invalid — please confirm it directly on your state's official RERA portal before relying on it.",
  });
}
