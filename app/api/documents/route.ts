import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { FEATURES } from "@/lib/features";
import { getBuyerSession } from "@/lib/buyerAuth";
import { ALLOWED_MIME, DOC_TYPES, MAX_BYTES, RETENTION_DAYS, analyseDocument, type DocType } from "@/lib/documentChecker";

export const maxDuration = 60;

// M5: the customer's private document vault. Upload = store privately + preliminary AI reading.
// Only the owner (and the master admin, for human review) can ever see a document.
const MAX_ACTIVE = 20;
const off = () => NextResponse.json({ error: "Not found" }, { status: 404 });
const unauth = () => NextResponse.json({ error: "Please log in to use the Document Checker." }, { status: 401 });

export async function GET() {
  if (!FEATURES.docChecker) return off();
  const buyer = await getBuyerSession();
  if (!buyer) return unauth();
  const docs = await prisma.documentCheck.findMany({
    where: { buyerId: buyer.id }, orderBy: { createdAt: "desc" },
    select: { id: true, fileName: true, docType: true, status: true, reviewStatus: true, expiresAt: true, createdAt: true, result: true },
  });
  return NextResponse.json({ documents: docs.map((d) => ({ ...d, risk: (d.result as { risk?: string } | null)?.risk ?? null, result: undefined })) });
}

export async function POST(req: NextRequest) {
  if (!FEATURES.docChecker) return off();
  const buyer = await getBuyerSession();
  if (!buyer) return unauth();

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const docType = String(form?.get("docType") ?? "other") as DocType;
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to check." }, { status: 400 });
  if (!(docType in DOC_TYPES)) return NextResponse.json({ error: "Choose the document type." }, { status: 400 });
  if (!ALLOWED_MIME.includes(file.type as (typeof ALLOWED_MIME)[number])) return NextResponse.json({ error: "Upload a PDF, JPG, PNG or WEBP file." }, { status: 415 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Files up to 10 MB, please." }, { status: 413 });
  if ((await prisma.documentCheck.count({ where: { buyerId: buyer.id } })) >= MAX_ACTIVE) {
    return NextResponse.json({ error: `Your vault holds up to ${MAX_ACTIVE} documents. Delete one first.` }, { status: 400 });
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const stored = await prisma.uploadedFile.create({
    data: { name: file.name.slice(0, 200), mimeType: file.type, sizeBytes: file.size, data: `data:${file.type};base64,${base64}`, docType: `vault:${docType}`, isPrivate: true },
    select: { id: true },
  });
  const check = await prisma.documentCheck.create({
    data: { buyerId: buyer.id, fileId: stored.id, fileName: file.name.slice(0, 200), mimeType: file.type, sizeBytes: file.size, docType, expiresAt: new Date(Date.now() + RETENTION_DAYS * 86_400_000) },
  });

  try {
    const result = await analyseDocument({ mimeType: file.type, base64 }, docType);
    const done = await prisma.documentCheck.update({ where: { id: check.id }, data: { status: "done", result: result as never, injectionFlag: result.embeddedInstructions } });
    return NextResponse.json({ id: done.id, status: done.status, result }, { status: 201 });
  } catch (e) {
    await prisma.documentCheck.update({ where: { id: check.id }, data: { status: "failed", error: (e instanceof Error ? e.message : String(e)).slice(0, 300) } });
    return NextResponse.json({ id: check.id, status: "failed", error: "We stored your document but couldn't read it right now. A reviewer will look at it, or try again later." }, { status: 202 });
  }
}
