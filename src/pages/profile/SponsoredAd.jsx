import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  CheckCircle,
  Clock,
  Eye,
  Info,
  Megaphone,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import './SponsoredAd.css';

const DEMO_IMAGES = [
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80',
  'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400&q=80',
  'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400&q=80',
];

const AD_SUMMARY = [
  { label: 'Duration', value: '7 days after approval' },
  { label: 'Cost', value: 'Included in your Trader plan' },
  { label: 'Status after submit', value: 'Pending review' },
];

export default function SponsoredAd() {
  const { isMobile } = useUI();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState('type');
  const [adType, setAdType] = useState('feed');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
  const [link, setLink] = useState('');

  if (user?.role === 'buyer') {
    return <TraderRequired navigate={navigate} isMobile={isMobile} />;
  }

  if (step === 'submitted') {
    return <AdSubmitted navigate={navigate} isMobile={isMobile} adType={adType} />;
  }

  const stepLabel = step === 'type'
    ? 'Step 1 of 3 - Choose format'
    : step === 'content'
      ? 'Step 2 of 3 - Ad content'
      : 'Step 3 of 3 - Review';
  const progressWidth = step === 'type' ? '33%' : step === 'content' ? '66%' : '100%';

  const goBack = () => {
    if (step === 'type') {
      navigate('/profile');
    } else {
      setStep(step === 'content' ? 'type' : 'content');
    }
  };

  return (
    <div className="sponsored-ad-page">
      <header className={`sponsored-ad-header ${isMobile ? 'sponsored-ad-header--sticky' : ''}`}>
        <div className={`sponsored-ad-header__inner ${isMobile ? '' : 'sponsored-ad-header__inner--desktop'}`}>
          <button onClick={goBack} className="sponsored-ad-back-button" aria-label="Go back">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="sponsored-ad-title">Create Sponsored Ad</h1>
            <p className="sponsored-ad-step-label">{stepLabel}</p>
          </div>
        </div>
        <div className="sponsored-ad-progress">
          <div className="sponsored-ad-progress__fill" style={{ width: progressWidth }} />
        </div>
      </header>

      <main className={`sponsored-ad-content ${isMobile ? 'sponsored-ad-content--mobile' : 'sponsored-ad-content--desktop'}`}>
        <QuotaBanner userRole={user?.role} />

        {step === 'type' && (
          <section className="sponsored-ad-step">
            <StepHeading
              title="Choose ad format"
              copy="Pick the format that best fits your promotion goal."
            />

            <div className="sponsored-ad-formats">
              <AdFormatOption
                selected={adType === 'story'}
                onSelect={() => setAdType('story')}
                icon={<Eye size={20} />}
                title="Story Ad"
                badge="High visibility"
                badgeType="attention"
                description="Appears in the sponsored stories row at the top of the home page. Great for brand awareness and store promotion."
                metric="High reach"
              />
              <AdFormatOption
                selected={adType === 'feed'}
                onSelect={() => setAdType('feed')}
                icon={<Megaphone size={20} />}
                title="Feed Ad"
                badge="Targeted"
                badgeType="targeted"
                description='Inserted between regular listings in the browsing feed. Clearly labelled "Promoted" - reaches buyers actively browsing.'
                metric="Buyer intent"
              />
            </div>

            <div className="sponsored-ad-notice">
              <Info size={16} />
              <p>
                All sponsored ads are reviewed by our team before going live. We&apos;ll notify you once your ad is approved.
                Ads that violate our guidelines will not be approved.
              </p>
            </div>

            <button onClick={() => setStep('content')} className="sponsored-ad-primary-button">
              Continue - Add content
            </button>
          </section>
        )}

        {step === 'content' && (
          <section className="sponsored-ad-step">
            <StepHeading
              title={adType === 'story' ? 'Story Ad content' : 'Feed Ad content'}
              copy="Add an image and a short message to capture buyers' attention."
            />

            <div className="sponsored-ad-image-field">
              <label className="sponsored-ad-field-label">
                Ad Image <span className="sponsored-ad-required">*</span>
              </label>
              <div className="sponsored-ad-image-grid">
                {DEMO_IMAGES.map((image, index) => (
                  <button
                    key={image}
                    onClick={() => setSelectedImage(index)}
                    className={`sponsored-ad-image-option ${selectedImage === index ? 'sponsored-ad-image-option--selected' : ''}`}
                    aria-label={`Select ad image ${index + 1}`}
                    aria-pressed={selectedImage === index}
                  >
                    <img src={image} alt="" className="sponsored-ad-image-option__image" />
                  </button>
                ))}
                <button className="sponsored-ad-upload-button">
                  <Camera size={20} />
                  <span>Upload</span>
                </button>
              </div>
              <p className="sponsored-ad-help-text">Recommended size: 800 x 800px. Max 2MB.</p>
            </div>

            <div className="sponsored-ad-field">
              <label htmlFor="sponsored-ad-headline" className="sponsored-ad-field-label">
                Headline <span className="sponsored-ad-required">*</span>
                <span className="sponsored-ad-character-count">{title.length}/60</span>
              </label>
              <input
                id="sponsored-ad-headline"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value.slice(0, 60))}
                placeholder='e.g. "Premium Electronics - Best Prices in Kigali"'
                className="sponsored-ad-field-control"
              />
            </div>

            <div className="sponsored-ad-field">
              <label htmlFor="sponsored-ad-description" className="sponsored-ad-field-label">
                Short description
                <span className="sponsored-ad-character-count">{description.length}/120</span>
              </label>
              <textarea
                id="sponsored-ad-description"
                value={description}
                onChange={(event) => setDescription(event.target.value.slice(0, 120))}
                placeholder="Briefly describe your offer or promotion..."
                rows={3}
                className="sponsored-ad-field-control sponsored-ad-field-control--textarea"
              />
            </div>

            <div className="sponsored-ad-field sponsored-ad-field--last">
              <label htmlFor="sponsored-ad-link" className="sponsored-ad-field-label">Link to listing (optional)</label>
              <input
                id="sponsored-ad-link"
                type="url"
                value={link}
                onChange={(event) => setLink(event.target.value)}
                placeholder="Paste a listing link or leave empty to link to your profile"
                className="sponsored-ad-field-control"
              />
            </div>

            <button
              onClick={() => setStep('preview')}
              disabled={!title}
              className="sponsored-ad-primary-button"
            >
              Preview ad
            </button>
          </section>
        )}

        {step === 'preview' && (
          <section className="sponsored-ad-step">
            <StepHeading title="Preview your ad" copy="This is how your ad will appear to buyers." />

            <article className="sponsored-ad-preview">
              <div className="sponsored-ad-preview__image-frame">
                <img src={DEMO_IMAGES[selectedImage]} alt="" className="sponsored-ad-preview__image" />
                <div className="sponsored-ad-preview__badge">
                  <Megaphone size={12} /> Sponsored
                </div>
              </div>
              <div className="sponsored-ad-preview__body">
                <p className="sponsored-ad-preview__title">{title || 'Your headline here'}</p>
                {description && <p className="sponsored-ad-preview__copy">{description}</p>}
                <button className="sponsored-ad-preview__link">Learn more &rarr;</button>
              </div>
            </article>

            <div className="sponsored-ad-summary">
              <h3 className="sponsored-ad-summary__title">Ad summary</h3>
              <div className="sponsored-ad-summary__rows">
                {[
                  { label: 'Format', value: adType === 'story' ? 'Story Ad' : 'Feed Ad' },
                  ...AD_SUMMARY,
                ].map((row) => (
                  <div key={row.label} className="sponsored-ad-summary__row">
                    <span className="sponsored-ad-summary__label">{row.label}</span>
                    <span className="sponsored-ad-summary__value">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="sponsored-ad-review-actions">
              <button onClick={() => setStep('content')} className="sponsored-ad-secondary-button">Edit</button>
              <button onClick={() => setStep('submitted')} className="sponsored-ad-primary-button">Submit for review</button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function StepHeading({ title, copy }) {
  return (
    <>
      <h2 className="sponsored-ad-step__title">{title}</h2>
      <p className="sponsored-ad-step__copy">{copy}</p>
    </>
  );
}

function QuotaBanner({ userRole }) {
  return (
    <div className="sponsored-ad-quota">
      <div className="sponsored-ad-quota__icon"><Zap size={16} /></div>
      <div className="sponsored-ad-quota__content">
        <p className="sponsored-ad-quota__label">
          {userRole === 'seller' ? '1 of 2 sponsored ads remaining' : '3 of 5 sponsored ads remaining'}
        </p>
        <div className="sponsored-ad-quota__track">
          <div className="sponsored-ad-quota__fill" style={{ width: userRole === 'seller' ? '50%' : '40%' }} />
        </div>
      </div>
    </div>
  );
}

function AdFormatOption({ selected, onSelect, icon, title, badge, badgeType, description, metric }) {
  return (
    <button
      onClick={onSelect}
      className={`sponsored-ad-format ${selected ? 'sponsored-ad-format--selected' : ''}`}
      aria-pressed={selected}
    >
      <div className="sponsored-ad-format__layout">
        <div className={`sponsored-ad-format__icon ${selected ? 'sponsored-ad-format__icon--selected' : ''}`}>{icon}</div>
        <div className="sponsored-ad-format__content">
          <div className="sponsored-ad-format__heading">
            <p className="sponsored-ad-format__title">{title}</p>
            <span className={`sponsored-ad-format__badge ${
              badgeType === 'attention'
                ? 'sponsored-ad-format__badge--attention'
                : 'sponsored-ad-format__badge--targeted'
            }`}>
              {badge}
            </span>
          </div>
          <p className="sponsored-ad-format__description">{description}</p>
          <div className="sponsored-ad-format__metadata">
            <span><TrendingUp size={12} /> {metric}</span>
            <span><Clock size={12} /> 7-day duration</span>
          </div>
        </div>
        {selected && <CheckCircle size={20} className="sponsored-ad-format__check" />}
      </div>
    </button>
  );
}

function AdSubmitted({ navigate, isMobile, adType }) {
  const nextSteps = [
    'Our team reviews your ad for guideline compliance',
    'You receive a notification with the review result',
    'Approved ads go live immediately for 7 days',
  ];

  return (
    <div className={`sponsored-ad-result ${isMobile ? 'sponsored-ad-result--mobile' : 'sponsored-ad-result--desktop'}`}>
      <div className="sponsored-ad-result__icon sponsored-ad-result__icon--success"><CheckCircle size={40} /></div>
      <h1 className="sponsored-ad-result__title">Ad submitted!</h1>
      <p className="sponsored-ad-result__copy">
        Your {adType === 'story' ? 'Story Ad' : 'Feed Ad'} has been submitted for review.
        We&apos;ll notify you once it&apos;s been approved and is live.
      </p>

      <div className="sponsored-ad-next-steps">
        <h2 className="sponsored-ad-next-steps__title">What happens next</h2>
        {nextSteps.map((text, index) => (
          <div key={text} className="sponsored-ad-next-steps__item">
            <span className="sponsored-ad-next-steps__number">{index + 1}</span>
            <p>{text}</p>
          </div>
        ))}
      </div>

      <div className="sponsored-ad-result__actions">
        <button onClick={() => navigate('/profile')} className="sponsored-ad-result__primary">Back to profile</button>
        <button onClick={() => navigate(0)} className="sponsored-ad-result__secondary">Create another ad</button>
      </div>
    </div>
  );
}

function TraderRequired({ navigate, isMobile }) {
  return (
    <div className={`sponsored-ad-result ${isMobile ? 'sponsored-ad-result--mobile' : 'sponsored-ad-result--desktop'}`}>
      <div className="sponsored-ad-result__icon sponsored-ad-result__icon--locked"><Megaphone size={40} /></div>
      <h1 className="sponsored-ad-result__title sponsored-ad-result__title--compact">Trader plan required</h1>
      <p className="sponsored-ad-result__copy">
        Sponsored ads are available to Trader Plus and Trader Premium members.
        Upgrade to start promoting your listings.
      </p>
      <div className="sponsored-ad-result__actions">
        <button onClick={() => navigate('/trader-plans')} className="sponsored-ad-result__primary">View Trader plans</button>
        <button onClick={() => navigate('/')} className="sponsored-ad-result__secondary">Maybe later</button>
      </div>
    </div>
  );
}
