import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AudioUploader, EpisodeEditor, PublishButton } from "../forms";

export const dynamic = "force-dynamic";

export default async function EpisodeStudio({ params }: { params: { id: string } }) {
  const e = await prisma.podcastEpisode.findUnique({ where: { id: params.id } }).catch(() => null);
  if (!e) notFound();
  const chapters = (e.chapters ?? []) as { start: string; title: string }[];
  const related = (e.relatedLinks ?? []) as { label: string; href: string }[];
  const social = (e.socialDrafts ?? null) as { instagram?: string; linkedin?: string; reelScript?: string; whatsapp?: string } | null;

  return (
    <div>
      <Link href="/admin/automation/podcast-studio" className="text-xs text-gray-400 underline">← Podcast Studio</Link>
      <h1 className="heading-h3 mt-2 mb-1">{e.title}</h1>
      <p className="text-sm text-gray-500 mb-5">status <b>{e.status}</b>{e.status === "published" && <> · <Link href={`/podcast/${e.slug}`} className="underline">view live</Link></>}</p>
      {e.outline && (
        <div className="card-dark p-4 mb-4 text-sm">
          <p className="font-semibold text-gray-900 mb-1">Talking points (AI planner)</p>
          <p className="whitespace-pre-wrap text-gray-700">{e.outline}</p>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <EpisodeEditor e={{
          id: e.id, status: e.status, title: e.title, description: e.description, showNotes: e.showNotes ?? "", transcript: e.transcript ?? "",
          guest: e.guest ?? "", topic: e.topic ?? "",
          chapters: chapters.map((c) => `${c.start} ${c.title}`).join("\n"),
          relatedLinks: related.map((r) => `${r.label} | ${r.href}`).join("\n"),
        }} />
        <div className="space-y-4">
          <AudioUploader id={e.id} hasAudio={!!e.audioUrl} />
          {e.audioUrl && (
            <div className="card-dark p-4">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio controls preload="none" src={e.audioUrl} className="w-full" />
            </div>
          )}
          {e.status !== "published" && <PublishButton id={e.id} />}
          {social && (
            <div className="card-dark p-4 text-sm space-y-2">
              <p className="font-semibold text-gray-900">Marketing drafts (review before posting)</p>
              {social.instagram && <p className="whitespace-pre-wrap"><b>Instagram:</b> {social.instagram}</p>}
              {social.linkedin && <p className="whitespace-pre-wrap"><b>LinkedIn:</b> {social.linkedin}</p>}
              {social.reelScript && <p className="whitespace-pre-wrap"><b>30-second reel:</b> {social.reelScript}</p>}
              {social.whatsapp && <p className="whitespace-pre-wrap"><b>WhatsApp broadcast:</b> {social.whatsapp}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
