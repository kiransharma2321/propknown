import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession, canRole } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session || !(await canRole(session.role, "properties"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const city         = searchParams.get("city");
  const listingType  = searchParams.get("listingType");
  const propertyType = searchParams.get("propertyType");
  const featured     = searchParams.get("featured");
  const status       = searchParams.get("status") ?? "approved";
  const page         = parseInt(searchParams.get("page") ?? "1");
  const limit        = parseInt(searchParams.get("limit") ?? "12");

  try {
    const where: Record<string, unknown> = { status };
    if (city)         where.city         = { contains: city, mode: "insensitive" };
    if (listingType)  where.listingType  = listingType;
    if (propertyType) where.propertyType = propertyType;
    if (featured)     where.featured     = featured === "true";

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
        skip:  (page - 1) * limit,
        take:  limit,
      }),
      prisma.property.count({ where }),
    ]);

    return NextResponse.json({ properties, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session || !(await canRole(session.role, "properties"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const property = await prisma.property.create({ data: body });
    return NextResponse.json(property, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create property" }, { status: 500 });
  }
}
