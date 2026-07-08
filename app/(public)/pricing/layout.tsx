import type { Metadata } from "next";
import { OG_IMAGE } from "@/app/layout";

export const metadata: Metadata = {
  title: "Pricing & Service Packages",
  description:
    "Transparent PropKnown service pricing. No hidden fees. Packages for buyers, sellers, property management, legal verification, and NRI services. One-time and annual plans available.",
  openGraph: {
    title: "PropKnown Service Pricing — Transparent, No Hidden Fees",
    description:
      "Clear, fair pricing for buying, selling, property management, legal verification, and NRI services. No surprise charges.",
    images: [OG_IMAGE],
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
