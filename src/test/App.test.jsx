import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';
import { AuthProvider } from '../context/AuthContext';
import { UIProvider } from '../context/UIContext';

describe('App', () => {
  it('renders without crashing', () => {
    render(
      <AuthProvider>
        <UIProvider>
          <App />
        </UIProvider>
      </AuthProvider>
    );
    expect(screen.getAllByText(/isoko/i).length).toBeGreaterThan(0);
  });
});
