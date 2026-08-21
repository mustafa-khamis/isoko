import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Calendar, MapPin, Heart, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { usersApi } from '../../services/usersApi';
import ListingCard from '../../components/listings/ListingCard';
import { resolveImageUrl } from '../../utils/formatters';
import './SellerProfile.css';

export default function SellerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const { showAuth } = useUI();

  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    const fetchSeller = async () => {
      setLoading(true);
      setError('');
      try {
        // Fetch profile and listings together; follower count is independent
        const [profileRes, listingsRes] = await Promise.all([
          usersApi.getUserPublic(id),
          usersApi.getUserListings(id),
        ]);
        if (!profileRes.data.data) {
          setError('Seller not found.');
          return;
        }
        setProfile(profileRes.data.data);
        setListings(listingsRes.data.data || []);
      } catch (err) {
        console.error('Fetch seller error', err);
        setError('Failed to load seller profile.');
      } finally {
        setLoading(false);
      }
    };
    fetchSeller();
  }, [id]);

  // Fetch follower count separately so a failure doesn't block the profile
  useEffect(() => {
    const fetchFollowerCount = async () => {
      try {
        const countRes = await usersApi.getFollowerCount(id);
        setFollowerCount(countRes.data.data.follower_count ?? 0);
      } catch (err) {
        console.error('Fetch follower count error', err);
        // Keep follower count at 0 on error — don't block profile rendering
      }
    };
    fetchFollowerCount();
  }, [id]);

  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!currentUser || currentUser.id === id) {
        setIsFollowing(false);
        return;
      }
      try {
        const res = await usersApi.isFollowing(id);
        setIsFollowing(res.data.data.is_following);
      } catch (err) {
        console.error('Check follow status error', err);
        // On error keep isFollowing as false — user can still click Follow
      }
    };

    if (!authLoading) {
      checkFollowStatus();
    }
  }, [id, currentUser, authLoading]);

  const handleFollow = async () => {
    if (!currentUser) {
      showAuth();
      return;
    }

    if (currentUser.id === id) {
      return; // Should not reach here due to button not showing
    }

    setFollowLoading(true);
    try {
      await usersApi.followUser(id);
      setIsFollowing(true);
      setFollowerCount(prev => prev + 1);
    } catch (err) {
      console.error('Follow error', err);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleUnfollow = async () => {
    setFollowLoading(true);
    try {
      await usersApi.unfollowUser(id);
      setIsFollowing(false);
      setFollowerCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Unfollow error', err);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) return <div className="seller-profile-state">Loading...</div>;
  if (error || !profile) return <div className="seller-profile-state seller-profile-state--error">{error || 'Seller not found'}</div>;

  // Ensure isSelf is a strict boolean.
  // URL param is string, currentUser.id might be a number from the API in some setups.
  const isSelf = Boolean(!authLoading && currentUser && String(currentUser.id) === String(id));



  return (
    <div className="seller-profile-container">
      <div className="seller-profile-header-actions">
        <button onClick={() => navigate(-1)} className="seller-profile-back">
          <ArrowLeft size={20} /> Back
        </button>
      </div>

      <div className="seller-profile-header">
        <div className="seller-profile-avatar-container">
          {resolveImageUrl(profile.profile_image_path || profile.avatar_url) && !avatarError ? (
            <img
              src={resolveImageUrl(profile.profile_image_path || profile.avatar_url)}
              alt={profile.full_name}
              className="seller-profile-avatar"
              onError={() => setAvatarError(true)}
            />
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
            <span><Heart size={14} /> {followerCount} {followerCount === 1 ? 'Follower' : 'Followers'}</span>
            {/* Follow button — visible to all visitors except the seller themselves */}
            {!isSelf && (
              <div className="seller-profile-actions">
                {isFollowing ? (
                  <button
                    onClick={handleUnfollow}
                    disabled={followLoading}
                    className="seller-profile-action-button seller-profile-action-button--unfollow"
                  >
                    {followLoading ? 'Loading...' : 'Following'}
                  </button>
                ) : (
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className="seller-profile-action-button seller-profile-action-button--follow"
                  >
                    <UserPlus size={16} /> {followLoading ? 'Loading...' : 'Follow'}
                  </button>
                )}
              </div>
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
