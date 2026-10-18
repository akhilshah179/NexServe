import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion, animate } from "framer-motion";
import { ease } from "../../lib/motion";

/** Reveal — fades/slides content in once it scrolls into view. */
export function Reveal({ children, delay = 0, y = 20, className, as = "div", amount = 0.2, ...rest }) {
  const Comp = motion[as] || motion.div;
  return (
    <Comp
      {...rest}
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.5, delay, ease: ease.out }}
    >
      {children}
    </Comp>
  );
}

/** Stagger + StaggerItem — staggered reveal for grids and lists. */
export function Stagger({ children, className, gap = 0.06, delay = 0, as = "div", amount = 0.1, animateOnMount = false }) {
  const Comp = motion[as] || motion.div;
  const variants = { hidden: {}, show: { transition: { staggerChildren: gap, delayChildren: delay } } };
  const trigger = animateOnMount
    ? { initial: "hidden", animate: "show" }
    : { initial: "hidden", whileInView: "show", viewport: { once: true, amount } };
  return (
    <Comp className={className} variants={variants} {...trigger}>
      {children}
    </Comp>
  );
}

export const staggerItem = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: ease.out } },
};

export function StaggerItem({ children, className, as = "div", ...rest }) {
  const Comp = motion[as] || motion.div;
  return (
    <Comp className={className} variants={staggerItem} {...rest}>
      {children}
    </Comp>
  );
}

/** PageTransition — enter animation applied to every routed page. */
export function PageTransition({ children, className }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: ease.out }}
    >
      {children}
    </motion.div>
  );
}

/** AnimatedNumber — counts up when visible. */
export function AnimatedNumber({ value, format = (n) => Math.round(n).toLocaleString("en-IN"), duration = 1.2, className }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(() => format(reduce ? Number(value) || 0 : 0));

  useEffect(() => {
    const target = Number(value) || 0;
    if (reduce) {
      setDisplay(format(target));
      return;
    }
    if (!inView) return;
    const controls = animate(0, target, {
      duration,
      ease: ease.out,
      onUpdate: (v) => setDisplay(format(v)),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value, reduce, duration]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
