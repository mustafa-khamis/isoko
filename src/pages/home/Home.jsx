import { useState, useEffect } from 'react';
import { Search, MapPin, ChevronDown, ArrowRight, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ListingCard, { SkeletonCard } from '../../components/listings/ListingCard';
import { useUI } from '../../context/UIContext';
import { listingsApi } from '../../services/listingsApi';
import SEO from '../../components/seo/SEO';
import './Home.css';

const POPULAR_SEARCHES = ['iPhone', 'Toyota', 'Laptop', 'Sofa', 'Kigali apartment'];


export default function Home() {
  const navigate = useNavigate();
  const { isMobile } = useUI();
  const [searchQuery, setSearchQuery] = useState('');
  const [listings, setListings] = useState([]);
  const [sponsoredAds, setSponsoredAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      try {
        const [listingsRes, adsRes] = await Promise.all([
          listingsApi.getListings({ limit: 12 }),
          import('../../services/adsApi').then(m => m.adsApi.getSponsoredAds().catch(() => null))
        ]);
        
        setListings(listingsRes.data.data || []);
        if (adsRes && adsRes.data && adsRes.data.data) {
          setSponsoredAds(adsRes.data.data);
        }
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
      <SEO 
        title="RwanMart | Buy & Sell Online in Rwanda"
        description="RwanMart is an online marketplace in Rwanda where people can buy and sell products and discover local sellers."
        canonicalUrl="/"
        schemaList={[
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "@id": "https://rwanmart.com/#website",
            "name": "RwanMart",
            "url": "https://rwanmart.com/",
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://rwanmart.com/browse?search={search_term_string}",
              "query-input": "required name=search_term_string"
            }
          },
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            "@id": "https://rwanmart.com/#organization",
            "name": "RwanMart",
            "url": "https://rwanmart.com/",
            "logo": "https://rwanmart.com/favicon.png"
          }
        ]}
      />
      {/* Desktop Hero Search Section */}
      {!isMobile && (
        <div className="home-hero-section">
          <div className="home-hero-inner">
            <h1 className="home-hero-title">RwanMart: Buy and Sell in Rwanda.</h1>
            <p className="home-hero-subtitle">Rwanda's trusted online marketplace. Browse thousands of products from local sellers, or list your own items for sale today.</p>
            
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
          <div className="home-listings-state home-listings-state--error">
            {error}
          </div>
        ) : loading ? (
          renderSkeletons()
        ) : (
          <>
            {sponsoredAds.length > 0 && (
              <div className="sponsored-ads-section" style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-ink-900)' }}>
                  <TrendingUp size={18} color="var(--color-brand-500)" /> Sponsored
                </h3>
                <div className="listings-grid">
                  {sponsoredAds.map(ad => (
                    <div key={ad.id} className="sponsored-ad-card" style={{ cursor: 'pointer', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-ink-200)' }} onClick={() => ad.listing_id && navigate(`/listing/${ad.listing_id}`)}>
                      <div style={{ aspectRatio: '1/1', background: 'var(--color-ink-100)' }}>
                        <img src={ad.image_url} alt={ad.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ padding: '0.75rem' }}>
                        <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', color: 'var(--color-ink-900)' }}>{ad.title}</h4>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-ink-500)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{ad.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="listings-grid">
              {listings.map(l => <ListingCard key={l.id} listing={l} compact={isMobile} />)}
            </div>

            {listings.length === 0 && (
              <div className="home-listings-state home-listings-state--empty">
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
        
        <div className="home-browse-more">
          <button onClick={() => navigate('/browse')} className="home-browse-more__button">
            Browse more listings
          </button>
        </div>

        <div className="home-seo-entity-block" style={{ padding: '2rem 1rem', background: 'var(--color-ink-50)', borderRadius: '12px', marginTop: '2rem', textAlign: 'left' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: 'var(--color-ink-900)' }}>About RwanMart</h2>
          <p style={{ color: 'var(--color-ink-600)', lineHeight: '1.6', fontSize: '0.9rem', margin: 0 }}>
            <strong>RwanMart</strong> is a Rwanda-based online marketplace dedicated to connecting local buyers and sellers. 
            Whether you are looking to buy mobile phones, laptops, electronics, cars, property, or home items, our platform makes it easy to find great deals from sellers across Rwanda. 
            Anyone can create an account to list their products, reach buyers directly, and grow their local business. Experience safe, reliable, and fast online shopping in Rwanda with RwanMart.
          </p>
        </div>
      </div>
    </div>
  );
}
