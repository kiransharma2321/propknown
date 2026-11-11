"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { quickAddDraft, quickAddVenture, saveDraft, approve, reject, type ActionState } from "./actions";
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

// Venture Quick Add: your own projects (e.g. Medchal open plots, The Lush Village). You type
// what you know; photos upload first, then the draft is created. Nothing is invented -- an empty
// approval number shows "Approval details pending" on the live card.
export function VentureForm() {
  const [state, action] = useFormState(quickAddVenture, init);
  const [photoIds, setPhotoIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState("");
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const ids: string[] = [];
    const list = Array.from(files);
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      if (f.size > 4 * 1024 * 1024) { setUploading(`${f.name} is over 4 MB, skipped`); continue; }
      setUploading(`Uploading ${i + 1}/${files.length}…`);
      const fd = new FormData(); fd.append("file", f); fd.append("docType", "venture_photo");
      const r = await fetch("/api/upload", { method: "POST", body: fd }).then((x) => x.json()).catch(() => null);
      if (r?.id) ids.push(r.id);
    }
    setPhotoIds((p) => [...p, ...ids]);
    setUploading(`${ids.length} photo${ids.length === 1 ? "" : "s"} uploaded`);
  };
  const f = (name: string, label: string, ph = "", wide = false, req = false) => (
    <div className={wide ? "sm:col-span-2" : ""}><label className={lbl} htmlFor={`v-${name}`}>{label}{req ? " *" : ""}</label><input id={`v-${name}`} name={name} required={req} placeholder={ph} className={inp} /></div>
  );
  return (
    <form action={action} className="card-dark p-4 space-y-3">
      <p className="font-semibold text-gray-900">Quick Add: my venture</p>
      <p className="text-xs text-gray-500">For your own projects. Fill in what you have; leave the rest empty. No approval number means the listing says &quot;Approval details pending&quot;, never &quot;Approved&quot;.</p>
      <input type="hidden" name="photoIds" value={photoIds.join(",")} />
      <div className="grid gap-3 sm:grid-cols-2">
        {f("projectName", "Project name", "The Lush Village", true, true)}
        {f("builder", "Developer / company")}
        <div><label className={lbl} htmlFor="v-type">Type</label><select id="v-type" name="propertyType" defaultValue="plot" className={inp}>{["plot", "villa", "house", "apartment", "agriculture", "commercial"].map((t) => <option key={t}>{t}</option>)}</select></div>
        {f("location", "Locality", "Medchal", false, true)}{f("city", "City", "Hyderabad", false, true)}
        {f("state", "State", "Telangana")}{f("configuration", "Plots / units", "Open plots, 150–400 sq.yd")}
        {f("sizeText", "Sizes (as you'd say them)", "150 – 400 sq.yd")}{f("sizeSqft", "Typical size in sq.ft (for the price check)", "1800")}
        <div><label className={lbl} htmlFor="v-auth">Approval issued by</label><select id="v-auth" name="approvalAuthority" defaultValue="" className={inp}><option value="">Not yet / don&apos;t know</option>{["RERA", "HMDA", "DTCP", "GHMC", "BDA", "Other"].map((a) => <option key={a}>{a}</option>)}</select></div>
        {f("approvalNumber", "Approval / LP / RERA number", "e.g. LP No. 000/2025/HMDA")}
        {f("price", "Total price ₹ (one typical unit, optional)", "4500000")}{f("priceNote", "Price as you state it", "₹28,000 per sq.yd")}
        {f("projectStatus", "Status", "Ready for registration")}{f("possessionDate", "Possession / registration")}
        <div className="sm:col-span-2"><label className={lbl} htmlFor="v-desc">Description (facts only)</label><textarea id="v-desc" name="description" rows={3} className={`${inp} resize-y`} placeholder="Road width, amenities, distance to ORR exit…" /></div>
        <div className="sm:col-span-2"><label className={lbl} htmlFor="v-photos">Real photos (JPG/PNG/WebP, up to 4 MB each)</label><input id="v-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => upload(e.target.files)} className="text-sm" />{uploading && <p className="text-xs text-gray-500 mt-1">{uploading}</p>}</div>
      </div>
      <div className="flex items-center gap-3 flex-wrap"><Btn disabled={uploading.startsWith("Uploading")}>Add venture → queue</Btn><Msg s={state} /></div>
    </form>
  );
}

export interface DraftView {
  id: string; projectName: string; builder: string | null; location: string | null; city: string | null; state: string | null;
  propertyType: string; configuration: string | null; sizeText: string | null; sizeSqft: number | null; projectStatus: string | null;
  possessionDate: string | null; reraNumber: string | null; price: number | null; priceSourceUrl: string | null;
  description: string | null; checklist: boolean[]; reviewStatus: string;
  approvalAuthority?: string | null; approvalNumber?: string | null; priceNote?: string | null;
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
        {field("approvalAuthority", "Approval issued by (RERA / HMDA / DTCP…)")}{field("approvalNumber", "Approval / LP number")}
        {field("priceNote", "Price as the owner states it", true)}
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
