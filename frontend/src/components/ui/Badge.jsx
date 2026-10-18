import { BadgeCheck } from "lucide-react";
import { cn } from "./cn";
import { statusMeta } from "../../lib/status";

const toneClasses = {
  neutral: "bg-white/[0.06] text-ink-200 ring-white/10",
  indigo: "bg-primary-500/12 text-primary-200 ring-primary-400/25",
  blue: "bg-accent-500/12 text-accent-300 ring-accent-400/25",
  emerald: "bg-emerald-500/12 text-emerald-300 ring-emerald-400/25",
  teal: "bg-teal-500/12 text-teal-300 ring-teal-400/25",
  amber: "bg-amber-500/12 text-amber-300 ring-amber-400/25",
  rose: "bg-rose-500/12 text-rose-300 ring-rose-400/25",
  violet: "bg-violet-500/12 text-violet-300 ring-violet-400/25",
  solid: "bg-white text-surface-950 ring-white",
};

const sizes = {
  sm: "h-5 px-1.5 text-[11px] gap-1",
  md: "h-6 px-2 text-xs gap-1.5",
  lg: "h-7 px-2.5 text-[13px] gap-1.5",
};

/**
 * Badge — compact metadata label.
 * Tones: neutral · indigo · blue · emerald · teal · amber · rose · violet · solid
 */
export function Badge({ children, tone = "neutral", size = "md", icon: Icon, dot, className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-md ring-1 ring-inset whitespace-nowrap",
        toneClasses[tone] || toneClasses.neutral,
        sizes[size],
        className
      )}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />}
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
      {children}
    </span>
  );
}

/** StatusBadge — resolves label/tone/icon from the shared status map. */
export function StatusBadge({ status, kind = "booking", size = "md", className, live }) {
  const meta = statusMeta(status, kind);
  return (
    <Badge tone={meta.tone} size={size} icon={live ? undefined : meta.icon} className={className}>
      {live && <span className="live-dot" aria-hidden="true" />}
      {meta.label}
    </Badge>
  );
}

/** VerifiedBadge — consistent “verified” marker for professionals and hosts. */
export function VerifiedBadge({ label = "Verified", size = "md", iconOnly, className }) {
  if (iconOnly) {
    return (
      <BadgeCheck
        className={cn("w-4 h-4 text-accent-400 shrink-0", className)}
        aria-label={label}
        role="img"
      />
    );
  }
  return (
    <Badge tone="blue" size={size} icon={BadgeCheck} className={className}>
      {label}
    </Badge>
  );
}
