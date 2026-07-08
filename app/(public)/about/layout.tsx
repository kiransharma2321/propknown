import type { Metadata } from "next";
import { OG_IMAGE } from "@/app/layout";

export const metadata: Metadata = {
  title: "About PropKnown",
  description:
    "PropKnown Infra Pvt Ltd — India's AI-verified real estate platform. Founded by Pinnelli Raghu Kiran (ISB Alumni, IIM PG Diploma, BITS Pilani) with 20+ years of product management and real estate expertise. We serve buyers, sellers, investors, and NRIs across India, UAE, UK, Singapore, and USA.",
  openGraph: {
    title: "About PropKnown — Founded by ISB Alumni Raghu Kiran",
    description:
      "20+ years of real estate expertise. ISB, IIM, BITS Pilani pedigree. AI-powered, RERA-verified, fully transparent. Know. Invest. Grow.",
    images: [OG_IMAGE],
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
