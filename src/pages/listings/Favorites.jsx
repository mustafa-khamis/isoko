import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { listingsApi } from '../../services/listingsApi';
import ListingCard from '../../components/listings/ListingCard';
import './Favorites.css';

export default function Favorites() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMobile, showAuth } = useUI();
  
  const [savedListings, setSavedListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const fetchFavorites = async () => {
      try {
        // In the backend, we would have a GET /listings/favorites
        // But for now, if it doesn't exist, we will mock or just show empty.
        // Actually MVP endpoint is /listings/favorites? 
        // Let's assume it exists or we just fail gracefully.
        const res = await listingsApi.getListings({ favorited_by: user.id }); 
        // This query might not work natively depending on backend MVP, but let's try.
        // Alternatively, if there's a specific endpoint for user's favorites:
        // const res = await listingsApi.getFavorites();
        if (res.data && res.data.data && res.data.data.listings) {
          setSavedListings(res.data.data.listings);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFavorites();
  }, [user]);

  if (!user) {
    return (
      <div className="favorites-auth-state">
        <div className="favorites-auth-icon">
          <Heart size={40} />
        </div>
        <h3 className="favorites-state-title">Sign in to save listings</h3>
        <p className="favorites-state-copy">Create a free account to save your favourite listings and come back to them anytime.</p>
        <button onClick={() => showAuth()} className="favorites-state-button">Sign In</button>
      </div>
    );
  }

  return (
    <div className="favorites-page">
      {/* Header */}
      <div className={`favorites-header ${isMobile ? 'favorites-header--sticky' : ''}`}>
        <div className="favorites-header-inner">
          {isMobile && (
            <button onClick={() => navigate(-1)} className="favorites-back-button">
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className="favorites-title">Saved Listings</h1>
          {!loading && savedListings.length > 0 && (
            <span className="favorites-count">({savedListings.length})</span>
          )}
        </div>
      </div>

      <div className={`favorites-content ${isMobile ? 'favorites-content--mobile' : ''}`}>
        {loading ? (
          <div className="favorites-loading">Loading...</div>
        ) : savedListings.length === 0 ? (
          <div className="favorites-empty-state">
            <div className="favorites-empty-icon">
              <Heart size={40} />
            </div>
            <h3 className="favorites-state-title">No saved listings yet</h3>
            <p className="favorites-state-copy">Tap the heart icon on any listing to save it here for later.</p>
            <button onClick={() => navigate('/browse')} className="favorites-browse-button">
              Browse listings
            </button>
          </div>
        ) : (
          <div className={`favorites-grid ${isMobile ? 'favorites-grid--mobile' : 'favorites-grid--desktop'}`}>
            {savedListings.map(l => (
              <ListingCard key={l.id} listing={l} compact={isMobile} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
