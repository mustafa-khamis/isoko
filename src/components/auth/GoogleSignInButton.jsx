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
      {(isLoading || isGoogleProcessing) && (
        <div className="google-button-skeleton">
          {isGoogleProcessing ? "Please wait..." : "Loading Google sign-in…"}
        </div>
      )}

      {/* Hide the google button if processing, or mask it */}
      <div 
        ref={buttonRef} 
        style={{ 
          display: isGoogleProcessing ? 'none' : 'block',
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
