import { prisma } from "@/lib/db";
import { DOC_TYPES, type DocResult } from "@/lib/documentChecker";
import { markReviewed } from "./actions";

export const dynamic = "force-dynamic";

// M5 human review queue (master only, via the automation layout). Every AI reading is
// "preliminary" until a person reviews it here.
const day = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default async function DocumentReviewsPage() {
  let rows: Awaited<ReturnType<typeof prisma.documentCheck.findMany<{ include: { buyer: { select: { name: true; email: true } } } }>>> = [];
  let tableMissing = false;
  try {
    rows = await prisma.documentCheck.findMany({ orderBy: [{ reviewStatus: "asc" }, { createdAt: "desc" }], take: 100, include: { buyer: { select: { name: true, email: true } } } });
  } catch { tableMissing = true; }

  return (
    <div>
      <h1 className="heading-h3">Document Reviews</h1>
      <p className="text-sm text-gray-500 mb-6">Customers&apos; documents with the AI&apos;s preliminary reading. Review each one and write notes the customer will see. Documents are deleted automatically 30 days after upload.</p>
      {tableMissing && <p className="text-amber-700 text-sm">The document table isn&apos;t in the database yet (DB push pending).</p>}
      {!tableMissing && rows.length === 0 && <p className="text-gray-500 text-sm">No documents yet.</p>}
      <div className="space-y-4">
        {rows.map((d) => {
          const r = d.result as DocResult | null;
          return (
            <div key={d.id} className="border border-gray-200 rounded-xl p-4 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{d.fileName} <span className="text-gray-500 font-normal text-sm">· {DOC_TYPES[d.docType as keyof typeof DOC_TYPES] ?? d.docType} · {d.buyer.name} ({d.buyer.email}) · {day(d.createdAt)}</span></p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${d.reviewStatus === "reviewed" ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`}>{d.reviewStatus === "reviewed" ? `Reviewed by ${d.reviewedBy}` : "Awaiting review"}</span>
              </div>
              {d.injectionFlag && <p className="text-xs text-red-700 mt-1">⚠ The document contained text aimed at an AI system.</p>}
              {d.status === "failed" && <p className="text-xs text-red-700 mt-1">AI reading failed: {d.error}</p>}
              {r && (
                <div className="text-sm mt-3 grid gap-2">
                  <p><b>AI risk:</b> {r.risk} · <b>Language:</b> {r.language} · <b>Type:</b> {r.documentType}</p>
                  <p className="text-gray-700">{r.summary}</p>
                  {r.redFlags.length > 0 && <ul className="list-disc pl-5 text-gray-700">{r.redFlags.map((f, i) => <li key={i}><b>[{f.severity}]</b> {f.issue}{f.quote && <span className="text-gray-500"> “{f.quote}”</span>}</li>)}</ul>}
                </div>
              )}
              <div className="flex flex-wrap gap-3 items-end mt-3">
                <a href={`/api/admin/documents/${d.id}/file`} target="_blank" rel="noopener noreferrer" className="text-sm underline text-[#7A5C1A]">Open the document</a>
                <form action={markReviewed} className="flex flex-1 min-w-[260px] gap-2">
                  <input type="hidden" name="id" value={d.id} />
                  <textarea name="notes" required defaultValue={d.reviewNotes ?? ""} aria-label="Review notes for the customer" placeholder="Review notes the customer will see" className="input-dark text-sm flex-1 min-h-[60px] p-2" />
                  <button type="submit" className="btn-primary text-sm self-end">{d.reviewStatus === "reviewed" ? "Update" : "Mark reviewed"}</button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
