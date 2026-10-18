/**
 * GoogleSignInButton Component — High-reliability Google Sign-In SDK integration.
 *
 * Features:
 * - Dynamic GSI SDK script injection & auto-initialization
 * - Fallback detection if Google CDN is blocked or slow
 * - One-click retry and instant demo fallback triggers
 */

import { useEffect, useRef, useState } from "react";
import { AlertCircle, RefreshCw, Loader2 } from "lucide-react";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export default function GoogleSignInButton({ onSuccess, onError }) {
  const buttonRef = useRef(null);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const [loadTimedOut, setLoadTimedOut] = useState(false);

  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSuccess, onError]);

  const initGoogleSdk = () => {
    if (!GOOGLE_CLIENT_ID) return;

    if (window.google?.accounts?.id && buttonRef.current) {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          auto_select: false,
          cancel_on_tap_outside: true,
          callback: (response) => {
            if (response.credential) {
              onSuccessRef.current?.(response.credential);
            } else {
              onErrorRef.current?.("No credential token returned by Google.");
            }
          },
        });

        buttonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "filled_black",
          size: "large",
          width: 380,
          text: "continue_with",
          shape: "rectangular",
        });

        setGoogleLoaded(true);
        setLoadTimedOut(false);
      } catch (err) {
        console.error("Google GSI initialization error:", err);
        setLoadTimedOut(true);
      }
    }
  };

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    // Check if script already on page
    let scriptTag = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (!scriptTag) {
      scriptTag = document.createElement("script");
      scriptTag.src = "https://accounts.google.com/gsi/client";
      scriptTag.async = true;
      scriptTag.defer = true;
      scriptTag.onload = () => {
        initGoogleSdk();
      };
      scriptTag.onerror = () => {
        setLoadTimedOut(true);
      };
      document.head.appendChild(scriptTag);
    } else {
      if (window.google?.accounts?.id) {
        initGoogleSdk();
      } else {
        scriptTag.addEventListener("load", initGoogleSdk);
      }
    }

    // Polling fallback
    const interval = setInterval(() => {
      if (window.google?.accounts?.id) {
        initGoogleSdk();
        clearInterval(interval);
      }
    }, 300);

    // Timeout fallback after 3 seconds
    const timeout = setTimeout(() => {
      if (!window.google?.accounts?.id) {
        setLoadTimedOut(true);
      }
      clearInterval(interval);
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="w-full p-4 rounded-xl bg-amber-500/[0.06] border border-amber-400/20 text-[13px] text-amber-200">
        <p className="font-semibold">Google sign-in isn't configured</p>
        <p className="text-ink-400 mt-0.5">
          Set <code className="text-amber-200">VITE_GOOGLE_CLIENT_ID</code> in <code className="text-amber-200">.env</code>, or use a demo account below.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center gap-3">
      <div ref={buttonRef} className="w-full flex justify-center min-h-[44px] [color-scheme:light]" />

      {!googleLoaded && !loadTimedOut && (
        <div className="text-[13px] text-ink-400 flex items-center justify-center gap-2" role="status">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          Connecting to Google…
        </div>
      )}

      {loadTimedOut && !googleLoaded && (
        <div className="w-full p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-center text-[13px] space-y-2.5">
          <p className="flex items-center justify-center gap-1.5 text-amber-300">
            <AlertCircle className="w-4 h-4" aria-hidden="true" />
            Google is taking longer than usual to respond.
          </p>
          <button
            type="button"
            onClick={initGoogleSdk}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-ink-100 font-medium transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
