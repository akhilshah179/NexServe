/**
 * Axios Instance — centralized HTTP client for the NexServe API.
 *
 * WHY a centralized instance?
 * - Sets the base URL once (no repeating "http://localhost:8000" everywhere)
 * - Attaches the JWT token automatically to every request
 * - Handles token expiry and refresh in one place
 * - Makes it easy to add logging, error handling, etc.
 *
 * HOW IT WORKS:
 * 1. Create an axios instance with default config
 * 2. Add a "request interceptor" that attaches the JWT token
 *    before every request goes out
 * 3. Add a "response interceptor" that catches 401 errors
 *    (meaning the token expired) and handles them
 * 4. Export the instance — all API calls use this instead of raw axios
 */

import axios from "axios";

const api = axios.create({
  // In development, Vite's proxy forwards /api to http://localhost:8000
  // In production, uses configured VITE_API_BASE_URL or falls back to /api/v1
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 second timeout
});

// ── Request Interceptor ──────────────────────────────
// Runs BEFORE every request. Attaches the JWT token if available.
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("nexserve_token") || localStorage.getItem("nexserve_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ── Response Interceptor ─────────────────────────────
// Runs AFTER every response. Catches auth errors globally.
api.interceptors.response.use(
  (response) => {
    // Detect HTML responses returned with 200 OK (e.g. SPA rewrites when VITE_API_BASE_URL is missing or wrong)
    const contentType = response.headers?.["content-type"] || "";
    if (
      contentType.includes("text/html") ||
      (typeof response.data === "string" && (response.data.trim().startsWith("<!DOCTYPE") || response.data.trim().startsWith("<html") || response.data.trim().startsWith("<!doctype")))
    ) {
      return Promise.reject(
        new Error(
          "API endpoint returned an HTML page instead of JSON. Check that VITE_API_BASE_URL is correctly set to your backend URL in production."
        )
      );
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear it from storage
      sessionStorage.removeItem("nexserve_token");
      localStorage.removeItem("nexserve_token");
      console.warn("Authentication expired. Please log in again.");
    }
    return Promise.reject(error);
  }
);

export default api;
