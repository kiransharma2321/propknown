import type { Metadata } from "next";
import HomePage from "@/components/pk/HomePage";

// Only alternates.canonical is set here -- title/description/OG/Twitter all correctly inherit
// the root layout's defaults, which already describe the homepage accurately.
export const metadata: Metadata = {
  alternates: { canonical: "https://www.propknown.com" },
};

// Every section reads cached data only (no live API calls during render), at most once every
// 6 hours (ISR).
export const revalidate = 21600;

// All the existing homepage sections, in their original order, plus the new ones: see
// components/pk/HomePage.tsx.
export default function Home() {
  return <HomePage />;
}
