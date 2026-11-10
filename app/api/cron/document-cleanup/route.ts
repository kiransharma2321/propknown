import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCronAuthorized } from "@/lib/cron";

export const dynamic = "force-dynamic";

// M5 daily job: permanently delete vault documents (file + check) older than 30 days. Runs even
// if the feature flag is later switched off, so stored documents never outlive the promise.
export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const expired = await prisma.documentCheck.findMany({ where: { expiresAt: { lt: new Date() } }, select: { id: true, fileId: true }, take: 500 }).catch(() => null);
  if (!expired) return NextResponse.json({ skipped: "document table not available" });
  if (!expired.length) return NextResponse.json({ deleted: 0 });
  const [files, checks] = await prisma.$transaction([
    prisma.uploadedFile.deleteMany({ where: { id: { in: expired.map((e) => e.fileId) } } }),
    prisma.documentCheck.deleteMany({ where: { id: { in: expired.map((e) => e.id) } } }),
  ]);
  return NextResponse.json({ deleted: checks.count, files: files.count });
}
