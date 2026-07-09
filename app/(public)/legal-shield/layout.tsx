import type { Metadata } from "next";
import { OG_IMAGE } from "@/app/layout";

const TITLE = "Legal Shield — Fraud & Red-Flag Property Checker";
const DESC =
  "Free fraud and red-flag checker for Indian real estate listings. Spot common scam signals, compare asking price against the market, and verify any RERA registration number against your state's official portal.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "https://www.propknown.com/legal-shield" },
  openGraph: {
    title: "PropKnown Legal Shield — Fraud & Red-Flag Checker",
    description:
      "Enter what you know about a listing and get an honest, plain-language check for common Indian real estate scam signals, plus direct links to verify RERA numbers officially.",
    images: [OG_IMAGE],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC, images: [OG_IMAGE.url] },
};

export default function LegalShieldLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
