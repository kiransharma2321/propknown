import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { masterApiSession } from "@/lib/adminGuard";
import { draftFromAudio } from "@/lib/podcast/ai";

// Transcribe an uploaded episode and draft its title, notes, chapters and description. Long
// audio takes a while, so this runs as its own request with the longest allowed duration.
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  if (!(await masterApiSession())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  const ep = id ? await prisma.podcastEpisode.findUnique({ where: { id } }) : null;
  if (!ep?.audioUrl) return NextResponse.json({ error: "Upload the MP3 first." }, { status: 400 });
  try {
    const d = await draftFromAudio(ep.audioUrl);
    await prisma.podcastEpisode.update({
      where: { id: ep.id },
      data: {
        title: d.title || ep.title, description: d.description, showNotes: d.showNotes, transcript: d.transcript,
        chapters: d.chapters as unknown as Prisma.InputJsonValue, topic: d.topic ?? ep.topic, guest: d.guest ?? ep.guest,
        status: ep.status === "idea" ? "draft" : ep.status,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[podcast] processing failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Processing failed" }, { status: 500 });
  }
}
