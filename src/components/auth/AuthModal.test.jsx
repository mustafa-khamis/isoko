import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuthModal from './AuthModal';
import { AuthProvider } from '../../context/AuthContext';
import { UIProvider } from '../../context/UIContext';
import { BrowserRouter } from 'react-router-dom';
import * as authApi from '../../services/authApi';

vi.mock('../../services/authApi', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
  },
  continueWithGoogle: vi.fn(),
}));

vi.mock('../../services/googleIdentity', () => ({
  initializeAndRenderGoogleButton: vi.fn(),
}));

// Mock Google accounts API
beforeAll(() => {
  window.google = {
    accounts: {
      id: {
        initialize: vi.fn(),
        renderButton: vi.fn(),
      },
    },
  };
});

describe('Google Authentication Frontend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    import.meta.env.VITE_GOOGLE_CLIENT_ID = 'test-client-id';
  });

  const renderModal = (initialMode = 'signin') => {
    return render(
      <BrowserRouter>
        <UIProvider>
          <AuthProvider>
            <AuthModal onClose={() => {}} initialMode={initialMode} />
          </AuthProvider>
        </UIProvider>
      </BrowserRouter>
    );
  };

  it('Google button appears on sign-in page', () => {
    renderModal('signin');
    expect(document.querySelector('.google-auth-wrapper')).toBeInTheDocument();
  });

  it('Google button appears on sign-up page', () => {
    renderModal('signup');
    expect(document.querySelector('.google-auth-wrapper')).toBeInTheDocument();
  });

  it('missing Client ID state', async () => {
    import.meta.env.VITE_GOOGLE_CLIENT_ID = '';
    renderModal('signin');
    await waitFor(() => {
      expect(screen.getByText('Google sign-in is not configured.')).toBeInTheDocument();
    });
  });

  // Note: duplicate clicks and redirect logic are handled by the native Google button and context.
});
