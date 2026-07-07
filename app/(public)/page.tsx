import HeroSection from "@/components/sections/HeroSection";
import StatsSection from "@/components/sections/StatsSection";
import FeaturedProperties from "@/components/sections/FeaturedProperties";
import ServicesSection from "@/components/sections/ServicesSection";
import WhyChooseUs from "@/components/sections/WhyChooseUs";
import AITeaser from "@/components/sections/AITeaser";
import PriceCheckTeaser from "@/components/sections/PriceCheckTeaser";
import GlobalPresence from "@/components/sections/GlobalPresence";
import TestimonialsSection from "@/components/sections/TestimonialsSection";
import CTASection from "@/components/sections/CTASection";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <StatsSection />
      <FeaturedProperties />
      <ServicesSection />
      <WhyChooseUs />
      <AITeaser />
      <PriceCheckTeaser />
      <GlobalPresence />
      <TestimonialsSection />
      <CTASection />
    </>
  );
}
