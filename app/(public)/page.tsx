import type { Metadata } from "next";
import HeroSection from "@/components/sections/HeroSection";
import StatsSection from "@/components/sections/StatsSection";
import ProtectionSection from "@/components/sections/ProtectionSection";
import NRITeaser from "@/components/sections/NRITeaser";
import PropertySearchSection from "@/components/sections/PropertySearchSection";
import FeaturedProperties from "@/components/sections/FeaturedProperties";
import ServicesSection from "@/components/sections/ServicesSection";
import WhyChooseUs from "@/components/sections/WhyChooseUs";
import AITeaser from "@/components/sections/AITeaser";
import PriceCheckTeaser from "@/components/sections/PriceCheckTeaser";
import CTASection from "@/components/sections/CTASection";
import { getHeroExamples } from "@/lib/heroExamples";

// Only alternates.canonical is set here -- title/description/OG/Twitter all correctly inherit
// the root layout's defaults, which already describe the homepage accurately.
export const metadata: Metadata = {
  alternates: { canonical: "https://www.propknown.com" },
};

// The hero's example carousel reads the location cache at most once every 6 hours (ISR).
export const revalidate = 21600;

export default async function HomePage() {
  const examples = await getHeroExamples();
  return (
    <>
      <HeroSection examples={examples} />
      <StatsSection />
      <ProtectionSection />
      <NRITeaser />
      <PropertySearchSection />
      <FeaturedProperties />
      <ServicesSection />
      <WhyChooseUs />
      <AITeaser />
      <PriceCheckTeaser />
      <CTASection />
    </>
  );
}
