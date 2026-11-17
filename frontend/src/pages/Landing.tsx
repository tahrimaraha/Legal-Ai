import { Corpus } from '../components/sections/Corpus';
import { EscalationLadder } from '../components/sections/EscalationLadder';
import { Faq } from '../components/sections/Faq';
import { Features } from '../components/sections/Features';
import { FinalCta } from '../components/sections/FinalCta';
import { ForLawyers } from '../components/sections/ForLawyers';
import { Hero } from '../components/sections/Hero';
import { HowItWorks } from '../components/sections/HowItWorks';
import { Problem } from '../components/sections/Problem';
import { Safety } from '../components/sections/Safety';
import { Showcase } from '../components/sections/Showcase';
import { Testimonials } from '../components/sections/Testimonials';
import { TrustStrip } from '../components/sections/TrustStrip';
import { FloatingActionButton } from '../components/ui/FloatingActionButton';

export default function Landing() {
  return (
    <>
      {/* Nav and Footer come from PublicLayout. */}
      <div id="main">
        <Hero />
        <TrustStrip />
        <Showcase />
        <EscalationLadder />
        <HowItWorks />
        <Features />
        <Corpus />
        <ForLawyers />
        <Problem />
        <Testimonials />
        <Safety />
        <Faq />
        <FinalCta />
      </div>
      <FloatingActionButton />
    </>
  );
}
