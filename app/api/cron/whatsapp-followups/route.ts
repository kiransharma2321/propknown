import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCronAuthorized } from "@/lib/cron";
import { FEATURES } from "@/lib/features";
import { followupDue } from "@/lib/whatsapp/rules";
import { sendFollowup } from "@/lib/whatsapp/automation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// M12 daily job: day-2 and day-5 WhatsApp follow-ups (approved templates only) for consented
// leads who haven't replied. A reply, STOP or a human takeover ends the sequence.
export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!FEATURES.whatsapp) return NextResponse.json({ skipped: "feature off" });
  const contacts = await prisma.whatsAppContact.findMany({ where: { followupStep: { in: [1, 2] }, humanTakeoverAt: null }, take: 300 });
  let sent = 0;
  for (const c of contacts) {
    const due = followupDue(c);
    if (!due) continue;
    await sendFollowup(c.phone, due).catch((e) => console.error("[whatsapp-followups]", e instanceof Error ? e.message : e));
    sent++;
  }
  return NextResponse.json({ checked: contacts.length, sent });
}
