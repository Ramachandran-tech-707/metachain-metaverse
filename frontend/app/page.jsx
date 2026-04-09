import HeroSection   from '@/components/HeroSection';
import FeaturedNFTs  from '@/components/FeaturedNFTs';
import ChainsTicker  from '@/components/ChainsTicker';
import FeaturesGrid  from '@/components/FeaturesGrid';
import RoadmapSection from '@/components/RoadmapSection';
import CTABanner     from '@/components/CTABanner';
import Footer        from '@/components/Footer';

export default function Home() {
  return (
    <>
      <main>
        <HeroSection />
        <ChainsTicker />
        <FeaturesGrid />
        <FeaturedNFTs />
        <RoadmapSection />
        <CTABanner />
      </main>
      <Footer />
    </>
  );
}
