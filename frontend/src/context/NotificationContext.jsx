/**
 * NotificationContext.jsx — Global real-time WebSocket notification hub & live toasts.
 *
 * Provides:
 * - Active WebSocket connection to /ws/user/{user.id}
 * - Real-time toast alerts for incoming bookings & status updates
 * - Live unread badge count tracking
 * - Synchronized PostgreSQL notifications list
 */

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { createUserNotificationSocket } from "../utils/websocket";
import { fetchNotificationsApi, fetchUnreadCountApi, markNotificationReadApi, markAllNotificationsReadApi } from "../api/notificationsApi";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeToast, setActiveToast] = useState(null);
  const [lastEvent, setLastEvent] = useState(null);

  const loadUnreadCount = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await fetchUnreadCountApi();
      setUnreadCount(data.unread_count || 0);
    } catch (e) {
      console.warn("Failed to fetch unread notification count:", e);
    }
  }, [user?.id]);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await fetchNotificationsApi();
      setNotifications(data || []);
    } catch (e) {
      console.warn("Failed to fetch notifications:", e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const showToast = useCallback((toastData) => {
    setActiveToast(toastData);
    // Auto dismiss after 6 seconds
    setTimeout(() => {
      setActiveToast((curr) => (curr?.id === toastData.id ? null : curr));
    }, 6000);
  }, []);

  // Establish user-specific WebSocket connection
  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setActiveToast(null);
      return;
    }

    loadUnreadCount();
    loadNotifications();

    const ws = createUserNotificationSocket(user.id, (payload) => {
      setLastEvent(payload);

      // Handle direct notification event
      if (payload?.event === "new_notification" && payload.notification) {
        const notif = payload.notification;
        setNotifications((prev) => [notif, ...prev.filter((n) => n.id !== notif.id)]);
        setUnreadCount((prev) => prev + 1);
        showToast({
          id: Date.now(),
          title: notif.title || "New Notification",
          message: notif.message || "",
          type: notif.type || "info",
        });
      }

      // Handle booking update event (e.g. new_booking_request, status_update)
      if (payload?.type === "booking_update" || payload?.event === "status_update" || payload?.event === "booking_created") {
        const title = payload.title || (payload.event === "booking_created" ? "New Booking Request" : "Booking Status Update");
        const message = payload.message || payload.notes || `Booking #${payload.booking_id || payload.booking?.id} updated to ${payload.status || "new status"}`;
        showToast({
          id: Date.now(),
          title,
          message,
          type: "booking",
          booking: payload.booking,
        });
        loadUnreadCount();
      }
    });

    return () => {
      if (ws) ws.close();
    };
  }, [user?.id, loadUnreadCount, loadNotifications, showToast]);

  const markRead = async (id) => {
    try {
      await markNotificationReadApi(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error("Failed to mark notification read:", e);
    }
  };

  const markAllRead = async () => {
    try {
      await markAllNotificationsReadApi();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error("Failed to mark all notifications read:", e);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        lastEvent,
        loadNotifications,
        loadUnreadCount,
        markRead,
        markAllRead,
        showToast,
      }}
    >
      {children}

      {/* Floating Live Real-Time Toast Notification */}
      {activeToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-slide-up">
          <div className="p-4 rounded-2xl bg-surface-800/95 backdrop-blur-xl border border-primary-500/40 shadow-2xl shadow-primary-500/20 text-white flex items-start gap-3 relative overflow-hidden">
            {/* Top Accent line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 via-accent-500 to-emerald-400" />
            
            <div className="w-9 h-9 rounded-xl bg-primary-500/20 text-primary-400 flex items-center justify-center text-lg shrink-0 mt-0.5 border border-primary-500/30">
              {activeToast.title?.includes("Way") ? "🚗" : activeToast.title?.includes("Request") || activeToast.title?.includes("Placed") ? "🔔" : activeToast.title?.includes("Progress") ? "🛠️" : activeToast.title?.includes("Completed") ? "⭐" : "✨"}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-white truncate">{activeToast.title}</h4>
                <button
                  type="button"
                  onClick={() => setActiveToast(null)}
                  className="text-gray-400 hover:text-white text-xs font-bold p-0.5"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-gray-300 mt-1 leading-relaxed line-clamp-2">
                {activeToast.message}
              </p>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
