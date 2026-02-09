import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { TrendingUp, Eye, Target, Lightbulb, PieChart, LineChart } from 'lucide-react';

const insights = [
  {
    icon: TrendingUp,
    title: 'Sales Velocity Tracking',
    description: 'Know exactly which products are accelerating and which are stalling. Identify seasonal patterns and capitalize on trends before competitors.',
    metric: 'Real-time'
  },
  {
    icon: Eye,
    title: 'Customer Behavior Analytics',
    description: 'Track purchase frequency, basket size, and product affinity. Understand what drives repeat visits and maximize customer lifetime value.',
    metric: '360° View'
  },
  {
    icon: Target,
    title: 'Demand Forecasting',
    description: 'AI-powered predictions use historical data to forecast what you\'ll sell next week, next month, and next quarter. Never overstock or understock again.',
    metric: 'AI-Powered'
  },
  {
    icon: PieChart,
    title: 'Margin Optimization',
    description: 'Visualize profit margins per product, category, and supplier. Identify hidden revenue leaks and optimize your pricing strategy.',
    metric: 'Per-Item'
  },
  {
    icon: LineChart,
    title: 'Staff Performance',
    description: 'Track cashier speed, sales per shift, and transaction accuracy. Reward top performers and identify training opportunities.',
    metric: 'Per-Shift'
  },
  {
    icon: Lightbulb,
    title: 'Strategic Recommendations',
    description: 'Automated reports highlight actionable opportunities: best reorder times, ideal promotions, supplier negotiation leverage, and growth strategies.',
    metric: 'Actionable'
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: { 
    opacity: 1, x: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

export function InsightsSection() {
  return (
    <section className="py-16 sm:py-24 bg-gradient-to-b from-muted/30 to-background" id="insights">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center mb-16"
        >
          <span className="inline-block text-sm font-semibold text-accent uppercase tracking-widest mb-3">
            Business Intelligence
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-4">
            Insights That Drive
            <br />
            <span className="text-accent">Winning Strategies</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Your supermarket generates thousands of data points daily. CFI-POS transforms that data 
            into competitive advantages no spreadsheet can match.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {insights.map((insight, idx) => {
            const Icon = insight.icon;
            return (
              <motion.div key={idx} variants={cardVariants}>
                <Card className="group relative overflow-hidden border-border/50 hover:border-accent/30 transition-all duration-300 hover:shadow-lg hover:shadow-accent/5 h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-2.5 rounded-lg bg-accent/10">
                        <Icon className="h-5 w-5 text-accent" />
                      </div>
                      <span className="text-xs font-bold text-accent bg-accent/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {insight.metric}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg mb-2">{insight.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {insight.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
