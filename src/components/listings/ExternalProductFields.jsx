import { ExternalLink } from 'lucide-react';
import { isValidExternalUrl } from '../../utils/externalProducts';
import './ExternalProductFields.css';

// Platform, "Other" platform name and product link for external products.
export default function ExternalProductFields({
  platforms,
  platformId,
  otherName,
  url,
  onChange,
  touched = {},
  onTouch = () => {},
  fieldClassName = 'form-group',
  inputClassName = '',
  selectClassName = '',
}) {
  const selected = platforms.find((platform) => platform.id === platformId);
  const urlInvalid = touched.externalUrl && !isValidExternalUrl(url);
  const otherNameMissing = selected?.is_other && touched.externalPlatformOtherName && !otherName.trim();

  return (
    <>
      <div className={fieldClassName}>
        <label htmlFor="external-platform">Platform *</label>
        <select
          id="external-platform"
          value={platformId}
          onChange={(e) => onChange({ externalPlatformId: e.target.value })}
          className={selectClassName}
        >
          <option value="">Select platform</option>
          {platforms.map((platform) => (
            <option key={platform.id} value={platform.id}>{platform.name}</option>
          ))}
        </select>
      </div>

      {selected?.is_other && (
        <div className={fieldClassName}>
          <label htmlFor="external-platform-other">Platform name *</label>
          <input
            id="external-platform-other"
            type="text"
            placeholder="e.g. Etsy"
            maxLength={100}
            value={otherName}
            onChange={(e) => onChange({ externalPlatformOtherName: e.target.value })}
            onBlur={() => onTouch('externalPlatformOtherName')}
            className={`${inputClassName} ${otherNameMissing ? 'external-fields__input--error' : ''}`.trim()}
          />
          {otherNameMissing && (
            <p className="external-fields__hint external-fields__hint--error">Enter the platform name.</p>
          )}
        </div>
      )}

      <div className={fieldClassName}>
        <label htmlFor="external-url">Product link *</label>
        <div className="external-fields__url">
          <ExternalLink size={16} aria-hidden="true" />
          <input
            id="external-url"
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://"
            maxLength={2048}
            value={url}
            onChange={(e) => onChange({ externalUrl: e.target.value })}
            onBlur={() => onTouch('externalUrl')}
            className={urlInvalid ? 'external-fields__input--error' : ''}
          />
        </div>
        {urlInvalid ? (
          <p className="external-fields__hint external-fields__hint--error">Enter a valid link that starts with https://</p>
        ) : (
          <p className="external-fields__hint">
            Buyers are sent to this link to buy the product. Affiliate links are fine.
          </p>
        )}
      </div>
    </>
  );
}
