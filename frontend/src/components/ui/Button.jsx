import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "./cn";

const base =
  "relative inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap select-none " +
  "rounded-xl transition-[background-color,border-color,color,box-shadow,opacity] duration-200 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-950 " +
  "disabled:opacity-50 disabled:pointer-events-none aria-disabled:opacity-50 aria-disabled:pointer-events-none";

const sizes = {
  xs: "h-8 px-3 text-xs",
  sm: "h-9 px-3.5 text-[13px]",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-[15px]",
  xl: "h-14 px-7 text-base",
};

const iconSizes = { xs: "w-3.5 h-3.5", sm: "w-4 h-4", md: "w-4 h-4", lg: "w-[18px] h-[18px]", xl: "w-5 h-5" };

const variants = {
  primary:
    "text-white bg-primary-600 hover:bg-primary-500 shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_1px_2px_rgb(0_0_0/0.4),0_8px_20px_-8px_rgb(97_80_226/0.7)]",
  secondary:
    "text-ink-100 bg-surface-800 hover:bg-surface-750 border border-white/[0.08] hover:border-white/[0.14] shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]",
  rental:
    "text-surface-950 bg-emerald-400 hover:bg-emerald-300 shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_8px_20px_-8px_rgb(20_184_143/0.6)]",
  ghost: "text-ink-200 hover:text-white hover:bg-white/[0.06]",
  outline: "text-ink-100 border border-white/[0.12] hover:border-white/25 hover:bg-white/[0.04]",
  danger:
    "text-white bg-rose-600 hover:bg-rose-500 shadow-[inset_0_1px_0_rgb(255_255_255/0.15),0_8px_20px_-10px_rgb(225_29_72/0.7)]",
  "danger-ghost": "text-rose-300 hover:text-rose-200 hover:bg-rose-500/10",
  white: "text-surface-950 bg-white hover:bg-ink-100 shadow-[0_8px_20px_-10px_rgb(255_255_255/0.4)]",
  link: "text-primary-300 hover:text-primary-200 h-auto px-0 underline-offset-4 hover:underline",
};

function Content({ loading, icon: Icon, iconRight: IconRight, size, children, loadingText }) {
  const ic = iconSizes[size] || iconSizes.md;
  if (loading) {
    return (
      <>
        <Loader2 className={cn(ic, "animate-spin")} aria-hidden="true" />
        <span>{loadingText || children}</span>
      </>
    );
  }
  return (
    <>
      {Icon && <Icon className={cn(ic, "shrink-0")} aria-hidden="true" />}
      {children}
      {IconRight && (
        <IconRight
          className={cn(ic, "shrink-0 transition-transform duration-200 group-hover/btn:translate-x-0.5")}
          aria-hidden="true"
        />
      )}
    </>
  );
}

/**
 * Button — primary action primitive.
 * Variants: primary · secondary · rental · ghost · outline · danger · danger-ghost · white · link
 */
export const Button = forwardRef(function Button(
  {
    children,
    variant = "primary",
    size = "md",
    className,
    loading = false,
    loadingText,
    disabled,
    icon,
    iconRight,
    fullWidth,
    type = "button",
    ...props
  },
  ref
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.15 }}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn("group/btn", base, sizes[size], variants[variant], fullWidth && "w-full", className)}
      {...props}
    >
      <Content loading={loading} loadingText={loadingText} icon={icon} iconRight={iconRight} size={size}>
        {children}
      </Content>
    </motion.button>
  );
});

/** ButtonLink — a router link styled as a button. */
export function ButtonLink({
  to,
  href,
  children,
  variant = "primary",
  size = "md",
  className,
  icon,
  iconRight,
  fullWidth,
  ...props
}) {
  const cls = cn("group/btn", base, sizes[size], variants[variant], fullWidth && "w-full", className);
  const content = (
    <Content icon={icon} iconRight={iconRight} size={size}>
      {children}
    </Content>
  );
  if (href) {
    return (
      <a href={href} className={cls} {...props}>
        {content}
      </a>
    );
  }
  return (
    <Link to={to} className={cls} {...props}>
      {content}
    </Link>
  );
}

const iconBtnSizes = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-11 h-11" };

/** IconButton — square icon-only button. `label` is required for screen readers. */
export const IconButton = forwardRef(function IconButton(
  { icon: Icon, label, size = "md", variant = "ghost", className, badge, ...props },
  ref
) {
  return (
    <motion.button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.92 }}
      transition={{ duration: 0.15 }}
      className={cn(base, "px-0", iconBtnSizes[size], variants[variant], className)}
      {...props}
    >
      <Icon className={size === "sm" ? "w-4 h-4" : "w-[18px] h-[18px]"} aria-hidden="true" />
      {badge}
    </motion.button>
  );
});
