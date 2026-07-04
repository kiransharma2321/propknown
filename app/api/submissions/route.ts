import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const subs = await prisma.propertySubmission.findMany({
    where:   { status: "approved" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(
    subs.map(s => ({
      id:          s.id,
      title:       s.title,
      propType:    s.propType,
      bhk:         s.bhk,
      size:        s.size,
      sizeUnit:    s.sizeUnit,
      priceDisplay: s.priceDisplay,
      city:        s.city,
      area:        s.area,
      reraNumber:  s.reraNumber,
      photoIds:    JSON.parse(s.photoIds  || "[]"),
      videoIds:    JSON.parse(s.videoIds  || "[]"),
      videoUrls:   JSON.parse(s.videoUrls || "[]"),
      verificationFlags: s.verificationFlags,
      constructionPct: s.constructionPct,
      createdAt:   s.createdAt,
    }))
  );
}
