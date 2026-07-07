import { NextResponse } from "next/server";
import { markRegistered } from "@/lib/aiIntelGate";

// Called right after a visitor submits the AI Intelligence lead-capture gate (POST /api/leads
// with source "ai_intelligence" having already succeeded). Grants this visitor unlimited
// AI Intelligence searches from now on -- separate call so the lead always lands in the CRM
// even if this step fails for some reason (worst case they see the gate once more).
export async function POST() {
  try {
    await markRegistered();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[ai-intelligence/unlock]", err);
    return NextResponse.json({ error: "Failed to unlock" }, { status: 500 });
  }
}
