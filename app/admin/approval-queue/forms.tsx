"use client";

import { useFormState, useFormStatus } from "react-dom";
import { quickAddDraft, saveDraft, approve, reject, type ActionState } from "./actions";
import { CHECKLIST_ITEMS } from "@/lib/listings/checklist";

const inp = "input-dark text-sm py-2 px-3 w-full";
const lbl = "block text-[11px] font-semibold text-gray-500 mb-1";
const init: ActionState = { ok: false, message: "" };

function Btn({ children, className = "btn-primary text-sm", disabled }: { children: React.ReactNode; className?: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending || disabled} className={`${className} disabled:opacity-50`}>{pending ? "Working…" : children}</button>;
}
const Msg = ({ s }: { s: ActionState }) => s.message ? <p className={`text-sm ${s.ok ? "text-green-700" : "text-red-700"}`}>{s.message}</p> : null;

export function QuickAddForm() {
  const [state, action] = useFormState(quickAddDraft, init);
  return (
    <form action={action} className="card-dark p-4 space-y-3">
      <p className="font-semibold text-gray-900">Quick Add from a brochure</p>
      <p className="text-xs text-gray-500">Paste brochure or listing text, or a link to a project page. The AI fills in only what the text states and puts a draft here for review. Nothing is published until you approve it.</p>
      <div><label className={lbl} htmlFor="qa-url">Link (project page)</label><input id="qa-url" name="url" type="url" placeholder="https://…" className={inp} /></div>
      <div><label className={lbl} htmlFor="qa-text">…or paste text</label><textarea id="qa-text" name="text" rows={5} className={`${inp} resize-y`} placeholder="Brochure text, WhatsApp message, broker notes…" /></div>
      <div className="flex items-center gap-3 flex-wrap"><Btn>AI draft → queue</Btn><Msg s={state} /></div>
    </form>
  );
}

export interface DraftView {
  id: string; projectName: string; builder: string | null; location: string | null; city: string | null; state: string | null;
  propertyType: string; configuration: string | null; sizeText: string | null; sizeSqft: number | null; projectStatus: string | null;
  possessionDate: string | null; reraNumber: string | null; price: number | null; priceSourceUrl: string | null;
  description: string | null; checklist: boolean[]; reviewStatus: string;
}

export function DraftEditor({ d }: { d: DraftView }) {
  const [state, action] = useFormState(saveDraft, init);
  const field = (name: keyof DraftView, label: string, wide = false) => (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label className={lbl} htmlFor={`d-${name}`}>{label}</label>
      <input id={`d-${name}`} name={name} defaultValue={(d[name] as string | number | null) ?? ""} className={inp} />
    </div>
  );
  const locked = d.reviewStatus !== "draft";
  return (
    <form action={action} className="card-dark p-4 space-y-4">
      <input type="hidden" name="id" value={d.id} />
      <fieldset disabled={locked} className="grid gap-3 sm:grid-cols-2">
        {field("projectName", "Project name *", true)}
        {field("builder", "Builder")}{field("reraNumber", "RERA number")}
        {field("location", "Locality")}{field("city", "City")}
        {field("state", "State")}
        <div>
          <label className={lbl} htmlFor="d-type">Property type</label>
          <select id="d-type" name="propertyType" defaultValue={d.propertyType} className={inp}>
            {["apartment", "villa", "house", "plot", "commercial", "agriculture"].map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        {field("configuration", "Configuration")}{field("sizeText", "Size (as written)")}
        {field("sizeSqft", "Size used for price check (sq.ft)")}{field("projectStatus", "Status")}
        {field("possessionDate", "Possession")}
        {field("price", "Total price (only if a source states it)")}
        {field("priceSourceUrl", "Price source link", true)}
        <div className="sm:col-span-2">
          <label className={lbl} htmlFor="d-desc">Description</label>
          <textarea id="d-desc" name="description" rows={4} defaultValue={d.description ?? ""} className={`${inp} resize-y`} />
        </div>
        <div className="sm:col-span-2">
          <p className={lbl}>10-point approval checklist (a human must confirm each)</p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {CHECKLIST_ITEMS.map((item, i) => (
              <label key={item} className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" name={`check${i}`} defaultChecked={d.checklist[i]} style={{ accentColor: "var(--gold)" }} /> {item}
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">{d.checklist.filter(Boolean).length}/10 ticked (save to update)</p>
        </div>
      </fieldset>
      {!locked && <div className="flex items-center gap-3 flex-wrap"><Btn className="btn-secondary text-sm">Save draft</Btn><Msg s={state} /></div>}
    </form>
  );
}

export function ReviewActions({ id, allChecked }: { id: string; allChecked: boolean }) {
  const [a, approveAction] = useFormState(approve, init);
  const [r, rejectAction] = useFormState(reject, init);
  return (
    <div className="card-dark p-4 space-y-3">
      <form action={approveAction} className="space-y-2">
        <input type="hidden" name="id" value={id} />
        <Btn disabled={!allChecked}>{allChecked ? "✓ Approve & publish to /buy" : "Tick and save all 10 checklist items to approve"}</Btn>
        <Msg s={a} />
      </form>
      <form action={rejectAction} className="space-y-2">
        <input type="hidden" name="id" value={id} />
        <textarea name="reason" rows={2} className={`${inp} resize-none`} placeholder="Reason for rejecting (required)" />
        <Btn className="btn-secondary text-sm text-red-700">Reject</Btn>
        <Msg s={r} />
      </form>
    </div>
  );
}
