import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { listingsApi } from '../../services/listingsApi';
import { usersApi } from '../../services/usersApi';
import { formatRWF, timeAgo } from '../../utils/formatters';
import './MyListings.css';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'pending', label: 'Pending' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'sold', label: 'Sold' },
  { key: 'hidden', label: 'Hidden' },
  { key: 'expired', label: 'Expired' },
];

export default function MyListings() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const { isMobile, showAuth } = useUI();

  const [activeTab, setActiveTab] = useState('all');
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null); // for hide/mark-sold

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      showAuth('Sign in to view your listings.');
      return;
    }

    const fetchMyListings = async () => {
      try {
        const response = await usersApi.getMyListings();
        if (response.data?.data) {
          setListings(response.data.data || []);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyListings();
  }, [user, isLoading, showAuth]);

  if (!user) return null;

  const filtered = listings.filter((listing) => activeTab === 'all' || listing.status === activeTab);

  const handleDelete = async () => {
    try {
      await listingsApi.deleteListing(deletingId);
      setListings((current) => current.filter((listing) => listing.id !== deletingId));
    } catch (error) {
      console.error(error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusUpdate = async (listingId, newStatus) => {
    if (updatingId) return;
    setUpdatingId(listingId);
    try {
      await listingsApi.updateStatus(listingId, newStatus);
      setListings((current) =>
        current.map((l) => (l.id === listingId ? { ...l, status: newStatus } : l))
      );
    } catch (error) {
      console.error('Status update failed', error);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="my-listings-page">
      <header className={`my-listings-header ${isMobile ? 'my-listings-header--sticky' : ''}`}>
        <div className={`my-listings-header__inner ${isMobile ? '' : 'my-listings-header__inner--desktop'}`}>
          <div className="my-listings-heading-row">
            {isMobile && (
              <button onClick={() => navigate(-1)} className="my-listings-back-button" aria-label="Go back">
                <ArrowLeft size={20} />
              </button>
            )}
            <h1 className="my-listings-title">My Listings</h1>
            <button onClick={() => navigate('/create-listing')} className="my-listings-create-button">
              <Plus size={14} />
              New listing
            </button>
          </div>

          <div className="my-listings-quota">
            <div className="my-listings-quota__summary">
              <span className="my-listings-quota__label">Free plan &middot; {listings.length} listings</span>
              <button onClick={() => navigate('/trader-plans')} className="my-listings-quota__upgrade">Upgrade &rarr;</button>
            </div>
            <div className="my-listings-quota__track">
              <div className="my-listings-quota__fill" />
            </div>
          </div>

          <div className="my-listings-tabs" role="tablist" aria-label="Listing status">
            {TABS.map((tab) => {
              const count = tab.key === 'all'
                ? listings.length
                : listings.filter((listing) => listing.status === tab.key).length;
              const selected = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveTab(tab.key)}
                  className={`my-listings-tab ${selected ? 'my-listings-tab--active' : ''}`}
                >
                  {tab.label}
                  {count > 0 && <span className="my-listings-tab__count">({count})</span>}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className={`my-listings-content ${isMobile ? 'my-listings-content--mobile' : 'my-listings-content--desktop'}`}>
        {loading ? (
          <div className="my-listings-loading">Loading...</div>
        ) : filtered.length === 0 ? (
          <EmptyListings navigate={navigate} tab={activeTab} />
        ) : (
          <div className="my-listings-list">
            {filtered.map((listing) => (
              <ListingRow
                key={listing.id}
                listing={listing}
                updating={updatingId === listing.id}
                onEdit={() => navigate(`/edit-listing/${listing.id}`)}
                onHide={() => handleStatusUpdate(listing.id, 'hidden')}
                onMarkSold={() => handleStatusUpdate(listing.id, 'sold')}
                onDelete={() => setDeletingId(listing.id)}
              />
            ))}
          </div>
        )}
      </main>

      {deletingId && (
        <div className="my-listings-delete-overlay" role="presentation" onMouseDown={() => setDeletingId(null)}>
          <div
            className="my-listings-delete-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-listing-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h3 id="delete-listing-title" className="my-listings-delete-dialog__title">Delete listing?</h3>
            <p className="my-listings-delete-dialog__copy">
              This will permanently remove the listing. This action cannot be undone.
            </p>
            <div className="my-listings-delete-dialog__actions">
              <button onClick={() => setDeletingId(null)} className="my-listings-delete-dialog__cancel">Cancel</button>
              <button onClick={handleDelete} className="my-listings-delete-dialog__confirm">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const normalizedStatus = status || 'active';
  const config = {
    active: { label: 'Active', modifier: 'my-listing-status--active', icon: <CheckCircle size={12} /> },
    pending: { label: 'Pending', modifier: 'my-listing-status--pending', icon: <Clock size={12} /> },
    rejected: { label: 'Rejected', modifier: 'my-listing-status--rejected', icon: <AlertCircle size={12} /> },
    sold: { label: 'Sold', modifier: 'my-listing-status--sold', icon: <CheckCircle size={12} /> },
    hidden: { label: 'Hidden', modifier: 'my-listing-status--hidden', icon: <EyeOff size={12} /> },
    expired: { label: 'Expired', modifier: 'my-listing-status--expired', icon: <RefreshCw size={12} /> },
    draft: { label: 'Draft', modifier: 'my-listing-status--hidden', icon: <Clock size={12} /> },
  };
  const badge = config[normalizedStatus] || config.active;

  return (
    <span className={`my-listing-status ${badge.modifier}`}>
      {badge.icon}{badge.label}
    </span>
  );
}

function ListingRow({ listing, updating, onEdit, onHide, onMarkSold, onDelete }) {
  const status = listing.status;
  // Only show Hide if listing is not already hidden/sold/expired
  const canHide    = !['hidden', 'sold', 'expired'].includes(status);
  // Only show Mark sold if listing is not already sold
  const canMarkSold = status !== 'sold';

  return (
    <article className="my-listing-card">
      <div className="my-listing-card__main">
        <div className="my-listing-card__image-frame">
          <img
            src={listing.cover_image_url || listing.images?.[0] || '/images/default-listing.svg'}
            alt={listing.title}
            className="my-listing-card__image"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = '/images/default-listing.svg';
            }}
          />
        </div>
        <div className="my-listing-card__content">
          <div className="my-listing-card__title-row">
            <p className="my-listing-card__title">{listing.title}</p>
            <StatusBadge status={listing.status} />
          </div>
          <div className="my-listing-card__price">
            {listing.price
              ? <span className="my-listing-card__price-value">{formatRWF(listing.price)}</span>
              : <span className="my-listing-card__price-contact">Contact for price</span>}
          </div>
          <div className="my-listing-card__metadata">
            <span className="my-listing-card__views"><Eye size={12} />{listing.views || 0}</span>
            <span aria-hidden="true">&middot;</span>
            <span>{timeAgo(listing.created_at)}</span>
          </div>
        </div>
      </div>

      <div className="my-listing-card__actions">
        <ActionButton icon={<Pencil size={14} />} label="Edit" onClick={onEdit} disabled={updating} />
        {canHide && (
          <ActionButton icon={<EyeOff size={14} />} label="Hide" onClick={onHide} loading={updating} disabled={updating} />
        )}
        {canMarkSold && (
          <ActionButton icon={<CheckCircle size={14} />} label="Mark sold" onClick={onMarkSold} loading={updating} disabled={updating} />
        )}
        <ActionButton icon={<Trash2 size={14} />} label="Delete" onClick={onDelete} danger disabled={updating} />
      </div>
    </article>
  );
}


function ActionButton({ icon, label, onClick, danger = false, disabled = false, loading = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`my-listing-action ${danger ? 'my-listing-action--danger' : ''} ${disabled ? 'my-listing-action--disabled' : ''}`}
    >
      {loading ? <RefreshCw size={13} className="my-listing-action__spinner" /> : icon}{label}
    </button>
  );
}

function EmptyListings({ navigate, tab }) {
  return (
    <div className="my-listings-empty">
      <div className="my-listings-empty__icon">
        <Package size={40} />
      </div>
      <h3 className="my-listings-empty__title">
        {tab === 'all' ? 'No listings yet' : `No ${tab} listings`}
      </h3>
      <p className="my-listings-empty__copy">
        {tab === 'all'
          ? 'Start selling by creating your first listing. It only takes a few minutes.'
          : `You don't have any ${tab} listings at the moment.`}
      </p>
      {tab === 'all' && (
        <button onClick={() => navigate('/create-listing')} className="my-listings-empty__button">
          <Plus size={16} /> Create a listing
        </button>
      )}
    </div>
  );
}
