import { useId, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "./cn";
import { toISODate } from "../../lib/format";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const parse = (iso) => {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

function monthMatrix(year, month) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Monday-first
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7) cells.push(null);
  return cells;
}

/**
 * Calendar — keyboard-accessible month grid.
 * mode="single": value is "YYYY-MM-DD"; onChange(iso)
 * mode="range":  value is { start, end }; onChange({ start, end })
 * accent: "primary" | "rental"
 */
export function Calendar({ mode = "single", value, onChange, min, max, accent = "primary", className }) {
  const minDate = parse(min);
  const maxDate = parse(max);
  const anchor = mode === "range" ? parse(value?.start) : parse(value);
  const [view, setView] = useState(() => {
    const d = anchor || minDate || new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [dir, setDir] = useState(0);
  const [hover, setHover] = useState(null);
  const uid = useId();

  const cells = useMemo(() => monthMatrix(view.y, view.m), [view]);
  const todayIso = toISODate(new Date());
  const label = new Date(view.y, view.m, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const canPrev = !minDate || new Date(view.y, view.m, 1) > new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const canNext = !maxDate || new Date(view.y, view.m + 1, 1) <= maxDate;

  const shift = (delta) => {
    setDir(delta);
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  const disabled = (d) => (minDate && d < minDate) || (maxDate && d > maxDate);

  const start = mode === "range" ? value?.start : value;
  const end = mode === "range" ? value?.end : null;
  const previewEnd = mode === "range" && start && !end ? hover : null;

  const select = (iso) => {
    if (mode === "single") return onChange(iso);
    if (!value?.start || (value.start && value.end)) return onChange({ start: iso, end: "" });
    if (iso < value.start) return onChange({ start: iso, end: "" });
    return onChange({ start: value.start, end: iso });
  };

  const onKeyDown = (e, d) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = new Date(d);
    next.setDate(d.getDate() + step);
    if (disabled(next)) return;
    if (next.getMonth() !== view.m) shift(next.getMonth() > view.m || next.getFullYear() > view.y ? 1 : -1);
    requestAnimationFrame(() => {
      document.querySelector(`[data-date="${toISODate(next)}"]`)?.focus();
    });
  };

  const selBg = accent === "rental" ? "bg-emerald-400 text-surface-950" : "bg-primary-500 text-white";
  const rangeBg = accent === "rental" ? "bg-emerald-400/12" : "bg-primary-500/15";

  return (
    <div className={cn("select-none", className)}>
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => shift(-1)}
          disabled={!canPrev}
          aria-label="Previous month"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-ink-300 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <p className="text-sm font-semibold text-white" aria-live="polite">
          {label}
        </p>
        <button
          type="button"
          onClick={() => shift(1)}
          disabled={!canNext}
          aria-label="Next month"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-ink-300 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1" aria-hidden="true">
        {WEEKDAYS.map((w) => (
          <span key={w} className="h-8 flex items-center justify-center text-[11px] font-medium text-ink-500">
            {w}
          </span>
        ))}
      </div>

      <div className="relative overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={`${view.y}-${view.m}`}
            custom={dir}
            initial={{ opacity: 0, x: dir * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -24 }}
            transition={{ duration: 0.22 }}
            role="grid"
            aria-label={label}
            className="grid grid-cols-7 gap-y-1"
            onMouseLeave={() => setHover(null)}
          >
            {cells.map((d, i) => {
              if (!d) return <span key={`e${i}`} />;
              const iso = toISODate(d);
              const isDisabled = disabled(d);
              const isStart = iso === start;
              const isEnd = iso === end;
              const rangeEnd = end || previewEnd;
              const inRange = mode === "range" && start && rangeEnd && iso > start && iso < rangeEnd;
              const selected = isStart || isEnd;
              const isToday = iso === todayIso;
              return (
                <div
                  key={iso}
                  className={cn(
                    "relative h-10 flex items-center justify-center",
                    inRange && rangeBg,
                    mode === "range" && isStart && rangeEnd && rangeEnd > start && cn(rangeBg, "rounded-l-xl"),
                    mode === "range" && (isEnd || (previewEnd && iso === previewEnd && previewEnd > start)) && cn(rangeBg, "rounded-r-xl")
                  )}
                >
                  <button
                    type="button"
                    data-date={iso}
                    disabled={isDisabled}
                    tabIndex={selected || (!start && isToday) ? 0 : -1}
                    aria-pressed={selected}
                    aria-label={d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                    onClick={() => select(iso)}
                    onMouseEnter={() => setHover(iso)}
                    onKeyDown={(e) => onKeyDown(e, d)}
                    className={cn(
                      "relative w-10 h-10 rounded-xl text-sm tabular transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/70",
                      selected
                        ? cn(selBg, "font-semibold")
                        : isDisabled
                        ? "text-ink-500/40 cursor-not-allowed"
                        : "text-ink-100 hover:bg-white/[0.08]"
                    )}
                  >
                    {selected && (
                      <motion.span
                        layoutId={`cal-sel-${uid}-${isStart ? "s" : "e"}`}
                        className={cn("absolute inset-0 rounded-xl", selBg)}
                        transition={{ type: "spring", stiffness: 500, damping: 36 }}
                      />
                    )}
                    <span className="relative">{d.getDate()}</span>
                    {isToday && !selected && (
                      <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary-300" aria-hidden="true" />
                    )}
                  </button>
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
