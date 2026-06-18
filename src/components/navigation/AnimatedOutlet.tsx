import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useLocation, useNavigationType, useOutlet } from 'react-router-dom';
import {
  PAGE_MOTION,
  TAB_MOTION,
  getTransitionDirection,
  resolveTransitionKey,
  shouldUseTabVariant,
} from '../../lib/navigation/transitionConfig';

type AnimatedOutletProps = {
  scope?: 'section' | 'full';
  variant?: 'page' | 'tab';
  className?: string;
};

const EXIT_EASE = [0.4, 0, 0.2, 1] as const;

export function AnimatedOutlet({
  scope = 'full',
  variant = 'page',
  className,
}: AnimatedOutletProps) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const outlet = useOutlet();
  const reducedMotion = useReducedMotion();
  const prevPathRef = useRef(location.pathname);

  const transitionKey =
    scope === 'section'
      ? resolveTransitionKey(location.pathname, 'section')
      : location.pathname;

  const useTab = variant === 'tab' || shouldUseTabVariant(prevPathRef.current, location.pathname);
  const direction = getTransitionDirection(prevPathRef.current, location.pathname, navigationType);
  const motionTokens = useTab ? TAB_MOTION : PAGE_MOTION;
  const vtClass = useTab ? 'vt-tab' : 'vt-page';

  useEffect(() => {
    prevPathRef.current = location.pathname;
  }, [location.pathname]);

  if (reducedMotion) {
    return <div className={['vt-outlet-host', className].filter(Boolean).join(' ')}>{outlet}</div>;
  }

  const pageVariants = {
    initial: (dir: number) => ({
      opacity: 0,
      y: dir > 0 ? 14 : -8,
      filter: 'blur(6px)',
      scale: dir > 0 ? 0.992 : 1,
    }),
    animate: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      scale: 1,
      transition: { duration: motionTokens.duration, ease: motionTokens.ease },
    },
    exit: (dir: number) => ({
      opacity: 0,
      y: dir > 0 ? -8 : 14,
      filter: 'blur(4px)',
      scale: 0.996,
      transition: { duration: motionTokens.duration * 0.65, ease: EXIT_EASE },
    }),
  };

  const tabVariants = {
    initial: (dir: number) => ({
      opacity: 0,
      x: dir > 0 ? 12 : -10,
      filter: 'blur(2px)',
    }),
    animate: {
      opacity: 1,
      x: 0,
      filter: 'blur(0px)',
      transition: { duration: motionTokens.duration, ease: motionTokens.ease },
    },
    exit: (dir: number) => ({
      opacity: 0,
      x: dir > 0 ? -10 : 12,
      filter: 'blur(2px)',
      transition: { duration: motionTokens.duration * 0.65, ease: EXIT_EASE },
    }),
  };

  const variants = useTab ? tabVariants : pageVariants;

  return (
    <AnimatePresence mode="wait" initial={false} custom={direction}>
      <motion.div
        key={transitionKey}
        className={['vt-outlet-host', vtClass, className].filter(Boolean).join(' ')}
        custom={direction}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
}
