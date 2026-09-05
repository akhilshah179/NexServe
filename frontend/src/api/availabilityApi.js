import api from "./axios";

/**
 * Fetch weekly availability schedule for a provider.
 */
export async function fetchProviderAvailabilityApi(providerId) {
  const res = await api.get(`/availability/providers/${providerId}`);
  return res.data;
}

/**
 * Fetch available time slots for a provider on a specific date (YYYY-MM-DD).
 * @param {number} providerId
 * @param {string} targetDate - Date in YYYY-MM-DD
 * @param {number|null} serviceId - Optional service ID for duration-based slots
 */
export async function fetchAvailableSlotsApi(providerId, targetDate, serviceId = null) {
  const params = { target_date: targetDate };
  if (serviceId) {
    params.service_id = serviceId;
  }
  const res = await api.get(`/availability/providers/${providerId}/slots`, { params });
  return res.data;
}

/**
 * Block a calendar date for the authenticated provider.
 */
export async function blockDateApi(dateStr) {
  const res = await api.post("/availability/me/block-date", { date: dateStr });
  return res.data;
}
