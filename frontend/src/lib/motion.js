/**
 * Motion tokens shared across the app.
 *
 * Durations follow the system: 150–300ms for micro-interactions,
 * 300–500ms for larger transitions. Everything animates transform /
 * opacity only. Reduced-motion is honoured globally by <MotionConfig
 * reducedMotion="user"> in AppRoutes, which strips transform animation.
 */

export const ease = {
  out: [0.16, 1, 0.3, 1],
  inOut: [0.65, 0, 0.35, 1],
  soft: [0.25, 1, 0.5, 1],
};

export const duration = {
  micro: 0.18,
  base: 0.28,
  large: 0.45,
};

export const spring = {
  snappy: { type: "spring", stiffness: 420, damping: 32, mass: 0.8 },
  gentle: { type: "spring", stiffness: 220, damping: 26 },
};

export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: duration.large, ease: ease.out } },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: duration.base, ease: ease.out } },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: { duration: duration.base, ease: ease.out } },
};

export const stagger = (staggerChildren = 0.06, delayChildren = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren, delayChildren } },
});

/** Hover lift used by interactive cards. */
export const hoverLift = {
  rest: { y: 0 },
  hover: { y: -4, transition: { duration: duration.base, ease: ease.out } },
};

export const tapScale = { scale: 0.97 };
