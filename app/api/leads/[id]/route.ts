import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/rbac";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
      include: { property: { select: { id: true, title: true } } },
    });
    if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(lead);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json() as Record<string, unknown>;

    // Safely extract only allowed fields
    const allowed: Record<string, unknown> = {};
    // docIds added for Lead Detail's Documents tab (Section 2) -- additive, same allowlist
    // pattern, no change to how the other fields behave.
    const allowedKeys = ["status", "notes", "assignedTo", "followUpDate", "leadValue", "tags", "docIds"];
    for (const k of allowedKeys) {
      if (k in body) allowed[k] = body[k];
    }

    // Append to timeline if a note or status change is provided
    if ("notes" in body || "status" in body) {
      const existing = await prisma.lead.findUnique({ where: { id: params.id }, select: { timeline: true } });
      const timeline = Array.isArray(existing?.timeline) ? existing.timeline : [];
      const entry: Record<string, string> = { ts: new Date().toISOString() };
      if ("status" in body) entry.type = "status";
      if ("notes" in body) entry.type = "note";
      if ("notes" in body && typeof body.notes === "string") entry.text = body.notes;
      if ("status" in body && typeof body.status === "string") entry.text = `Status → ${body.status}`;
      allowed.timeline = [...timeline, entry];
    }

    // followUpDate: parse ISO string to Date
    if (allowed.followUpDate && typeof allowed.followUpDate === "string") {
      allowed.followUpDate = new Date(allowed.followUpDate);
    }

    const lead = await prisma.lead.update({
      where: { id: params.id },
      data: allowed as Parameters<typeof prisma.lead.update>[0]["data"],
    });
    return NextResponse.json(lead);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await prisma.lead.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
  }
}
