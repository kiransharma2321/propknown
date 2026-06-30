import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "pending";

  const where = status === "all" ? {} : { status };

  const subs = await prisma.propertySubmission.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(
    subs.map(s => ({
      id:          s.id,
      title:       s.title,
      propType:    s.propType,
      bhk:         s.bhk,
      priceDisplay: s.priceDisplay,
      city:        s.city,
      area:        s.area,
      ownerName:   s.ownerName,
      ownerPhone:  s.ownerPhone,
      ownerEmail:  s.ownerEmail,
      reraNumber:  s.reraNumber,
      status:      s.status,
      rejectReason: s.rejectReason,
      createdAt:   s.createdAt,
      photoCount:  (JSON.parse(s.photoIds  || "[]") as string[]).length,
      videoCount:  (JSON.parse(s.videoIds  || "[]") as string[]).length +
                   (JSON.parse(s.videoUrls || "[]") as string[]).length,
      docCount:    (JSON.parse(s.docIds    || "[]") as string[]).length,
    }))
  );
}
