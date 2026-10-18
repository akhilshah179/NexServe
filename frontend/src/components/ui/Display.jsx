import { useState } from "react";
import { motion } from "framer-motion";
import { Search, X, ArrowRight } from "lucide-react";
import { cn } from "./cn";
import { initials } from "../../lib/format";
import { AnimatedNumber } from "./Motion";
import { ease } from "../../lib/motion";

/** Card — base surface. `interactive` adds hover lift. */
export function Card({ children, className, interactive, as = "div", padded = true, ...props }) {
  const Comp = interactive ? motion[as] || motion.div : as;
  const motionProps = interactive
    ? { whileHover: { y: -4 }, transition: { duration: 0.28, ease: ease.out } }
    : {};
  return (
    <Comp
      className={cn("surface", interactive && "card-interactive", padded && "p-5 sm:p-6", className)}
      {...motionProps}
      {...props}
    >
      {children}
    </Comp>
  );
}

const avatarSizes = {
  xs: "w-7 h-7 text-[11px] rounded-lg",
  sm: "w-9 h-9 text-xs rounded-xl",
  md: "w-11 h-11 text-sm rounded-xl",
  lg: "w-14 h-14 text-base rounded-2xl",
  xl: "w-20 h-20 text-xl rounded-2xl",
  "2xl": "w-28 h-28 text-3xl rounded-3xl",
};

const avatarGradients = [
  "from-primary-500 to-violet-600",
  "from-accent-500 to-primary-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-rose-500",
  "from-sky-500 to-indigo-600",
];

/** Avatar — image with a graceful initials fallback (also on load error). */
export function Avatar({ src, name = "", size = "md", className, ring }) {
  const [failed, setFailed] = useState(false);
  const grad = avatarGradients[(name.charCodeAt(0) || 0) % avatarGradients.length];
  const cls = cn(
    "relative shrink-0 overflow-hidden flex items-center justify-center font-semibold text-white",
    avatarSizes[size],
    ring && "ring-2 ring-surface-900",
    className
  );
  if (src && !failed) {
    return (
      <span className={cls}>
        <img src={src} alt={name} className="w-full h-full object-cover" loading="lazy" onError={() => setFailed(true)} />
      </span>
    );
  }
  return (
    <span className={cn(cls, "bg-gradient-to-br", grad)} aria-label={name} role="img">
      {initials(name)}
    </span>
  );
}

/** StatCard — metric tile with animated number. */
export function StatCard({ label, value, format, icon: Icon, hint, tone = "indigo", className }) {
  const toneCls = {
    indigo: "text-primary-300 bg-primary-500/10",
    emerald: "text-emerald-300 bg-emerald-500/10",
    amber: "text-amber-300 bg-amber-500/10",
    blue: "text-accent-300 bg-accent-500/10",
    teal: "text-teal-300 bg-teal-500/10",
    rose: "text-rose-300 bg-rose-500/10",
  }[tone];
  return (
    <div className={cn("surface p-4 sm:p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-ink-400">{label}</p>
        {Icon && (
          <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", toneCls)}>
            <Icon className="w-4 h-4" aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl sm:text-[28px] font-semibold text-white tabular tracking-tight font-heading">
        {typeof value === "number" ? <AnimatedNumber value={value} format={format} /> : value}
      </p>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

/**
 * SearchBar — large search input with clear button and optional submit.
 */
export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = "Search",
  size = "md",
  accent = "primary",
  className,
  submitLabel,
  autoFocus,
  ariaLabel = "Search",
}) {
  const h = size === "lg" ? "h-14 text-base" : "h-12 text-[15px]";
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.(value);
      }}
      className={cn("relative flex items-center", className)}
    >
      <Search className="absolute left-4 w-[18px] h-[18px] text-ink-400 pointer-events-none" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoFocus={autoFocus}
        className={cn(
          "input pl-11 rounded-2xl [&::-webkit-search-cancel-button]:hidden",
          h,
          submitLabel ? "pr-32" : "pr-11",
          accent === "rental" && "input-rental"
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className={cn(
            "absolute w-7 h-7 rounded-lg flex items-center justify-center text-ink-400 hover:text-white hover:bg-white/[0.08] transition-colors",
            submitLabel ? "right-28" : "right-3"
          )}
        >
          <X className="w-4 h-4" />
        </button>
      )}
      {submitLabel && (
        <button
          type="submit"
          className={cn(
            "absolute right-1.5 h-[calc(100%-12px)] px-4 rounded-xl text-sm font-semibold inline-flex items-center gap-1.5 transition-colors",
            accent === "rental"
              ? "bg-emerald-400 text-surface-950 hover:bg-emerald-300"
              : "bg-primary-600 text-white hover:bg-primary-500"
          )}
        >
          {submitLabel}
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </form>
  );
}

/** Divider with optional centred label. */
export function Divider({ label, className }) {
  if (!label) return <hr className={cn("border-white/[0.06]", className)} />;
  return (
    <div className={cn("flex items-center gap-3 text-xs text-ink-500", className)}>
      <span className="h-px flex-1 bg-white/[0.06]" />
      {label}
      <span className="h-px flex-1 bg-white/[0.06]" />
    </div>
  );
}

/** KeyValue — label/value pair for summaries. */
export function KeyValue({ label, value, icon: Icon, className }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs text-ink-400 flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5" aria-hidden="true" />}
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-ink-50 break-words">{value}</dd>
    </div>
  );
}

/**
 * SmartImage — lazy image that degrades to a tasteful gradient + icon
 * placeholder if the source is missing or fails to load.
 */
export function SmartImage({ src, alt = "", className, imgClassName, fallbackIcon: FallbackIcon, tone = "primary" }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const showFallback = !src || failed;
  return (
    <div className={cn("relative overflow-hidden bg-surface-850", className)}>
      {showFallback ? (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center",
            tone === "rental"
              ? "bg-[radial-gradient(circle_at_30%_20%,rgb(20_184_143/0.18),transparent_60%)]"
              : "bg-[radial-gradient(circle_at_30%_20%,rgb(116_104_240/0.2),transparent_60%)]"
          )}
          role={alt ? "img" : undefined}
          aria-label={alt || undefined}
        >
          {FallbackIcon && <FallbackIcon className="w-10 h-10 text-white/20" aria-hidden="true" />}
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn("w-full h-full object-cover transition-opacity duration-500", loaded ? "opacity-100" : "opacity-0", imgClassName)}
        />
      )}
    </div>
  );
}
