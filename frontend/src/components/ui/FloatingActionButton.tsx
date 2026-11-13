import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, ArrowUp, Sparkles } from 'lucide-react';
import { useReducedMotion } from '../../lib/motion';
import { useLang } from '../../context/LanguageContext';

export function FloatingActionButton() {
  const { lang } = useLang();
  const reduced = useReducedMotion();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToChat = () => {
    window.location.href = '/signin';
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={scrollToTop}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white border border-granite-soft shadow-lg hover:shadow-xl transition-all duration-200"
            aria-label={lang === 'bn' ? 'উপরে যান' : 'Scroll to top'}
          >
            <ArrowUp className="h-5 w-5 text-clay-deep" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.div
        className="relative"
        onHoverStart={() => setIsExpanded(true)}
        onHoverEnd={() => setIsExpanded(false)}
      >
        {/* Pulse animation ring */}
        {!reduced && (
          <motion.div
            className="absolute inset-0 rounded-full bg-clay"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
        )}

        {/* Sparkle effects */}
        {!reduced && isExpanded && (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <motion.div
                key={`sparkle-${i}`}
                className="absolute"
                style={{
                  left: `${20 + i * 15}%`,
                  top: `${10 + i * 20}%`,
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                  rotate: 360,
                }}
                transition={{
                  duration: 0.8,
                  delay: i * 0.1,
                  repeat: Infinity,
                  repeatDelay: 2,
                }}
              >
                <Sparkles className="h-3 w-3 text-clay" />
              </motion.div>
            ))}
          </>
        )}

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={goToChat}
          className="relative flex h-16 w-16 items-center justify-center rounded-full bg-clay text-white shadow-lg hover:bg-clay-deep transition-all duration-200 overflow-hidden"
          aria-label={lang === 'bn' ? 'এআই চ্যাট শুরু করুন' : 'Start AI Chat'}
        >
          {/* Animated background gradient */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-clay via-clay-deep to-clay"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
            }}
          />
          
          <motion.div
            animate={reduced ? {} : {
              rotate: [0, 10, -10, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <MessageCircle className="h-7 w-7 relative z-10" />
          </motion.div>
        </motion.button>

        {/* Tooltip */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, x: 10, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 10, scale: 0.9 }}
              className="absolute right-20 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-ink text-white px-3 py-2 text-sm font-medium shadow-lg"
            >
              {lang === 'bn' ? 'এআই চ্যাট শুরু করুন' : 'Start AI Chat'}
              <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 h-3 w-3 rotate-45 bg-ink" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}