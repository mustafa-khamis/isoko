import { Link } from 'react-router-dom';
import { Lock, Plus, Tag, X } from 'lucide-react';
import { OfferBadge, PriceBadge } from './ListingCard';
import { validateOffer } from '../../utils/offers';
import './OfferFields.css';

// Optional promotional offer below a listing's price input. The page keeps its
// own price input (the current price); this adds the previous price. Offer
// availability comes from the seller's plan, loaded by the page.
export default function OfferFields({
  planStatus,
  allowed,
  enabled,
  previousPrice,
  price,
  priceType,
  onEnable,
  onRemove,
  onPreviousPriceChange,
  onRetry,
  fieldClassName = 'form-group',
  inputClassName = '',
}) {
  if (!enabled) {
    if (planStatus === 'loading') {
      return (
        <button type="button" className="offer-fields__add" disabled aria-busy="true" aria-label="Add offer, checking your plan">
          <Tag size={16} aria-hidden="true" />
          <span className="offer-fields__skeleton" aria-hidden="true" />
        </button>
      );
    }
    if (planStatus === 'error') {
      return (
        <div className="offer-fields__notice">
          <p>We couldn&apos;t load your plan, so offers are unavailable right now.</p>
          <button type="button" className="offer-fields__link" onClick={onRetry}>Try again</button>
        </div>
      );
    }
    if (!allowed) {
      return (
        <div className="offer-fields__notice offer-fields__notice--locked">
          <p className="offer-fields__notice-title"><Lock size={14} aria-hidden="true" /> Promotional offers</p>
          <p>Show buyers a discounted price with the original price crossed out.</p>
          <Link to="/trader-plans" className="offer-fields__link">Upgrade to unlock offers</Link>
        </div>
      );
    }
    return (
      <button type="button" className="offer-fields__add" onClick={onEnable}>
        <Plus size={16} aria-hidden="true" /> Add offer
      </button>
    );
  }

  const error = previousPrice !== '' && price !== '' ? validateOffer(previousPrice, price) : null;
  const locked = planStatus === 'ready' && !allowed;

  return (
    <div className="offer-fields">
      <div className="offer-fields__header">
        <span className="offer-fields__title"><Tag size={14} aria-hidden="true" /> Offer</span>
        <button type="button" className="offer-fields__remove" onClick={onRemove}>
          <X size={14} aria-hidden="true" /> Remove offer
        </button>
      </div>
      {locked && (
        <p className="offer-fields__hint">
          Your plan no longer includes offers. You can keep this offer as it is or remove it.
        </p>
      )}
      <div className={fieldClassName}>
        <label htmlFor="offer-previous-price">Previous price (RWF) *</label>
        <input
          id="offer-previous-price"
          type="number"
          min="0"
          inputMode="numeric"
          placeholder="Price before the offer"
          value={previousPrice}
          disabled={locked}
          onChange={(e) => onPreviousPriceChange(e.target.value)}
          className={inputClassName}
          aria-invalid={Boolean(error)}
          aria-describedby="offer-feedback"
        />
      </div>
      <div id="offer-feedback" aria-live="polite">
        {error ? (
          <p className="offer-fields__hint offer-fields__hint--error">{error}</p>
        ) : previousPrice !== '' && price !== '' ? (
          <div className="offer-fields__preview">
            <span className="offer-fields__preview-label">Buyers will see</span>
            <PriceBadge price={price} previousPrice={previousPrice} priceType={priceType} />
            <OfferBadge previousPrice={previousPrice} price={price} />
          </div>
        ) : (
          <p className="offer-fields__hint">Enter the current price above and the price before the offer here.</p>
        )}
      </div>
    </div>
  );
}
