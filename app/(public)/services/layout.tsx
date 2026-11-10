import type { Metadata } from "next";
import { OG_IMAGE } from "@/app/layout";

// title/description live in page.tsx (same segment, always wins) -- not repeated here.
export const metadata: Metadata = {
  alternates: { canonical: "https://www.propknown.com/services" },
  openGraph: {
    title: "Property Services — Legal, RERA, Management | PropKnown",
    description:
      "End-to-end real estate services: legal verification, RERA registration, property management, NRI support. Led by founder Pinnelli Raghukiran (B.Com; ISB and IIM Bangalore credentials; 20+ years across real estate, financial services and media).",
    images: [OG_IMAGE],
  },
};

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
