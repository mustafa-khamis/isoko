import { useState, useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, CheckCircle, Crown, Loader2, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { usersApi } from '../../services/usersApi';
import './TraderPlans.css';
import { subscriptionsApi } from '../../services/subscriptionsApi';
import { buildPlanFeatures, getPlanDescription } from '../../utils/planFeatures';

export default function TraderPlans() {
  const { user, isLoading, updateUser } = useAuth();
  const { isMobile, showAuth } = useUI();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [error, setError] = useState(null);
  const [activating, setActivating] = useState(null);
  const [activated, setActivated] = useState(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await subscriptionsApi.getPlans();
        setPlans(response.data?.data || []);
      } catch (err) {
        setError('Failed to load plans. Please try again later.');
        console.error('Error fetching plans:', err);
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, []);

  if (isLoading || loadingPlans) return <div className="page-loading" style={{ minHeight: '100vh' }}><Loader2 className="spinner" /></div>;

  const currentPlanCode = user?.selling_plan?.code || 'free';
  const currentPlanName = user?.selling_plan?.name || 'Free';

  const handleActivate = async (plan) => {
    if (!user) {
      showAuth('Sign in to upgrade your plan');
      return;
    }
    if (!plan.is_active || currentPlanCode === plan.code) return;

    setActivating(plan.id);
    try {
      await subscriptionsApi.subscribe(plan.id, 'momo');
      // Refresh user to get updated selling_plan
      const userRes = await usersApi.getMe();
      if (userRes.data?.data) {
        updateUser(userRes.data.data);
      }
      setActivating(null);
      setActivated(plan);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to activate plan.');
      setActivating(null);
    }
  };

  if (activated) {
    return <ActivationSuccess plan={activated} onContinue={() => navigate('/')} />;
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
              <p className="trader-current-plan__name">{currentPlanName}</p>
            </div>
            {currentPlanCode !== 'free' && <span className="trader-current-plan__badge">Active</span>}
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

        {error && <div className="error-message" style={{ color: 'red', textAlign: 'center', marginBottom: '1rem' }}>{error}</div>}

        <div className={`trader-plans-grid ${isMobile ? '' : 'trader-plans-grid--desktop'}`}>
          {plans.length === 0 && !error ? (
            <p style={{ textAlign: 'center', width: '100%' }}>No plans available at the moment.</p>
          ) : (
            plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrentPlan={currentPlanCode === plan.code}
                isActivating={activating === plan.id}
                onActivate={() => handleActivate(plan)}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
}

function PlanCard({ plan, isCurrentPlan, isActivating, onActivate }) {
  const isPopular = plan.code === 'trader_plus' || plan.code === 'trader-plus';
  const cardModifier = isCurrentPlan
    ? 'trader-plan-card--current'
    : isPopular
      ? 'trader-plan-card--popular'
      : '';
  const buttonModifier = isCurrentPlan
    ? 'trader-plan-card__button--current'
    : !plan.is_active
      ? 'trader-plan-card__button--unavailable'
      : isPopular
        ? 'trader-plan-card__button--primary'
        : 'trader-plan-card__button--secondary';

  const planFeatures = buildPlanFeatures(plan);
  const planDescription = getPlanDescription(plan.code);

  return (
    <article className={`trader-plan-card ${cardModifier}`}>
      {isPopular && !isCurrentPlan && <div className="trader-plan-card__ribbon">Most Popular</div>}
      {isCurrentPlan && <div className="trader-plan-card__ribbon trader-plan-card__ribbon--current">Your current plan</div>}

      <div className="trader-plan-card__body">
        <div className="trader-plan-card__heading">
          <PlanIcon planCode={plan.code} />
          <h3 className="trader-plan-card__name">{plan.name}</h3>
        </div>

        <p className="trader-plan-card__description" style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem', lineHeight: '1.4' }}>
          {planDescription}
        </p>

        <div className="trader-plan-card__price">
          {plan.is_free ? (
            <span className="trader-plan-card__price-value">Free</span>
          ) : !plan.is_active ? (
            <span className="trader-plan-card__coming-soon">Coming soon</span>
          ) : (
            <>
              <span className="trader-plan-card__price-value">RWF {Number(plan.price_rwf)?.toLocaleString()}</span>
              {plan.billing_period_days > 0 && <span className="trader-plan-card__price-period">/{plan.billing_period_days} days</span>}
            </>
          )}
        </div>

        <ul className="trader-plan-card__features">
          {planFeatures.map((feature, index) => (
            <li key={index} className="trader-plan-card__feature">
              <Check size={14} className="trader-plan-card__feature-icon" />
              {feature}
            </li>
          ))}
        </ul>

        <button
          onClick={onActivate}
          disabled={isCurrentPlan || !plan.is_active || isActivating}
          className={`trader-plan-card__button ${buttonModifier}`}
        >
          {isActivating ? (
            <><Loader2 size={16} className="trader-plan-card__spinner" />Activating...</>
          ) : isCurrentPlan ? (
            'Current plan'
          ) : !plan.is_active ? (
            'Coming soon'
          ) : (
            'Select plan'
          )}
        </button>
      </div>
    </article>
  );
}

function PlanIcon({ planCode }) {
  if (planCode === 'free') {
    return <div className="trader-plan-card__icon trader-plan-card__icon--free">F</div>;
  }
  if (planCode === 'trader_plus' || planCode === 'trader-plus') {
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
        Your plan is now active. You can now post {plan.max_active_listings ? `up to ${plan.max_active_listings}` : 'unlimited'} active listings
        {plan.max_sponsored_ads_per_period > 0 ? ` and use ${plan.max_sponsored_ads_per_period} sponsored ad placements` : ''}.
      </p>
      <button onClick={onContinue} className="trader-plan-success__button">Start listing</button>
    </div>
  );
}
