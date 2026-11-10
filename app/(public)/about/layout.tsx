import type { Metadata } from "next";
import { OG_IMAGE } from "@/app/layout";

// title/description live in page.tsx (same segment, always wins) -- not repeated here.
export const metadata: Metadata = {
  alternates: { canonical: "https://www.propknown.com/about" },
  openGraph: {
    title: "About PropKnown — Founded by Pinnelli Raghukiran",
    description:
      "Founded by Pinnelli Raghukiran — B.Com; ISB and IIM Bangalore credentials; 20+ years across real estate, financial services and media. Know. Invest. Grow.",
    images: [OG_IMAGE],
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
