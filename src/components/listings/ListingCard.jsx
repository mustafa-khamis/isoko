import { Heart, MapPin, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { formatRWF, timeAgo } from '../../utils/formatters';

export function PriceBadge({ price, priceType }) {
  if (priceType === 'contact') {
    return <span className="listing-price-contact">Contact for price</span>;
  }
  return (
    <div className="listing-price-container">
      <span className="listing-price">
        {price ? formatRWF(price) : '—'}
      </span>
      {priceType === 'negotiable' && (
        <span className="listing-price-negotiable">Negotiable</span>
      )}
    </div>
  );
}

export default function ListingCard({ listing, compact = false, variant = 'grid' }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toggleFavorite, isFavorite, showAuth } = useUI();
  const saved = isFavorite(listing.id);

  const handleFavorite = (e) => {
    e.stopPropagation();
    if (!user) { showAuth('Sign in to save listings to your favourites.'); return; }
    toggleFavorite(listing.id);
  };

  const handleClick = () => navigate(`/listings/${listing.id}`);

  // Need a fallback image if listing.images is missing or empty
  const imageUrl = listing.images && listing.images.length > 0 
    ? listing.images[0].url || listing.images[0] 
    : '/images/default-listing.svg';

  if (variant === 'list') {
    return (
      <button onClick={handleClick} className="listing-card-list">
        <div className="listing-card-list-img-wrapper">
          <img 
            src={imageUrl} 
            alt={listing.title} 
            className="listing-img" 
            loading="lazy"
            onError={(e) => { e.target.onerror = null; e.target.src = '/images/default-listing.svg'; }}
          />
        </div>
        <div className="listing-card-list-content">
          <p className="listing-title line-clamp-2">{listing.title}</p>
          <div className="listing-price-wrapper">
            <PriceBadge price={listing.price} priceType={listing.priceType} />
          </div>
          <div className="listing-meta">
            {listing.location && (
              <span className="listing-meta-item">
                <MapPin size={12} />{typeof listing.location === 'object' ? listing.location.city : listing.location}
              </span>
            )}
            <span className="listing-meta-dot">·</span>
            <span>{timeAgo(listing.created_at || listing.postedAt || new Date())}</span>
          </div>
        </div>
        <button
          onClick={handleFavorite}
          className={`listing-fav-btn-list ${saved ? 'saved' : ''}`}
        >
          <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </button>
    );
  }

  return (
    <button onClick={handleClick} className={`listing-card-grid ${compact ? 'compact' : ''}`}>
      <div className="listing-card-img-container">
        <img
          src={imageUrl}
          alt={listing.title}
          className="listing-img-grid"
          loading="lazy"
          onError={(e) => { e.target.onerror = null; e.target.src = '/images/default-listing.svg'; }}
        />

        <div className="listing-badges">
          {listing.isPromoted && (
            <span className="listing-badge-promoted">
              <Zap size={10} />Promoted
            </span>
          )}
          {listing.isNew && (
            <span className="listing-badge-new">New</span>
          )}
        </div>

        <button
          onClick={handleFavorite}
          className={`listing-fav-btn-grid ${saved ? 'saved' : ''}`}
        >
          <Heart size={14} fill={saved ? 'currentColor' : 'none'} />
        </button>

        {listing.seller?.plan && listing.seller.plan !== 'free' && (
          <div className="listing-badge-seller">
            <span>
              {listing.seller.plan === 'trader-premium' ? '★ Premium' : '★ Trader'}
            </span>
          </div>
        )}
      </div>

      <div className="listing-card-info">
        <p className="listing-title line-clamp-2">
          {listing.title}
        </p>
        <PriceBadge price={listing.price} priceType={listing.priceType} />
        <div className="listing-meta mt-auto">
          {listing.location && (
            <>
              <MapPin size={12} className="shrink-0" />
              <span className="truncate">{typeof listing.location === 'object' ? listing.location.city : listing.location}</span>
              <span className="listing-meta-dot">·</span>
            </>
          )}
          <span className="shrink-0">{timeAgo(listing.created_at || listing.postedAt || new Date())}</span>
        </div>
      </div>
    </button>
  );
}

export function SponsoredCard({ story }) {
  return (
    <div className="sponsored-card">
      <img src={story.image} alt="" className="sponsored-img" />
      <div className="sponsored-content">
        <span className="sponsored-badge">Sponsored</span>
        <p className="sponsored-title">{story.name}</p>
        <p className="sponsored-link">View latest listings →</p>
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-img skeleton" />
      <div className="skeleton-info">
        <div className="skeleton-line-1 skeleton" />
        <div className="skeleton-line-2 skeleton" />
        <div className="skeleton-line-3 skeleton" />
      </div>
    </div>
  );
}
