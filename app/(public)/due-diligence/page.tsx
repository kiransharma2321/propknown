import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURES } from "@/lib/features";
import DueDiligenceForm from "@/components/tools/DueDiligence";
import { DD_DISCLAIMER } from "@/lib/dueDiligence";

export const metadata: Metadata = {
  title: "Due Diligence Report",
  description: "A preliminary due-diligence report on a project or area: price vs market, project facts, RERA, your documents, true cost and a legal checklist, reviewed by PropKnown. Not legal advice.",
  alternates: { canonical: "https://www.propknown.com/due-diligence" },
};

// M6 (feature flag NEXT_PUBLIC_FEATURE_DUE_DILIGENCE). 404 while the flag is off.
export default function DueDiligencePage() {
  if (!FEATURES.dueDiligence) notFound();
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-32 pb-20">
      <h1 className="heading-h1 mb-3">Due Diligence Report</h1>
      <p className="text-gray-600 max-w-3xl mb-2">We run our checks one after another: area and project prices, project facts, RERA, your uploaded documents, true cost and the Investment Score. Then we put everything in one report. Every step shows its source, and a PropKnown reviewer checks the report.</p>
      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 max-w-3xl mb-8">{DD_DISCLAIMER}</p>
      <DueDiligenceForm />
    </section>
  );
}
