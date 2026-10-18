import { useState } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { cn } from "./cn";

/** Rating — star + score + optional review count. */
export function Rating({ value, count, size = "sm", className, showEmpty = false }) {
  const n = Number(value);
  const has = Number.isFinite(n) && n > 0;
  if (!has && !showEmpty) {
    return <span className={cn("text-xs text-ink-400", className)}>New</span>;
  }
  const star = size === "lg" ? "w-[18px] h-[18px]" : size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  const text = size === "lg" ? "text-base" : size === "md" ? "text-sm" : "text-[13px]";
  return (
    <span className={cn("inline-flex items-center gap-1 tabular", className)}>
      <Star className={cn(star, "fill-amber-400 text-amber-400")} aria-hidden="true" />
      <span className={cn(text, "font-semibold text-ink-50")}>{has ? n.toFixed(1) : "—"}</span>
      {count !== undefined && count !== null && (
        <span className={cn(text, "text-ink-400")}>
          ({count}
          <span className="sr-only"> reviews</span>)
        </span>
      )}
      <span className="sr-only">{has ? `Rated ${n.toFixed(1)} out of 5` : "No rating yet"}</span>
    </span>
  );
}

/** StarInput — accessible 1–5 star picker (radio group semantics). */
export function StarInput({ value, onChange, size = 28, label = "Rating" }) {
  const [hover, setHover] = useState(0);
  const display = hover || value;
  const words = ["", "Poor", "Fair", "Good", "Great", "Excellent"];
  return (
    <div className="flex items-center gap-3">
      <div role="radiogroup" aria-label={label} className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((star) => {
          const active = display >= star;
          return (
            <motion.button
              key={star}
              type="button"
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} star${star > 1 ? "s" : ""}`}
              onMouseEnter={() => setHover(star)}
              onClick={() => onChange(star)}
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.9 }}
              className="p-0.5 rounded-md"
            >
              <Star
                style={{ width: size, height: size }}
                className={cn(
                  "transition-colors duration-150",
                  active ? "fill-amber-400 text-amber-400" : "text-surface-600"
                )}
              />
            </motion.button>
          );
        })}
      </div>
      <span className="text-sm font-medium text-ink-200 min-w-[72px]" aria-live="polite">
        {words[display]}
      </span>
    </div>
  );
}
