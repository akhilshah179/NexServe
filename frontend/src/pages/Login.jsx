/**
 * Login Page — Google OAuth Sign In & Role Selection.
 *
 * Features:
 * - Direct Google Sign-In authentication via FastAPI backend
 * - Role selector: Book Services (CUSTOMER) vs Provide Services (PROVIDER)
 * - NO password fields / NO separate signup forms required
 * - Automatic redirect to appropriate dashboard upon login
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import GoogleSignInButton from "../components/common/GoogleSignInButton";

export default function Login() {
  const { user, loginWithGoogle, loading: authLoading } = useAuth();
  const [selectedRole, setSelectedRole] = useState("customer");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect authenticated users to appropriate dashboard
  useEffect(() => {
    if (user && !authLoading) {
      const from = location.state?.from?.pathname;
      if (from) {
        navigate(from, { replace: true });
      } else if (user.role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else if (user.role === "provider") {
        navigate("/provider/dashboard", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [user, authLoading, navigate, location]);

  const handleGoogleSuccess = useCallback(async (credential) => {
    setIsSubmitting(true);
    setError("");
    const refCode = new URLSearchParams(location.search).get("ref") || null;
    try {
      const loggedUser = await loginWithGoogle(credential, selectedRole, refCode);
      if (loggedUser.role === "admin") {
        navigate("/admin/dashboard");
      } else if (loggedUser.role === "provider") {
        navigate("/provider/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Google login error:", err);
      setError(err.message || "Failed to authenticate with Google.");
    } finally {
      setIsSubmitting(false);
    }
  }, [loginWithGoogle, selectedRole, navigate, location.search]);

  const handleGoogleError = useCallback((errMsg) => {
    setError(errMsg || "Google sign-in encountered an error.");
  }, []);

  const handleDemoLogin = async (demoRole) => {
    setIsSubmitting(true);
    setError("");
    const refCode = new URLSearchParams(location.search).get("ref") || null;
    try {
      const credential = `demo-${demoRole}`;
      const loggedUser = await loginWithGoogle(credential, demoRole, refCode);
      if (loggedUser.role === "admin") {
        navigate("/admin/dashboard");
      } else if (loggedUser.role === "provider") {
        navigate("/provider/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Demo login error:", err);
      setError(err.message || "Failed to complete demo login.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center pt-20 pb-16 px-4">
      {/* Ambient background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 -left-20 w-80 h-80 bg-primary-500/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 -right-20 w-80 h-80 bg-accent-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        {/* Brand Logo Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/25">
              <span className="text-white font-bold text-xl">N</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
              NexServe
            </span>
          </Link>
        </div>

        {/* Auth Card */}
        <div className="p-8 rounded-2xl bg-surface-800/80 backdrop-blur-xl border border-white/10 shadow-2xl">
          <h1 className="text-2xl font-bold text-white text-center mb-1">
            Welcome to NexServe
          </h1>
          <p className="text-sm text-gray-400 text-center mb-6">
            Sign in with your Google account to get started immediately.
          </p>

          {/* Role Selector */}
          <div className="mb-6">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2.5 text-center">
              Select Account Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedRole("customer")}
                className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-300 ${
                  selectedRole === "customer"
                    ? "bg-primary-500/20 border-primary-500/50 text-primary-300 shadow-md shadow-primary-500/10"
                    : "bg-surface-700/60 border-white/10 text-gray-400 hover:border-white/20"
                }`}
              >
                🔍 Book Services
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole("provider")}
                className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-300 ${
                  selectedRole === "provider"
                    ? "bg-primary-500/20 border-primary-500/50 text-primary-300 shadow-md shadow-primary-500/10"
                    : "bg-surface-700/60 border-white/10 text-gray-400 hover:border-white/20"
                }`}
              >
                🛠️ Provide Services
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-error-500/10 border border-error-500/20 text-error-400 text-sm animate-fade-in flex items-center gap-2">
              <span>⚠️</span>
              <p>{error}</p>
            </div>
          )}

          {/* Submitting State Indicator */}
          {isSubmitting ? (
            <div className="py-6 text-center animate-pulse">
              <div className="inline-block w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-sm text-gray-300">Authenticating with NexServe...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mb-4">
                <GoogleSignInButton
                  role={selectedRole}
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                />
              </div>

              {/* Dev / Quick Demo Login Options */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-surface-800 px-3 text-gray-400">Quick Test / Demo Sign-In</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleDemoLogin("customer")}
                  className="py-2.5 px-3 rounded-lg bg-surface-700/60 hover:bg-surface-700 text-gray-300 hover:text-white border border-white/10 text-center transition-all"
                >
                  ⚡ Demo Customer
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoLogin("provider")}
                  className="py-2.5 px-3 rounded-lg bg-surface-700/60 hover:bg-surface-700 text-gray-300 hover:text-white border border-white/10 text-center transition-all"
                >
                  ⚡ Demo Provider
                </button>
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-white/5 text-center text-xs text-gray-500">
            By signing in, you agree to NexServe&apos;s{" "}
            <span className="text-gray-400 hover:text-white cursor-pointer underline">Terms of Service</span>{" "}
            and{" "}
            <span className="text-gray-400 hover:text-white cursor-pointer underline">Privacy Policy</span>.
          </div>
        </div>
      </div>
    </div>
  );
}

