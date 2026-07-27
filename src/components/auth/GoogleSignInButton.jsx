import { useEffect, useRef, useState } from "react";
import { continueWithGoogle } from "../../services/authApi";
import { useAuth } from "../../context/AuthContext";
import { initializeAndRenderGoogleButton } from "../../services/googleIdentity";

export default function GoogleSignInButton({ onSuccess }) {
  const buttonRef = useRef(null);
  const { login } = useAuth();

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

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
        const result = await continueWithGoogle(response.credential);
        login(result.data.user, result.data.accessToken);
        if (onSuccess) onSuccess();
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Google sign-in failed.");
      }
    };

    if (buttonRef.current) {
      initializeAndRenderGoogleButton(clientId, buttonRef.current, callback);
      setIsLoading(false);
    }
  }, [login]);

  return (
    <div className="google-auth-wrapper">
      {isLoading && (
        <div className="google-button-skeleton">
          Loading Google sign-in…
        </div>
      )}

      <div ref={buttonRef} />

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}