import api from "./axios";

export async function fetchEmergencyProvidersApi(params = {}) {
  const res = await api.get("/emergency/providers", { params });
  return res.data;
}
