import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, Pencil, Trash2, EyeOff, CheckCircle, RefreshCw, AlertCircle, Clock, Plus, Package } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { listingsApi } from '../../services/listingsApi';
import { formatRWF, timeAgo } from '../../utils/formatters';

const TABS = [
  { key: 'all',      label: 'All' },
  { key: 'active',   label: 'Active' },
  { key: 'pending',  label: 'Pending' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'sold',     label: 'Sold' },
  { key: 'hidden',   label: 'Hidden' },
  { key: 'expired',  label: 'Expired' },
];

export default function MyListings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMobile, showAuth } = useUI();
  
  const [activeTab, setActiveTab] = useState('all');
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!user) {
      showAuth('Sign in to view your listings.');
      return;
    }
    
    const fetchMyListings = async () => {
      try {
        const { usersApi } = await import('../../services/usersApi');
        const res = await usersApi.getMyListings();
        if (res.data && res.data.data) {
          setListings(res.data.data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMyListings();
  }, [user, showAuth]);

  if (!user) return null;

  const filtered = listings.filter(l => activeTab === 'all' || l.status === activeTab);

  const container = 'bg-ink-50 min-h-full';

  return (
    <div className={`${container} animate-fade-in`}>
      {/* Header */}
      <div className={`bg-white border-b border-ink-100 ${isMobile ? 'sticky top-0 z-30' : ''}`}>
        <div className={`${isMobile ? 'px-4' : 'max-w-screen-xl mx-auto px-4 lg:px-8'}`}>
          <div className="flex items-center gap-3 py-4">
            {isMobile && (
              <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-ink-100">
                <ArrowLeft size={20} className="text-ink-600" />
              </button>
            )}
            <h1 className="text-lg font-bold text-ink-950">My Listings</h1>
            <button
              onClick={() => navigate('/create-listing')}
              className="ml-auto flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs px-3 py-2 rounded-xl transition-colors"
            >
              <Plus size={14} />
              New listing
            </button>
          </div>

          {/* Quota bar mock */}
          <div className="bg-ink-50 rounded-xl p-3 mb-3 border border-ink-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-ink-600">Free plan · {listings.length} listings</span>
              <button className="text-xs text-brand-600 font-semibold">Upgrade &rarr;</button>
            </div>
            <div className="h-1.5 bg-ink-200 rounded-full overflow-hidden">
              <div className="h-full bg-brand-500 rounded-full w-1/4" />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto no-scrollbar pb-px">
            {TABS.map(tab => {
              const count = tab.key === 'all' ? listings.length : listings.filter(l => l.status === tab.key).length;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`shrink-0 text-xs font-semibold px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'bg-brand-50 text-brand-700 border border-brand-200'
                      : 'text-ink-500 hover:text-ink-900 hover:bg-ink-50'
                  }`}
                >
                  {tab.label} {count > 0 && <span className="ml-0.5 opacity-60">({count})</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Listing list */}
      <div className={`${isMobile ? 'px-3 pt-4' : 'max-w-screen-xl mx-auto px-4 lg:px-8 pt-6'}`}>
        {loading ? (
          <div className="text-center py-10">Loading...</div>
        ) : filtered.length === 0 ? (
          <EmptyListings navigate={navigate} tab={activeTab} />
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(l => (
              <ListingRow
                key={l.id}
                listing={l}
                onEdit={() => navigate(`/edit-listing/${l.id}`)}
                onDelete={() => setDeletingId(l.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete confirm overlay */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm animate-slide-up">
            <h3 className="text-base font-bold text-ink-950 mb-2">Delete listing?</h3>
            <p className="text-sm text-ink-500 mb-5">This will permanently remove the listing. This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)} className="flex-1 border border-ink-200 text-ink-700 font-semibold text-sm py-3 rounded-xl hover:bg-ink-50 transition-colors">
                Cancel
              </button>
              <button onClick={async () => {
                try {
                  await listingsApi.deleteListing(deletingId);
                  setListings(listings.filter(l => l.id !== deletingId));
                } catch (err) {
                  console.error(err);
                }
                setDeletingId(null);
              }} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold text-sm py-3 rounded-xl transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const normalizedStatus = status || 'active'; // Default for MVP if missing
  const config = {
    active:   { label: 'Active',   className: 'bg-brand-50 text-brand-700 border-brand-200',  icon: <CheckCircle size={12} /> },
    pending:  { label: 'Pending',  className: 'bg-amber-50 text-amber-700 border-amber-200',  icon: <Clock size={12} /> },
    rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700 border-red-200',        icon: <AlertCircle size={12} /> },
    sold:     { label: 'Sold',     className: 'bg-ink-100 text-ink-600 border-ink-300',        icon: <CheckCircle size={12} /> },
    hidden:   { label: 'Hidden',   className: 'bg-ink-100 text-ink-500 border-ink-200',        icon: <EyeOff size={12} /> },
    expired:  { label: 'Expired',  className: 'bg-orange-50 text-orange-700 border-orange-200',icon: <RefreshCw size={12} /> },
    draft:    { label: 'Draft',    className: 'bg-ink-100 text-ink-500 border-ink-200',        icon: <Clock size={12} /> },
  };
  const c = config[normalizedStatus] || config.active;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${c.className}`}>
      {c.icon}{c.label}
    </span>
  );
}

function ListingRow({ listing, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-xl border border-ink-200 overflow-hidden">
      <div className="flex gap-3 p-3">
        <div className="w-20 h-20 rounded-lg overflow-hidden bg-ink-100 shrink-0">
          <img 
            src={listing.images?.[0] || '/images/default-listing.svg'} 
            alt={listing.title} 
            className="w-full h-full object-cover" 
            onError={(e) => { e.target.onerror = null; e.target.src = '/images/default-listing.svg'; }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-ink-800 line-clamp-2 leading-snug">{listing.title}</p>
            <StatusBadge status={listing.status} />
          </div>
          <div className="mt-1">
            {listing.price ? (
              <span className="text-sm font-bold text-ink-950">{formatRWF(listing.price)}</span>
            ) : (
              <span className="text-xs text-ink-500">Contact for price</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-ink-400">
            <span className="flex items-center gap-0.5"><Eye size={12} />{listing.views || 0}</span>
            <span>·</span>
            <span>{timeAgo(listing.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-ink-100 px-3 py-2 flex gap-1">
        <ActionBtn icon={<Pencil size={14} />} label="Edit" onClick={onEdit} />
        <ActionBtn icon={<EyeOff size={14} />} label="Hide" onClick={() => {}} />
        <ActionBtn icon={<CheckCircle size={14} />} label="Mark sold" onClick={() => {}} />
        <ActionBtn icon={<Trash2 size={14} className="text-red-500" />} label="Delete" onClick={onDelete} className="ml-auto text-red-500 hover:bg-red-50" />
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick, primary, className }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${
        primary ? 'bg-brand-600 text-white hover:bg-brand-700' : `text-ink-600 hover:bg-ink-100 ${className || ''}`
      }`}
    >
      {icon}{label}
    </button>
  );
}

function EmptyListings({ navigate, tab }) {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <div className="w-20 h-20 bg-ink-100 rounded-3xl flex items-center justify-center mb-4">
        <Package size={40} className="text-ink-300" />
      </div>
      <h3 className="text-lg font-bold text-ink-800 mb-2">
        {tab === 'all' ? 'No listings yet' : `No ${tab} listings`}
      </h3>
      <p className="text-sm text-ink-500 max-w-xs mb-6">
        {tab === 'all' ? 'Start selling by creating your first listing. It only takes a few minutes.' : `You don't have any ${tab} listings at the moment.`}
      </p>
      {tab === 'all' && (
        <button onClick={() => navigate('/create-listing')} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm px-5 py-3 rounded-xl transition-colors">
          <Plus size={16} /> Create a listing
        </button>
      )}
    </div>
  );
}
