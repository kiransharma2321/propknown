import { prisma } from "@/lib/db";
import { ALL_LOCALITIES } from "@/lib/localities";
import GuidanceRateForm from "./GuidanceRateForm";

export const dynamic = "force-dynamic";

const day = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default async function GuidanceRatesPage() {
  let rows: Awaited<ReturnType<typeof prisma.guidanceRate.findMany>> = [];
  let tableMissing = false;
  try {
    rows = await prisma.guidanceRate.findMany({ orderBy: [{ localityKey: "asc" }, { propertyType: "asc" }, { effectiveDate: "desc" }], take: 500 });
  } catch {
    tableMissing = true;
  }
  const localities = ALL_LOCALITIES
    .filter((l) => l.country === "India")
    .map((l) => ({ key: `${l.citySlug}/${l.slug}`, label: `${l.name}, ${l.city}` }));

  return (
    <div>
      <h1 className="heading-h3">Govt Guidance Rates</h1>
      <p className="text-gray-500 text-sm mb-2 max-w-3xl">
        Official guidance / market values, copied by hand from the published source (Telangana IGRS first). They show
        next to the AI estimate as &ldquo;Govt guidance value&rdquo;, with the source and effective date. Never enter an estimate here.
        To correct or update a rate, add a new row with the new effective date; the newest one is shown.
      </p>
      <p className="text-gray-400 text-xs mb-5">Telangana rates: registration.telangana.gov.in → Market Value → choose district, mandal and village.</p>

      {tableMissing ? (
        <p className="mb-4 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">
          The guidance_rates table hasn&apos;t been created yet: run the pending database update (prisma db push) first.
        </p>
      ) : (
        <div className="mb-6"><GuidanceRateForm localities={localities} /></div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 text-xs">
              <th className="py-2 pr-3">Locality</th><th className="pr-3">State / district / mandal</th><th className="pr-3">Type</th>
              <th className="pr-3">Rate</th><th className="pr-3">Effective</th><th className="pr-3">Source</th><th>Entered</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="py-3 text-gray-400">No official rates entered yet.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-gray-100 align-top">
                <td className="py-2 pr-3">{r.locality}<div className="text-[11px] text-gray-400">{r.localityKey}</div></td>
                <td className="pr-3">{[r.state, r.district, r.mandal].filter(Boolean).join(" / ")}</td>
                <td className="pr-3 capitalize">{r.propertyType}</td>
                <td className="pr-3 tabular-nums">₹{r.ratePerUnit.toLocaleString("en-IN")}/{r.unit}</td>
                <td className="pr-3 tabular-nums">{day(r.effectiveDate)}</td>
                <td className="pr-3">{r.sourceUrl ? <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">{r.sourceName}</a> : r.sourceName}{r.notes && <div className="text-[11px] text-gray-400">{r.notes}</div>}</td>
                <td className="text-xs text-gray-500">{r.enteredBy ?? "—"}<div>{day(r.createdAt)}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
