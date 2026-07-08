import type { Metadata } from "next";
import { OG_IMAGE } from "@/app/layout";

export const metadata: Metadata = {
  title: "Sell Your Property",
  description:
    "Sell your property fast with PropKnown's verified buyer network. Free AI valuation, RERA compliance guidance, zero brokerage for sellers in Hyderabad, Bangalore, and globally. WhatsApp Raghu on 97017 71333.",
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
