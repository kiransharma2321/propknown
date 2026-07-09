import type { Metadata } from "next";
import { OG_IMAGE } from "@/app/layout";

// title/description are NOT set here -- page.tsx in this same route segment defines its own
// and always wins over a sibling layout.tsx's, so anything here would be unreachable dead
// code. openGraph below is different: page.tsx doesn't define its own, so this one actually
// is what renders -- confirmed by checking real build output before touching this file.
export const metadata: Metadata = {
  alternates: { canonical: "https://www.propknown.com/contact" },
  openGraph: {
    title: "Contact PropKnown — WhatsApp 97017 71333",
    description:
      "Reach Raghu Kiran directly on WhatsApp 97017 71333 or visit our Hyderabad office. We respond within 2 hours.",
    images: [OG_IMAGE],
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
