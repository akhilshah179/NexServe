import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "./cn";
import { ease } from "../../lib/motion";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Stack of open dialogs so nested dialogs only let the topmost handle keys.
const stack = [];

/** Locks body scroll, traps focus, restores focus and closes on Escape. */
function useDialogBehaviour(open, onClose, panelRef) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement;
    const token = {};
    stack.push(token);
    document.body.style.overflow = "hidden";

    const focusFirst = () => {
      const panel = panelRef.current;
      if (!panel) return;
      const target = panel.querySelector("[data-autofocus]") || panel;
      target.focus({ preventScroll: true });
    };
    const raf = requestAnimationFrame(focusFirst);

    const onKey = (e) => {
      if (stack[stack.length - 1] !== token) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const nodes = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      const i = stack.indexOf(token);
      if (i >= 0) stack.splice(i, 1);
      if (stack.length === 0) document.body.style.overflow = "";
      if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus({ preventScroll: true });
    };
  }, [open, panelRef]);
}

/** Keeps the last rendered children while the exit animation plays. */
function useStickyChildren(open, children) {
  const last = useRef(children);
  if (open) last.current = children;
  return open ? children : last.current;
}

const sizes = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
  "2xl": "sm:max-w-5xl",
  full: "sm:max-w-6xl",
};

/**
 * Modal — centred dialog on desktop, bottom sheet on mobile.
 * Pass `open` (boolean) so exit animations can run.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  icon: Icon,
  iconTone = "text-primary-300 bg-primary-500/12",
  size = "md",
  children,
  footer,
  className,
  bodyClassName,
  hideClose,
  dismissible = true,
  subheader,
  eyebrow,
}) {
  const panelRef = useRef(null);
  const titleId = useId();
  const descId = useId();
  useDialogBehaviour(open, dismissible ? onClose : undefined, panelRef);
  const content = useStickyChildren(open, children);
  const footerContent = useStickyChildren(open, footer);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-surface-950/75 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={dismissible ? onClose : undefined}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.32, ease: ease.out }}
            className={cn(
              "relative w-full max-h-[92dvh] sm:max-h-[88dvh] flex flex-col outline-none",
              "bg-surface-900 border border-white/[0.08] shadow-[var(--shadow-pop)]",
              "rounded-t-3xl sm:rounded-3xl overflow-hidden",
              sizes[size],
              className
            )}
          >
            <div className="sm:hidden mx-auto mt-2.5 h-1 w-10 rounded-full bg-white/15" aria-hidden="true" />
            {(title || !hideClose) && (
              <div className="flex items-start gap-3.5 px-5 sm:px-6 pt-4 sm:pt-6 pb-4">
                {Icon && (
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", iconTone)}>
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {eyebrow && <p className="text-xs font-medium text-ink-400 mb-1">{eyebrow}</p>}
                  {title && (
                    <h2 id={titleId} className="text-lg font-semibold text-white leading-snug">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p id={descId} className="text-sm text-ink-400 mt-1 leading-relaxed">
                      {description}
                    </p>
                  )}
                </div>
                {!hideClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close dialog"
                    className="-mr-1.5 -mt-1 w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-ink-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    <X className="w-[18px] h-[18px]" />
                  </button>
                )}
              </div>
            )}
            {subheader && <div className="px-5 sm:px-6 pb-5 border-b border-white/[0.06]">{subheader}</div>}
            {content != null && content !== false && (
              <div className={cn("flex-1 overflow-y-auto px-5 sm:px-6 pb-6", bodyClassName)}>{content}</div>
            )}
            {footerContent && (
              <div className="px-5 sm:px-6 py-4 border-t border-white/[0.06] bg-surface-900/95 safe-area-pb">
                {footerContent}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/** Drawer — slide-in panel from the right (or left). Used for mobile navigation and filters. */
export function Drawer({ open, onClose, title, side = "right", children, footer, className, width = "max-w-sm" }) {
  const panelRef = useRef(null);
  const titleId = useId();
  useDialogBehaviour(open, onClose, panelRef);
  const content = useStickyChildren(open, children);
  const x = side === "right" ? "100%" : "-100%";

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70]">
          <motion.div
            className="absolute inset-0 bg-surface-950/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            initial={{ x }}
            animate={{ x: 0 }}
            exit={{ x }}
            transition={{ duration: 0.36, ease: ease.out }}
            className={cn(
              "absolute top-0 bottom-0 w-full flex flex-col outline-none bg-surface-900 border-white/[0.08] shadow-[var(--shadow-pop)]",
              side === "right" ? "right-0 border-l" : "left-0 border-r",
              width,
              className
            )}
          >
            <div className="flex items-center justify-between px-5 h-16 border-b border-white/[0.06] shrink-0">
              {title ? (
                <h2 id={titleId} className="text-base font-semibold text-white">
                  {title}
                </h2>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close panel"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-ink-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-[18px] h-[18px]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{content}</div>
            {footer && <div className="px-5 py-4 border-t border-white/[0.06] safe-area-pb">{footer}</div>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
