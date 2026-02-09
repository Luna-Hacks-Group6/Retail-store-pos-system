import { Button } from '@/components/ui/button';
import { ArrowRight, Play, Shield, Zap, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CFILogo } from '@/components/CFILogo';

export function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-foreground via-foreground/95 to-primary/20" />
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--primary-foreground)) 1px, transparent 0)',
        backgroundSize: '40px 40px'
      }} />

      {/* Floating accent orbs */}
      <div className="absolute top-20 right-[10%] w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-20 left-[5%] w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-4xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-8 animate-fade-in">
            <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            <span className="text-sm font-medium text-primary-foreground/80">Enterprise-Grade POS Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight text-primary-foreground leading-[0.95] mb-6 animate-fade-in">
            Command Your
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              Retail Empire
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-primary-foreground/60 max-w-2xl mb-10 leading-relaxed animate-fade-in" style={{ animationDelay: '100ms' }}>
            The intelligence-driven POS system built for supermarkets and wholesale businesses. 
            Real-time analytics, predictive inventory, and customer insights that give you an 
            unfair advantage over every competitor.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-16 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')} 
              className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25"
            >
              Start Free Today <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate('/auth')}
              className="text-lg px-8 py-6 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Play className="mr-2 h-5 w-5" /> Watch Demo
            </Button>
          </div>

          {/* Trust bar */}
          <div className="flex flex-wrap items-center gap-8 animate-fade-in" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center gap-2 text-primary-foreground/50">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">Bank-Level Security</span>
            </div>
            <div className="flex items-center gap-2 text-primary-foreground/50">
              <Zap className="h-4 w-4" />
              <span className="text-sm font-medium">Sub-Second Checkout</span>
            </div>
            <div className="flex items-center gap-2 text-primary-foreground/50">
              <Globe className="h-4 w-4" />
              <span className="text-sm font-medium">Works Offline</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
