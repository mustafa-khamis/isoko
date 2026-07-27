import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Crown, Zap, X, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { usersApi } from '../../services/usersApi';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    isFree: true,
    features: ['2 active listings per week', 'Standard search visibility'],
    isAvailable: true,
    maxActiveListings: 2,
    sponsoredAdsAllowance: 0,
  },
  {
    id: 'trader-plus',
    name: 'Trader Plus',
    price: 5000,
    features: ['20 active listings', '2 sponsored ads per month', 'Higher search priority', 'Trader badge', 'Priority support'],
    isAvailable: true,
    maxActiveListings: 20,
    sponsoredAdsAllowance: 2,
  },
  {
    id: 'trader-premium',
    name: 'Trader Premium',
    price: 15000,
    features: ['50 active listings', '5 sponsored ads per month', 'Top search priority', 'Premium badge', 'Analytics dashboard', 'Priority support'],
    isAvailable: false,
    isComingSoon: true,
    maxActiveListings: 50,
    sponsoredAdsAllowance: 5,
  }
];

export default function TraderPlans() {
  const { user } = useAuth();
  const { isMobile, showAuth } = useUI();
  const navigate = useNavigate();
  
  const [activating, setActivating] = useState(null);
  const [activated, setActivated] = useState(null);

  const currentPlan = user?.role === 'buyer' ? 'free' : 'trader-plus';

  const handleActivate = async (plan) => {
    if (!user) {
      showAuth('Sign in to upgrade your plan');
      return;
    }
    if (!plan.isAvailable || plan.isComingSoon) return;
    if (currentPlan === plan.id) return;
    
    setActivating(plan.id);
    // Simulate activation since backend role logic might be mock or specific
    try {
      await usersApi.updateProfile({ role: 'seller' });
      // Would need to refresh user context here
      setTimeout(() => {
        setActivating(null);
        setActivated(plan.id);
      }, 1500);
    } catch (err) {
      console.error(err);
      setActivating(null);
    }
  };

  if (activated) {
    return <ActivationSuccess plan={PLANS.find(p => p.id === activated)} onContinue={() => navigate('/')} />;
  }

  return (
    <div className="bg-ink-50 min-h-full animate-fade-in">
      {/* Header */}
      <div className={`bg-white border-b border-ink-100 ${isMobile ? 'sticky top-0 z-30' : ''}`}>
        <div className={`flex items-center gap-3 px-4 py-4 ${isMobile ? '' : 'max-w-screen-xl mx-auto lg:px-8'}`}>
          {isMobile && (
            <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-ink-100">
              <ArrowLeft size={20} className="text-ink-600" />
            </button>
          )}
          <div>
            <h1 className="text-lg font-bold text-ink-950">Become a Trader</h1>
            <p className="text-xs text-ink-500">List more, reach more buyers</p>
          </div>
        </div>
      </div>

      <div className={`px-4 py-6 ${isMobile ? '' : 'max-w-screen-xl mx-auto lg:px-8'}`}>
        {/* Current plan indicator */}
        {user && (
          <div className="bg-white border border-ink-200 rounded-xl px-4 py-3 mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-ink-500">Your current plan</p>
              <p className="text-sm font-bold text-ink-900">
                {currentPlan === 'free' ? 'Free' : currentPlan === 'trader-plus' ? 'Trader Plus' : 'Trader Premium'}
              </p>
            </div>
            {currentPlan !== 'free' && (
              <div className="text-xs bg-brand-50 border border-brand-200 text-brand-700 px-2.5 py-1 rounded-full font-semibold">
                Active
              </div>
            )}
          </div>
        )}

        {/* Why upgrade */}
        <div className="mb-6 bg-gradient-to-r from-brand-600 to-brand-700 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={20} />
            <span className="font-bold text-base">Why upgrade to Trader?</span>
          </div>
          <p className="text-sm text-white/80 leading-relaxed">
            Free sellers can post 2 listings every 7 days. As a Trader, you get more active listings, sponsored placements, and priority in search results.
          </p>
        </div>

        {/* Plan cards */}
        <div className={`grid gap-4 ${isMobile ? '' : 'grid-cols-3'}`}>
          {PLANS.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrentPlan={currentPlan === plan.id}
              isActivating={activating === plan.id}
              onActivate={() => handleActivate(plan)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PlanCard({ plan, isCurrentPlan, isActivating, onActivate }) {
  const isPopular = plan.id === 'trader-plus';

  return (
    <div className={`relative bg-white rounded-2xl border-2 overflow-hidden transition-all ${
      isCurrentPlan ? 'border-brand-500 shadow-sm shadow-brand-100' :
      isPopular ? 'border-brand-300 shadow-sm shadow-brand-50' :
      'border-ink-200'
    }`}>
      {isPopular && !isCurrentPlan && (
        <div className="bg-brand-500 text-white text-[10px] font-bold text-center py-1.5 tracking-wide uppercase">
          ★ Most Popular
        </div>
      )}
      {isCurrentPlan && (
        <div className="bg-brand-600 text-white text-[10px] font-bold text-center py-1.5 tracking-wide">
          Your current plan
        </div>
      )}

      <div className="p-5">
        <div className="flex items-center gap-2 mb-1">
          {plan.id === 'free' && <div className="w-6 h-6 rounded-lg bg-ink-100 flex items-center justify-center text-ink-500 text-xs font-bold">F</div>}
          {plan.id === 'trader-plus' && <div className="w-6 h-6 rounded-lg bg-brand-50 flex items-center justify-center"><Zap size={14} className="text-brand-600" /></div>}
          {plan.id === 'trader-premium' && <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center"><Crown size={14} className="text-amber-500" /></div>}
          <h3 className="font-bold text-sm text-ink-950">{plan.name}</h3>
        </div>

        <div className="mb-4">
          {plan.isFree ? (
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-ink-950">Free</span>
            </div>
          ) : plan.isComingSoon ? (
            <span className="text-sm font-semibold text-ink-400">Coming soon</span>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-ink-950">RWF {plan.price?.toLocaleString()}</span>
              <span className="text-xs text-ink-400">/month</span>
            </div>
          )}
        </div>

        <ul className="flex flex-col gap-2 mb-5">
          {plan.features.map(feat => (
            <li key={feat} className="flex items-start gap-2 text-xs text-ink-600">
              <Check size={14} className="text-brand-500 mt-0.5 shrink-0" />
              {feat}
            </li>
          ))}
        </ul>

        <button
          onClick={onActivate}
          disabled={isCurrentPlan || plan.isComingSoon || isActivating}
          className={`w-full font-semibold text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
            isCurrentPlan ? 'bg-ink-100 text-ink-400 cursor-default' :
            plan.isComingSoon ? 'border border-ink-200 text-ink-400 cursor-not-allowed' :
            isPopular ? 'bg-brand-600 hover:bg-brand-700 text-white active:bg-brand-800' :
            'border border-ink-200 hover:border-brand-400 hover:bg-brand-50 text-ink-700'
          }`}
        >
          {isActivating ? (
            <><Loader2 size={16} className="animate-spin" />Activating…</>
          ) : isCurrentPlan ? (
            'Current plan'
          ) : plan.isComingSoon ? (
            'Coming soon'
          ) : (
            'Select plan'
          )}
        </button>
      </div>
    </div>
  );
}

function ActivationSuccess({ plan, onContinue }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-ink-50 animate-fade-in">
      <div className="w-24 h-24 bg-brand-50 rounded-3xl flex items-center justify-center mb-6">
        <CheckCircle size={48} className="text-brand-600" />
      </div>
      <h1 className="text-2xl font-bold text-ink-950">Welcome to {plan.name}!</h1>
      <p className="text-sm text-ink-500 mt-3 max-w-xs leading-relaxed">
        Your plan is now active. You can now post up to {plan.maxActiveListings} active listings
        {plan.sponsoredAdsAllowance > 0 ? ` and use ${plan.sponsoredAdsAllowance} sponsored ad placements` : ''}.
      </p>
      <div className="flex flex-col gap-3 mt-8 w-full max-w-sm">
        <button onClick={onContinue} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm py-3.5 rounded-xl transition-colors">
          Start listing
        </button>
      </div>
    </div>
  );
}
