import Link from "next/link";
import { prisma } from "@/lib/db";
import type { DDReport } from "@/lib/dueDiligence";
import { reviewDueDiligence } from "./actions";

export const dynamic = "force-dynamic";

// M6 review queue (master only, via the automation layout).
const day = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default async function DDReviewsPage() {
  const leads = await prisma.lead.findMany({ where: { source: "Due diligence report" }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, name: true, email: true, phone: true, createdAt: true, reportContext: true } });
  return (
    <div>
      <h1 className="heading-h3">Due Diligence Reviews</h1>
      <p className="text-sm text-gray-500 mb-6">Preliminary reports customers requested. Review each one: notes and checklist statuses are shown to the customer. Only mark an item verified after you have checked the original document.</p>
      {leads.length === 0 && <p className="text-gray-500 text-sm">No reports yet.</p>}
      <div className="space-y-4">
        {leads.map((l) => {
          const c = l.reportContext as unknown as { report: DDReport; review: { by: string; at: string; notes: string; checklist: Record<string, string> } | null };
          const r = c.report;
          return (
            <details key={l.id} className="border border-gray-200 rounded-xl p-4 bg-white" open={!c.review}>
              <summary className="cursor-pointer font-semibold">{r.title} <span className="font-normal text-sm text-gray-500">· {l.name} · {l.phone} · {day(l.createdAt)} · {c.review ? `Reviewed by ${c.review.by}` : "Awaiting review"}</span></summary>
              <div className="text-sm mt-3 grid gap-2">
                <ul className="list-disc pl-5 text-gray-700">{r.steps.map((s, i) => <li key={i}><b>{s.step}:</b> {s.detail} <span className="text-gray-500">({s.status}{s.source ? `; ${s.source}` : ""})</span></li>)}</ul>
                {r.redFlags.length > 0 && <div><b>Red flags</b><ul className="list-disc pl-5 text-red-800">{r.redFlags.map((f, i) => <li key={i}>{f}</li>)}</ul></div>}
                {r.documents.length > 0 && <p>Documents: {r.documents.map((d) => <Link key={d.id} href="/admin/automation/document-reviews" className="underline mr-2">{d.fileName}</Link>)}</p>}
              </div>
              <form action={reviewDueDiligence} className="mt-3 grid gap-2">
                <input type="hidden" name="id" value={l.id} />
                <div className="grid sm:grid-cols-3 gap-2">
                  {r.checklist.map((item) => (
                    <label key={item.key} className="text-xs text-gray-700">{item.label}
                      <select name={`c_${item.key}`} defaultValue={c.review?.checklist?.[item.key] ?? "pending"} className="input-dark text-xs py-1.5 px-2 w-full mt-0.5">
                        <option value="pending">Pending</option><option value="verified">Verified (original seen)</option><option value="na">Not applicable</option>
                      </select>
                    </label>
                  ))}
                </div>
                <textarea name="notes" required defaultValue={c.review?.notes ?? ""} aria-label="Review notes for the customer" placeholder="Review notes the customer will see" className="input-dark text-sm min-h-[70px] p-2" />
                <button type="submit" className="btn-primary text-sm justify-self-start">{c.review ? "Update review" : "Save review"}</button>
              </form>
            </details>
          );
        })}
      </div>
    </div>
  );
}
