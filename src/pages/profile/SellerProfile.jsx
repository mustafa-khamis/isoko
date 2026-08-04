import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Calendar, MapPin } from 'lucide-react';
import { usersApi } from '../../services/usersApi';
import ListingCard from '../../components/listings/ListingCard';
import './SellerProfile.css';

export default function SellerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSeller = async () => {
      setLoading(true);
      setError('');
      try {
        const [profileRes, listingsRes] = await Promise.all([
          usersApi.getUserPublic(id),
          usersApi.getUserListings(id)
        ]);
        setProfile(profileRes.data.data);
        setListings(listingsRes.data.data);
      } catch (err) {
        console.error('Fetch seller error', err);
        setError('Failed to load seller profile.');
      } finally {
        setLoading(false);
      }
    };
    fetchSeller();
  }, [id]);

  if (loading) return <div className="seller-profile-state">Loading...</div>;
  if (error || !profile) return <div className="seller-profile-state seller-profile-state--error">{error || 'Seller not found'}</div>;

  return (
    <div className="seller-profile-container">
      <div className="seller-profile-header-actions">
        <button onClick={() => navigate(-1)} className="seller-profile-back">
          <ArrowLeft size={20} /> Back
        </button>
      </div>

      <div className="seller-profile-header">
        <div className="seller-profile-avatar-container">
          {profile.profile_image_path ? (
            <img src={profile.profile_image_path} alt={profile.full_name} className="seller-profile-avatar" />
          ) : (
            <div className="seller-profile-avatar-fallback"><User size={40} /></div>
          )}
        </div>
        <div className="seller-profile-info">
          <h1>{profile.full_name || 'Anonymous Seller'}</h1>
          <div className="seller-profile-meta">
            <span><Calendar size={14} /> Member since {new Date(profile.created_at).getFullYear()}</span>
            {profile.plan_code && profile.plan_code !== 'free' && (
              <span className="seller-profile-plan">★ {profile.plan_name || 'Trader'}</span>
            )}
          </div>
        </div>
      </div>

      <div className="seller-profile-listings-section">
        <h2>Listings by this seller ({listings.length})</h2>
        {listings.length > 0 ? (
          <div className="seller-profile-listings-grid">
            {listings.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="seller-profile-empty">
            <p>This seller has no active listings.</p>
          </div>
        )}
      </div>
    </div>
  );
}
