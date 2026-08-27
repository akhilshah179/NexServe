import api from "./axios";

export async function fetchPublicProvidersApi(params = {}) {
  const res = await api.get("/providers/public", { params });
  return res.data;
}

export async function fetchProviderByIdApi(providerId) {
  const res = await api.get(`/providers/${providerId}`);
  return res.data;
}

export async function updateProviderProfileApi(profileData) {
  const res = await api.put("/providers/me/profile", profileData);
  return res.data;
}

export async function verifyProviderApi(providerId, actionData) {
  const res = await api.post(`/providers/${providerId}/verify`, actionData);
  return res.data;
}
