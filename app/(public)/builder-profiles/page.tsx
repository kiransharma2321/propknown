import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FEATURES } from "@/lib/features";
import { loadBuilders } from "@/lib/builders";

export const metadata: Metadata = {
  title: "Builder Profiles",
  description: "Builders and their projects as found in public sources, each fact linked to where it came from.",
  alternates: { canonical: "https://www.propknown.com/builder-profiles" },
};
export const revalidate = 21600;

// M8 (feature flag NEXT_PUBLIC_FEATURE_BUILDER_PROFILES). 404 while the flag is off.
export default async function BuilderProfilesPage() {
  if (!FEATURES.builderProfiles) notFound();
  const builders = await loadBuilders();
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-32 pb-20">
      <h1 className="heading-h1 mb-3">Builder Profiles</h1>
      <p className="text-gray-600 max-w-3xl mb-8">Builders behind the projects we&apos;ve checked, with each fact linked to its public source. We don&apos;t rate or review builders here.</p>
      {builders.length === 0 ? <p className="text-gray-500">No builder profiles yet.</p> : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {builders.map((b) => (
            <li key={b.slug}><Link href={`/builder-profiles/${b.slug}`} className="card-dark block p-4 hover:border-[#D6A63E]"><p className="font-semibold">{b.name}</p><p className="text-sm text-gray-500">{b.projects.length} project{b.projects.length === 1 ? "" : "s"} checked</p></Link></li>
          ))}
        </ul>
      )}
    </section>
  );
}
