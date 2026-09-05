import api from "./axios";

/**
 * Fetch current user's referral info (code, credits, referral list)
 */
export async function fetchMyReferralsApi() {
  const res = await api.get("/referrals/me");
  return res.data;
}

/**
 * Validate a referral code during sign-up
 * @param {string} referralCode
 */
export async function validateReferralCodeApi(referralCode) {
  const res = await api.post("/referrals/validate", { referral_code: referralCode });
  return res.data;
}
