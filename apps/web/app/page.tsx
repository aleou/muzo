import { FinalCtaSection } from '@/components/sections/final-cta';
import { HeroSection } from '@/components/sections/hero';
import { PricingSection } from '@/components/sections/pricing';
import { ProcessSection } from '@/components/sections/process';
import { ShowcaseSection } from '@/components/sections/showcase';
import { TestimonialsSection } from '@/components/sections/testimonials';
import { ValuePropsSection } from '@/components/sections/value-props';

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col gap-20 pb-24">
      <HeroSection />
      <ValuePropsSection />
      <ProcessSection />
      <ShowcaseSection />
      <TestimonialsSection />
      <PricingSection />
      <FinalCtaSection />
    </main>
  );
}
