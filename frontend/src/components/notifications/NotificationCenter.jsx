import { useState, useEffect, useRef } from "react";
import { useNotifications } from "../../context/NotificationContext";

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, loading, loadNotifications, markRead, markAllRead } = useNotifications();
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, loadNotifications]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkRead = async (id) => {
    await markRead(id);
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-gray-300 hover:text-white hover:bg-surface-700/60 transition-all"
        title="Notifications"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-surface-800 border border-white/10 shadow-2xl z-50 overflow-hidden animate-fade-in">
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-surface-900/50">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-accent-500/20 text-accent-300 text-xs font-medium">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs text-primary-400 hover:text-primary-300 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
            {loading ? (
              <div className="p-6 text-center text-xs text-gray-400">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400">No notifications yet.</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && handleMarkRead(n.id)}
                  className={`p-3.5 hover:bg-surface-700/40 transition-all cursor-pointer ${
                    !n.is_read ? "bg-primary-500/5" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-xs font-semibold ${!n.is_read ? "text-white" : "text-gray-300"}`}>
                      {n.title}
                    </p>
                    <span className="text-[10px] text-gray-500 whitespace-nowrap">
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
