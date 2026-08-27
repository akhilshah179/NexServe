import api from "./axios";

export async function getAdminStats() {
  const res = await api.get("/admin/stats");
  return res.data;
}

export async function getPendingProvidersApi() {
  const res = await api.get("/admin/providers/pending");
  return res.data;
}

export async function approveProviderApi(providerId) {
  const res = await api.post(`/admin/providers/${providerId}/approve`);
  return res.data;
}

export async function rejectProviderApi(providerId, rejectionReason) {
  const res = await api.post(`/admin/providers/${providerId}/reject`, {
    status: "rejected",
    rejection_reason: rejectionReason,
  });
  return res.data;
}

export async function getAllUsers(role = null, search = null) {
  const params = {};
  if (role) params.role = role;
  if (search) params.search = search;
  const res = await api.get("/admin/users", { params });
  return res.data;
}

export async function toggleUserActiveApi(userId, isActive) {
  const res = await api.patch(`/admin/users/${userId}/status`, { is_active: isActive });
  return res.data;
}

export async function getAllBookings() {
  const res = await api.get("/admin/bookings");
  return res.data;
}

export async function getAllMessages() {
  const res = await api.get("/admin/messages");
  return res.data;
}

export async function updateUserRole(userId, role) {
  const res = await api.patch(`/admin/users/${userId}/role`, { role });
  return res.data;
}

export async function deleteReviewApi(reviewId) {
  const res = await api.delete(`/admin/reviews/${reviewId}`);
  return res.data;
}

export async function createCategoryApi(data) {
  const res = await api.post("/admin/categories", data);
  return res.data;
}

export async function fetchAuditLogsApi() {
  const res = await api.get("/admin/audit-logs");
  return res.data;
}

export async function markMessageRead(messageId) {
  const res = await api.patch(`/contact/${messageId}/read`);
  return res.data;
}
