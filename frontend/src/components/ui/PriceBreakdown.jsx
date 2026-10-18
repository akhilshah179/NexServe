import { motion, AnimatePresence } from "framer-motion";
import { cn } from "./cn";
import { formatINRPrecise } from "../../lib/format";

/**
 * PriceRow — one line of a breakdown.
 * tone: default · discount · surcharge · muted · deposit
 */
export function PriceRow({ label, value, tone = "default", hint, icon: Icon, sign }) {
  const toneCls = {
    default: "text-ink-300",
    muted: "text-ink-400",
    discount: "text-emerald-300",
    surcharge: "text-amber-300",
    deposit: "text-teal-300",
    danger: "text-rose-300",
  }[tone];
  const amount = typeof value === "number" ? formatINRPrecise(Math.abs(value)) : value;
  const prefix = sign ?? (tone === "discount" ? "−" : tone === "surcharge" ? "+" : "");
  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
      className={cn("flex items-start justify-between gap-4 text-sm", toneCls)}
    >
      <span className="flex items-center gap-1.5 min-w-0">
        {Icon && <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />}
        <span className="min-w-0">
          {label}
          {hint && <span className="block text-xs text-ink-500 mt-0.5">{hint}</span>}
        </span>
      </span>
      <span className={cn("tabular font-medium shrink-0", tone === "default" && "text-ink-100")}>
        {prefix}
        {amount}
      </span>
    </motion.div>
  );
}

/** PriceTotal — emphasised final line. */
export function PriceTotal({ label = "Total", value, caption, accent = "primary" }) {
  return (
    <div className="flex items-end justify-between gap-4 pt-3.5 mt-1 border-t border-white/[0.08]">
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        {caption && <p className="text-xs text-ink-400 mt-0.5">{caption}</p>}
      </div>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={String(value)}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22 }}
          className={cn(
            "tabular text-2xl font-semibold tracking-tight font-heading",
            accent === "rental" ? "text-emerald-300" : "text-white"
          )}
        >
          {typeof value === "number" ? formatINRPrecise(value) : value}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

/** PriceBreakdown — container that animates rows in/out. */
export function PriceBreakdown({ children, className }) {
  return (
    <div className={cn("space-y-2.5", className)}>
      <AnimatePresence initial={false}>{children}</AnimatePresence>
    </div>
  );
}
