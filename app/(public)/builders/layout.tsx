import type { Metadata } from "next";
import { OG_IMAGE } from "@/app/layout";

// title/description live in page.tsx (same segment, always wins) -- not repeated here.
export const metadata: Metadata = {
  alternates: { canonical: "https://www.propknown.com/builders" },
  openGraph: {
    title: "Builder & Developer Partnerships | PropKnown",
    description:
      "Reach verified buyers, leverage AI pricing, and close faster. PropKnown's builder partnership programme — RERA-compliant, results-driven.",
    images: [OG_IMAGE],
  },
};

export default function BuildersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
