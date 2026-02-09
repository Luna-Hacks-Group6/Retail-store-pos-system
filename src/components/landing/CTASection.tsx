import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function CTASection() {
  const navigate = useNavigate();

  return (
    <section className="py-20 sm:py-28 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-accent/80" />
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
        backgroundSize: '32px 32px'
      }} />

      <div className="container mx-auto px-4 sm:px-6 relative z-10 text-center">
        <div className="inline-flex items-center gap-2 bg-primary-foreground/10 rounded-full px-4 py-1.5 mb-8">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
          <span className="text-sm font-medium text-primary-foreground/90">Join the Future of Retail</span>
        </div>

        <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-primary-foreground mb-6 tracking-tight max-w-3xl mx-auto">
          Ready to Outperform
          <br />
          Every Competitor?
        </h2>
        
        <p className="text-lg sm:text-xl text-primary-foreground/70 mb-10 max-w-2xl mx-auto">
          Hundreds of businesses across East Africa trust CFI-POS for their daily operations.
          Start transforming your business today.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            onClick={() => navigate('/auth')}
            className="text-lg px-10 py-6 bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-xl"
          >
            Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
}
