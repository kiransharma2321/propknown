import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sub = await prisma.propertySubmission.findUnique({ where: { id: params.id } });
  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const photoIds: string[]  = JSON.parse(sub.photoIds  || "[]");
  const videoIds: string[]  = JSON.parse(sub.videoIds  || "[]");
  const docIds:   string[]  = JSON.parse(sub.docIds    || "[]");
  const videoUrls: string[] = JSON.parse(sub.videoUrls || "[]");

  const [photoFiles, videoFiles, docFiles] = await Promise.all([
    photoIds.length ? prisma.uploadedFile.findMany({ where: { id: { in: photoIds } } }) : [],
    videoIds.length ? prisma.uploadedFile.findMany({ where: { id: { in: videoIds } } }) : [],
    docIds.length   ? prisma.uploadedFile.findMany({ where: { id: { in: docIds   } } }) : [],
  ]);

  return NextResponse.json({
    id:           sub.id,
    title:        sub.title,
    propType:     sub.propType,
    bhk:          sub.bhk,
    size:         sub.size,
    sizeUnit:     sub.sizeUnit,
    priceDisplay: sub.priceDisplay,
    city:         sub.city,
    area:         sub.area,
    description:  sub.description,
    features:     sub.features,
    reraNumber:   sub.reraNumber,
    ownerName:    sub.ownerName,
    ownerPhone:   sub.ownerPhone,
    ownerEmail:   sub.ownerEmail,
    status:       sub.status,
    rejectReason: sub.rejectReason,
    adminNotes:   sub.adminNotes,
    createdAt:    sub.createdAt,
    videoUrls,
    photoFiles:   photoFiles.map(f => ({ id: f.id, name: f.name, mimeType: f.mimeType, data: f.data })),
    videoFiles:   videoFiles.map(f => ({ id: f.id, name: f.name, mimeType: f.mimeType, data: f.data })),
    docFiles:     docFiles.map(f => ({ id: f.id, name: f.name, mimeType: f.mimeType, docType: f.docType, data: f.data })),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const { action, reason, notes } = body;

  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const updated = await prisma.propertySubmission.update({
    where: { id: params.id },
    data: {
      status:       action === "approve" ? "approved" : "rejected",
      rejectReason: action === "reject" ? (reason ?? null) : null,
      adminNotes:   notes ?? null,
    },
  });

  return NextResponse.json({ id: updated.id, status: updated.status });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.propertySubmission.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
