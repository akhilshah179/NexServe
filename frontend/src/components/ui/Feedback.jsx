import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, Info, CheckCircle2, AlertCircle } from "lucide-react";
import { Button, ButtonLink } from "./Button";
import { cn } from "./cn";
import { ease } from "../../lib/motion";

/** Skeleton — shimmer placeholder block. */
export function Skeleton({ className }) {
  return <div className={cn("skeleton", className)} aria-hidden="true" />;
}

/** Card-shaped skeletons for grids. */
export function SkeletonCard({ media = true, className }) {
  return (
    <div className={cn("surface overflow-hidden", className)} aria-hidden="true">
      {media && <div className="skeleton rounded-none h-44" />}
      <div className="p-5 space-y-3">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-5 w-3/4" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-2/3" />
        <div className="flex items-center justify-between pt-3">
          <div className="skeleton h-6 w-20" />
          <div className="skeleton h-9 w-24 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 6, className, media = true }) {
  return (
    <div className={cn("grid gap-5 sm:grid-cols-2 lg:grid-cols-3", className)} role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} media={media} />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/**
 * EmptyState — friendly zero-data state with one clear next action.
 */
export function EmptyState({ icon: Icon, title, description, action, secondaryAction, tone = "primary", className, compact }) {
  const toneCls =
    tone === "rental"
      ? "text-emerald-300 bg-emerald-500/10 ring-emerald-400/20"
      : "text-primary-300 bg-primary-500/10 ring-primary-400/20";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: ease.out }}
      className={cn(
        "flex flex-col items-center text-center rounded-3xl border border-dashed border-white/10 bg-surface-900/50",
        compact ? "py-10 px-6" : "py-16 sm:py-20 px-6",
        className
      )}
    >
      {Icon && (
        <div className={cn("w-14 h-14 rounded-2xl ring-1 ring-inset flex items-center justify-center mb-5", toneCls)}>
          <Icon className="w-6 h-6" aria-hidden="true" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {description && <p className="mt-2 text-sm text-ink-400 max-w-md leading-relaxed">{description}</p>}
      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5">
          {action}
          {secondaryAction}
        </div>
      )}
    </motion.div>
  );
}

/** ErrorState — shown when a request fails; always offers a retry. */
export function ErrorState({ title = "We couldn't load this", description, onRetry, retrying, backTo, backLabel, className }) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center text-center rounded-3xl border border-rose-400/15 bg-rose-500/[0.04] py-14 px-6",
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-rose-500/10 ring-1 ring-inset ring-rose-400/20 text-rose-300 flex items-center justify-center mb-5">
        <AlertTriangle className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-ink-400 max-w-md leading-relaxed">
        {description || "Something interrupted the connection to NexServe. Your data is safe — try again in a moment."}
      </p>
      <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5">
        {onRetry && (
          <Button variant="secondary" icon={RefreshCw} onClick={onRetry} loading={retrying} loadingText="Retrying">
            Try again
          </Button>
        )}
        {backTo && (
          <ButtonLink to={backTo} variant="ghost">
            {backLabel || "Go back"}
          </ButtonLink>
        )}
      </div>
    </div>
  );
}

const alertTones = {
  info: { icon: Info, cls: "bg-accent-500/[0.07] border-accent-400/20 text-accent-200" },
  success: { icon: CheckCircle2, cls: "bg-emerald-500/[0.07] border-emerald-400/20 text-emerald-200" },
  warning: { icon: AlertTriangle, cls: "bg-amber-500/[0.07] border-amber-400/20 text-amber-200" },
  error: { icon: AlertCircle, cls: "bg-rose-500/[0.07] border-rose-400/20 text-rose-200" },
};

/** Alert — inline contextual message. */
export function Alert({ tone = "info", title, children, icon, className, action }) {
  const t = alertTones[tone] || alertTones.info;
  const Icon = icon || t.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: ease.out }}
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-xl border px-3.5 py-3 text-[13px] leading-relaxed", t.cls, className)}
    >
      <Icon className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold text-white/95">{title}</p>}
        {children && <div className={title ? "mt-0.5 opacity-90" : ""}>{children}</div>}
      </div>
      {action}
    </motion.div>
  );
}
