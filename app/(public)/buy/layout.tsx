import type { Metadata } from "next";
import { OG_IMAGE } from "@/app/layout";

export const metadata: Metadata = {
  title: "Buy RERA-Verified Properties",
  description:
    "Browse RERA-verified properties in Hyderabad — apartments, villas, HMDA plots, farmland, and commercial spaces. AI-scored listings with WhatsApp enquiry. Kokapet, Gachibowli, Nallagandla, Financial District and more.",
  keywords: [
    "buy property Hyderabad", "RERA verified apartments", "Kokapet flats",
    "Gachibowli apartments", "Nallagandla villas", "HMDA plots Hyderabad",
    "PropKnown listings", "property investment Hyderabad 2026",
  ],
  openGraph: {
    title: "Buy RERA-Verified Properties in Hyderabad | PropKnown",
    description:
      "AI-scored, RERA-verified properties — apartments, villas, HMDA plots, farmland. WhatsApp enquiry, transparent pricing, zero surprises.",
    images: [OG_IMAGE],
  },
};

export default function BuyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
