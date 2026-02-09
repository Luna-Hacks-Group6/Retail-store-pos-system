import { motion } from 'framer-motion';

const stats = [
  { value: '60%', label: 'Faster Checkout', detail: 'Compared to traditional POS' },
  { value: '99.9%', label: 'Uptime', detail: 'With offline fallback' },
  { value: '30%', label: 'Revenue Growth', detail: 'Through customer insights' },
  { value: '10+', label: 'Hours Saved/Week', detail: 'On manual reporting' },
];

export function StatsSection() {
  return (
    <section className="py-16 sm:py-20 bg-card border-y border-border">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="text-center"
            >
              <div className="text-3xl sm:text-5xl font-black text-primary mb-1 tracking-tight">
                {stat.value}
              </div>
              <div className="text-base sm:text-lg font-semibold text-foreground mb-1">{stat.label}</div>
              <div className="text-sm text-muted-foreground">{stat.detail}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
