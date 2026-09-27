let isInitialized = false;
let globalCallback = null;

// The single unified callback that Google Identity Services triggers
function handleCredentialResponse(response) {
  if (globalCallback) {
    globalCallback(response);
  }
}

/**
 * Ensures Google Identity Services is initialized exactly once,
 * and renders the button safely into the given container.
 */
export function initializeAndRenderGoogleButton(clientId, containerElement, callback) {
  // Update the global callback so the most recently mounted component handles the sign-in response
  globalCallback = callback;

  if (!clientId) {
    return;
  }

  // If the external script is not loaded yet, retry shortly
  if (typeof window === 'undefined' || !window.google?.accounts?.id) {
    setTimeout(() => initializeAndRenderGoogleButton(clientId, containerElement, callback), 100);
    return;
  }

  // Initialize exactly once per page
  if (!isInitialized) {
    window.google.accounts.id.initialize({
      client_id: clientId,
      ux_mode: 'popup',
      callback: handleCredentialResponse,
    });
    isInitialized = true;
  }

  // Clear any existing content in the container to avoid duplicate iframes
  if (containerElement) {
    containerElement.innerHTML = '';

    // Google draws the button at a fixed pixel width baked into the iframe's
    // content. Without an explicit width, it auto-sizes to the button's text,
    // so the personalized "Continue as <name>" state renders much narrower
    // than the generic "Continue with Google" state. Passing the container's
    // own width (clamped to Google's supported 200-400px range) keeps both
    // states the same size.
    // The container itself is `display:none` until loading finishes, which
    // would measure as 0 width, so prefer the always-visible parent wrapper.
    const measuredWidth = containerElement.parentElement?.getBoundingClientRect().width
      || containerElement.getBoundingClientRect().width;
    const width = Math.round(Math.min(400, Math.max(200, measuredWidth || 400)));

    window.google.accounts.id.renderButton(containerElement, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width,
    });
  }
}
