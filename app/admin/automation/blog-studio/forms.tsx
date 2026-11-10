"use client";

import { useFormState, useFormStatus } from "react-dom";
import { savePost, regenerate, approvePublish, rejectPost, type StudioState } from "./actions";

const inp = "input-dark text-sm py-2 px-3 w-full";
const lbl = "block text-[11px] font-semibold text-gray-500 mb-1";
const init: StudioState = { ok: false, message: "" };

function Btn({ children, className = "btn-primary text-sm" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className={`${className} disabled:opacity-50`}>{pending ? "Working…" : children}</button>;
}
const Msg = ({ s }: { s: StudioState }) => (s.message ? <p className={`text-sm ${s.ok ? "text-green-700" : "text-red-700"}`}>{s.message}</p> : null);

export interface PostView { id: string; title: string; excerpt: string; body: string; whatItMeans: string; status: string }

export function PostEditor({ p }: { p: PostView }) {
  const [state, action] = useFormState(savePost, init);
  const locked = p.status !== "draft";
  return (
    <form action={action} className="card-dark p-4 space-y-3">
      <input type="hidden" name="id" value={p.id} />
      <fieldset disabled={locked} className="space-y-3">
        <div><label className={lbl} htmlFor="b-title">Title</label><input id="b-title" name="title" defaultValue={p.title} className={inp} /></div>
        <div><label className={lbl} htmlFor="b-ex">Excerpt</label><input id="b-ex" name="excerpt" defaultValue={p.excerpt} className={inp} /></div>
        <div><label className={lbl} htmlFor="b-body">Body (blank line between paragraphs)</label><textarea id="b-body" name="body" rows={10} defaultValue={p.body} className={`${inp} resize-y`} /></div>
        <div><label className={lbl} htmlFor="b-what">What this means for buyers</label><textarea id="b-what" name="whatItMeans" rows={4} defaultValue={p.whatItMeans} className={`${inp} resize-y`} /></div>
      </fieldset>
      {!locked && <div className="flex items-center gap-3"><Btn className="btn-secondary text-sm">Save</Btn><Msg s={state} /></div>}
    </form>
  );
}

export function StudioActions({ id }: { id: string }) {
  const [g, gen] = useFormState(regenerate, init);
  const [a, pub] = useFormState(approvePublish, init);
  const [r, rej] = useFormState(rejectPost, init);
  return (
    <div className="card-dark p-4 space-y-3">
      <form action={pub} className="space-y-1"><input type="hidden" name="id" value={id} /><Btn>Approve &amp; Publish</Btn><Msg s={a} /></form>
      <form action={gen} className="space-y-1"><input type="hidden" name="id" value={id} /><Btn className="btn-secondary text-sm">Regenerate</Btn><Msg s={g} /></form>
      <form action={rej} className="space-y-1">
        <input type="hidden" name="id" value={id} />
        <input name="reason" placeholder="Reason (optional)" className={inp} />
        <Btn className="btn-secondary text-sm text-red-700">Reject</Btn><Msg s={r} />
      </form>
    </div>
  );
}
