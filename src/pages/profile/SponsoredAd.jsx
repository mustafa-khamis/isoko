import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, CheckCircle, Clock, Eye, Info, Megaphone, TrendingUp, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';

const DEMO_IMAGES = [
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80',
  'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400&q=80',
  'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400&q=80',
];

export default function SponsoredAd() {
  const { isMobile } = useUI();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [step, setStep] = useState('type'); // type, content, preview, submitted
  const [adType, setAdType] = useState('feed');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
  const [link, setLink] = useState('');

  const isFreeUser = user?.role === 'buyer';

  if (isFreeUser) {
    return <TraderRequired navigate={navigate} isMobile={isMobile} />;
  }

  if (step === 'submitted') {
    return <AdSubmitted navigate={navigate} isMobile={isMobile} adType={adType} />;
  }

  return (
    <div className="bg-ink-50 min-h-full animate-fade-in">
      {/* Header */}
      <div className={`bg-white border-b border-ink-100 ${isMobile ? 'sticky top-0 z-30' : ''}`}>
        <div className={`flex items-center gap-3 px-4 py-4 ${isMobile ? '' : 'max-w-screen-xl mx-auto lg:px-8 max-w-2xl'}`}>
          <button
            onClick={() => step === 'type' ? navigate('/profile') : setStep(s => s === 'content' ? 'type' : 'content')}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-ink-100"
          >
            <ArrowLeft size={20} className="text-ink-600" />
          </button>
          <div>
            <h1 className="text-base font-bold text-ink-950">Create Sponsored Ad</h1>
            <p className="text-xs text-ink-400">
              {step === 'type' ? 'Step 1 of 3 — Choose format' : step === 'content' ? 'Step 2 of 3 — Ad content' : 'Step 3 of 3 — Review'}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="h-1 bg-ink-100">
          <div
            className="h-full bg-brand-500 transition-all duration-300 rounded-r-full"
            style={{ width: step === 'type' ? '33%' : step === 'content' ? '66%' : '100%' }}
          />
        </div>
      </div>

      <div className={`${isMobile ? 'px-4 pt-4' : 'max-w-2xl mx-auto px-4 pt-6'}`}>

        {/* Quota banner */}
        <div className="bg-brand-50 border border-brand-100 rounded-xl p-3 mb-5 flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center shrink-0">
            <Zap size={16} className="text-brand-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-brand-800">
              {user?.role === 'seller' ? '1 of 2 sponsored ads remaining' : '3 of 5 sponsored ads remaining'}
            </p>
            <div className="mt-1 h-1.5 bg-brand-100 rounded-full overflow-hidden">
              <div className="h-full bg-brand-500 rounded-full" style={{ width: user?.role === 'seller' ? '50%' : '40%' }} />
            </div>
          </div>
        </div>

        {/* Step 1: Ad Type */}
        {step === 'type' && (
          <div className="animate-fade-in">
            <h2 className="text-lg font-bold text-ink-900 mb-1">Choose ad format</h2>
            <p className="text-sm text-ink-500 mb-5">Pick the format that best fits your promotion goal.</p>

            <div className="flex flex-col gap-3 mb-6">
              {/* Story ad */}
              <button
                onClick={() => setAdType('story')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${adType === 'story' ? 'border-brand-500 bg-brand-50' : 'border-ink-200 bg-white hover:border-ink-300'}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${adType === 'story' ? 'bg-brand-100' : 'bg-ink-100'}`}>
                    <Eye size={20} className={`${adType === 'story' ? 'text-brand-600' : 'text-ink-500'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-bold text-ink-900">Story Ad</p>
                      <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full">HIGH VISIBILITY</span>
                    </div>
                    <p className="text-xs text-ink-500 leading-relaxed">
                      Appears in the sponsored stories row at the top of the home page. Great for brand awareness and store promotion.
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-ink-400 flex items-center gap-1"><TrendingUp size={12} /> High reach</span>
                      <span className="text-[10px] text-ink-400 flex items-center gap-1"><Clock size={12} /> 7-day duration</span>
                    </div>
                  </div>
                  {adType === 'story' && <CheckCircle size={20} className="text-brand-600 shrink-0 mt-0.5" />}
                </div>
              </button>

              {/* Feed ad */}
              <button
                onClick={() => setAdType('feed')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${adType === 'feed' ? 'border-brand-500 bg-brand-50' : 'border-ink-200 bg-white hover:border-ink-300'}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${adType === 'feed' ? 'bg-brand-100' : 'bg-ink-100'}`}>
                    <Megaphone size={20} className={`${adType === 'feed' ? 'text-brand-600' : 'text-ink-500'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-bold text-ink-900">Feed Ad</p>
                      <span className="text-[10px] bg-brand-50 text-brand-700 font-bold px-1.5 py-0.5 rounded-full border border-brand-200">TARGETED</span>
                    </div>
                    <p className="text-xs text-ink-500 leading-relaxed">
                      Inserted between regular listings in the browsing feed. Clearly labelled "Promoted" — reaches buyers actively browsing.
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-ink-400 flex items-center gap-1"><TrendingUp size={12} /> Buyer intent</span>
                      <span className="text-[10px] text-ink-400 flex items-center gap-1"><Clock size={12} /> 7-day duration</span>
                    </div>
                  </div>
                  {adType === 'feed' && <CheckCircle size={20} className="text-brand-600 shrink-0 mt-0.5" />}
                </div>
              </button>
            </div>

            <div className="flex items-start gap-2 bg-ink-50 border border-ink-100 rounded-xl p-3 mb-6">
              <Info size={16} className="text-ink-400 shrink-0 mt-0.5" />
              <p className="text-xs text-ink-500 leading-relaxed">
                All sponsored ads are reviewed by our team before going live. We'll notify you once your ad is approved. Ads that violate our guidelines will not be approved.
              </p>
            </div>

            <button
              onClick={() => setStep('content')}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm py-4 rounded-xl transition-colors"
            >
              Continue — Add content
            </button>
          </div>
        )}

        {/* Step 2: Content */}
        {step === 'content' && (
          <div className="animate-fade-in">
            <h2 className="text-lg font-bold text-ink-900 mb-1">
              {adType === 'story' ? 'Story Ad content' : 'Feed Ad content'}
            </h2>
            <p className="text-sm text-ink-500 mb-5">Add an image and a short message to capture buyers' attention.</p>

            {/* Image selector */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-ink-800 mb-2">Ad Image <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {DEMO_IMAGES.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${selectedImage === i ? 'border-brand-500' : 'border-transparent'}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
                <button className="aspect-square rounded-xl border-2 border-dashed border-ink-300 flex flex-col items-center justify-center gap-1 hover:border-brand-400 hover:bg-brand-50 transition-colors">
                  <Camera size={20} className="text-ink-400" />
                  <span className="text-[10px] text-ink-400 font-medium">Upload</span>
                </button>
              </div>
              <p className="text-xs text-ink-400">Recommended size: 800×800px. Max 2MB.</p>
            </div>

            {/* Title */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-ink-800 mb-1.5">
                Headline <span className="text-red-500">*</span>
                <span className="text-ink-400 font-normal ml-2">{title.length}/60</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value.slice(0, 60))}
                placeholder='e.g. "Premium Electronics — Best Prices in Kigali"'
                className="w-full border border-ink-200 rounded-xl px-4 py-3 text-sm text-ink-800 placeholder-ink-400 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
              />
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-ink-800 mb-1.5">
                Short description
                <span className="text-ink-400 font-normal ml-2">{description.length}/120</span>
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value.slice(0, 120))}
                placeholder="Briefly describe your offer or promotion…"
                rows={3}
                className="w-full border border-ink-200 rounded-xl px-4 py-3 text-sm text-ink-800 placeholder-ink-400 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all resize-none"
              />
            </div>

            {/* Link */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-ink-800 mb-1.5">Link to listing (optional)</label>
              <input
                type="url"
                value={link}
                onChange={e => setLink(e.target.value)}
                placeholder="Paste a listing link or leave empty to link to your profile"
                className="w-full border border-ink-200 rounded-xl px-4 py-3 text-sm text-ink-800 placeholder-ink-400 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
              />
            </div>

            <button
              onClick={() => setStep('preview')}
              disabled={!title}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-ink-200 disabled:text-ink-400 text-white font-bold text-sm py-4 rounded-xl transition-colors"
            >
              Preview ad
            </button>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && (
          <div className="animate-fade-in">
            <h2 className="text-lg font-bold text-ink-900 mb-1">Preview your ad</h2>
            <p className="text-sm text-ink-500 mb-5">This is how your ad will appear to buyers.</p>

            {/* Preview card */}
            <div className="bg-white rounded-2xl border border-ink-200 overflow-hidden mb-5">
              <div className="relative aspect-[4/3] bg-ink-100">
                <img src={DEMO_IMAGES[selectedImage]} alt="" className="w-full h-full object-cover" />
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-[10px] font-bold text-ink-600 px-2 py-1 rounded-full flex items-center gap-1">
                  <Megaphone size={12} /> Sponsored
                </div>
              </div>
              <div className="p-4">
                <p className="font-bold text-ink-900 text-sm mb-1">{title || 'Your headline here'}</p>
                {description && <p className="text-xs text-ink-500 leading-relaxed mb-2">{description}</p>}
                <button className="text-xs font-semibold text-brand-600 hover:text-brand-700">Learn more →</button>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-ink-50 border border-ink-100 rounded-xl p-4 mb-5">
              <p className="text-xs font-semibold text-ink-600 uppercase tracking-wider mb-3">Ad summary</p>
              <div className="flex flex-col gap-2">
                {[
                  { label: 'Format', value: adType === 'story' ? 'Story Ad' : 'Feed Ad' },
                  { label: 'Duration', value: '7 days after approval' },
                  { label: 'Cost', value: 'Included in your Trader plan' },
                  { label: 'Status after submit', value: 'Pending review' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-xs text-ink-500">{row.label}</span>
                    <span className="text-xs font-semibold text-ink-800">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('content')}
                className="flex-1 border border-ink-200 text-ink-700 font-semibold text-sm py-4 rounded-xl hover:bg-ink-100 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => setStep('submitted')}
                className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm py-4 rounded-xl transition-colors"
              >
                Submit for review
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AdSubmitted({ navigate, isMobile, adType }) {
  return (
    <div className={`min-h-screen bg-ink-50 flex flex-col items-center justify-center px-6 text-center ${isMobile ? 'pb-20' : 'pt-24'}`}>
      <div className="w-20 h-20 bg-brand-50 rounded-3xl flex items-center justify-center mb-4 border border-brand-100">
        <CheckCircle size={40} className="text-brand-600" />
      </div>
      <h1 className="text-2xl font-bold text-ink-900 mb-2">Ad submitted!</h1>
      <p className="text-ink-500 text-sm max-w-xs mb-6 leading-relaxed">
        Your {adType === 'story' ? 'Story Ad' : 'Feed Ad'} has been submitted for review. We'll notify you once it's been approved and is live.
      </p>

      <div className="w-full max-w-xs bg-white border border-ink-200 rounded-xl p-4 mb-6 text-left">
        <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-3">What happens next</p>
        {[
          { step: '1', text: 'Our team reviews your ad for guideline compliance' },
          { step: '2', text: 'You receive a notification with the review result' },
          { step: '3', text: 'Approved ads go live immediately for 7 days' },
        ].map(item => (
          <div key={item.step} className="flex items-start gap-3 mb-3 last:mb-0">
            <div className="w-5 h-5 bg-brand-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[10px] font-bold text-brand-600">{item.step}</span>
            </div>
            <p className="text-xs text-ink-600 leading-relaxed">{item.text}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={() => navigate('/profile')}
          className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm py-4 rounded-xl transition-colors"
        >
          Back to profile
        </button>
        <button
          onClick={() => navigate(0)}
          className="border border-ink-200 text-ink-700 font-semibold text-sm py-4 rounded-xl hover:bg-ink-100 transition-colors"
        >
          Create another ad
        </button>
      </div>
    </div>
  );
}

function TraderRequired({ navigate, isMobile }) {
  return (
    <div className={`min-h-screen bg-ink-50 flex flex-col items-center justify-center px-6 text-center ${isMobile ? 'pb-20' : 'pt-24'}`}>
      <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mb-4 border border-amber-100">
        <Megaphone size={40} className="text-amber-500" />
      </div>
      <h1 className="text-xl font-bold text-ink-900 mb-2">Trader plan required</h1>
      <p className="text-ink-500 text-sm max-w-xs mb-6 leading-relaxed">
        Sponsored ads are available to Trader Plus and Trader Premium members. Upgrade to start promoting your listings.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={() => navigate('/trader-plans')}
          className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm py-4 rounded-xl transition-colors"
        >
          View Trader plans
        </button>
        <button
          onClick={() => navigate('/')}
          className="border border-ink-200 text-ink-700 font-semibold text-sm py-4 rounded-xl hover:bg-ink-100 transition-colors"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
