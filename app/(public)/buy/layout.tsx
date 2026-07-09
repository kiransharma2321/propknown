import type { Metadata } from "next";
import { OG_IMAGE } from "@/app/layout";

const TITLE = "Buy RERA-Verified Properties";
const DESC =
  "Browse RERA-verified properties in Hyderabad — apartments, villas, HMDA plots, farmland, commercial. AI-scored listings, WhatsApp enquiry. Kokapet, Gachibowli & more.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  // /buy reads city/area/type/budget filter query params for deep-linking (from the homepage
  // search form) -- without this, each filter combination is a separately crawlable,
  // near-duplicate URL with no signal pointing back to the canonical unfiltered page.
  alternates: { canonical: "https://www.propknown.com/buy" },
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
  twitter: { card: "summary_large_image", title: TITLE, description: DESC, images: [OG_IMAGE.url] },
};

export default function BuyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
