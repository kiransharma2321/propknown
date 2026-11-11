import { requestDetailsAction } from "../actions";

// Listing Researcher draft: every fact with its source link and capture date, plus the
// pre-queue checks (price vs area, duplicate, conflicts, missing fields) and the confidence score.
type Fact = { value: string; sourceUrl: string; capturedAt: string };
const LABELS: Record<string, string> = {
  name: "Project", builder: "Builder", builderLegalName: "Builder (legal name)", location: "Location", approvalType: "Approval type",
  approvalNumber: "Approval number", configurations: "Configurations", sizes: "Sizes", pricePerUnit: "Price per unit", totalPrice: "Total price",
  priceUnit: "Price unit", areaBasis: "Area basis", possession: "Possession", status: "Status", builderWebsite: "Builder website",
};
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };

export default function ResearchFacts({ id, facts, checks, confidence, open }: { id: string; facts: Record<string, Fact[]>; checks: Record<string, unknown> | null; confidence: number | null; open: boolean }) {
  const c = (checks ?? {}) as { priceVsArea?: string; areaPrice?: number; duplicateOf?: string | null; conflicts?: string[]; missing?: string[] };
  return (
    <div className="card-dark p-4 text-sm space-y-3">
      <div className="flex items-center justify-between"><p className="font-semibold text-gray-900">Facts and sources</p>{confidence != null && <span className="text-xs font-semibold">Confidence {confidence}/100</span>}</div>
      <table className="w-full text-xs">
        <tbody>
          {Object.entries(facts).flatMap(([k, list]) => list.map((f, i) => (
            <tr key={`${k}-${i}`} className="border-t border-gray-100 align-top">
              <td className="py-1 pr-2 text-gray-500 whitespace-nowrap">{i === 0 ? LABELS[k] ?? k : ""}</td>
              <td className="py-1 pr-2 text-gray-900">{f.value}</td>
              <td className="py-1 whitespace-nowrap"><a href={f.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">{host(f.sourceUrl)}</a> <span className="text-gray-400">{new Date(f.capturedAt).toLocaleDateString("en-IN")}</span></td>
            </tr>
          )))}
        </tbody>
      </table>
      <ul className="text-xs space-y-0.5 text-gray-600">
        <li>Price vs area: <b>{(c.priceVsArea ?? "no_data").replace("_", " ")}</b>{c.areaPrice ? ` (area ₹${c.areaPrice.toLocaleString("en-IN")}/sq ft, cached sourced data)` : ""}</li>
        <li>Duplicate check: {c.duplicateOf ? <b className="text-amber-800">possible duplicate of {c.duplicateOf}</b> : "none found"}</li>
        <li>Conflicts: {c.conflicts?.length ? <b className="text-amber-800">{c.conflicts.join("; ")}</b> : "none"}</li>
        <li>Missing: {c.missing?.length ? c.missing.join(", ") : "nothing"}</li>
      </ul>
      <p className="text-[11px] text-gray-400">Description is written by PropKnown from these facts. No page text or photos are copied. Verify any approval number on the official portal before approving.</p>
      {open && (
        <form action={requestDetailsAction} className="flex gap-2">
          <input type="hidden" name="id" value={id} />
          <input name="note" placeholder="Note for the request (optional)" className="input-dark text-xs py-1.5 px-2 flex-1" />
          <button className="btn-secondary text-xs">Request builder details</button>
        </form>
      )}
    </div>
  );
}
