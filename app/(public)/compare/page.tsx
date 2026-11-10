import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FEATURES } from "@/lib/features";
import CompareClient from "@/components/tools/CompareClient";

export const metadata: Metadata = {
  title: "Compare Areas & Projects",
  description: "Compare up to 4 areas, projects or listings side by side: asking price, confidence, sources, RERA, possession and true cost.",
  alternates: { canonical: "https://www.propknown.com/compare" },
};

// M3 (feature flag NEXT_PUBLIC_FEATURE_COMPARE). 404 while the flag is off.
export default function ComparePage() {
  if (!FEATURES.compare) notFound();
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-32 pb-20">
      <h1 className="heading-h1 mb-3">Compare side by side</h1>
      <p className="text-gray-600 max-w-2xl mb-8">Add up to 4 areas or projects. Every figure is a sourced, dated asking price from our records, never a guess. If something hasn&apos;t been checked yet, we say so.</p>
      <Suspense fallback={null}><CompareClient /></Suspense>
    </section>
  );
}
