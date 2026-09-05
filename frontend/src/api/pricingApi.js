import api from "./axios";

/**
 * Calculate dynamic price on backend
 * @param {Object} payload { service_id, provider_id, booking_date, time_slot, is_emergency, customer_lat, customer_lng, coupon_code, use_referral_credit }
 */
export async function calculatePriceApi(payload) {
  const res = await api.post("/pricing/calculate", payload);
  return res.data;
}
