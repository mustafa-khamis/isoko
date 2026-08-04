import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, CheckCircle, Crown, Loader2, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { usersApi } from '../../services/usersApi';
import './TraderPlans.css';

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
  },
];

export default function TraderPlans() {
  const { user, isLoading } = useAuth();
  const { isMobile, showAuth } = useUI();
  const navigate = useNavigate();
  const [activating, setActivating] = useState(null);
  const [activated, setActivated] = useState(null);

  if (isLoading) return <div className="page-loading" style={{ minHeight: '100vh' }}></div>;

  const currentPlan = user?.role === 'buyer' ? 'free' : 'trader-plus';

  const handleActivate = async (plan) => {
    if (!user) {
      showAuth('Sign in to upgrade your plan');
      return;
    }
    if (!plan.isAvailable || plan.isComingSoon || currentPlan === plan.id) return;

    setActivating(plan.id);
    try {
      await usersApi.updateProfile({ role: 'seller' });
      setTimeout(() => {
        setActivating(null);
        setActivated(plan.id);
      }, 1500);
    } catch (error) {
      console.error(error);
      setActivating(null);
    }
  };

  if (activated) {
    return <ActivationSuccess plan={PLANS.find((plan) => plan.id === activated)} onContinue={() => navigate('/')} />;
  }

  return (
    <div className="trader-plans-page">
      <header className={`trader-plans-header ${isMobile ? 'trader-plans-header--sticky' : ''}`}>
        <div className={`trader-plans-header__inner ${isMobile ? '' : 'trader-plans-header__inner--desktop'}`}>
          {isMobile && (
            <button onClick={() => navigate(-1)} className="trader-plans-back-button" aria-label="Go back">
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="trader-plans-title">Become a Trader</h1>
            <p className="trader-plans-subtitle">List more, reach more buyers</p>
          </div>
        </div>
      </header>

      <main className={`trader-plans-content ${isMobile ? '' : 'trader-plans-content--desktop'}`}>
        {user && (
          <section className="trader-current-plan">
            <div>
              <p className="trader-current-plan__label">Your current plan</p>
              <p className="trader-current-plan__name">
                {currentPlan === 'free' ? 'Free' : currentPlan === 'trader-plus' ? 'Trader Plus' : 'Trader Premium'}
              </p>
            </div>
            {currentPlan !== 'free' && <span className="trader-current-plan__badge">Active</span>}
          </section>
        )}

        <section className="trader-plans-benefits">
          <div className="trader-plans-benefits__title">
            <Zap size={20} />
            <h2>Why upgrade to Trader?</h2>
          </div>
          <p className="trader-plans-benefits__copy">
            Free sellers can post 2 listings every 7 days. As a Trader, you get more active listings,
            sponsored placements, and priority in search results.
          </p>
        </section>

        <div className={`trader-plans-grid ${isMobile ? '' : 'trader-plans-grid--desktop'}`}>
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrentPlan={currentPlan === plan.id}
              isActivating={activating === plan.id}
              onActivate={() => handleActivate(plan)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

function PlanCard({ plan, isCurrentPlan, isActivating, onActivate }) {
  const isPopular = plan.id === 'trader-plus';
  const cardModifier = isCurrentPlan
    ? 'trader-plan-card--current'
    : isPopular
      ? 'trader-plan-card--popular'
      : '';
  const buttonModifier = isCurrentPlan
    ? 'trader-plan-card__button--current'
    : plan.isComingSoon
      ? 'trader-plan-card__button--unavailable'
      : isPopular
        ? 'trader-plan-card__button--primary'
        : 'trader-plan-card__button--secondary';

  return (
    <article className={`trader-plan-card ${cardModifier}`}>
      {isPopular && !isCurrentPlan && <div className="trader-plan-card__ribbon">Most Popular</div>}
      {isCurrentPlan && <div className="trader-plan-card__ribbon trader-plan-card__ribbon--current">Your current plan</div>}

      <div className="trader-plan-card__body">
        <div className="trader-plan-card__heading">
          <PlanIcon planId={plan.id} />
          <h3 className="trader-plan-card__name">{plan.name}</h3>
        </div>

        <div className="trader-plan-card__price">
          {plan.isFree ? (
            <span className="trader-plan-card__price-value">Free</span>
          ) : plan.isComingSoon ? (
            <span className="trader-plan-card__coming-soon">Coming soon</span>
          ) : (
            <>
              <span className="trader-plan-card__price-value">RWF {plan.price?.toLocaleString()}</span>
              <span className="trader-plan-card__price-period">/month</span>
            </>
          )}
        </div>

        <ul className="trader-plan-card__features">
          {plan.features.map((feature) => (
            <li key={feature} className="trader-plan-card__feature">
              <Check size={14} className="trader-plan-card__feature-icon" />
              {feature}
            </li>
          ))}
        </ul>

        <button
          onClick={onActivate}
          disabled={isCurrentPlan || plan.isComingSoon || isActivating}
          className={`trader-plan-card__button ${buttonModifier}`}
        >
          {isActivating ? (
            <><Loader2 size={16} className="trader-plan-card__spinner" />Activating...</>
          ) : isCurrentPlan ? (
            'Current plan'
          ) : plan.isComingSoon ? (
            'Coming soon'
          ) : (
            'Select plan'
          )}
        </button>
      </div>
    </article>
  );
}

function PlanIcon({ planId }) {
  if (planId === 'free') {
    return <div className="trader-plan-card__icon trader-plan-card__icon--free">F</div>;
  }
  if (planId === 'trader-plus') {
    return <div className="trader-plan-card__icon trader-plan-card__icon--plus"><Zap size={14} /></div>;
  }
  return <div className="trader-plan-card__icon trader-plan-card__icon--premium"><Crown size={14} /></div>;
}

function ActivationSuccess({ plan, onContinue }) {
  return (
    <div className="trader-plan-success">
      <div className="trader-plan-success__icon"><CheckCircle size={48} /></div>
      <h1 className="trader-plan-success__title">Welcome to {plan.name}!</h1>
      <p className="trader-plan-success__copy">
        Your plan is now active. You can now post up to {plan.maxActiveListings} active listings
        {plan.sponsoredAdsAllowance > 0 ? ` and use ${plan.sponsoredAdsAllowance} sponsored ad placements` : ''}.
      </p>
      <button onClick={onContinue} className="trader-plan-success__button">Start listing</button>
    </div>
  );
}
