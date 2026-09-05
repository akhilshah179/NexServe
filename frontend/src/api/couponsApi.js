import api from "./axios";

/**
 * Validate a coupon code against current booking details
 * @param {Object} payload { code, service_id, total_amount }
 */
export async function validateCouponApi(payload) {
  const res = await api.post("/coupons/validate", payload);
  return res.data;
}

/**
 * Fetch list of active available coupons (with optional serviceId filter)
 * @param {number|null} serviceId
 */
export async function fetchAvailableCouponsApi(serviceId = null) {
  const params = serviceId ? { service_id: serviceId } : {};
  const res = await api.get("/coupons/available", { params });
  return res.data;
}
