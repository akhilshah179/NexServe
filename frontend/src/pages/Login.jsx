/**
 * Login Page — Google OAuth Sign In & Role Selection.
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import GoogleSignInButton from "../components/common/GoogleSignInButton";
import { motion } from "framer-motion";
import { ShieldCheck, Search, Wrench, Loader2, Lock, User, Briefcase, Star, Package } from "lucide-react";
import { LogoMark } from "../components/common/Logo";
import { Alert, Button, Tabs, Divider, Reveal } from "../components/ui";
import { unsplash } from "../lib/visuals";
import { ease } from "../lib/motion";

export default function Login() {
  const { user, loginWithGoogle, loading: authLoading } = useAuth();
  const [selectedRole, setSelectedRole] = useState("customer");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect authenticated users
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

  const handleGoogleSuccess = useCallback(
    async (credential) => {
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
    },
    [loginWithGoogle, selectedRole, navigate, location.search]
  );

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
    <div className="relative min-h-screen pt-16 grid lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden border-r border-white/[0.06] p-12 xl:p-16">
        <img src={unsplash("1581578731548-c64695cc6952", 1400)} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-br from-surface-950 via-surface-950/85 to-primary-950/60" />
        <div className="relative">
          <p className="eyebrow mb-4">Welcome to NexServe</p>
          <h2 className="text-4xl xl:text-5xl font-semibold text-white leading-[1.1] max-w-md">
            Your home, handled by people you can trust.
          </h2>
          <p className="mt-4 text-ink-300 max-w-md leading-relaxed">
            One account to book verified professionals, rent gear with protected deposits, and track everything live.
          </p>
        </div>
        <ul className="relative space-y-4 max-w-sm">
          {[
            { icon: ShieldCheck, t: "Background-verified professionals", d: "ID and skills checked before the first job." },
            { icon: Package, t: "Rentals with refundable deposits", d: "Delivered to your door or picked up nearby." },
            { icon: Star, t: "Ratings you can rely on", d: "Reviews come from real bookings." },
          ].map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.li
                key={f.t}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.45, ease: ease.out }}
                className="flex gap-3.5 p-4 rounded-2xl bg-surface-900/60 backdrop-blur-md border border-white/[0.07]"
              >
                <span className="w-9 h-9 rounded-xl bg-white/[0.06] text-primary-200 flex items-center justify-center shrink-0">
                  <Icon className="w-[18px] h-[18px]" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">{f.t}</span>
                  <span className="block text-[13px] text-ink-400 mt-0.5">{f.d}</span>
                </span>
              </motion.li>
            );
          })}
        </ul>
      </aside>

      {/* Auth panel */}
      <div className="relative flex items-center justify-center px-4 py-12 sm:py-16">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(50%_40%_at_50%_30%,rgb(116_104_240/0.12),transparent)]" aria-hidden="true" />
        <Reveal y={16} className="w-full max-w-[420px]">
          <div className="flex justify-center lg:justify-start">
            <LogoMark className="w-11 h-11" />
          </div>
          <h1 className="mt-6 text-3xl font-semibold text-white text-center lg:text-left">Sign in to NexServe</h1>
          <p className="mt-2 text-[15px] text-ink-400 text-center lg:text-left">
            New here? Signing in with Google creates your account.
          </p>

          <div className="mt-8">
            <p id="role-label" className="label">I want to</p>
            <Tabs
              ariaLabel="Account type"
              value={selectedRole}
              onChange={setSelectedRole}
              stretch
              items={[
                { id: "customer", label: "Book services", icon: Search },
                { id: "provider", label: "Offer services", icon: Wrench },
              ]}
            />
            <p className="mt-2 text-xs text-ink-500">
              {selectedRole === "provider"
                ? "Provider accounts are reviewed before you can accept bookings."
                : "Book services, rent gear and manage everything in one place."}
            </p>
          </div>

          {error && <Alert tone="error" className="mt-6">{error}</Alert>}

          <div className="mt-6">
            {isSubmitting ? (
              <div className="h-[120px] flex flex-col items-center justify-center gap-3 surface-inset" role="status">
                <Loader2 className="w-6 h-6 text-primary-300 animate-spin" aria-hidden="true" />
                <p className="text-sm text-ink-300">Signing you in…</p>
              </div>
            ) : (
              <>
                <GoogleSignInButton role={selectedRole} onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
                <Divider label="or explore with a demo account" className="my-6" />
                <div className="grid grid-cols-2 gap-2.5">
                  <Button variant="secondary" icon={User} onClick={() => handleDemoLogin("customer")}>
                    Demo customer
                  </Button>
                  <Button variant="secondary" icon={Briefcase} onClick={() => handleDemoLogin("provider")}>
                    Demo provider
                  </Button>
                </div>
              </>
            )}
          </div>

          <p className="mt-8 text-xs text-ink-500 leading-relaxed text-center lg:text-left flex items-start gap-2 justify-center lg:justify-start">
            <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              By continuing you agree to NexServe's{" "}
              <Link to="/about#trust" className="text-ink-300 hover:text-white underline underline-offset-2">
                terms and privacy policy
              </Link>
              .
            </span>
          </p>
        </Reveal>
      </div>
    </div>
  );
}
