import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURES } from "@/lib/features";
import DueDiligenceReport from "@/components/tools/DueDiligenceReport";

export const metadata: Metadata = { title: "Due Diligence Report", robots: { index: false, follow: false } };

// M6: a customer's report (owner only; the API checks ownership).
export default function DueDiligenceReportPage({ params }: { params: { id: string } }) {
  if (!FEATURES.dueDiligence) notFound();
  return <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-32 pb-20"><DueDiligenceReport id={params.id} /></section>;
}
