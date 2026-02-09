import { CheckCircle2, X } from 'lucide-react';
import { motion } from 'framer-motion';

const comparisons = [
  { feature: 'Offline-First Architecture', cfi: true, others: false },
  { feature: 'Native M-Pesa STK Push', cfi: true, others: false },
  { feature: 'AI Demand Forecasting', cfi: true, others: false },
  { feature: 'Real-Time Multi-Location Sync', cfi: true, others: false },
  { feature: 'Customer Loyalty & Credit System', cfi: true, others: false },
  { feature: 'Automated Scheduled Reports', cfi: true, others: false },
  { feature: 'Role-Based Security with Audit Trails', cfi: true, others: false },
  { feature: 'GRN & Supplier Invoice Management', cfi: true, others: false },
  { feature: 'Works on Any Device (PWA)', cfi: true, others: false },
  { feature: 'KES Currency & KRA Compliance', cfi: true, others: false },
];

const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, x: 0,
    transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

export function CompetitiveSection() {
  return (
    <section className="py-16 sm:py-24 bg-foreground text-primary-foreground" id="compare">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center mb-16"
        >
          <span className="inline-block text-sm font-semibold text-primary uppercase tracking-widest mb-3">
            Why CFI-POS
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-4">
            Built Different.
            <br />
            <span className="text-primary">Built Better.</span>
          </h2>
          <p className="text-lg text-primary-foreground/60">
            While other POS systems force you into one-size-fits-all solutions, 
            CFI-POS is purpose-built for African wholesale and supermarket operations.
          </p>
        </motion.div>

        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="grid grid-cols-[1fr_80px_80px] sm:grid-cols-[1fr_120px_120px] items-center gap-4 pb-4 border-b border-primary-foreground/10 mb-2">
            <span className="text-sm font-semibold text-primary-foreground/50 uppercase tracking-wider">Feature</span>
            <span className="text-sm font-bold text-primary text-center">CFI-POS</span>
            <span className="text-sm font-semibold text-primary-foreground/40 text-center">Others</span>
          </div>

          {/* Rows */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            transition={{ staggerChildren: 0.05 }}
          >
            {comparisons.map((item, idx) => (
              <motion.div
                key={idx}
                variants={rowVariants}
                className="grid grid-cols-[1fr_80px_80px] sm:grid-cols-[1fr_120px_120px] items-center gap-4 py-3 border-b border-primary-foreground/5 hover:bg-primary-foreground/5 transition-colors rounded px-2"
              >
                <span className="text-sm font-medium text-primary-foreground/80">{item.feature}</span>
                <div className="flex justify-center">
                  <CheckCircle2 className="h-5 w-5 text-accent" />
                </div>
                <div className="flex justify-center">
                  <X className="h-5 w-5 text-primary-foreground/20" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
