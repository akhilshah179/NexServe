import api from "./axios";

export async function fetchProviderAvailabilityApi(providerId) {
  const res = await api.get(`/availability/providers/${providerId}`);
  return res.data;
}

export async function fetchAvailableSlotsApi(providerId, targetDate) {
  const res = await api.get(`/availability/providers/${providerId}/slots`, {
    params: { target_date: targetDate },
  });
  return res.data;
}

export async function blockDateApi(dateStr) {
  const res = await api.post("/availability/me/block-date", { date: dateStr });
  return res.data;
}
