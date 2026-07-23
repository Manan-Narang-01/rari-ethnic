import { useEffect, useRef, useState } from "react";
import { GOOGLE_CLIENT_ID } from "@/lib/api";

const GSI_SRC = "https://accounts.google.com/gsi/client";

// Loads the Google Identity Services script once and reuses it.
let gsiPromise = null;
const loadGsi = () => {
  if (gsiPromise) return gsiPromise;
  gsiPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", reject);
      return;
    }
    const s = document.createElement("script");
    s.src = GSI_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return gsiPromise;
};

export const GoogleSignInButton = ({ onCredential, onError }) => {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    loadGsi()
      .then(() => {
        if (cancelled || !ref.current) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (response?.credential) onCredential(response.credential);
            else onError?.("No credential returned");
          },
        });
        window.google.accounts.id.renderButton(ref.current, {
          theme: "outline",
          size: "large",
          shape: "rectangular",
          text: "continue_with",
          width: 320,
          logo_alignment: "left",
        });
        setReady(true);
      })
      .catch(() => onError?.("Failed to load Google Sign-In"));
    return () => {
      cancelled = true;
    };
  }, [onCredential, onError]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="text-sm text-[#6E7B85] border border-dashed border-[#2A2E30]/25 rounded-sm p-4 text-center">
        Google Sign-In is not configured yet. Add{" "}
        <code className="text-[#A0684E]">REACT_APP_GOOGLE_CLIENT_ID</code> to enable login.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div ref={ref} data-testid="google-signin-button" />
      {!ready && <span className="text-xs text-[#6E7B85]">Loading Google Sign-In…</span>}
    </div>
  );
};

export default GoogleSignInButton;
