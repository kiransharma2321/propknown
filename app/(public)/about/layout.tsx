import type { Metadata } from "next";
import { OG_IMAGE } from "@/app/layout";

// title/description live in page.tsx (same segment, always wins) -- not repeated here.
export const metadata: Metadata = {
  alternates: { canonical: "https://www.propknown.com/about" },
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
