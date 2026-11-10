import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { masterApiSession } from "@/lib/adminGuard";
import { logAudit } from "@/lib/auditLog";

// M5 human review: the master admin can open a customer's document to review the AI reading.
// Every access is written to the audit log.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await masterApiSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const d = await prisma.documentCheck.findUnique({ where: { id: params.id }, select: { fileId: true, fileName: true } });
  const f = d ? await prisma.uploadedFile.findUnique({ where: { id: d.fileId }, select: { data: true, mimeType: true } }) : null;
  if (!d || !f) return NextResponse.json({ error: "Not found" }, { status: 404 });
  logAudit({ actorId: session.userId, actorName: session.name, action: "document.view", entity: "DocumentCheck", entityId: params.id, details: {} }).catch(() => null);
  return new NextResponse(Buffer.from(f.data.replace(/^data:[^;]+;base64,/, ""), "base64"), {
    headers: { "Content-Type": f.mimeType, "Content-Disposition": `inline; filename="${d.fileName.replace(/[^\w.\- ]+/g, "_")}"`, "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" },
  });
}
