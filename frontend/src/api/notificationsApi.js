import api from "./axios";

export async function fetchNotificationsApi() {
  const res = await api.get("/notifications");
  return res.data;
}

export async function fetchUnreadCountApi() {
  const res = await api.get("/notifications/unread-count");
  return res.data;
}

export async function markNotificationReadApi(notifId) {
  const res = await api.post(`/notifications/${notifId}/read`);
  return res.data;
}

export async function markAllNotificationsReadApi() {
  const res = await api.post("/notifications/read-all");
  return res.data;
}
