/**
 * AuthContext — Isolated authentication state management for NexServe.
 *
 * Manages:
 * - Tab-isolated user session & JWT token in sessionStorage
 * - Google Sign-In & Demo authentication handler
 * - Automatic session validation on page load
 * - Session state updates & Logout handler
 */

import { createContext, useContext, useState, useEffect } from "react";
import { googleAuthApi, fetchMeApi, logoutApi } from "../api/authApi";

const AuthContext = createContext(null);

const TOKEN_KEY = "nexserve_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => {
    // sessionStorage provides tab-level isolation for true multi-user support
    return sessionStorage.getItem(TOKEN_KEY) || "";
  });
  const [loading, setLoading] = useState(true);

  // Validate existing JWT token on app startup
  useEffect(() => {
    async function initAuth() {
      if (token) {
        try {
          const userData = await fetchMeApi(token);
          setUser(userData);
        } catch (err) {
          console.warn("Invalid or expired session, clearing token:", err.message);
          sessionStorage.removeItem(TOKEN_KEY);
          setToken("");
          setUser(null);
        }
      }
      setLoading(false);
    }
    initAuth();
  }, [token]);

  /**
   * Login or Register via Google ID token or Demo credential.
   */
  const loginWithGoogle = async (credential, role = "customer", referralCode = null) => {
    setLoading(true);
    try {
      const data = await googleAuthApi(credential, role, referralCode);
      sessionStorage.setItem(TOKEN_KEY, data.access_token);
      setToken(data.access_token);
      setUser(data.user);
      setLoading(false);
      return data.user;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  /**
   * Update current user in session state.
   */
  const updateUser = (updatedData) => {
    setUser((prev) => (prev ? { ...prev, ...updatedData } : updatedData));
  };

  /**
   * Logout user and purge tab session token.
   */
  const logout = async () => {
    if (token) {
      try {
        await logoutApi(token);
      } catch (e) {
        // Continue clearing local state even if network logout fails
      }
    }
    sessionStorage.removeItem(TOKEN_KEY);
    setToken("");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, loginWithGoogle, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

