import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notifyMatchingAlerts } from "@/lib/alerts";

interface ImportRow {
  title: string;
  propType?: string;
  bhk?: string;
  size?: string;
  sizeUnit?: string;
  priceDisplay: string;
  city: string;
  area: string;
  description?: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  features?: string;
  reraNumber?: string;
  approve?: string;
}

function parseCSV(text: string): ImportRow[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, ""));
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
    return row as unknown as ImportRow;
  });
}

export async function POST(req: NextRequest) {
  try {
    const { rows, autoApprove } = await req.json() as { rows: ImportRow[]; autoApprove?: boolean };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 });
    }

    const results: { row: number; status: string; id?: string; error?: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        if (!r.title || !r.priceDisplay || !r.city || !r.ownerName || !r.ownerPhone) {
          results.push({ row: i + 1, status: "error", error: "Missing required fields: title, priceDisplay, city, ownerName, ownerPhone" });
          continue;
        }
        const sub = await prisma.propertySubmission.create({
          data: {
            title:        r.title.trim(),
            propType:     r.propType ?? "apartment",
            bhk:          r.bhk ?? null,
            size:         r.size ?? null,
            sizeUnit:     r.sizeUnit ?? null,
            priceDisplay: r.priceDisplay.trim(),
            city:         r.city.trim(),
            area:         r.area?.trim() ?? r.city.trim(),
            description:  r.description?.trim() ?? `${r.title} in ${r.city}`,
            features:     r.features ?? null,
            reraNumber:   r.reraNumber ?? null,
            ownerName:    r.ownerName.trim(),
            ownerPhone:   r.ownerPhone.trim(),
            ownerEmail:   r.ownerEmail?.trim().toLowerCase() ?? "",
            photoIds:     "[]",
            videoIds:     "[]",
            videoUrls:    "[]",
            docIds:       "[]",
            status:       (autoApprove || r.approve === "yes") ? "approved" : "pending",
          },
        });
        results.push({ row: i + 1, status: "ok", id: sub.id });

        if (sub.status === "approved") {
          notifyMatchingAlerts({
            id: sub.id, title: sub.title, propType: sub.propType,
            city: sub.city, area: sub.area, priceDisplay: sub.priceDisplay,
          }).catch(() => null);
        }
      } catch (e) {
        results.push({ row: i + 1, status: "error", error: String(e) });
      }
    }

    const ok    = results.filter(r => r.status === "ok").length;
    const errors = results.filter(r => r.status === "error").length;
    return NextResponse.json({ ok, errors, total: rows.length, results });
  } catch (e) {
    console.error("Bulk import error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  // CSV parse endpoint
  try {
    const { csv } = await req.json() as { csv: string };
    const rows = parseCSV(csv);
    return NextResponse.json({ rows, count: rows.length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
