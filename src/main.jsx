import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css'; // using our new global css
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { UIProvider } from './context/UIContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <UIProvider>
        <App />
      </UIProvider>
    </AuthProvider>
  </StrictMode>,
);
