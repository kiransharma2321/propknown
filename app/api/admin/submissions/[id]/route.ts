import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notifyMatchingAlerts } from "@/lib/alerts";
import { getAdminSession, canRole } from "@/lib/rbac";

async function requireSubmissionsAccess() {
  const session = await getAdminSession();
  return session && canRole(session.role, "submissions");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await requireSubmissionsAccess())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
    verificationFlags: sub.verificationFlags,
    legalChecklist: sub.legalChecklist,
    legalNotes:     sub.legalNotes,
    constructionMilestones: sub.constructionMilestones,
    constructionPct:        sub.constructionPct,
    expectedCompletion:     sub.expectedCompletion,
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
  if (!(await requireSubmissionsAccess())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    action, reason, notes, verificationFlags,
    legalChecklist, legalNotes,
    constructionMilestones, constructionPct, expectedCompletion,
  } = body;

  if (action !== undefined && !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  const hasOtherUpdate = [verificationFlags, legalChecklist, legalNotes, constructionMilestones, constructionPct, expectedCompletion]
    .some(v => v !== undefined);
  if (action === undefined && !hasOtherUpdate) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (action) {
    data.status       = action === "approve" ? "approved" : "rejected";
    data.rejectReason = action === "reject" ? (reason ?? null) : null;
    if (notes !== undefined) data.adminNotes = notes;
  }
  // Each of these panels (verification, legal checklist, construction progress) is
  // admin-toggled independently of approve/reject and of each other, so any subset can be
  // updated at any time without needing to touch the others.
  if (verificationFlags !== undefined) data.verificationFlags = verificationFlags;
  if (legalChecklist !== undefined) data.legalChecklist = legalChecklist;
  if (legalNotes !== undefined) data.legalNotes = legalNotes;
  if (constructionMilestones !== undefined) data.constructionMilestones = constructionMilestones;
  if (constructionPct !== undefined) data.constructionPct = constructionPct;
  if (expectedCompletion !== undefined) data.expectedCompletion = expectedCompletion;

  const updated = await prisma.propertySubmission.update({
    where: { id: params.id },
    data,
  });

  if (action === "approve") {
    notifyMatchingAlerts({
      id: updated.id, title: updated.title, propType: updated.propType,
      city: updated.city, area: updated.area, priceDisplay: updated.priceDisplay,
    }).catch(() => null);
  }

  return NextResponse.json({
    id: updated.id, status: updated.status,
    verificationFlags: updated.verificationFlags,
    legalChecklist: updated.legalChecklist, legalNotes: updated.legalNotes,
    constructionMilestones: updated.constructionMilestones,
    constructionPct: updated.constructionPct, expectedCompletion: updated.expectedCompletion,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await requireSubmissionsAccess())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.propertySubmission.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
