import api from "./axios";

export async function fetchAddressesApi() {
  const res = await api.get("/addresses");
  return res.data;
}

export async function createAddressApi(data) {
  const res = await api.post("/addresses", data);
  return res.data;
}

export async function updateAddressApi(addressId, data) {
  const res = await api.put(`/addresses/${addressId}`, data);
  return res.data;
}

export async function deleteAddressApi(addressId) {
  const res = await api.delete(`/addresses/${addressId}`);
  return res.data;
}
