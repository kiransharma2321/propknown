import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURES } from "@/lib/features";
import DocumentChecker from "@/components/tools/DocumentChecker";
import { DOC_DISCLAIMER } from "@/lib/documentChecker";

export const metadata: Metadata = {
  title: "AI Document Checker",
  description: "Upload a sale deed, EC or approval for a preliminary AI reading in English, Telugu or Hindi, then a review by PropKnown. Private vault, deleted after 30 days. Not legal advice.",
  alternates: { canonical: "https://www.propknown.com/document-checker" },
  robots: { index: false, follow: true },
};

// M5 (feature flag NEXT_PUBLIC_FEATURE_DOC_CHECKER). 404 while the flag is off.
export default function DocumentCheckerPage() {
  if (!FEATURES.docChecker) notFound();
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-32 pb-20">
      <h1 className="heading-h1 mb-3">AI Document Checker</h1>
      <p className="text-gray-600 max-w-3xl mb-2">Upload a sale deed, encumbrance certificate, approval or agreement. Our AI reads it (English, Telugu or Hindi), pulls out the key details and lists points to check. A PropKnown reviewer then looks at every reading.</p>
      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 max-w-3xl mb-8">{DOC_DISCLAIMER}</p>
      <DocumentChecker />
    </section>
  );
}
