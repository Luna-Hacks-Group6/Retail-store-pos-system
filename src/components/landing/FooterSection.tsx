import { CFILogo } from '@/components/CFILogo';

export function FooterSection() {
  return (
    <footer className="py-12 bg-foreground border-t border-border/10">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <CFILogo size="md" className="[&_span]:text-primary-foreground [&_.text-foreground]:text-primary-foreground [&_.text-muted-foreground]:text-primary-foreground/50" />
          <p className="text-primary-foreground/40 text-sm max-w-md">
            Enterprise-grade point of sale solutions for modern wholesale and supermarket businesses across Africa.
          </p>
          <div className="border-t border-primary-foreground/10 pt-4 w-full max-w-md">
            <p className="text-primary-foreground/30 text-xs">
              © {new Date().getFullYear()} CFI Tech Solutions. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
