import { useState, useEffect } from 'react';
import { Search, MapPin, ChevronDown, ArrowRight, TrendingUp, Shield, Star, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ListingCard, { SponsoredCard, SkeletonCard } from '../../components/listings/ListingCard';
import { useUI } from '../../context/UIContext';
import { listingsApi } from '../../services/listingsApi';

const POPULAR_SEARCHES = ['iPhone', 'Toyota', 'Laptop', 'Sofa', 'Kigali apartment'];


export default function Home() {
  const navigate = useNavigate();
  const { isMobile } = useUI();
  const [searchQuery, setSearchQuery] = useState('');
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      try {
        const res = await listingsApi.getListings({ limit: 12 });
        // The API returns { status: 'success', data: { listings: [...] } }
        setListings(res.data.data.listings || []);
      } catch (err) {
        console.error('Failed to fetch listings', err);
        setError('Failed to load listings. Check backend connection.');
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) navigate(`/browse?search=${encodeURIComponent(searchQuery.trim())}`);
    else navigate('/browse');
  };

  const renderSkeletons = () => (
    <div className="listings-grid">
      {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );

  return (
    <div className="home-container">
      {/* Desktop Hero Search Section */}
      {!isMobile && (
        <div className="home-hero-section">
          <div className="home-hero-inner">
            <h1 className="home-hero-title">Find anything in Rwanda.</h1>
            <p className="home-hero-subtitle">Browse thousands of listings from verified sellers across the country.</p>
            
            <div className="hero-search-wrapper">
              <div className="hero-search-input-group">
                <Search size={16} color="var(--color-ink-400)" />
                <input
                  type="text"
                  placeholder="What are you looking for?"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  className="hero-search-input"
                />
              </div>
              <div className="hero-location-divider">
                <button className="hero-location-btn">
                  <MapPin size={16} color="var(--color-brand-500)" />
                  All of Rwanda
                  <ChevronDown size={14} />
                </button>
              </div>
              <button onClick={handleSearch} className="hero-search-btn">Search</button>
            </div>

            <div className="hero-popular">
              <span className="hero-popular-label"><TrendingUp size={12} /> Popular:</span>
              {POPULAR_SEARCHES.map(term => (
                <button key={term} onClick={() => navigate(`/browse?search=${term}`)} className="hero-popular-tag">
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="home-section">
        <div className="section-header">
          <h2 className="section-title">Recent Listings</h2>
          <button onClick={() => navigate('/browse')} className="section-link">
            See all <ArrowRight size={14} />
          </button>
        </div>

        {error ? (
          <div style={{ color: 'var(--color-danger)', padding: '2rem', textAlign: 'center', backgroundColor: 'var(--color-ink-50)', borderRadius: 'var(--radius-xl)' }}>
            {error}
          </div>
        ) : loading ? (
          renderSkeletons()
        ) : (
          <>
            <div className="listings-grid">
              {listings.map(l => <ListingCard key={l.id} listing={l} compact={isMobile} />)}
            </div>

            {listings.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-ink-500)' }}>
                No listings available right now.
              </div>
            )}
          </>
        )}

        <div className="sell-cta-banner">
          <div>
            <h3 className="sell-cta-title">Have something to sell?</h3>
            <p className="sell-cta-subtitle">Post your first 2 listings for free. No subscription needed.</p>
          </div>
          <button onClick={() => navigate('/create-listing')} className="sell-cta-btn">Start selling</button>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
          <button onClick={() => navigate('/browse')} className="btn btn-outline">
            Browse more listings
          </button>
        </div>
      </div>
    </div>
  );
}
