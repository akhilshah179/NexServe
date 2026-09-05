/**
 * Authentication API Client.
 * Connects React frontend to FastAPI auth endpoints using centralized axios instance.
 */

import api from "./axios";

/**
 * Authenticate with Google ID token.
 * @param {string} credential - Google ID token
 * @param {string} role - Selected user role ('customer' or 'provider')
 * @param {string} referralCode - Optional referral code during registration
 */
export async function googleAuthApi(credential, role = "customer", referralCode = null) {
  try {
    const res = await api.post("/auth/google", {
      credential,
      role,
      referral_code: referralCode || undefined,
    });
    return res.data; // { access_token, token_type, user }
  } catch (err) {
    const message =
      err.response?.data?.detail ||
      err.message ||
      "Unable to connect to NexServe authentication backend.";
    throw new Error(message);
  }
}

/**
 * Fetch currently authenticated user profile.
 * @param {string} token - NexServe JWT token
 */
export async function fetchMeApi(token) {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await api.get("/auth/me", { headers });
    return res.data; // UserResponse object
  } catch (err) {
    const message = err.response?.data?.detail || "Session expired.";
    throw new Error(message);
  }
}

/**
 * Logout authenticated user.
 * @param {string} token - NexServe JWT token
 */
export async function logoutApi(token) {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    await api.post("/auth/logout", {}, { headers });
  } catch (err) {
    console.warn("Logout warning:", err);
  }
}
