import { Card, CardContent } from '@/components/ui/card';
import {
  ShoppingCart,
  BarChart3,
  Users,
  Package,
  Shield,
  Cloud,
  Brain,
  CreditCard,
  Bell,
  Globe,
} from 'lucide-react';

const features = [
  {
    icon: ShoppingCart,
    title: 'Lightning Checkout',
    description: 'Barcode scanning, keyboard shortcuts, and smart search. Process sales in under 10 seconds with multi-payment support.',
    color: 'from-primary/20 to-primary/5',
    iconColor: 'text-primary',
  },
  {
    icon: Brain,
    title: 'AI-Powered Insights',
    description: 'Predictive analytics forecast demand, identify trends, and recommend optimal stock levels before you even think about it.',
    color: 'from-accent/20 to-accent/5',
    iconColor: 'text-accent',
  },
  {
    icon: Package,
    title: 'Smart Inventory',
    description: 'Real-time stock tracking across locations with automated reorder alerts, batch tracking, and expiry management.',
    color: 'from-warning/20 to-warning/5',
    iconColor: 'text-warning',
  },
  {
    icon: Users,
    title: 'Customer Intelligence',
    description: 'Build rich customer profiles with purchase history, loyalty tiers, credit management, and personalized engagement.',
    color: 'from-primary/20 to-primary/5',
    iconColor: 'text-primary',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    description: 'Interactive dashboards with sales trends, profit margins, staff performance, and automated scheduled reports.',
    color: 'from-accent/20 to-accent/5',
    iconColor: 'text-accent',
  },
  {
    icon: CreditCard,
    title: 'M-Pesa Integration',
    description: 'Native M-Pesa STK Push for seamless mobile payments. Support hybrid Cash + M-Pesa splits on single transactions.',
    color: 'from-success/20 to-success/5',
    iconColor: 'text-success',
  },
  {
    icon: Cloud,
    title: 'Offline-First Design',
    description: 'Never lose a sale. Transactions queue offline and sync automatically when connectivity returns.',
    color: 'from-primary/20 to-primary/5',
    iconColor: 'text-primary',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Role-based access control, encrypted data, audit trails, and row-level security protect every transaction.',
    color: 'from-destructive/20 to-destructive/5',
    iconColor: 'text-destructive',
  },
  {
    icon: Bell,
    title: 'Smart Alerts',
    description: 'Automated low-stock warnings, expiry notifications, and performance anomaly detection keep you ahead of problems.',
    color: 'from-warning/20 to-warning/5',
    iconColor: 'text-warning',
  },
];

export function FeaturesSection() {
  return (
    <section className="py-16 sm:py-24 bg-background" id="features">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <span className="inline-block text-sm font-semibold text-primary uppercase tracking-widest mb-3">
            Feature Suite
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-4">
            Everything You Need.
            <br />
            <span className="text-muted-foreground">Nothing You Don't.</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Built from the ground up for African wholesale and supermarket operations.
            Every feature is battle-tested in real stores.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <Card
                key={idx}
                className="group border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <CardContent className="p-6">
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} mb-4`}>
                    <Icon className={`h-6 w-6 ${feature.iconColor}`} />
                  </div>
                  <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
