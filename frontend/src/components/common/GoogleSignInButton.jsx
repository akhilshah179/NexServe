/**
 * GoogleSignInButton Component — Renders official Google Sign-In button.
 * Integrates with Google Identity Services (gsi/client).
 */

import { useEffect, useRef, useState } from "react";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export default function GoogleSignInButton({ onSuccess, onError }) {
  const buttonRef = useRef(null);
  const [googleLoaded, setGoogleLoaded] = useState(false);

  // Store callbacks in refs so changes don't re-trigger initialization
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSuccess, onError]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      return;
    }

    let intervalId = null;

    const checkAndInitGoogle = () => {
      if (window.google?.accounts?.id && buttonRef.current) {
        setGoogleLoaded(true);
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }

        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response) => {
              if (response.credential) {
                onSuccessRef.current?.(response.credential);
              } else {
                onErrorRef.current?.("No credential received from Google.");
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
        } catch (e) {
          console.error("Google GIS initialization error:", e);
          onErrorRef.current?.("Failed to initialize Google Sign-In SDK.");
        }
      }
    };

    if (window.google?.accounts?.id) {
      checkAndInitGoogle();
    } else {
      intervalId = setInterval(checkAndInitGoogle, 300);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="w-full p-4 rounded-xl bg-surface-700/50 border border-warning-500/30 text-center text-xs text-warning-400">
        <p className="font-semibold mb-1">Google Sign-In Required</p>
        <p className="text-gray-400">
          Please configure <code className="text-primary-300">VITE_GOOGLE_CLIENT_ID</code> in <code className="text-primary-300">frontend/.env</code> to enable authentication.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center gap-3">
      <div ref={buttonRef} className="w-full flex justify-center min-h-[44px]" />
      {!googleLoaded && (
        <div className="text-xs text-gray-400 animate-pulse text-center py-2">
          Loading Google Sign-In...
        </div>
      )}
    </div>
  );
}

