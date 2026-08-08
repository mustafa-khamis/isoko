import { useEffect, useRef, useState } from "react";
import { continueWithGoogle } from "../../services/authApi";
import { useAuth } from "../../context/AuthContext";
import { initializeAndRenderGoogleButton } from "../../services/googleIdentity";
import "./GoogleSignInButton.css";

export default function GoogleSignInButton({ onSuccess }) {
  const buttonRef = useRef(null);
  const { login } = useAuth();

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isGoogleProcessing, setIsGoogleProcessing] = useState(false);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId) {
      setError("Google sign-in is not configured.");
      setIsLoading(false);
      return;
    }

    const callback = async (response) => {
      try {
        setError("");
        setIsGoogleProcessing(true);
        const result = await continueWithGoogle(response.credential);
        login(result.data.user, result.data.accessToken);
        if (onSuccess) onSuccess();
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Google sign-in failed.");
        setIsGoogleProcessing(false);
      }
    };

    if (buttonRef.current) {
      initializeAndRenderGoogleButton(clientId, buttonRef.current, callback);
      setIsLoading(false);
    }
  }, [login, onSuccess]);

  return (
    <div className="google-auth-wrapper">
      {isLoading && !isGoogleProcessing && (
        <div className="google-button-skeleton">
          <span className="google-skeleton-text">Loading Google sign-in…</span>
        </div>
      )}

      {isGoogleProcessing && (
        <div className="google-processing-overlay">
          <svg
            className="google-spinner"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="google-spinner-track"
              cx="12" cy="12" r="10"
              strokeWidth="3"
            />
            <path
              className="google-spinner-arc"
              d="M22 12a10 10 0 0 1-10 10"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
          <span className="google-processing-text">Signing you in…</span>
        </div>
      )}

      {/* Hide the google button if processing, or mask it */}
      <div 
        ref={buttonRef} 
        style={{ 
          display: (isLoading || isGoogleProcessing) ? 'none' : 'block',
          width: '100%'
        }} 
      />

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
