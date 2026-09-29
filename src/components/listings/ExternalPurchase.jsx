import { ExternalLink } from 'lucide-react';
import { buyButtonLabel, externalUrlHost, safeExternalUrl } from '../../utils/externalProducts';
import './ExternalPurchase.css';

// Opens the seller's product page on the external platform in a new tab.
// rel="sponsored" marks it as an affiliate/commercial link for search engines.
export function BuyExternalButton({ listing, className = '', label }) {
  const href = safeExternalUrl(listing.external_url);
  if (!href) return null;

  const text = label || buyButtonLabel(listing.external_platform_name);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow sponsored"
      className={`external-buy-link ${className}`.trim()}
      aria-label={`${buyButtonLabel(listing.external_platform_name)} (opens ${externalUrlHost(href)} in a new tab)`}
    >
      {text}
      <ExternalLink size={16} aria-hidden="true" />
    </a>
  );
}

export function ExternalPurchaseDisclosure({ listing }) {
  const platform = listing.external_platform_name || 'the external store';
  const host = externalUrlHost(listing.external_url);
  return (
    <p className="external-disclosure">
      External product: you will be redirected to {platform}{host ? ` (${host})` : ''} to complete your purchase.
      RwanMart does not process payment or fulfillment for this product, and the price may change on {platform}.
    </p>
  );
}
