import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X, Bell, Package } from "lucide-react";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { Field, Textarea } from "./Field";
import { cn } from "./cn";
import { ease } from "../../lib/motion";

const ToastContext = createContext(null);

const toneStyles = {
  success: { icon: CheckCircle2, cls: "text-emerald-300 bg-emerald-500/12", bar: "bg-emerald-400" },
  error: { icon: AlertCircle, cls: "text-rose-300 bg-rose-500/12", bar: "bg-rose-400" },
  info: { icon: Info, cls: "text-accent-300 bg-accent-500/12", bar: "bg-accent-400" },
  booking: { icon: Bell, cls: "text-primary-300 bg-primary-500/12", bar: "bg-primary-400" },
  rental: { icon: Package, cls: "text-emerald-300 bg-emerald-500/12", bar: "bg-emerald-400" },
};

/**
 * ToastProvider — app-wide toasts plus a promise-based confirm dialog.
 *   const { toast, confirm } = useToast();
 *   toast.success("Saved", "Your address was updated.");
 *   if (await confirm({ title: "Cancel booking?", tone: "danger" })) { … }
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});
  const [dialog, setDialog] = useState(null);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const push = useCallback(
    (tone, title, message, opts = {}) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((list) => [...list.slice(-3), { id, tone, title, message, action: opts.action }]);
      const ms = opts.duration ?? (tone === "error" ? 7000 : 5000);
      timers.current[id] = setTimeout(() => dismiss(id), ms);
      return id;
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      success: (title, message, opts) => push("success", title, message, opts),
      error: (title, message, opts) => push("error", title, message, opts),
      info: (title, message, opts) => push("info", title, message, opts),
      show: (tone, title, message, opts) => push(tone, title, message, opts),
      dismiss,
    }),
    [push, dismiss]
  );

  const confirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        setDialog({ ...opts, resolve });
      }),
    []
  );

  // prompt({ title, label, defaultValue }) resolves to the entered text, or null if dismissed.
  const prompt = useCallback(
    (opts) =>
      new Promise((resolve) => {
        setDialog({ ...opts, isPrompt: true, value: opts.defaultValue || "", resolve });
      }),
    []
  );

  const closeDialog = (result) => {
    if (dialog?.isPrompt) dialog.resolve(result ? dialog.value : null);
    else dialog?.resolve(result);
    setDialog(null);
  };

  const value = useMemo(() => ({ toast, confirm, prompt }), [toast, confirm, prompt]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          aria-relevant="additions"
          className="fixed z-[80] top-3 md:top-20 inset-x-3 md:inset-x-auto md:right-6 flex flex-col items-stretch md:items-end gap-2.5 pointer-events-none"
        >
          <AnimatePresence initial={false}>
            {toasts.map((t) => {
              const s = toneStyles[t.tone] || toneStyles.info;
              const Icon = s.icon;
              return (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: -16, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 24, scale: 0.97, transition: { duration: 0.18 } }}
                  transition={{ duration: 0.3, ease: ease.out }}
                  role={t.tone === "error" ? "alert" : "status"}
                  className="pointer-events-auto w-full md:w-[380px] relative overflow-hidden rounded-2xl bg-surface-850/95 backdrop-blur-xl border border-white/[0.08] shadow-[var(--shadow-pop)]"
                >
                  <div className="flex items-start gap-3 p-3.5 pr-2.5">
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", s.cls)}>
                      <Icon className="w-[18px] h-[18px]" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-sm font-semibold text-white leading-snug">{t.title}</p>
                      {t.message && <p className="text-[13px] text-ink-300 mt-0.5 leading-relaxed">{t.message}</p>}
                      {t.action && (
                        <button
                          type="button"
                          onClick={() => {
                            t.action.onClick();
                            dismiss(t.id);
                          }}
                          className="mt-2 text-[13px] font-semibold text-primary-300 hover:text-primary-200"
                        >
                          {t.action.label}
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => dismiss(t.id)}
                      aria-label="Dismiss notification"
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-400 hover:text-white hover:bg-white/[0.06] shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <motion.div
                    className={cn("absolute bottom-0 left-0 h-0.5 origin-left", s.bar)}
                    initial={{ scaleX: 1 }}
                    animate={{ scaleX: 0 }}
                    transition={{ duration: t.tone === "error" ? 7 : 5, ease: "linear" }}
                    style={{ width: "100%", opacity: 0.6 }}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>,
        document.body
      )}

      <Modal
        open={!!dialog}
        onClose={() => closeDialog(false)}
        size="sm"
        title={dialog?.title}
        description={dialog?.description}
        icon={dialog?.icon || (dialog?.tone === "danger" ? AlertCircle : Info)}
        iconTone={dialog?.tone === "danger" ? "text-rose-300 bg-rose-500/12" : "text-primary-300 bg-primary-500/12"}
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="secondary" onClick={() => closeDialog(false)}>
              {dialog?.cancelLabel || "Keep it"}
            </Button>
            <Button
              variant={dialog?.tone === "danger" ? "danger" : "primary"}
              onClick={() => closeDialog(true)}
              disabled={dialog?.isPrompt && dialog?.required && !dialog?.value?.trim()}
              data-autofocus={dialog?.isPrompt ? undefined : true}
            >
              {dialog?.confirmLabel || "Confirm"}
            </Button>
          </div>
        }
      >
        {dialog?.isPrompt ? (
          <Field label={dialog.label || "Details"} required={dialog.required}>
            <Textarea
              data-autofocus
              rows={3}
              value={dialog.value}
              placeholder={dialog.placeholder}
              onChange={(e) => setDialog((d) => ({ ...d, value: e.target.value }))}
            />
          </Field>
        ) : (
          dialog?.body || null
        )}
      </Modal>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
