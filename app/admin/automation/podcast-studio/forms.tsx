"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { upload } from "@vercel/blob/client";
import { suggestEpisodes, newEpisode, attachAudio, saveEpisode, publishEpisode, saveShow, type PodState } from "./actions";

const inp = "input-dark text-sm py-2 px-3 w-full";
const lbl = "block text-[11px] font-semibold text-gray-500 mb-1";
const init: PodState = { ok: false, message: "" };

function Btn({ children, className = "btn-primary text-sm" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className={`${className} disabled:opacity-50`}>{pending ? "Working…" : children}</button>;
}
const Msg = ({ s }: { s: PodState }) => (s.message ? <p className={`text-sm ${s.ok ? "text-green-700" : "text-red-700"}`}>{s.message}</p> : null);

export function StudioTop() {
  const router = useRouter();
  const [plan, setPlan] = useState<PodState>(init);
  const [pending, start] = useTransition();
  const [created, create] = useFormState(async (p: PodState, f: FormData) => {
    const r = await newEpisode(p, f);
    if (r.ok) router.push(`/admin/automation/podcast-studio/${r.message}`);
    return r.ok ? { ok: true, message: "Created." } : r;
  }, init);
  return (
    <div className="grid gap-3 sm:grid-cols-2 mb-6">
      <form action={create} className="card-dark p-4 space-y-2">
        <p className="font-semibold text-gray-900">New episode</p>
        <input name="title" placeholder="Working title" className={inp} />
        <Btn>Create and upload MP3</Btn><Msg s={created} />
      </form>
      <div className="card-dark p-4 space-y-2">
        <p className="font-semibold text-gray-900">AI episode planner</p>
        <p className="text-xs text-gray-500">3 ideas with talking points from this week&apos;s price movements and published news. You record them in your own voice. It also runs every Monday.</p>
        <button type="button" disabled={pending} onClick={() => start(async () => { setPlan(await suggestEpisodes()); router.refresh(); })} className="btn-secondary text-sm disabled:opacity-50">
          {pending ? "Planning…" : "Suggest 3 episodes"}
        </button>
        <Msg s={plan} />
      </div>
    </div>
  );
}

export function AudioUploader({ id, hasAudio }: { id: string; hasAudio: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const onFile = async (file: File) => {
    setBusy(true);
    try {
      setStatus("Reading length…");
      const durationSec = await new Promise<number | null>((resolve) => {
        const a = document.createElement("audio");
        a.preload = "metadata"; a.src = URL.createObjectURL(file);
        a.onloadedmetadata = () => resolve(Number.isFinite(a.duration) ? Math.round(a.duration) : null);
        a.onerror = () => resolve(null);
      });
      setStatus("Uploading… (large files take a few minutes)");
      const blob = await upload(`podcast/episodes/${file.name}`, file, { access: "public", handleUploadUrl: "/api/podcast/upload", multipart: file.size > 50 * 1024 * 1024 });
      const saved = await attachAudio(id, blob.url, file.size, durationSec);
      if (!saved.ok) { setStatus(saved.message); return; }
      setStatus("Transcribing and drafting notes… (can take a few minutes)");
      const res = await fetch("/api/podcast/process", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const data = await res.json().catch(() => ({}));
      setStatus(res.ok ? "Done: transcript, title, notes and chapters drafted below. Review and edit before publishing." : `Uploaded, but drafting failed: ${data.error ?? res.status}. You can retry.`);
      router.refresh();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Upload failed");
    } finally { setBusy(false); }
  };

  const retry = async () => {
    setBusy(true); setStatus("Transcribing and drafting notes…");
    const res = await fetch("/api/podcast/process", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const data = await res.json().catch(() => ({}));
    setStatus(res.ok ? "Done." : `Drafting failed: ${data.error ?? res.status}`);
    setBusy(false); router.refresh();
  };

  return (
    <div className="card-dark p-4 space-y-2">
      <p className="font-semibold text-gray-900">Episode audio (MP3)</p>
      <input type="file" accept="audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a" disabled={busy} onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} className="text-sm" />
      {hasAudio && <button type="button" disabled={busy} onClick={retry} className="btn-secondary text-xs disabled:opacity-50">Re-run AI drafting</button>}
      {status && <p className="text-xs text-gray-600">{status}</p>}
    </div>
  );
}

export interface EpisodeView {
  id: string; status: string; title: string; description: string; showNotes: string; transcript: string; guest: string; topic: string;
  chapters: string; relatedLinks: string;
}

export function EpisodeEditor({ e }: { e: EpisodeView }) {
  const [s, act] = useFormState(saveEpisode, init);
  const f = (name: keyof EpisodeView, label: string, rows = 0) => (
    <div>
      <label className={lbl} htmlFor={`ep-${name}`}>{label}</label>
      {rows ? <textarea id={`ep-${name}`} name={name} rows={rows} defaultValue={e[name]} className={`${inp} resize-y`} />
        : <input id={`ep-${name}`} name={name} defaultValue={e[name]} className={inp} />}
    </div>
  );
  return (
    <form action={act} className="card-dark p-4 space-y-3">
      <input type="hidden" name="id" value={e.id} />
      {f("title", "Title")}{f("description", "SEO description (max 155 chars)")}
      <div className="grid gap-3 sm:grid-cols-2">{f("topic", "Topic")}{f("guest", "Guest")}</div>
      {f("showNotes", "Show notes", 6)}
      {f("chapters", "Chapters (one per line: 00:00 Title)", 5)}
      {f("relatedLinks", "Related links (one per line: Label | /path)", 3)}
      {f("transcript", "Transcript", 10)}
      <div className="flex items-center gap-3"><Btn className="btn-secondary text-sm">Save</Btn><Msg s={s} /></div>
    </form>
  );
}

export function PublishButton({ id }: { id: string }) {
  const [s, act] = useFormState(publishEpisode, init);
  return (
    <form action={act} className="card-dark p-4 space-y-2">
      <input type="hidden" name="id" value={id} />
      <Btn>Approve &amp; Publish</Btn>
      <p className="text-[11px] text-gray-500">Publishes the episode page and adds it to the RSS feed. Instagram/LinkedIn posts, a 30-second reel script and a WhatsApp message are drafted for you to review.</p>
      <Msg s={s} />
    </form>
  );
}

export function ShowSettings({ show }: { show: { title: string; description: string; coverUrl: string; ownerName: string; ownerEmail: string; category: string } }) {
  const [s, act] = useFormState(saveShow, init);
  const [cover, setCover] = useState(show.coverUrl);
  const [msg, setMsg] = useState("");
  const onCover = async (file: File) => {
    setMsg("Uploading cover…");
    try {
      const b = await upload(`podcast/cover-${file.name}`, file, { access: "public", handleUploadUrl: "/api/podcast/upload" });
      setCover(b.url); setMsg("Uploaded. Click Save show settings.");
    } catch (e) { setMsg(e instanceof Error ? e.message : "Upload failed"); }
  };
  return (
    <form action={act} className="card-dark p-4 space-y-3">
      <p className="font-semibold text-gray-900">Show settings (RSS feed)</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className={lbl} htmlFor="sh-t">Show title</label><input id="sh-t" name="title" defaultValue={show.title} className={inp} /></div>
        <div><label className={lbl} htmlFor="sh-c">Apple category</label><input id="sh-c" name="category" defaultValue={show.category} className={inp} /></div>
        <div><label className={lbl} htmlFor="sh-o">Owner name</label><input id="sh-o" name="ownerName" defaultValue={show.ownerName} className={inp} /></div>
        <div><label className={lbl} htmlFor="sh-e">Owner email (shown to podcast directories)</label><input id="sh-e" name="ownerEmail" type="email" defaultValue={show.ownerEmail} className={inp} /></div>
      </div>
      <div><label className={lbl} htmlFor="sh-d">Show description</label><textarea id="sh-d" name="description" rows={3} defaultValue={show.description} className={`${inp} resize-y`} /></div>
      <div>
        <label className={lbl} htmlFor="sh-cover">Cover art (square JPG/PNG, 1400–3000 px)</label>
        <input id="sh-cover" type="file" accept="image/jpeg,image/png" onChange={(e) => e.target.files?.[0] && onCover(e.target.files[0])} className="text-sm" />
        <input type="hidden" name="coverUrl" value={cover} />
        {cover && <p className="text-xs text-gray-500 mt-1 break-all">Current: {cover}</p>}
        {msg && <p className="text-xs text-gray-600">{msg}</p>}
      </div>
      <div className="flex items-center gap-3"><Btn className="btn-secondary text-sm">Save show settings</Btn><Msg s={s} /></div>
    </form>
  );
}
