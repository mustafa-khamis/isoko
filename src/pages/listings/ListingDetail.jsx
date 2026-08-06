import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Share2, MapPin, Clock, ChevronLeft, ChevronRight, X, Eye, MessageCircle, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { listingsApi } from '../../services/listingsApi';
import { messagesApi } from '../../services/messagesApi';
import ListingCard, { PriceBadge } from '../../components/listings/ListingCard';
import { timeAgo } from '../../utils/formatters';
import './ListingDetail.css';

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
  );
}

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showAuth, isMobile } = useUI();
  
  const [listing, setListing] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [currentImg, setCurrentImg] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const [showDesc, setShowDesc] = useState(false);
  const [startingConversation, setStartingConversation] = useState(false);
  const [messageError, setMessageError] = useState('');
  
  const { toggleFavorite, isFavorite } = useUI();
  
  const saved = listing ? isFavorite(listing.id) : false;

  useEffect(() => {
    let isMounted = true;
    const fetchListing = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await listingsApi.getListing(id);
        if (!isMounted) return;

        const fetchedListing = res.data.data;
        setListing(fetchedListing);
        
        // Fetch related listings based on category
        if (fetchedListing.category) {
          const relatedRes = await listingsApi.getListings({ category: fetchedListing.category, limit: 4 });
          if (!isMounted) return;
          // exclude current
          const filtered = (relatedRes.data.data.listings || []).filter(l => l.id !== fetchedListing.id);
          setRelated(filtered);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Fetch listing error', err);
        setError('Failed to load listing details.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchListing();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const isOwner = String(user?.id) === String(listing?.user_id);

  const handleMessage = async () => {
    if (!user) {
      showAuth('Sign in to message the seller.');
      return;
    }

    if (isOwner) {
      return;
    }

    if (startingConversation) {
      return;
    }

    setStartingConversation(true);
    setMessageError('');

    try {
      const response = await messagesApi.createConversation(listing.id, { message: `Hi, I'm interested in your listing: "${listing.title}"` });
      
      const conversation = response.data?.data?.conversation ?? response.data?.data;
      const conversationId = conversation?.conversation_id ?? conversation?.id;

      if (!conversationId) {
        throw new Error('Conversation API did not return a conversation ID');
      }

      navigate(`/messages/${conversationId}`);
    } catch (error) {
      const message =
        error.response?.data?.error?.message ??
        error.response?.data?.message ??
        'Unable to start this conversation. Please try again.';

      setMessageError(message);

      console.error('Failed to start conversation', {
        status: error.response?.status,
        code: error.response?.data?.error?.code,
        message,
      });
    } finally {
      setStartingConversation(false);
    }
  };

  const handleWhatsApp = () => {
    if (!listing.whatsapp_enabled) {
      alert("This seller has not enabled WhatsApp contact.");
      return;
    }
    if (!listing.seller_phone) {
      alert("Seller hasn't provided a phone number.");
      return;
    }
    const url = `https://wa.me/${listing.seller_phone.replace(/\D/g, '')}?text=Hi, I'm interested in your listing on Isoko: ${listing.title}`;
    window.open(url, '_blank');
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: listing.title,
          text: `Check out ${listing.title} on Isoko!`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  if (loading) return <div className="listing-detail-state">Loading...</div>;
  if (error || !listing) return <div className="listing-detail-state listing-detail-state--error">{error || 'Listing not found'}</div>;

  const images = listing.images || [];
  const displayImage = images.length > 0 ? images[currentImg] : '/images/default-listing.svg';

  const ContactActions = () => {
    if (isOwner) {
      return (
        <div className="listing-contact-actions">
          <button onClick={() => navigate('/admin')} className="listing-contact-button">
            Manage your listing
          </button>
        </div>
      );
    }

    return (
      <div className="listing-contact-actions">
        {messageError && <div className="listing-detail-error" style={{ color: 'red', fontSize: '0.875rem', marginBottom: '8px' }}>{messageError}</div>}
        <button onClick={handleMessage} disabled={startingConversation} className="listing-contact-button listing-contact-button--message">
          <MessageCircle size={16} />
          {startingConversation ? 'Starting chat...' : 'Message seller'}
        </button>
        {listing.whatsapp_enabled && (
          <button onClick={handleWhatsApp} className="listing-contact-button listing-contact-button--whatsapp">
            <WhatsAppIcon />
            WhatsApp seller
          </button>
        )}
      </div>
    );
  };

  if (isMobile) {
    return (
      <div className="listing-detail-mobile">
        <div className="listing-detail-header-mobile">
          <button onClick={() => navigate(-1)} className="ld-header-btn">
            <ArrowLeft size={20} />
          </button>
          <div className="listing-detail-mobile__header-actions">
            <button onClick={() => toggleFavorite(listing.id)} className={`ld-header-btn ${saved ? 'ld-header-btn--saved' : ''}`} aria-label="Save listing">
              <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
            </button>
            <button onClick={handleShare} className="ld-header-btn" aria-label="Share listing"><Share2 size={16} /></button>
          </div>
        </div>

        <div className="ld-gallery-preview" onClick={() => setShowGallery(true)}>
          <img src={displayImage} alt={listing.title} />
          {images.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); setCurrentImg(i => Math.max(0, i - 1)); }} className="ld-gallery-nav ld-gallery-nav--previous" aria-label="Previous image">
                <ChevronLeft size={20} />
              </button>
              <button onClick={e => { e.stopPropagation(); setCurrentImg(i => Math.min(images.length - 1, i + 1)); }} className="ld-gallery-nav ld-gallery-nav--next" aria-label="Next image">
                <ChevronRight size={20} />
              </button>
              <div className="ld-gallery-indicator">{currentImg + 1}/{images.length}</div>
            </>
          )}
          {listing.is_promoted && (
            <span className="ld-promoted-badge"><Zap size={12} /> Promoted</span>
          )}
        </div>

        <div className="ld-info-section">
          <h1>{listing.title}</h1>
          <div className="listing-detail-price"><PriceBadge price={listing.price} priceType={listing.price_type} /></div>
          
          <div className="ld-meta">
            {listing.location && <span><MapPin size={12} />{listing.location}</span>}
            <span><Clock size={12} />{timeAgo(listing.created_at)}</span>
            {(user?.id === listing.user_id || user?.roles?.some(r => ['admin', 'super_admin'].includes(r))) && (
              <span><Eye size={12} />{listing.views || 0} views</span>
            )}
          </div>

          <div className="ld-tags">
            <span>{listing.category}</span>
            {listing.subcategory && <span>{listing.subcategory}</span>}
          </div>
        </div>

        <div className="ld-desc-section">
          <h2>Description</h2>
          <p className={!showDesc ? 'listing-description--collapsed' : ''}>{listing.description}</p>
          <button onClick={() => setShowDesc(!showDesc)}>{showDesc ? 'Show less' : 'Show more'}</button>
        </div>

        {/* Seller Info */}
        <div className="ld-seller-section">
          <h2>Seller</h2>
          <div className="ld-seller-card" onClick={() => navigate(`/seller/${listing.user_id}`)} style={{cursor: 'pointer'}}>
            <div className="ld-seller-avatar">
              {listing.seller_profile_image_path ? <img src={listing.seller_profile_image_path} alt="" /> : null}
            </div>
            <div className="ld-seller-info">
              <div><span className="name">{listing.seller_name || 'Anonymous Seller'}</span></div>
              <span className="ld-seller-since">Member since {new Date(listing.created_at).getFullYear()}</span>
            </div>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="ld-related-section">
            <h2>More in {listing.category}</h2>
            <div className="ld-related-grid ld-related-grid--mobile">
              {related.map(l => <ListingCard key={l.id} listing={l} compact />)}
            </div>
          </div>
        )}

        {/* Sticky Actions */}
        <div className="ld-sticky-actions">
          <div className="ld-sticky-price">
            <PriceBadge price={listing.price} priceType={listing.price_type} />
          </div>
          <div className="ld-sticky-btns">
            {!isOwner ? (
              <>
                <button onClick={handleMessage} disabled={startingConversation} className="btn-message">
                  <MessageCircle size={16} /> {startingConversation ? '...' : 'Message'}
                </button>
                {listing.whatsapp_enabled && (
                  <button onClick={handleWhatsApp} className="btn-wa" aria-label="Contact seller on WhatsApp"><WhatsAppIcon /></button>
                )}
              </>
            ) : (
              <button onClick={() => navigate('/admin')} className="btn-message">Manage</button>
            )}
          </div>
        </div>

        {showGallery && (
          <div className="ld-fullscreen-gallery">
            <div className="ld-fullscreen-header">
              <button onClick={() => setShowGallery(false)} aria-label="Close gallery"><X size={24} /></button>
              <span>{currentImg + 1} / {images.length}</span>
              <div className="listing-gallery-header__spacer" aria-hidden="true" />
            </div>
            <img src={images[currentImg]} alt="" />
          </div>
        )}
      </div>
    );
  }

  // Desktop
  return (
    <div className="ld-desktop-container">
      <div className="ld-desktop-inner">
        <button onClick={() => navigate(-1)} className="ld-back-link">
          <ArrowLeft size={16} /> Back to listings
        </button>

        <div className="ld-desktop-layout">
          {/* Left Column */}
          <div className="ld-main-col">
            <div className="ld-desktop-gallery" onClick={() => setShowGallery(true)}>
              <img src={displayImage} alt={listing.title} />
              {images.length > 1 && (
                <>
                  <button onClick={e => { e.stopPropagation(); setCurrentImg(i => Math.max(0, i - 1)); }} className="ld-gallery-nav ld-gallery-nav--previous" aria-label="Previous image">
                    <ChevronLeft size={24} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); setCurrentImg(i => Math.min(images.length - 1, i + 1)); }} className="ld-gallery-nav ld-gallery-nav--next" aria-label="Next image">
                    <ChevronRight size={24} />
                  </button>
                  <div className="ld-gallery-indicator">{currentImg + 1} / {images.length}</div>
                </>
              )}
            </div>
            
            {images.length > 1 && (
              <div className="ld-thumbnails">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setCurrentImg(i)} className={i === currentImg ? 'ld-thumbnail--active' : ''}>
                    <img src={img} alt="" />
                  </button>
                ))}
              </div>
            )}

            <div className="ld-details-content">
              <h1>{listing.title}</h1>
              <div className="ld-meta">
                {listing.location && <span><MapPin size={14} />{listing.location}</span>}
                <span><Clock size={14} />{timeAgo(listing.created_at)}</span>
                {(user?.id === listing.user_id || user?.roles?.some(r => ['admin', 'super_admin'].includes(r))) && (
                  <span><Eye size={14} />{listing.views || 0} views</span>
                )}
              </div>
              <div className="ld-tags">
                <span>{listing.category}</span>
                {listing.subcategory && <span>{listing.subcategory}</span>}
              </div>
            </div>

            <div className="ld-desc-section ld-desc-section--desktop">
              <h2>Description</h2>
              <p className={!showDesc ? 'listing-description--collapsed' : ''}>{listing.description}</p>
              {listing.description?.length > 200 && (
                <button onClick={() => setShowDesc(!showDesc)}>{showDesc ? 'Show less' : 'Read more'}</button>
              )}
            </div>

            {related.length > 0 && (
              <div className="ld-related-desktop">
                <h2>More in {listing.category}</h2>
                <div className="ld-related-grid ld-related-grid--desktop">
                  {related.map(l => <ListingCard key={l.id} listing={l} />)}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Sticky Sidebar */}
          <div className="ld-sidebar">
            <div className="ld-sidebar-inner">
              <PriceBadge price={listing.price} priceType={listing.price_type} />
              
              <div className="ld-sidebar-actions">
                <ContactActions />
                <div className="listing-secondary-actions">
                  <button onClick={() => toggleFavorite(listing.id)} className={`listing-secondary-button ${saved ? 'listing-secondary-button--saved' : ''}`}>
                    <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
                    {saved ? 'Saved' : 'Save'}
                  </button>
                  <button onClick={handleShare} className="listing-secondary-button">
                    <Share2 size={16} /> Share
                  </button>
                </div>
              </div>

              <div className="ld-seller-card ld-seller-card--desktop" onClick={() => navigate(`/seller/${listing.user_id}`)} style={{cursor: 'pointer'}}>
                <h3>Seller</h3>
                <div className="ld-seller-info-row">
                  <div className="ld-seller-avatar">
                    {listing.seller_profile_image_path ? <img src={listing.seller_profile_image_path} alt="" /> : null}
                  </div>
                  <div>
                    <span className="name">{listing.seller_name || 'Anonymous Seller'}</span>
                    <span className="since">Since {new Date(listing.created_at).getFullYear()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showGallery && (
        <div className="ld-fullscreen-gallery">
          <div className="ld-fullscreen-header">
            <button onClick={() => setShowGallery(false)}><X size={20} /> Close</button>
            <span>{currentImg + 1} / {images.length}</span>
          </div>
          <div className="ld-fullscreen-content">
            <img src={images[currentImg]} alt="" />
          </div>
        </div>
      )}
    </div>
  );
}
