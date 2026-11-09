"use client";

import { useFormState, useFormStatus } from "react-dom";
import { addGuidanceRate, type GuidanceFormState } from "./actions";

const inp = "input-dark text-sm py-2 px-3 w-full";
const lbl = "block text-[11px] font-semibold text-gray-500 mb-1";

function Submit() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="btn-primary text-sm">{pending ? "Saving…" : "Add official rate"}</button>;
}

export default function GuidanceRateForm({ localities }: { localities: { key: string; label: string }[] }) {
  const [state, action] = useFormState<GuidanceFormState, FormData>(addGuidanceRate, { ok: false, message: "" });
  return (
    <form action={action} className="card-dark p-4 grid gap-3 sm:grid-cols-3">
      <div><label className={lbl} htmlFor="gr-state">State</label><input id="gr-state" name="state" defaultValue="Telangana" className={inp} /></div>
      <div><label className={lbl} htmlFor="gr-district">District</label><input id="gr-district" name="district" placeholder="Ranga Reddy" className={inp} /></div>
      <div><label className={lbl} htmlFor="gr-mandal">Mandal</label><input id="gr-mandal" name="mandal" placeholder="Gandipet" className={inp} /></div>
      <div>
        <label className={lbl} htmlFor="gr-loc">PropKnown locality *</label>
        <select id="gr-loc" name="localityKey" required className={inp} defaultValue="">
          <option value="" disabled>Choose…</option>
          {localities.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
        </select>
      </div>
      <div><label className={lbl} htmlFor="gr-village">Village / locality as published</label><input id="gr-village" name="locality" placeholder="Kokapet" className={inp} /></div>
      <div>
        <label className={lbl} htmlFor="gr-type">Property type *</label>
        <select id="gr-type" name="propertyType" required className={inp} defaultValue="apartment">
          {["apartment", "villa", "house", "plot", "commercial", "agriculture"].map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div><label className={lbl} htmlFor="gr-rate">Published rate (₹) *</label><input id="gr-rate" name="ratePerUnit" inputMode="decimal" required placeholder="6500" className={inp} /></div>
      <div>
        <label className={lbl} htmlFor="gr-unit">Per *</label>
        <select id="gr-unit" name="unit" required className={inp} defaultValue="sqft">
          <option value="sqft">sq.ft</option><option value="sqyard">sq.yard</option><option value="acres">acre</option>
        </select>
      </div>
      <div><label className={lbl} htmlFor="gr-eff">Effective date *</label><input id="gr-eff" name="effectiveDate" type="date" required className={inp} /></div>
      <div className="sm:col-span-2"><label className={lbl} htmlFor="gr-src">Source *</label><input id="gr-src" name="sourceName" required defaultValue="IGRS Telangana — Market Value Guidelines" className={inp} /></div>
      <div><label className={lbl} htmlFor="gr-url">Source link</label><input id="gr-url" name="sourceUrl" type="url" placeholder="https://registration.telangana.gov.in/…" className={inp} /></div>
      <div className="sm:col-span-3"><label className={lbl} htmlFor="gr-notes">Notes</label><input id="gr-notes" name="notes" placeholder="e.g. survey nos. 1–120, ground-floor flats" className={inp} /></div>
      <div className="sm:col-span-3 flex items-center gap-3 flex-wrap">
        <Submit />
        {state.message && <p className={`text-sm ${state.ok ? "text-green-700" : "text-red-700"}`}>{state.message}</p>}
      </div>
    </form>
  );
}
