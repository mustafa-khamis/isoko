import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
      <Helmet>
        <meta name="robots" content="noindex, follow" />
        <title>Page Not Found | RwanMart</title>
      </Helmet>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--color-ink-900)' }}>404 - Page Not Found</h1>
      <p style={{ marginBottom: '2rem', color: 'var(--color-ink-500)' }}>The page you are looking for doesn't exist or has been removed.</p>
      <Link to="/" style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--color-brand-500)', color: 'white', borderRadius: '8px', textDecoration: 'none' }}>
        Return Home
      </Link>
    </div>
  );
}
