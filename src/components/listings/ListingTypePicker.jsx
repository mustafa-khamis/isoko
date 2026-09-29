import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { LISTING_TYPE } from '../../utils/externalProducts';

// Regular listings are always available and render immediately. Only the
// external-product option waits for the seller's plan: it shows a skeleton
// while loading, an upgrade prompt when the plan doesn't include it, and is
// selectable once the plan allows it.
export default function ListingTypePicker({ value, onChange, allowanceStatus, allowance, onRetry }) {
  const isExternal = value === LISTING_TYPE.EXTERNAL;

  return (
    <div className="form-group">
      <label>What are you listing?</label>
      <div className="cl-listing-types">
        <button
          type="button"
          onClick={() => onChange(LISTING_TYPE.REGULAR)}
          aria-pressed={!isExternal}
          className={`cl-listing-type ${!isExternal ? 'cl-listing-type--active' : ''}`}
        >
          <span className="cl-listing-type__title">Regular listing</span>
          <span className="cl-listing-type__copy">Buyers contact you on RwanMart.</span>
        </button>
        <ExternalOption
          selected={isExternal}
          onSelect={() => onChange(LISTING_TYPE.EXTERNAL)}
          allowanceStatus={allowanceStatus}
          allowance={allowance}
          onRetry={onRetry}
        />
      </div>
    </div>
  );
}

function ExternalOption({ selected, onSelect, allowanceStatus, allowance, onRetry }) {
  if (allowanceStatus === 'loading') {
    return (
      <button
        type="button"
        disabled
        aria-busy="true"
        aria-label="External product, checking your plan"
        className="cl-listing-type cl-listing-type--loading"
      >
        <span className="cl-listing-type__title">External product</span>
        <span className="cl-listing-type__skeleton" aria-hidden="true" />
      </button>
    );
  }

  if (allowanceStatus === 'error') {
    return (
      <div className="cl-listing-type cl-listing-type--locked" aria-disabled="true">
        <span className="cl-listing-type__title">External product</span>
        <span className="cl-listing-type__copy cl-listing-type__resolved">We couldn&apos;t check your plan.</span>
        <button type="button" onClick={onRetry} className="cl-listing-type__cta">Try again</button>
      </div>
    );
  }

  if (!allowance.enabled) {
    return (
      <div className="cl-listing-type cl-listing-type--locked" aria-disabled="true">
        <span className="cl-listing-type__title">
          External product
          <Lock size={12} aria-hidden="true" />
        </span>
        <span className="cl-listing-type__copy cl-listing-type__resolved">Sold on another store.</span>
        <Link to="/trader-plans" className="cl-listing-type__cta">Upgrade to unlock</Link>
      </div>
    );
  }

  const limitReached = allowance.remaining === 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={limitReached}
      aria-pressed={selected}
      className={`cl-listing-type ${selected ? 'cl-listing-type--active' : ''}`}
    >
      <span className="cl-listing-type__title">External product</span>
      <span className="cl-listing-type__copy cl-listing-type__resolved">
        {limitReached
          ? `Limit reached for this ${allowance.period_days}-day period.`
          : `Sold on another store. ${allowance.remaining} of ${allowance.limit} left this period.`}
      </span>
    </button>
  );
}
