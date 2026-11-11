"use client";

import { useState } from "react";

// "List your project" (For Builders): goes to the CRM as a lead (source "builders_list_project")
// with the project details in the message, so it gets the normal alert email + CRM timeline.
export default function ListProjectForm() {
  const [f, setF] = useState({ name: "", phone: "", email: "", company: "", project: "", location: "", rera: "", units: "", note: "" });
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name || !f.phone || !f.project || !f.location) { setError("Your name, phone, project name and location are required."); return; }
    setState("sending"); setError("");
    const message = [
      `LIST MY PROJECT`, `Company: ${f.company || "-"}`, `Project: ${f.project}`, `Location: ${f.location}`,
      `RERA / approval no.: ${f.rera || "not given"}`, `Units / inventory: ${f.units || "-"}`, f.note ? `Note: ${f.note}` : "",
    ].filter(Boolean).join("\n");
    const res = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: f.name, phone: f.phone, email: f.email || undefined, message, source: "builders_list_project" }) }).catch(() => null);
    if (res?.ok) setState("done"); else { setState("error"); setError("Something went wrong. Please try again, or WhatsApp 70130 16003."); }
  };

  if (state === "done") return (
    <div className="text-center py-8">
      <p className="heading-h3 mb-2">Thank you, we have your project.</p>
      <p className="text-gray-500 text-sm">We&apos;ll check the RERA / approval details and call you to set up the pilot.</p>
    </div>
  );
  const inp = "input-dark text-sm py-2.5 px-3 w-full";
  const lbl = "block text-xs font-semibold text-gray-500 mb-1";
  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="heading-h3">List your project</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className={lbl} htmlFor="lp-name">Your name *</label><input id="lp-name" className={inp} value={f.name} onChange={set("name")} /></div>
        <div><label className={lbl} htmlFor="lp-phone">Phone / WhatsApp *</label><input id="lp-phone" className={inp} value={f.phone} onChange={set("phone")} inputMode="tel" /></div>
        <div><label className={lbl} htmlFor="lp-email">Email</label><input id="lp-email" type="email" className={inp} value={f.email} onChange={set("email")} /></div>
        <div><label className={lbl} htmlFor="lp-company">Company</label><input id="lp-company" className={inp} value={f.company} onChange={set("company")} /></div>
        <div><label className={lbl} htmlFor="lp-project">Project name *</label><input id="lp-project" className={inp} value={f.project} onChange={set("project")} /></div>
        <div><label className={lbl} htmlFor="lp-location">Location *</label><input id="lp-location" className={inp} value={f.location} onChange={set("location")} placeholder="Locality, city" /></div>
        <div><label className={lbl} htmlFor="lp-rera">RERA / HMDA / DTCP number</label><input id="lp-rera" className={inp} value={f.rera} onChange={set("rera")} /></div>
        <div><label className={lbl} htmlFor="lp-units">Units available</label><input id="lp-units" className={inp} value={f.units} onChange={set("units")} placeholder="e.g. 40 plots, 2 & 3 BHK" /></div>
        <div className="sm:col-span-2"><label className={lbl} htmlFor="lp-note">Anything else</label><textarea id="lp-note" rows={3} className={`${inp} resize-none`} value={f.note} onChange={set("note")} /></div>
      </div>
      {error && <p className="error-text">{error}</p>}
      <button type="submit" disabled={state === "sending"} className="btn-primary w-full justify-center disabled:opacity-60">{state === "sending" ? "Sending…" : "List my project"}</button>
      <p className="text-[11px] text-gray-400">We publish a project only after checking its RERA / approval number and running the price check. Nothing goes live without your approval.</p>
    </form>
  );
}
