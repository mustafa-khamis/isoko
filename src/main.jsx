import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css'; // using our new global css
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { UIProvider } from './context/UIContext.jsx';
import { HelmetProvider } from 'react-helmet-async';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <UIProvider>
        <HelmetProvider>
          <App />
        </HelmetProvider>
      </UIProvider>
    </AuthProvider>
  </StrictMode>,
);
