import { motion } from 'framer-motion';

interface FloatingGavelProps {
  className?: string;
  size?: number;
  delay?: number;
  duration?: number;
}

export function FloatingGavel({ className = '', size = 60, delay = 0, duration = 8 }: FloatingGavelProps) {
  return (
    <motion.div
      className={`opacity-5 ${className}`}
      animate={{
        y: [0, -20, 0],
        rotate: [0, 5, 0],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="text-clay">
        <path d="M3.6 21.2l7.2-7.2-2.4-2.4L1.2 18.8c-.8.8-.8 2 0 2.8.8.8 2 .8 2.4-.4zm11.6-9.6l-2.4-2.4L22 0l2.4 2.4-9.2 9.2z"/>
      </svg>
    </motion.div>
  );
}

interface FloatingBalanceProps {
  className?: string;
  size?: number;
  delay?: number;
  duration?: number;
}

export function FloatingBalance({ className = '', size = 50, delay = 0, duration = 10 }: FloatingBalanceProps) {
  return (
    <motion.div
      className={`opacity-5 ${className}`}
      animate={{
        y: [0, 15, 0],
        rotate: [0, -3, 0],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-clay">
        <path d="M12 3v18M3 8l4.5-3L12 8l4.5-3L21 8M5 8c0 3 1.5 5 4 5s4-2 4-5M15 8c0 3 1.5 5 4 5s4-2 4-5"/>
      </svg>
    </motion.div>
  );
}
