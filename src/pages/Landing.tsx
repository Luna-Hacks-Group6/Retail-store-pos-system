import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { HeroSection } from '@/components/landing/HeroSection';
import { StatsSection } from '@/components/landing/StatsSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { InsightsSection } from '@/components/landing/InsightsSection';
import { CompetitiveSection } from '@/components/landing/CompetitiveSection';
import { CTASection } from '@/components/landing/CTASection';
import { FooterSection } from '@/components/landing/FooterSection';
import { CFILogo } from '@/components/CFILogo';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen w-full">
      {/* Sticky Nav */}
      <nav className="fixed top-0 z-50 w-full bg-foreground/80 backdrop-blur-xl border-b border-primary-foreground/5">
        <div className="container mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <CFILogo size="sm" className="[&_span]:text-primary-foreground [&_.text-foreground]:text-primary-foreground [&_.text-muted-foreground]:text-primary-foreground/50" />
          <Button
            size="sm"
            onClick={() => navigate('/auth')}
            className="bg-primary hover:bg-primary/90"
          >
            Get Started <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </nav>

      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <InsightsSection />
      <CompetitiveSection />
      <CTASection />
      <FooterSection />
    </div>
  );
}
