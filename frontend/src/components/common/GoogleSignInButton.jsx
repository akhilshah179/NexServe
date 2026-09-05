/**
 * GoogleSignInButton Component — High-reliability Google Sign-In SDK integration.
 *
 * Features:
 * - Dynamic GSI SDK script injection & auto-initialization
 * - Fallback detection if Google CDN is blocked or slow
 * - One-click retry and instant demo fallback triggers
 */

import { useEffect, useRef, useState } from "react";
import { FiAlertCircle, FiRefreshCw } from "react-icons/fi";

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
          theme: "filled_blue",
          size: "large",
          width: 320,
          text: "continue_with",
          shape: "pill",
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
      <div className="w-full p-4 rounded-xl bg-slate-800/80 border border-amber-500/30 text-center text-xs text-amber-300">
        <p className="font-semibold mb-1">Google Client ID Missing</p>
        <p className="text-slate-400">
          Please check <code className="text-blue-400">VITE_GOOGLE_CLIENT_ID</code> in <code className="text-blue-400">.env</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center gap-3">
      <div ref={buttonRef} className="w-full flex justify-center min-h-[44px]" />

      {!googleLoaded && !loadTimedOut && (
        <div className="text-xs text-slate-400 flex items-center justify-center gap-2 py-2">
          <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Connecting to Google Sign-In...</span>
        </div>
      )}

      {loadTimedOut && !googleLoaded && (
        <div className="w-full p-3 rounded-xl bg-slate-800/90 border border-slate-700 text-center text-xs space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-amber-400">
            <FiAlertCircle />
            <span>Google CDN taking longer to respond.</span>
          </div>
          <button
            type="button"
            onClick={initGoogleSdk}
            className="px-3 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <FiRefreshCw className="w-3 h-3" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}
    </div>
  );
}
