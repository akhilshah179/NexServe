import { useId, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "./cn";

/**
 * Tabs — segmented control with a sliding indicator.
 * items: [{ id, label, count?, icon? }]
 * variant: "pill" (segmented, default) | "underline"
 * accent: "primary" | "rental"
 */
export function Tabs({ items, value, onChange, variant = "pill", accent = "primary", className, ariaLabel, size = "md", stretch }) {
  const layoutId = useId();
  const listRef = useRef(null);

  const onKeyDown = (e) => {
    const idx = items.findIndex((i) => i.id === value);
    let next = null;
    if (e.key === "ArrowRight") next = items[(idx + 1) % items.length];
    if (e.key === "ArrowLeft") next = items[(idx - 1 + items.length) % items.length];
    if (e.key === "Home") next = items[0];
    if (e.key === "End") next = items[items.length - 1];
    if (next) {
      e.preventDefault();
      onChange(next.id);
      listRef.current?.querySelector(`[data-tab="${next.id}"]`)?.focus();
    }
  };

  const pill = variant === "pill";
  const indicator =
    accent === "rental"
      ? pill
        ? "bg-emerald-400/15 ring-1 ring-inset ring-emerald-400/30"
        : "bg-emerald-400"
      : pill
      ? "bg-white/[0.08] ring-1 ring-inset ring-white/10"
      : "bg-primary-400";

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn(
        "flex items-center overflow-x-auto scrollbar-none",
        pill ? cn("gap-1 p-1 rounded-xl bg-surface-900 border border-white/[0.06] max-w-full", stretch ? "w-full" : "w-fit") : "gap-6 border-b border-white/[0.06]",
        className
      )}
    >
      {items.map((item) => {
        const active = item.id === value;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            data-tab={item.id}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.id)}
            className={cn(
              "relative shrink-0 inline-flex items-center justify-center gap-2 font-medium",
              stretch && "flex-1",
              " whitespace-nowrap transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60 rounded-lg",
              pill ? (size === "sm" ? "h-8 px-3 text-[13px]" : "h-9 px-3.5 text-sm") : "h-11 text-sm",
              active
                ? accent === "rental" && pill
                  ? "text-emerald-200"
                  : "text-white"
                : "text-ink-400 hover:text-ink-100"
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className={cn("absolute", pill ? "inset-0 rounded-lg" : "left-0 right-0 -bottom-px h-0.5 rounded-full", indicator)}
                transition={{ type: "spring", stiffness: 420, damping: 36 }}
                aria-hidden="true"
              />
            )}
            {Icon && <Icon className="relative w-4 h-4" aria-hidden="true" />}
            <span className="relative">{item.label}</span>
            {item.count !== undefined && (
              <span
                className={cn(
                  "relative tabular text-[11px] font-semibold min-w-5 h-5 px-1.5 rounded-md inline-flex items-center justify-center",
                  active ? "bg-white/10 text-white" : "bg-white/[0.04] text-ink-400"
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * FilterChips — horizontally scrollable, single-select chip row.
 * items: [{ id, label, icon?, count? }]
 */
export function FilterChips({ items, value, onChange, accent = "primary", className, ariaLabel }) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "flex items-center gap-2 overflow-x-auto scrollbar-none -mx-1 px-1 py-1 pr-8 [mask-image:linear-gradient(90deg,black_calc(100%-40px),transparent)]",
        className
      )}
    >
      {items.map((item) => {
        const active = String(item.id) === String(value);
        const Icon = item.icon;
        return (
          <motion.button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(item.id)}
            whileTap={{ scale: 0.96 }}
            className={cn(
              "shrink-0 inline-flex items-center gap-2 h-9 pl-3 pr-3.5 rounded-full text-[13px] font-medium border transition-colors duration-200",
              active
                ? accent === "rental"
                  ? "bg-emerald-400 text-surface-950 border-emerald-400"
                  : "bg-white text-surface-950 border-white"
                : "bg-surface-900 text-ink-200 border-white/[0.08] hover:border-white/20 hover:text-white"
            )}
          >
            {Icon && <Icon className="w-4 h-4" aria-hidden="true" />}
            {item.label}
            {item.count !== undefined && (
              <span className={cn("tabular text-[11px]", active ? "text-surface-950/60" : "text-ink-400")}>{item.count}</span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
