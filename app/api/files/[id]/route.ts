import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const file = await prisma.uploadedFile.findUnique({ where: { id: params.id } });

  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (file.isPrivate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const base64 = file.data.split(",")[1];
  if (!base64) return NextResponse.json({ error: "Corrupt file" }, { status: 500 });

  const buffer = Buffer.from(base64, "base64");

  return new Response(buffer, {
    headers: {
      "Content-Type": file.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(buffer.length),
    },
  });
}
