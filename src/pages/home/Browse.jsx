import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, X, ChevronDown, ArrowLeft, PackageSearch } from 'lucide-react';
import ListingCard, { SkeletonCard } from '../../components/listings/ListingCard';
import { useUI } from '../../context/UIContext';
import { listingsApi } from '../../services/listingsApi';
import './Browse.css';

// Dummy Categories for now (should come from API or constants)
const CATEGORIES = [
  { id: 'electronics', label: 'Electronics', icon: 'Smartphone' },
  { id: 'vehicles', label: 'Vehicles', icon: 'Car' },
  { id: 'real-estate', label: 'Real Estate', icon: 'Building2' },
  { id: 'fashion', label: 'Fashion', icon: 'Shirt' },
  { id: 'home', label: 'Home & Garden', icon: 'Sofa' },
  { id: 'agriculture', label: 'Agriculture', icon: 'Wheat' },
];

const PROVINCES = ['All provinces', 'Kigali City', 'Northern', 'Southern', 'Eastern', 'Western'];

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isMobile } = useUI();
  
  const initialSearch = searchParams.get('search') || '';
  const initialCategory = searchParams.get('category') || '';

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [sortBy, setSortBy] = useState('newest');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [province, setProvince] = useState('');
  
  const [showFilters, setShowFilters] = useState(false);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch listings when filters change
  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      try {
        const params = {};
        if (searchQuery) params.search = searchQuery;
        if (activeCategory) params.category = activeCategory;
        if (priceMin) params.min_price = priceMin;
        if (priceMax) params.max_price = priceMax;
        if (province && province !== 'All provinces') params.location = province; // assuming location matches
        if (sortBy) params.sort = sortBy;

        const res = await listingsApi.getListings(params);
        setListings(res.data.data.listings || []);
      } catch (err) {
        console.error('Fetch listings failed', err);
        setError('Failed to load listings.');
      } finally {
        setLoading(false);
      }
    };
    
    // Debounce search slightly
    const timeout = setTimeout(fetchListings, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, activeCategory, priceMin, priceMax, province, sortBy]);

  // Sync state to URL params if needed, or just let API call handle it
  useEffect(() => {
    const params = {};
    if (searchQuery) params.search = searchQuery;
    if (activeCategory) params.category = activeCategory;
    setSearchParams(params, { replace: true });
  }, [searchQuery, activeCategory, setSearchParams]);

  const cat = CATEGORIES.find(c => c.id === activeCategory);
  const activeFiltersCount = [activeCategory, province, priceMin, priceMax].filter(Boolean).length;
  const clearFilters = () => { setActiveCategory(''); setProvince(''); setPriceMin(''); setPriceMax(''); };

  const renderSkeletons = () => (
    <div className="listings-grid browse-grid">
      {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );

  if (isMobile) {
    return (
      <div className="browse-mobile-container">
        {/* Mobile header */}
        <div className="browse-mobile-header">
          <div className="browse-mobile-top">
            <button onClick={() => navigate('/')} className="browse-back-btn">
              <ArrowLeft size={20} />
            </button>
            <div className="browse-search-bar">
              <Search size={16} color="var(--color-ink-400)" />
              <input
                type="text"
                placeholder="Search listings…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && <button onClick={() => setSearchQuery('')}><X size={16} color="var(--color-ink-400)" /></button>}
            </div>
            <button onClick={() => setShowFilters(true)} className="browse-filter-btn">
              <SlidersHorizontal size={16} />
              {activeFiltersCount > 0 && <span className="browse-filter-badge">{activeFiltersCount}</span>}
            </button>
          </div>

          {cat && (
            <div className="browse-active-cat">
              <span>{cat.label}</span>
              <button onClick={() => setActiveCategory('')}><X size={12} /></button>
            </div>
          )}

          {activeFiltersCount > 0 && (
            <div className="browse-active-filters">
              {province && <Chip label={province} onRemove={() => setProvince('')} />}
              {(priceMin || priceMax) && <Chip label={`RWF ${priceMin || '0'} – ${priceMax || '∞'}`} onRemove={() => { setPriceMin(''); setPriceMax(''); }} />}
              <button onClick={clearFilters} className="browse-clear-btn">Clear all</button>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="browse-mobile-results">
          <div className="browse-results-header">
            <span className="browse-results-count">{listings.length} listings</span>
            <SortSelect value={sortBy} onChange={setSortBy} />
          </div>

          {error && <div className="browse-results-error">{error}</div>}
          
          {!error && loading ? renderSkeletons() : 
            listings.length === 0 ? <EmptyState /> : (
              <div className="listings-grid browse-grid-mobile">
                {listings.map(l => <ListingCard key={l.id} listing={l} compact />)}
              </div>
          )}
        </div>

        {showFilters && (
          <FilterSheet
            province={province} setProvince={setProvince}
            priceMin={priceMin} setPriceMin={setPriceMin}
            priceMax={priceMax} setPriceMax={setPriceMax}
            activeCategory={activeCategory} setActiveCategory={setActiveCategory}
            onClose={() => setShowFilters(false)}
          />
        )}
      </div>
    );
  }

  // Desktop
  return (
    <div className="browse-desktop-container">
      <div className="browse-desktop-inner">
        {/* Search bar */}
        <div className="browse-desktop-top">
          <div className="browse-search-bar">
            <Search size={16} color="var(--color-ink-400)" />
            <input
              type="text"
              placeholder="Search listings…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && <button onClick={() => setSearchQuery('')}><X size={16} color="var(--color-ink-400)" /></button>}
          </div>
          <SortSelect value={sortBy} onChange={setSortBy} />
        </div>

        {/* Heading */}
        <div className="browse-desktop-heading">
          <h1>{cat ? cat.label : searchQuery ? `Results for "${searchQuery}"` : 'All Listings'}</h1>
          <span>{listings.length} listings</span>
        </div>

        {activeFiltersCount > 0 && (
          <div className="browse-active-filters">
            {province && <Chip label={province} onRemove={() => setProvince('')} />}
            {(priceMin || priceMax) && <Chip label={`RWF ${priceMin || '0'} – ${priceMax || '∞'}`} onRemove={() => { setPriceMin(''); setPriceMax(''); }} />}
            <button onClick={clearFilters} className="browse-clear-btn">Clear all filters</button>
          </div>
        )}

        <div className="browse-desktop-layout">
          {/* Sidebar */}
          <aside className="browse-sidebar">
            <div className="browse-sidebar-inner">
              <h3>Filters</h3>
              
              <div className="filter-group">
                <label>Category</label>
                <div className="filter-list">
                  <button
                    onClick={() => setActiveCategory('')}
                    className={`filter-list__button ${!activeCategory ? 'filter-list__button--active' : ''}`}
                  >
                    All categories
                  </button>
                  {CATEGORIES.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setActiveCategory(c.id)}
                      className={`filter-list__button ${activeCategory === c.id ? 'filter-list__button--active' : ''}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <label>Province</label>
                <select value={province} onChange={e => setProvince(e.target.value === 'All provinces' ? '' : e.target.value)}>
                  {PROVINCES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>

              <div className="filter-group">
                <label>Price range (RWF)</label>
                <div className="filter-price-inputs">
                  <input type="number" placeholder="Min" value={priceMin} onChange={e => setPriceMin(e.target.value)} />
                  <input type="number" placeholder="Max" value={priceMax} onChange={e => setPriceMax(e.target.value)} />
                </div>
              </div>
            </div>
          </aside>

          {/* Grid */}
          <div className="browse-main">
            {error && <div className="browse-results-error">{error}</div>}
            
            {!error && loading ? renderSkeletons() :
              listings.length === 0 ? <EmptyState /> : (
                <div className="listings-grid browse-grid">
                  {listings.map(l => <ListingCard key={l.id} listing={l} />)}
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({ label, onRemove }) {
  return (
    <span className="browse-chip">
      {label}
      <button onClick={onRemove}><X size={12} /></button>
    </span>
  );
}

function SortSelect({ value, onChange }) {
  return (
    <div className="browse-sort-select">
      <select value={value} onChange={e => onChange(e.target.value)}>
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="price-asc">Price: Low to high</option>
        <option value="price-desc">Price: High to low</option>
      </select>
      <ChevronDown size={14} className="sort-icon" />
    </div>
  );
}

function EmptyState() {
  const navigate = useNavigate();
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <PackageSearch size={40} />
      </div>
      <h3>No listings found</h3>
      <p>Try adjusting your search or filters to find what you're looking for.</p>
      <button onClick={() => navigate('/')}>Browse all listings</button>
    </div>
  );
}

function FilterSheet({ province, setProvince, priceMin, setPriceMin, priceMax, setPriceMax, activeCategory, setActiveCategory, onClose }) {
  return (
    <div className="filter-sheet-overlay" onClick={onClose}>
      <div className="filter-sheet-content" onClick={e => e.stopPropagation()}>
        <div className="filter-sheet-header">
          <h3>Filters</h3>
          <button onClick={onClose}><X size={16} /></button>
        </div>

        <div className="filter-group">
          <label>Category</label>
          <div className="filter-chip-list">
            <button
              onClick={() => setActiveCategory('')}
              className={`filter-chip-list__button ${!activeCategory ? 'filter-chip-list__button--active' : ''}`}
            >
              All
            </button>
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`filter-chip-list__button ${activeCategory === c.id ? 'filter-chip-list__button--active' : ''}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <label>Province</label>
          <div className="filter-chip-list">
            {PROVINCES.map(p => (
              <button
                key={p}
                onClick={() => setProvince(p === 'All provinces' ? '' : p)}
                className={`filter-chip-list__button ${
                  province === p || (p === 'All provinces' && !province) ? 'filter-chip-list__button--active' : ''
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <label>Price range (RWF)</label>
          <div className="filter-price-inputs">
            <input type="number" placeholder="Min" value={priceMin} onChange={e => setPriceMin(e.target.value)} />
            <input type="number" placeholder="Max" value={priceMax} onChange={e => setPriceMax(e.target.value)} />
          </div>
        </div>

        <button onClick={onClose} className="browse-filter-apply-button">Show results</button>
      </div>
    </div>
  );
}
