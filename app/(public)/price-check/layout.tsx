import type { Metadata } from "next";
import { OG_IMAGE } from "@/app/layout";

const TITLE = "Price Reality Check — Is That Property Overpriced?";
const DESC =
  "Find out instantly if a property is overpriced or underpriced. Compare the asking price against PropKnown live AI market analysis — free to try.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "https://www.propknown.com/price-check" },
  openGraph: {
    title: "PropKnown Price Reality Check — Is That Price Fair?",
    description:
      "Compare any asking price against live AI market analysis in seconds. Backed by the same engine behind PropKnown AI Intelligence — never a blind guess.",
    images: [OG_IMAGE],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC, images: [OG_IMAGE.url] },
};

export default function PriceCheckLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
