/**
 * AuthContext — Global authentication state management for NexServe.
 *
 * Manages:
 * - Current user state & JWT token in localStorage
 * - Google Sign-In authentication handler
 * - Automatic session validation on page load
 * - Logout handler
 */

import { createContext, useContext, useState, useEffect } from "react";
import { googleAuthApi, fetchMeApi, logoutApi } from "../api/authApi";

const AuthContext = createContext(null);

const TOKEN_KEY = "nexserve_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
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
          localStorage.removeItem(TOKEN_KEY);
          setToken("");
          setUser(null);
        }
      }
      setLoading(false);
    }
    initAuth();
  }, [token]);

  /**
   * Login or Register via Google ID token.
   */
  const loginWithGoogle = async (credential, role = "customer") => {
    setLoading(true);
    try {
      const data = await googleAuthApi(credential, role);
      localStorage.setItem(TOKEN_KEY, data.access_token);
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
   * Logout user and purge session token.
   */
  const logout = async () => {
    if (token) {
      await logoutApi(token);
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, loginWithGoogle, logout }}>
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
