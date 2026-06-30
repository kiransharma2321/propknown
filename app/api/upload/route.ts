import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/quicktime", "video/webm",
  "application/pdf",
]);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file     = formData.get("file") as File | null;
    const docType  = formData.get("docType") as string | null;
    const isPrivate = formData.get("isPrivate") === "true";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 413 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 415 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUri = `data:${file.type};base64,${base64}`;

    const uploaded = await prisma.uploadedFile.create({
      data: {
        name:      file.name,
        mimeType:  file.type,
        sizeBytes: file.size,
        data:      dataUri,
        docType:   docType ?? null,
        isPrivate,
      },
    });

    return NextResponse.json({ id: uploaded.id, name: uploaded.name, sizeBytes: uploaded.sizeBytes });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
