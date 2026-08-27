/**
 * Authentication API Client.
 * Connects React frontend to FastAPI auth endpoints.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

/**
 * Authenticate with Google ID token.
 * @param {string} credential - Google ID token
 * @param {string} role - Selected user role ('customer' or 'provider')
 */
export async function googleAuthApi(credential, role = "customer") {
  try {
    const response = await fetch(`${API_BASE}/auth/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ credential, role }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Google authentication failed.");
    }
    return data; // { access_token, token_type, user }
  } catch (err) {
    if (err.name === "TypeError" || err.message === "Failed to fetch") {
      throw new Error("Unable to connect to NexServe backend server on http://localhost:8000. Please ensure the backend is running.");
    }
    throw err;
  }
}

/**
 * Fetch currently authenticated user profile.
 * @param {string} token - NexServe JWT token
 */
export async function fetchMeApi(token) {
  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Session expired.");
    }
    return data; // UserResponse object
  } catch (err) {
    if (err.name === "TypeError" || err.message === "Failed to fetch") {
      throw new Error("Unable to connect to NexServe backend server.");
    }
    throw err;
  }
}

/**
 * Logout authenticated user.
 * @param {string} token - NexServe JWT token
 */
export async function logoutApi(token) {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (err) {
    console.warn("Logout endpoint warning:", err);
  }
}
