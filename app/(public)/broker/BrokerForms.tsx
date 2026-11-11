"use client";

import { useFormState, useFormStatus } from "react-dom";
import { signupAction, loginAction, uploadAction, type BrokerState } from "./actions";

const init: BrokerState = { ok: false, message: "" };
const inp = "input-dark text-sm py-2.5 px-3 w-full";
const lbl = "block text-xs font-semibold text-gray-500 mb-1";
function Btn({ children }: { children: React.ReactNode }) { const { pending } = useFormStatus(); return <button disabled={pending} className="btn-primary w-full justify-center disabled:opacity-60">{pending ? "Please wait…" : children}</button>; }
const Msg = ({ s }: { s: BrokerState }) => (s.message ? <p className={`text-sm ${s.ok ? "text-green-700" : "text-red-700"}`}>{s.message}</p> : null);

export function LoginSignup() {
  const [l, login] = useFormState(loginAction, init);
  const [g, signup] = useFormState(signupAction, init);
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <form action={login} className="border border-gray-200 rounded-xl p-5 space-y-3 bg-white">
        <p className="heading-h3">Broker login</p>
        <div><label className={lbl} htmlFor="bl-email">Email</label><input id="bl-email" name="email" type="email" required className={inp} /></div>
        <div><label className={lbl} htmlFor="bl-pw">Password</label><input id="bl-pw" name="password" type="password" required className={inp} /></div>
        <Btn>Log in</Btn><Msg s={l} />
      </form>
      <form action={signup} className="border border-gray-200 rounded-xl p-5 space-y-3 bg-white">
        <p className="heading-h3">Register as a channel partner</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={lbl} htmlFor="bs-name">Your name *</label><input id="bs-name" name="name" required className={inp} /></div>
          <div><label className={lbl} htmlFor="bs-firm">Firm</label><input id="bs-firm" name="firm" className={inp} /></div>
          <div><label className={lbl} htmlFor="bs-email">Email *</label><input id="bs-email" name="email" type="email" required className={inp} /></div>
          <div><label className={lbl} htmlFor="bs-phone">Phone *</label><input id="bs-phone" name="phone" required inputMode="tel" className={inp} /></div>
          <div><label className={lbl} htmlFor="bs-rera">RERA agent number</label><input id="bs-rera" name="reraAgentNo" className={inp} /></div>
          <div><label className={lbl} htmlFor="bs-pw">Password (10+ characters) *</label><input id="bs-pw" name="password" type="password" minLength={10} required className={inp} /></div>
        </div>
        <Btn>Register</Btn><Msg s={g} />
        <p className="text-[11px] text-gray-400">PropKnown approves every partner account before uploads open.</p>
      </form>
    </div>
  );
}

export function UploadForm({ declaration, columns }: { declaration: string; columns: readonly string[] }) {
  const [u, upload] = useFormState(uploadAction, init);
  return (
    <form action={upload} className="border border-gray-200 rounded-xl p-5 space-y-3 bg-white">
      <p className="heading-h3">Upload listings (CSV)</p>
      <p className="text-xs text-gray-500">Columns: <code>{columns.join(", ")}</code>. property_type: apartment, villa, house, plot, commercial or agriculture. size_unit: sqft, sqyd or acre. Leave owner names, phone numbers and emails out: enquiries come through PropKnown to you.</p>
      <input type="file" name="file" accept=".csv,text/csv" required className="text-sm" />
      <label className="flex items-start gap-2 text-xs text-gray-700"><input type="checkbox" name="declaration" required className="mt-0.5" /> <span>{declaration}</span></label>
      <Btn>Upload for review</Btn><Msg s={u} />
      <p className="text-[11px] text-gray-400">Every listing is checked by PropKnown (approval number, price against the area, photos) before it goes live. Your declaration, with the time and your IP address, is stored with each listing.</p>
    </form>
  );
}
