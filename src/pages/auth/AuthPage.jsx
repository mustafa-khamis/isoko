import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthModal from '../../components/auth/AuthModal';
import '../../components/auth/AuthModal.css';
import './AuthPage.css';

const getReturnPath = (location) => {
  const from = location.state?.from;
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/';
};

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const returnPath = getReturnPath(location);
  const initialMode = location.pathname === '/register' ? 'signup' : 'signin';

  const handleAuthenticated = useCallback(() => {
    navigate(returnPath, { replace: true });
  }, [navigate, returnPath]);

  return (
    <div className="auth-page">
      <div className="auth-page__card">
        <AuthModal
          initialMode={initialMode}
          onAuthenticated={handleAuthenticated}
          onClose={() => navigate('/')}
        />
      </div>
    </div>
  );
}