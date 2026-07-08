import type { Metadata } from "next";
import { OG_IMAGE } from "@/app/layout";

export const metadata: Metadata = {
  title: "Property Services",
  description:
    "PropKnown's full-suite real estate services: legal title verification, RERA compliance, property management, rent collection, construction, and NRI investment support across India and globally.",
  openGraph: {
    title: "Property Services — Legal, RERA, Management | PropKnown",
    description:
      "End-to-end real estate services: legal verification, RERA registration, property management, NRI support. Expert team led by ISB & IIM alumnus Raghu Kiran.",
    images: [OG_IMAGE],
  },
};

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
