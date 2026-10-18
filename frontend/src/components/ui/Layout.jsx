import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "./cn";
import { Reveal } from "./Motion";

/** Section — vertical rhythm wrapper for page sections. */
export function Section({ children, className, id, tight, bleed }) {
  return (
    <section id={id} className={cn(tight ? "py-12 sm:py-16" : "py-16 sm:py-24", className)}>
      {bleed ? children : <div className="container-page">{children}</div>}
    </section>
  );
}

/** SectionHeader — eyebrow, title, subtitle and optional right-side action. */
export function SectionHeader({ eyebrow, title, subtitle, action, align = "left", accent = "primary", className }) {
  const center = align === "center";
  return (
    <Reveal
      className={cn(
        "mb-10 sm:mb-12 flex flex-col gap-5",
        center ? "items-center text-center" : "md:flex-row md:items-end md:justify-between",
        className
      )}
    >
      <div className={cn("max-w-2xl", center && "mx-auto")}>
        {eyebrow && <p className={cn("eyebrow mb-3", accent === "rental" && "eyebrow-rental")}>{eyebrow}</p>}
        <h2 className="text-[28px] sm:text-4xl font-semibold text-white leading-[1.15]">{title}</h2>
        {subtitle && <p className="mt-3 text-[15px] sm:text-base text-ink-400 leading-relaxed">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </Reveal>
  );
}

/** Breadcrumbs — compact trail used at the top of detail pages. */
export function Breadcrumbs({ items, className }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-[13px]", className)}>
      <ol className="flex items-center gap-1.5 flex-wrap text-ink-400">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5 min-w-0">
              {item.to && !last ? (
                <Link to={item.to} className="hover:text-white transition-colors truncate">
                  {item.label}
                </Link>
              ) : (
                <span className={cn("truncate", last && "text-ink-200")} aria-current={last ? "page" : undefined}>
                  {item.label}
                </span>
              )}
              {!last && <ChevronRight className="w-3.5 h-3.5 shrink-0 text-ink-500" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * PageHeader — top-of-page heading for app routes (dashboards, lists).
 * Provides the navbar offset so pages don't each re-implement it.
 */
export function PageHeader({ eyebrow, title, subtitle, actions, accent = "primary", breadcrumbs, children, className }) {
  return (
    <header className={cn("relative pt-28 sm:pt-32 pb-8 sm:pb-10", className)}>
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-72 -z-10",
          accent === "rental"
            ? "bg-[radial-gradient(60%_100%_at_50%_0%,rgb(20_184_143/0.10),transparent)]"
            : "bg-[radial-gradient(60%_100%_at_50%_0%,rgb(116_104_240/0.12),transparent)]"
        )}
        aria-hidden="true"
      />
      <div className="container-page">
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} className="mb-5" />}
        <Reveal y={12} className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="max-w-3xl min-w-0">
            {eyebrow && <p className={cn("eyebrow mb-3", accent === "rental" && "eyebrow-rental")}>{eyebrow}</p>}
            <h1 className="text-[32px] sm:text-[44px] font-semibold text-white leading-[1.08]">{title}</h1>
            {subtitle && <p className="mt-3 text-[15px] sm:text-base text-ink-400 leading-relaxed max-w-2xl">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
        </Reveal>
        {children}
      </div>
    </header>
  );
}
