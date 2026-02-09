import { cn } from '@/lib/utils';

interface CFILogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'wordmark';
  className?: string;
}

export function CFILogo({ size = 'md', variant = 'full', className }: CFILogoProps) {
  const sizeMap = {
    sm: { icon: 'h-7 w-7', text: 'text-base', sub: 'text-[9px]' },
    md: { icon: 'h-9 w-9', text: 'text-lg', sub: 'text-[10px]' },
    lg: { icon: 'h-12 w-12', text: 'text-2xl', sub: 'text-xs' },
    xl: { icon: 'h-16 w-16', text: 'text-4xl', sub: 'text-sm' },
  };

  const s = sizeMap[size];

  const IconMark = () => (
    <div className={cn(
      s.icon,
      'rounded-lg bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center shrink-0 shadow-md',
    )}>
      <span className="font-black text-primary-foreground tracking-tighter" style={{ fontSize: size === 'sm' ? 12 : size === 'md' ? 15 : size === 'lg' ? 20 : 28 }}>
        C
      </span>
    </div>
  );

  if (variant === 'icon') {
    return (
      <div className={className}>
        <IconMark />
      </div>
    );
  }

  if (variant === 'wordmark') {
    return (
      <div className={cn('flex items-center', className)}>
        <span className={cn(s.text, 'font-black tracking-tight')}>
          <span className="text-primary">CFI</span>
          <span className="text-muted-foreground font-light">-</span>
          <span className="text-foreground">POS</span>
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <IconMark />
      <div className="flex flex-col leading-none">
        <span className={cn(s.text, 'font-black tracking-tight')}>
          <span className="text-primary">CFI</span>
          <span className="text-muted-foreground/50 font-light">-</span>
          <span className="text-foreground">POS</span>
        </span>
        <span className={cn(s.sub, 'text-muted-foreground font-medium tracking-widest uppercase mt-0.5')}>
          Point of Sale
        </span>
      </div>
    </div>
  );
}
