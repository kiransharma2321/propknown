import type { Metadata } from "next";
import { OG_IMAGE } from "@/app/layout";

// title/description live in page.tsx (same segment, always wins) -- not repeated here.
export const metadata: Metadata = {
  alternates: { canonical: "https://www.propknown.com/pricing" },
  openGraph: {
    title: "PropKnown Service Pricing — Transparent, No Hidden Fees",
    description:
      "Clear, fair pricing for buying, selling, property management, legal verification, and NRI services. No surprise charges.",
    images: [OG_IMAGE],
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
