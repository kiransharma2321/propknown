import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { FEATURES } from "@/lib/features";
import { loadBuilders, trustScore } from "@/lib/builders";

export const revalidate = 21600;
export const metadata: Metadata = { title: "Builder Profile" };

// M8: one builder's projects from our sourced checks. The Trust Score block only renders when
// the separate builderTrustScore flag is on (which needs the legal review first).
export default async function BuilderProfilePage({ params }: { params: { slug: string } }) {
  if (!FEATURES.builderProfiles) notFound();
  const b = (await loadBuilders()).find((x) => x.slug === params.slug);
  if (!b) notFound();
  const ts = FEATURES.builderTrustScore ? trustScore(b) : null;
  const day = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-32 pb-20">
      <p className="text-sm"><Link href="/builder-profiles" className="underline text-gray-500">Builder Profiles</Link></p>
      <h1 className="heading-h1 mb-3">{b.name}</h1>
      <p className="text-gray-600 mb-8">Projects we have checked, with what public sources say. Each fact comes from the linked source; verify on the RERA portal before you decide.</p>
      <div className="overflow-x-auto rounded-2xl border border-gray-200">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50 text-left"><tr><th className="p-3">Project</th><th className="p-3">Area</th><th className="p-3">Status</th><th className="p-3">Possession</th><th className="p-3">RERA (per source)</th><th className="p-3">Asking ₹/sq.ft</th><th className="p-3">Source</th></tr></thead>
          <tbody>
            {b.projects.map((p) => (
              <tr key={p.name} className="border-t border-gray-100">
                <td className="p-3 font-semibold"><Link href={`/price-check?location=${encodeURIComponent(p.area)}&project=${encodeURIComponent(p.name)}#project`} className="hover:underline">{p.name}</Link></td>
                <td className="p-3">{p.area}</td><td className="p-3">{p.status ?? "—"}</td><td className="p-3">{p.possession ?? "—"}</td><td className="p-3">{p.rera ?? "Not found"}</td>
                <td className="p-3">{p.priceMin && p.priceMax ? `${p.priceMin.toLocaleString("en-IN")}–${p.priceMax.toLocaleString("en-IN")}` : "—"}</td>
                <td className="p-3"><a href={p.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-gray-500 underline">link<ExternalLink size={11} /></a><span className="block text-[11px] text-gray-500">checked {day(p.checkedAt)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {ts && (
        <div className="card-dark p-5 mt-8">
          <h2 className="heading-h3 mb-1">Builder Trust Score</h2>
          <p className="font-semibold">{ts.score != null ? `${ts.score}/100` : ts.basedOn}</p>
          <ul className="text-sm text-gray-600 mt-2">{ts.factors.map((f) => <li key={f.key}>{f.label}: {f.points ?? "—"} <span className="text-gray-500">({f.note})</span></li>)}</ul>
        </div>
      )}
      <p className="text-[11px] text-gray-500 mt-6">Information from public listing and builder pages, as found on the dates shown. PropKnown does not rate builders on this page. Spotted an error? Contact us and we&apos;ll correct it.</p>
    </section>
  );
}
