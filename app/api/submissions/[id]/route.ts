import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sub = await prisma.propertySubmission.findUnique({ where: { id: params.id } });

  if (!sub || sub.status !== "approved") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id:          sub.id,
    title:       sub.title,
    propType:    sub.propType,
    bhk:         sub.bhk,
    size:        sub.size,
    sizeUnit:    sub.sizeUnit,
    priceDisplay: sub.priceDisplay,
    city:        sub.city,
    area:        sub.area,
    description: sub.description,
    features:    sub.features,
    reraNumber:  sub.reraNumber,
    ownerName:   sub.ownerName,
    ownerPhone:  sub.ownerPhone,
    photoIds:    JSON.parse(sub.photoIds  || "[]"),
    photoCaptions: sub.photoCaptions,
    videoIds:    JSON.parse(sub.videoIds  || "[]"),
    videoUrls:   JSON.parse(sub.videoUrls || "[]"),
    verificationFlags: sub.verificationFlags,
    legalChecklist: sub.legalChecklist,
    legalNotes:     sub.legalNotes,
    constructionMilestones: sub.constructionMilestones,
    constructionPct:        sub.constructionPct,
    expectedCompletion:     sub.expectedCompletion,
    // docIds intentionally excluded from public endpoint
    createdAt:   sub.createdAt,
  });
}
