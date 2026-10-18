import { useId } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "./cn";
import { ease } from "../../lib/motion";

const accents = {
  primary: { done: "bg-primary-500 text-white", ring: "ring-primary-400/30", text: "text-primary-200", bar: "bg-primary-400" },
  rental: { done: "bg-emerald-400 text-surface-950", ring: "ring-emerald-400/30", text: "text-emerald-200", bar: "bg-emerald-400" },
};

/**
 * ProgressStepper — horizontal step indicator (booking wizard, live tracker).
 * steps: [{ label, icon? }]; current: index of the active step.
 */
export function ProgressStepper({ steps, current, accent = "primary", compact, className, onStepClick }) {
  const a = accents[accent];
  const uid = useId();
  const pct = steps.length > 1 ? (Math.max(0, current) / (steps.length - 1)) * 100 : 0;
  return (
    <div className={cn("relative", className)}>
      <div className="absolute left-4 right-4 top-4 h-0.5 rounded-full bg-white/[0.07]" aria-hidden="true">
        <motion.div
          className={cn("h-full rounded-full origin-left", a.bar)}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: ease.out }}
        />
      </div>
      <ol className="relative flex justify-between">
        {steps.map((step, i) => {
          const done = i < current;
          const active = i === current;
          const Icon = step.icon;
          const clickable = onStepClick && i < current;
          return (
            <li key={step.label} className="flex flex-col items-center text-center min-w-0 flex-1">
              <button
                type="button"
                disabled={!clickable}
                onClick={clickable ? () => onStepClick(i) : undefined}
                aria-current={active ? "step" : undefined}
                aria-label={`${step.label}${done ? " (completed)" : active ? " (current)" : ""}`}
                className={cn(
                  "relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors duration-300",
                  done && a.done,
                  active && cn("bg-surface-900 ring-2", a.ring, a.text),
                  !done && !active && "bg-surface-850 text-ink-500 ring-1 ring-white/[0.08]",
                  clickable ? "cursor-pointer" : "cursor-default"
                )}
              >
                {active && (
                  <motion.span
                    layoutId={`stepper-active-${uid}`}
                    className={cn("absolute inset-0 rounded-full ring-2", a.ring)}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                {done ? (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.25, ease: ease.out }}>
                    <Check className="w-4 h-4" strokeWidth={3} />
                  </motion.span>
                ) : Icon ? (
                  <Icon className="w-4 h-4" />
                ) : (
                  i + 1
                )}
              </button>
              {!compact && (
                <span
                  className={cn(
                    "mt-2 text-[11px] sm:text-xs font-medium leading-tight px-1 truncate max-w-full",
                    active ? "text-white" : done ? "text-ink-300" : "text-ink-500"
                  )}
                >
                  {step.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * Timeline — vertical lifecycle. Each item: { label, desc?, icon?, time? }.
 * `current` marks the active step; items before it render as complete.
 */
export function Timeline({ items, current, accent = "primary", className }) {
  const a = accents[accent];
  return (
    <ol className={cn("relative", className)}>
      {items.map((item, i) => {
        const done = i < current;
        const active = i === current;
        const Icon = item.icon;
        const last = i === items.length - 1;
        return (
          <motion.li
            key={`${item.label}-${i}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05, ease: ease.out }}
            className="relative flex gap-3.5 pb-5 last:pb-0"
          >
            {!last && (
              <span className="absolute left-[15px] top-8 bottom-0 w-px bg-white/[0.08]" aria-hidden="true">
                <motion.span
                  className={cn("block w-full origin-top", a.bar)}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: done ? 1 : 0 }}
                  transition={{ duration: 0.4, delay: i * 0.05 + 0.1, ease: ease.out }}
                  style={{ height: "100%" }}
                />
              </span>
            )}
            <span
              className={cn(
                "relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                done && a.done,
                active && cn("bg-surface-900 ring-2", a.ring, a.text),
                !done && !active && "bg-surface-850 text-ink-500 ring-1 ring-white/[0.08]"
              )}
            >
              {done ? <Check className="w-4 h-4" strokeWidth={3} /> : Icon ? <Icon className="w-4 h-4" /> : <span className="text-xs">{i + 1}</span>}
              {active && <span className={cn("absolute inset-0 rounded-full animate-ping opacity-30 ring-2", a.ring)} aria-hidden="true" />}
            </span>
            <div className="min-w-0 pt-1">
              <p className={cn("text-sm font-medium leading-tight", active ? "text-white" : done ? "text-ink-200" : "text-ink-500")}>
                {item.label}
                {active && <span className="sr-only"> (current)</span>}
              </p>
              {item.desc && <p className="text-[13px] text-ink-400 mt-0.5 leading-snug">{item.desc}</p>}
              {item.time && <p className="text-xs text-ink-500 mt-0.5 tabular">{item.time}</p>}
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}

/**
 * LifecycleTrack — compact horizontal lifecycle used inside order cards.
 * Scrolls horizontally on narrow screens instead of squeezing labels.
 */
export function LifecycleTrack({ steps, current, accent = "rental", className }) {
  const a = accents[accent];
  return (
    <div className={cn("overflow-x-auto scrollbar-none -mx-1 px-1", className)}>
      <ol className="flex items-start min-w-[560px]">
        {steps.map((step, i) => {
          const done = i < current;
          const active = i === current;
          const Icon = step.icon;
          return (
            <li key={step.key || step.label} className="flex-1 flex flex-col items-center relative">
              {i > 0 && (
                <span className="absolute right-1/2 left-[-50%] top-3.5 h-0.5 bg-white/[0.07]" aria-hidden="true">
                  <motion.span
                    className={cn("block h-full origin-left", a.bar)}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: i <= current ? 1 : 0 }}
                    transition={{ duration: 0.45, delay: i * 0.06, ease: ease.out }}
                  />
                </span>
              )}
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, delay: i * 0.06, ease: ease.out }}
                className={cn(
                  "relative z-10 w-7 h-7 rounded-full flex items-center justify-center",
                  done && a.done,
                  active && cn("bg-surface-900 ring-2", a.ring, a.text),
                  !done && !active && "bg-surface-850 text-ink-500 ring-1 ring-white/[0.08]"
                )}
              >
                {done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : Icon ? <Icon className="w-3.5 h-3.5" /> : null}
              </motion.span>
              <span
                className={cn(
                  "mt-2 text-[11px] font-medium text-center leading-tight px-0.5",
                  active ? "text-white" : done ? "text-ink-300" : "text-ink-500"
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
