import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession, canRole } from "@/lib/rbac";

async function requirePropertiesAccess() {
  const session = await getAdminSession();
  return session && (await canRole(session.role, "properties"));
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requirePropertiesAccess())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const property = await prisma.property.findUnique({
      where: { id: params.id },
      include: { leads: { select: { id: true, name: true, createdAt: true } } },
    });
    if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(property);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requirePropertiesAccess())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const property = await prisma.property.update({ where: { id: params.id }, data: body });
    return NextResponse.json(property);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requirePropertiesAccess())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.property.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
