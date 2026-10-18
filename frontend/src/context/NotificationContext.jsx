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
import { useToast } from "../components/ui";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
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

  const { toast } = useToast();

  // Live events surface through the shared toast system.
  const showToast = useCallback(
    (toastData) => {
      const tone = toastData.type === "rental" ? "rental" : toastData.type === "booking" ? "booking" : "info";
      toast.show(tone, toastData.title, toastData.message, { duration: 6000 });
    },
    [toast]
  );

  // Establish user-specific WebSocket connection
  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
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

      // Handle service booking update event (e.g. new_booking_request, status_update)
      if (payload?.type === "booking_update" || payload?.event === "status_update" || payload?.event === "booking_created") {
        const title = payload.title || (payload.event === "booking_created" ? "New booking request" : "Booking update");
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

      // Handle rental booking update event (e.g. new_rental_booking, rental_status_update)
      if (payload?.type === "rental_booking_update" || payload?.event === "new_rental_booking" || payload?.event === "rental_status_update" || payload?.event === "rental_returned_inspected") {
        const title = payload.title || (payload.event === "new_rental_booking" ? "New rental request" : "Rental order updated");
        const statusClean = (payload.status || "").replace(/_/g, " ");
        const message = payload.message || payload.notes || `Rental #${payload.rental_booking_id} for '${payload.item_name || "item"}' is now ${statusClean}`;
        showToast({
          id: Date.now(),
          title,
          message,
          type: "rental",
          rental_booking_id: payload.rental_booking_id,
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
