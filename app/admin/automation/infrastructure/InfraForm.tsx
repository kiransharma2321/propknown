"use client";

import { useFormState, useFormStatus } from "react-dom";
import { saveInfra, type InfraState } from "./actions";

// M7 admin form: one verified infrastructure entry. Source link + checked date are required.
const KINDS = [["metro", "Metro"], ["rail", "Rail"], ["road", "Road / flyover"], ["airport", "Airport"], ["it_park", "IT park"], ["hospital", "Hospital"], ["school", "School / university"], ["other", "Other"]];
const STATUSES = [["announced", "Announced"], ["approved", "Approved"], ["under_construction", "Under construction"], ["completed", "Completed"]];

function Save() { const { pending } = useFormStatus(); return <button type="submit" disabled={pending} className="btn-primary text-sm">{pending ? "Saving…" : "Save entry"}</button>; }

export default function InfraForm() {
  const [state, action] = useFormState<InfraState, FormData>(saveInfra, { ok: false, message: "" });
  const inp = "input-dark text-sm py-2 px-2 w-full mt-0.5";
  return (
    <form action={action} className="border border-gray-200 rounded-xl p-4 bg-white grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-xs text-gray-700">Project name<input name="name" required className={inp} placeholder="e.g. Hyderabad Metro Phase 2 (Corridor 6)" /></label>
      <label className="text-xs text-gray-700">Type<select name="kind" className={inp}>{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <label className="text-xs text-gray-700">Status (per source)<select name="status" className={inp}>{STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <label className="text-xs text-gray-700">City slug<input name="citySlug" required className={inp} placeholder="hyderabad" /></label>
      <label className="text-xs text-gray-700">Area slugs it serves (comma-separated)<input name="areaSlugs" required className={inp} placeholder="kokapet,narsingi" /></label>
      <label className="text-xs text-gray-700">Expected (as the source says)<input name="expected" className={inp} placeholder="Dec 2027" /></label>
      <label className="text-xs text-gray-700">Source name<input name="sourceName" required className={inp} placeholder="HMRL press release" /></label>
      <label className="text-xs text-gray-700 sm:col-span-2">Source link (https)<input name="sourceUrl" required type="url" className={inp} /></label>
      <label className="text-xs text-gray-700">Date you checked it<input name="verifiedAt" required type="date" className={inp} /></label>
      <label className="text-xs text-gray-700 sm:col-span-2">Notes (internal)<input name="notes" className={inp} /></label>
      <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-3"><Save />{state.message && <span className={`text-sm ${state.ok ? "text-green-700" : "text-red-700"}`}>{state.message}</span>}</div>
    </form>
  );
}
