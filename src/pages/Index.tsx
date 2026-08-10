import { lazy, Suspense } from 'react';
import LandingNav from '@/components/landing/LandingNav';
import HeroSection from '@/components/landing/HeroSection';
import SEO from '@/components/SEO';


// Lazy load sections below the fold for faster initial paint
const ClientLogosSection = lazy(() => import('@/components/landing/ClientLogosSection'));
const ProblemSection = lazy(() => import('@/components/landing/ProblemSection'));
const ClientsSection = lazy(() => import('@/components/landing/ClientsSection'));
const MethodSection = lazy(() => import('@/components/landing/MethodSection'));
const ServicesSection = lazy(() => import('@/components/landing/ServicesSection'));
const ShowcaseSection = lazy(() => import('@/components/landing/ShowcaseSection'));
const PortfolioSection = lazy(() => import('@/components/landing/PortfolioSection'));
const PortfolioCasesDisplay = lazy(() => import('@/components/landing/PortfolioCasesDisplay'));
const FounderSection = lazy(() => import('@/components/landing/FounderSection'));
const TeamSection = lazy(() => import('@/components/landing/TeamSection'));
const SocialProofSection = lazy(() => import('@/components/landing/SocialProofSection'));
const FooterCTA = lazy(() => import('@/components/landing/FooterCTA'));

const SectionFallback = () => <div className="min-h-[200px]" aria-hidden="true" />;

// Wrap each lazy section in its own Suspense so that one slow chunk
// does not collapse the entire page below the fold (critical on mobile).
const LazySection = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<SectionFallback />}>{children}</Suspense>
);

const Index = () => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "name": "Peformake",
    "image": "https://peformake.com.br/favicon.png",
    "@id": "https://peformake.com.br",
    "url": "https://peformake.com.br",
    "telephone": "",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Brasil",
      "addressCountry": "BR"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": -15.7942,
      "longitude": -47.8822
    },
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday"
      ],
      "opens": "09:00",
      "closes": "18:00"
    },
    "sameAs": [
      "https://www.instagram.com/performake/"
    ]
  };

  return (
    <div className="landing-page selection:bg-performake-accent/30">
      <SEO 
        title="Estruturação de Marketing e Resultados Reais"
        description="Organizamos, posicionamos e escalamos empresas com estratégia, execução e análise baseada em dados reais. Faça seu diagnóstico gratuito agora."
        structuredData={structuredData}
      />

      <LandingNav />
      <main>

        <HeroSection />
        <LazySection><ClientLogosSection /></LazySection>
        <LazySection><ProblemSection /></LazySection>
        <LazySection><ClientsSection /></LazySection>
        <LazySection><MethodSection /></LazySection>
        <LazySection><ServicesSection /></LazySection>
        <LazySection><ShowcaseSection /></LazySection>
        <LazySection><PortfolioSection /></LazySection>
        <LazySection>
          <PortfolioCasesDisplay
            title="Nossos resultados"
            subtitle="Veja os cases reais dos nossos clientes"
          />
        </LazySection>
        <LazySection><FounderSection /></LazySection>
        <LazySection><TeamSection /></LazySection>
        <LazySection><SocialProofSection /></LazySection>
        <LazySection><FooterCTA /></LazySection>
      </main>
    </div>
  );
};

export default Index;
