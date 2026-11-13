import { motion } from 'framer-motion';
import { useReducedMotion } from '../../lib/motion';

interface AnimatedBackgroundProps {
  variant?: 'dots' | 'grid' | 'orbs' | 'legal-symbols';
  className?: string;
}

export function AnimatedBackground({ variant = 'dots', className = '' }: AnimatedBackgroundProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={`absolute inset-0 pointer-events-none ${className}`} aria-hidden="true" />;
  }

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} aria-hidden="true">
      {variant === 'dots' && <DotsPattern />}
      {variant === 'grid' && <GridPattern />}
      {variant === 'orbs' && <OrbsPattern />}
      {variant === 'legal-symbols' && <LegalSymbolsPattern />}
    </div>
  );
}

function DotsPattern() {
  return (
    <div className="absolute inset-0">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={`dot-${i}`}
          className="absolute w-1 h-1 bg-clay/10 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -10, 0],
            opacity: [0.1, 0.3, 0.1],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function GridPattern() {
  return (
    <div className="absolute inset-0 opacity-20">
      <div className="h-full w-full">
        <div className="grid h-full grid-cols-12 gap-px">
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={`grid-${i}`}
              className="border-l border-granite-soft/30"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{
                duration: 1.5,
                delay: i * 0.1,
                ease: [0.16, 1, 0.3, 1],
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function OrbsPattern() {
  // Orbs removed - causing visual bubble effect
  return <div className="absolute inset-0" />;
}

function LegalSymbolsPattern() {
  const symbols = ['§', '⚖', '⚡', '📜', '🏛', '⚖'];
  
  return (
    <div className="absolute inset-0">
      {symbols.map((symbol, i) => (
        <motion.div
          key={`symbol-${i}`}
          className="absolute text-clay/5 text-4xl font-serif select-none"
          style={{
            left: `${10 + (i * 15)}%`,
            top: `${15 + (i % 3) * 25}%`,
          }}
          animate={{
            y: [0, -15, 0],
            rotate: [0, 3, 0],
            opacity: [0.05, 0.15, 0.05],
          }}
          transition={{
            duration: 3 + i * 0.5,
            repeat: Infinity,
            delay: i * 0.4,
            ease: "easeInOut",
          }}
        >
          {symbol}
        </motion.div>
      ))}
    </div>
  );
}