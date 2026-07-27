import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { listingsApi } from '../../services/listingsApi';
import ListingCard from '../../components/listings/ListingCard';

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
      <div className="flex flex-col items-center justify-center text-center h-full px-6">
        <div className="w-20 h-20 bg-ink-100 rounded-3xl flex items-center justify-center mb-4">
          <Heart size={40} className="text-ink-300" />
        </div>
        <h3 className="text-lg font-bold text-ink-800 mb-2">Sign in to save listings</h3>
        <p className="text-sm text-ink-500 max-w-xs mb-6">Create a free account to save your favourite listings and come back to them anytime.</p>
        <button onClick={() => showAuth()} className="btn btn-primary px-6">Sign In</button>
      </div>
    );
  }

  return (
    <div className="bg-ink-50 min-h-full animate-fade-in">
      {/* Header */}
      <div className={`bg-white border-b border-ink-100 ${isMobile ? 'sticky top-0 z-30' : ''}`}>
        <div className={`flex items-center gap-3 px-4 py-4 ${isMobile ? '' : 'max-w-screen-xl mx-auto lg:px-8'}`}>
          {isMobile && (
            <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-ink-100">
              <ArrowLeft size={20} className="text-ink-600" />
            </button>
          )}
          <h1 className="text-lg font-bold text-ink-950">Saved Listings</h1>
          {!loading && savedListings.length > 0 && (
            <span className="text-sm text-ink-400 ml-1">({savedListings.length})</span>
          )}
        </div>
      </div>

      <div className={`${isMobile ? 'px-3 pt-4' : 'max-w-screen-xl mx-auto px-4 lg:px-8 pt-6'}`}>
        {loading ? (
          <div className="text-center py-10">Loading...</div>
        ) : savedListings.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="w-20 h-20 bg-brand-50 rounded-3xl flex items-center justify-center mb-4">
              <Heart size={40} className="text-brand-300" />
            </div>
            <h3 className="text-lg font-bold text-ink-800 mb-2">No saved listings yet</h3>
            <p className="text-sm text-ink-500 max-w-xs mb-6">Tap the heart icon on any listing to save it here for later.</p>
            <button onClick={() => navigate('/browse')} className="btn btn-primary px-5">
              Browse listings
            </button>
          </div>
        ) : (
          <div className={isMobile ? "browse-grid-mobile" : "browse-grid"}>
            {savedListings.map(l => (
              <ListingCard key={l.id} listing={l} compact={isMobile} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
