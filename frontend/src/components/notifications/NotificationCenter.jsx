import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck, BellOff } from "lucide-react";
import { useNotifications } from "../../context/NotificationContext";
import { Skeleton, cn } from "../ui";
import { ease } from "../../lib/motion";

function timeAgo(value) {
  const d = new Date(value);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (Number.isNaN(diff)) return "";
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, loading, loadNotifications, markRead, markAllRead } = useNotifications();
  const ref = useRef(null);

  useEffect(() => {
    if (isOpen) loadNotifications();
  }, [isOpen, loadNotifications]);

  useEffect(() => {
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setIsOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="relative w-10 h-10 rounded-xl flex items-center justify-center text-ink-300 hover:text-white hover:bg-white/[0.06] transition-colors"
      >
        <Bell className="w-[18px] h-[18px]" aria-hidden="true" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-primary-500 text-white text-[10px] font-semibold flex items-center justify-center ring-2 ring-surface-950 tabular"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="dialog"
            aria-label="Notifications"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.2, ease: ease.out }}
            className="fixed left-4 right-4 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[380px] origin-top-right rounded-2xl bg-surface-850/95 backdrop-blur-xl border border-white/[0.08] shadow-[var(--shadow-pop)] overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-4 h-14 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="h-5 px-1.5 rounded-md bg-primary-500/15 text-primary-200 text-[11px] font-semibold inline-flex items-center">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-300 hover:text-primary-200 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[min(420px,60vh)] overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <div className="p-4 space-y-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="w-2 h-2 rounded-full mt-1.5" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3.5 w-2/3" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-12 px-6 text-center">
                  <div className="w-11 h-11 mx-auto rounded-xl bg-white/[0.04] flex items-center justify-center text-ink-400 mb-3">
                    <BellOff className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-medium text-ink-100">You're all caught up</p>
                  <p className="text-[13px] text-ink-400 mt-1">Booking and rental updates will appear here.</p>
                </div>
              ) : (
                <ul className="divide-y divide-white/[0.04]">
                  {notifications.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => !n.is_read && markRead(n.id)}
                        className={cn(
                          "w-full text-left flex gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.03]",
                          !n.is_read && "bg-primary-500/[0.04]"
                        )}
                      >
                        <span
                          className={cn("mt-1.5 w-2 h-2 rounded-full shrink-0", n.is_read ? "bg-transparent" : "bg-primary-400")}
                          aria-hidden="true"
                        />
                        <span className="flex-1 min-w-0">
                          <span className="flex items-start justify-between gap-3">
                            <span className={cn("text-sm leading-snug", n.is_read ? "text-ink-300" : "text-white font-medium")}>
                              {n.title}
                            </span>
                            <span className="text-[11px] text-ink-500 whitespace-nowrap mt-0.5">{timeAgo(n.created_at)}</span>
                          </span>
                          {n.message && (
                            <span className="block text-[13px] text-ink-400 mt-0.5 leading-relaxed line-clamp-2">{n.message}</span>
                          )}
                          {!n.is_read && <span className="sr-only">Unread. Activate to mark as read.</span>}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
