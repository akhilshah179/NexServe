import { forwardRef, useId, cloneElement, isValidElement } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "./cn";

/**
 * Field — label + control + hint/error, wired with aria attributes.
 * Pass a single Input / Textarea / Select (or any element) as the child.
 */
export function Field({ label, hint, error, required, children, className, labelAction }) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  const control = isValidElement(children)
    ? cloneElement(children, {
        id: children.props.id || id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": [error ? errId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined,
        required: children.props.required ?? required,
      })
    : children;

  return (
    <div className={className}>
      {label && (
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={children?.props?.id || id} className="label">
            {label}
            {required && <span className="text-rose-400 ml-0.5" aria-hidden="true">*</span>}
          </label>
          {labelAction}
        </div>
      )}
      {control}
      {error ? (
        <p id={errId} className="mt-1.5 text-[13px] text-rose-300 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-[13px] text-ink-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef(function Input({ className, icon: Icon, rental, ...props }, ref) {
  if (Icon) {
    return (
      <div className="relative">
        <Icon className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
        <input ref={ref} className={cn("input pl-10", rental && "input-rental", className)} {...props} />
      </div>
    );
  }
  return <input ref={ref} className={cn("input", rental && "input-rental", className)} {...props} />;
});

export const Textarea = forwardRef(function Textarea({ className, rows = 3, rental, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn("input resize-y min-h-[88px] leading-relaxed", rental && "input-rental", className)}
      {...props}
    />
  );
});

export const Select = forwardRef(function Select({ className, children, rental, ...props }, ref) {
  return (
    <select ref={ref} className={cn("input", rental && "input-rental", className)} {...props}>
      {children}
    </select>
  );
});

/** Switch — accessible on/off toggle. */
export function Switch({ checked, onChange, label, description, tone = "primary", id, disabled }) {
  const autoId = useId();
  const switchId = id || autoId;
  const on = tone === "rental" ? "bg-emerald-500" : tone === "danger" ? "bg-rose-500" : "bg-primary-500";
  return (
    <label htmlFor={switchId} className={cn("flex items-start justify-between gap-4 cursor-pointer", disabled && "opacity-50 cursor-not-allowed")}>
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-sm font-medium text-ink-100">{label}</span>}
          {description && <span className="block text-[13px] text-ink-400 mt-0.5">{description}</span>}
        </span>
      )}
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 mt-0.5",
          checked ? on : "bg-surface-700"
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          )}
        />
      </button>
    </label>
  );
}
