

import HomeNavbar from "@/components/home/HomeNavbar";
import HeroSection from "@/components/home/HeroSection";
import TrustStatsSection from "@/components/home/TrustStatsSection";
import WhyLoveMatchSection from "@/components/home/WhyLoveMatchSection";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import DiscoverProfilesSection from "@/components/home/DiscoverProfilesSection";
import CommunicationSection from "@/components/home/CommunicationSection";
import SuccessStoriesSection from "@/components/home/SuccessStoriesSection";
import FinalCTASection from "@/components/home/FinalCTASection";
import HomeFooter from "@/components/home/HomeFooter";

export default function HomePage() {
  return (
    <main>
      <HomeNavbar />
      <HeroSection />
      <TrustStatsSection />
      <WhyLoveMatchSection />
      <HowItWorksSection />
      <DiscoverProfilesSection />
      <CommunicationSection />
      <SuccessStoriesSection />
      <FinalCTASection />
      <HomeFooter />
    </main>
  );
}
