"use client";

import { useFormState, useFormStatus } from "react-dom";
import { addGuidanceRate, type GuidanceFormState } from "./actions";

const inp = "input-dark text-sm py-2 px-3 w-full";
const lbl = "block text-[11px] font-semibold text-gray-500 mb-1";

function Submit() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="btn-primary text-sm">{pending ? "Saving…" : "Save official rate"}</button>;
}

export interface GuidanceRow {
  id: string; state: string; district: string | null; mandal: string | null; locality: string; localityKey: string;
  propertyType: string; unit: string; ratePerUnit: number; sourceName: string; sourceUrl: string | null;
  effectiveDate: string; notes: string | null;
}

export default function GuidanceRateForm({ localities, editing }: { localities: { key: string; label: string }[]; editing?: GuidanceRow | null }) {
  const [state, action] = useFormState<GuidanceFormState, FormData>(addGuidanceRate, { ok: false, message: "" });
  const e = editing;
  return (
    <form action={action} key={e?.id ?? "new"} className="card-dark p-4 grid gap-3 sm:grid-cols-3">
      {e && <input type="hidden" name="id" value={e.id} />}
      {e && <p className="sm:col-span-3 text-sm font-semibold text-gray-700">Editing {e.locality} · {e.propertyType} <a href="?" className="ml-2 text-xs underline font-normal">cancel</a></p>}
      <div><label className={lbl} htmlFor="gr-state">State</label><input id="gr-state" name="state" defaultValue={e?.state ?? "Telangana"} className={inp} /></div>
      <div><label className={lbl} htmlFor="gr-district">District</label><input id="gr-district" name="district" defaultValue={e?.district ?? ""} placeholder="Ranga Reddy" className={inp} /></div>
      <div><label className={lbl} htmlFor="gr-mandal">Mandal</label><input id="gr-mandal" name="mandal" defaultValue={e?.mandal ?? ""} placeholder="Gandipet" className={inp} /></div>
      <div>
        <label className={lbl} htmlFor="gr-loc">PropKnown locality *</label>
        <select id="gr-loc" name="localityKey" required className={inp} defaultValue={e?.localityKey ?? ""}>
          <option value="" disabled>Choose…</option>
          {localities.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
        </select>
      </div>
      <div><label className={lbl} htmlFor="gr-village">Village / locality as published</label><input id="gr-village" name="locality" defaultValue={e?.locality ?? ""} placeholder="Kokapet" className={inp} /></div>
      <div>
        <label className={lbl} htmlFor="gr-type">Property type *</label>
        <select id="gr-type" name="propertyType" required className={inp} defaultValue={e?.propertyType ?? "apartment"}>
          {["apartment", "villa", "house", "plot", "commercial", "agriculture"].map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div><label className={lbl} htmlFor="gr-rate">Published rate (₹) *</label><input id="gr-rate" name="ratePerUnit" inputMode="decimal" required defaultValue={e?.ratePerUnit ?? ""} placeholder="6500" className={inp} /></div>
      <div>
        <label className={lbl} htmlFor="gr-unit">Per *</label>
        <select id="gr-unit" name="unit" required className={inp} defaultValue={e?.unit ?? "sqft"}>
          <option value="sqft">sq.ft</option><option value="sqyard">sq.yard</option><option value="acres">acre</option>
        </select>
      </div>
      <div><label className={lbl} htmlFor="gr-eff">Effective date *</label><input id="gr-eff" name="effectiveDate" type="date" required defaultValue={e?.effectiveDate ?? ""} className={inp} /></div>
      <div className="sm:col-span-2"><label className={lbl} htmlFor="gr-src">Source *</label><input id="gr-src" name="sourceName" required defaultValue={e?.sourceName ?? "IGRS Telangana — Market Value Guidelines"} className={inp} /></div>
      <div><label className={lbl} htmlFor="gr-url">Source link</label><input id="gr-url" name="sourceUrl" type="url" defaultValue={e?.sourceUrl ?? ""} placeholder="https://registration.telangana.gov.in/…" className={inp} /></div>
      <div className="sm:col-span-3"><label className={lbl} htmlFor="gr-notes">Notes</label><input id="gr-notes" name="notes" defaultValue={e?.notes ?? ""} placeholder="e.g. survey nos. 1–120, ground-floor flats" className={inp} /></div>
      <div className="sm:col-span-3 flex items-center gap-3 flex-wrap">
        <Submit />
        {state.message && <p className={`text-sm ${state.ok ? "text-green-700" : "text-red-700"}`}>{state.message}</p>}
      </div>
    </form>
  );
}
