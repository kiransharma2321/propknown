import type { Metadata } from "next";
import { OG_IMAGE } from "@/app/layout";

// title/description live in page.tsx (same segment, always wins) -- not repeated here.
export const metadata: Metadata = {
  alternates: { canonical: "https://www.propknown.com/sell" },
  openGraph: {
    title: "Sell Your Property — Free AI Valuation | PropKnown",
    description:
      "List with PropKnown and reach 10,000+ verified buyers. Free AI valuation, RERA support, legal verification. Sell faster at the right price.",
    images: [OG_IMAGE],
  },
};

export default function SellLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
