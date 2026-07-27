import { useState, useRef, useEffect } from 'react';
import { X, Eye, EyeOff, Mail, Lock, User, ShoppingBag, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { authApi } from '../../services/authApi';
import GoogleSignInButton from './GoogleSignInButton';

export default function AuthModal({ onClose, reason, initialMode = 'signin' }) {
  const { login } = useAuth();
  const { isMobile } = useUI();
  
  const [mode, setMode] = useState(initialMode === 'welcome' ? 'signin' : initialMode);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resetOtp, setResetOtp] = useState(['', '', '', '', '', '']);
  const [resendSeconds, setResendSeconds] = useState(60);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false); // duplicate-submission guard

  // ── Sign Up ──────────────────────────────────────────────────────────────

  const handleSignUp = async () => {
    if (submitting) return;
    const errs = {};
    if (!name.trim()) errs.name = 'Please enter your full name.';
    if (!email.includes('@')) errs.email = 'Please enter a valid email address.';
    if (password.length < 8) errs.password = 'Password must be at least 8 characters.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    
    setSubmitting(true);
    setLoading(true);
    setApiError('');
    try {
      await authApi.register({ email, password, full_name: name, client_type: 'web' });
      setMode('otp');
      setResendSeconds(60);
    } catch (err) {
      // Use the correct response shape: { success, message, error_code, errors }
      const msg =
        err.response?.data?.message ||
        'Registration failed. Please try again.';
      // Handle 503 — email service not configured
      if (err.response?.status === 503) {
        setApiError('Email service is temporarily unavailable. Please try again later.');
      } else {
        setApiError(msg);
      }
      // Modal stays open on failure — user can correct and retry
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };


  // ── Sign In ──────────────────────────────────────────────────────────────

  const handleSignIn = async () => {
    if (submitting) return;
    const errs = {};
    if (!email.includes('@')) errs.email = 'Please enter a valid email address.';
    if (!password) errs.password = 'Please enter your password.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    
    setSubmitting(true);
    setLoading(true);
    setApiError('');
    try {
      const res = await authApi.login({ email, password, client_type: 'web' });
      login(res.data.data.user, res.data.data.accessToken);
      onClose();
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || 'Invalid credentials or login failed.';
      // Handle 429 rate limit
      if (status === 429) {
        setApiError('Too many login attempts. Please wait a few minutes and try again.');
      } else {
        setApiError(msg);
      }
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  // ── OTP Verify ───────────────────────────────────────────────────────────

  const handleOtpSubmit = async () => {
    if (submitting) return;
    const code = otp.join('');
    if (code.length !== 6) return;
    
    setSubmitting(true);
    setLoading(true);
    setApiError('');
    try {
      const res = await authApi.verifyEmail({ email, code, client_type: 'web' });
      const data = res.data?.data;
      if (data?.accessToken && data?.user) {
        // Server created a session on first-time verification — log the user in now
        login(data.user, data.accessToken);
        onClose();
      } else {
        // Idempotent path (already verified) — just move to success screen
        setMode('success');
      }
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || 'Verification failed. Please check the code.';
      if (status === 429) {
        setApiError('Too many verification attempts. Please request a new code.');
      } else {
        setApiError(msg);
      }
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  // ── Resend Code ──────────────────────────────────────────────────────────

  const handleResendCode = async () => {
    if (loading) return;
    setLoading(true);
    setApiError('');
    try {
      await authApi.resendVerificationCode({ email });
      setResendSeconds(60);
    } catch (err) {
      const status = err.response?.status;
      if (status === 429) {
        setApiError('Too many resend requests. Please wait before trying again.');
      } else if (status === 503) {
        setApiError('Email service is temporarily unavailable. Please try again later.');
      } else {
        setApiError(err.response?.data?.message || 'Resend failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot Password ──────────────────────────────────────────────────────

  const handleForgot = async () => {
    if (submitting) return;
    setSubmitting(true);
    setLoading(true);
    setApiError('');
    try {
      await authApi.forgotPassword({ email });
      setResetOtp(['', '', '', '', '', '']);
      setMode('reset');
    } catch (err) {
      const status = err.response?.status;
      if (status === 429) {
        setApiError('Too many requests. Please wait before trying again.');
      } else if (status === 503) {
        setApiError('Email service is temporarily unavailable. Please try again later.');
      } else {
        setApiError(err.response?.data?.message || 'Failed to send reset code. Please try again.');
      }
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  // ── Reset Password ───────────────────────────────────────────────────────

  const handleReset = async (newPassword) => {
    if (submitting) return;
    const code = resetOtp.join('');
    if (code.length !== 6) return;

    setSubmitting(true);
    setLoading(true);
    setApiError('');
    try {
      // Correct API: { email, code, new_password }
      await authApi.resetPassword({ email, code, new_password: newPassword });
      setMode('signin');
      setPassword('');
      setApiError('');
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || 'Password reset failed. Please check the code and try again.';
      if (status === 429) {
        setApiError('Too many attempts. Please request a new reset code.');
      } else {
        setApiError(msg);
      }
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  const handleSuccess = () => {
    setMode('signin');
  };

  // ── Countdown for resend button ──────────────────────────────────────────

  useEffect(() => {
    if (mode !== 'otp') return;
    const interval = setInterval(() => {
      setResendSeconds(s => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [mode]);

  const containerClass = isMobile ? 'auth-modal-mobile' : 'auth-modal-content';

  return (
    <div className={containerClass}>
      <div className="auth-header">
        <button
          onClick={onClose}
          className="auth-back-btn"
        >
          <X size={20} />
        </button>
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <ShoppingBag size={12} strokeWidth={2.5} color="white" />
          </div>
          <span>isoko</span>
        </div>
        <div style={{width: 32}} />
      </div>

      <div className="auth-body">
        {reason && (
          <div className="auth-reason">
            {reason}
          </div>
        )}
        
        {apiError && (
          <div className="auth-error-banner">
            <AlertCircle size={16} />
            {apiError}
          </div>
        )}

        {mode === 'signup'  && <SignUpForm name={name} email={email} password={password} showPass={showPass} errors={errors} loading={loading} onName={setName} onEmail={setEmail} onPass={setPassword} onTogglePass={() => setShowPass(s => !s)} onSubmit={handleSignUp} onSwitch={() => {setMode('signin'); setApiError('');}} onClose={onClose} />}
        {mode === 'signin'  && <SignInForm email={email} password={password} showPass={showPass} errors={errors} loading={loading} onEmail={setEmail} onPass={setPassword} onTogglePass={() => setShowPass(s => !s)} onSubmit={handleSignIn} onSwitch={() => {setMode('signup'); setApiError('');}} onForgot={() => {setMode('forgot'); setApiError('');}} onClose={onClose} />}
        {mode === 'otp'     && <OtpScreen email={email} otp={otp} setOtp={setOtp} loading={loading} resendSeconds={resendSeconds} onResend={handleResendCode} onSubmit={handleOtpSubmit} />}
        {mode === 'forgot'  && <ForgotPassword email={email} onEmail={setEmail} onSend={handleForgot} loading={loading} onBack={() => {setMode('signin'); setApiError('');}} />}
        {mode === 'reset'   && <ResetPassword resetOtp={resetOtp} setResetOtp={setResetOtp} onReset={handleReset} loading={loading} email={email} />}
        {mode === 'success' && <SuccessScreen onContinue={handleSuccess} />}
      </div>
    </div>
  );
}

// ── Subcomponents ────────────────────────────────────────────────────────────

function Divider() {
  return (
    <div className="auth-divider">
      <div className="auth-divider-line" />
      <span className="auth-divider-text">or continue with email</span>
      <div className="auth-divider-line" />
    </div>
  );
}

function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <div className="auth-field-error">
      <AlertCircle size={12} />
      <span>{msg}</span>
    </div>
  );
}

function SignUpForm({ name, email, password, showPass, errors, loading, onName, onEmail, onPass, onTogglePass, onSubmit, onSwitch, onClose }) {
  return (
    <div className="animate-fade-in">
      <h1 className="auth-title">Create your account</h1>
      <p className="auth-subtitle text-left">Only your name, email, and password — that's it.</p>
      <GoogleSignInButton onSuccess={onClose} />
      <Divider />
      <div className="auth-form">
        <div>
          <label className="auth-label">Full name</label>
          <div className="auth-input-group">
            <User size={16} />
            <input type="text" placeholder="Amahoro Jean" value={name} onChange={e => onName(e.target.value)} />
          </div>
          <FieldError msg={errors.name} />
        </div>
        <div>
          <label className="auth-label">Email address</label>
          <div className="auth-input-group">
            <Mail size={16} />
            <input type="email" placeholder="you@example.com" value={email} onChange={e => onEmail(e.target.value)} />
          </div>
          <FieldError msg={errors.email} />
        </div>
        <div>
          <label className="auth-label">Password</label>
          <div className="auth-input-group">
            <Lock size={16} />
            <input type={showPass ? 'text' : 'password'} placeholder="Minimum 8 characters" value={password} onChange={e => onPass(e.target.value)} />
            <button type="button" onClick={onTogglePass}>
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <FieldError msg={errors.password} />
        </div>
        <button onClick={onSubmit} disabled={loading} className="auth-btn-primary">
          {loading && <Loader2 size={16} className="animate-spin" />}
          Create account
        </button>
        <p className="auth-footer-text">
          Already have an account? <button onClick={onSwitch}>Sign in</button>
        </p>
      </div>
    </div>
  );
}

function SignInForm({ email, password, showPass, errors, loading, onEmail, onPass, onTogglePass, onSubmit, onSwitch, onForgot, onClose }) {
  return (
    <div className="animate-fade-in">
      <h1 className="auth-title">Welcome back</h1>
      <p className="auth-subtitle text-left">Sign in to your Isoko account.</p>
      <GoogleSignInButton onSuccess={onClose} />
      <Divider />
      <div className="auth-form">
        <div>
          <label className="auth-label">Email address</label>
          <div className="auth-input-group">
            <Mail size={16} />
            <input type="email" placeholder="you@example.com" value={email} onChange={e => onEmail(e.target.value)} />
          </div>
          <FieldError msg={errors.email} />
        </div>
        <div>
          <div style={{display:'flex', justifyContent:'space-between', marginBottom:'0.375rem'}}>
            <label className="auth-label" style={{marginBottom: 0}}>Password</label>
            <button onClick={onForgot} className="auth-forgot-btn">Forgot password?</button>
          </div>
          <div className="auth-input-group">
            <Lock size={16} />
            <input type={showPass ? 'text' : 'password'} placeholder="Your password" value={password} onChange={e => onPass(e.target.value)} />
            <button type="button" onClick={onTogglePass}>
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <FieldError msg={errors.password} />
        </div>
        <button onClick={onSubmit} disabled={loading} className="auth-btn-primary">
          {loading && <Loader2 size={16} className="animate-spin" />}
          Sign in
        </button>
        <p className="auth-footer-text">
          Don't have an account? <button onClick={onSwitch}>Create one free</button>
        </p>
      </div>
    </div>
  );
}

function OtpScreen({ email, otp, setOtp, loading, resendSeconds, onResend, onSubmit }) {
  const refs = useRef([]);
  const handleChange = (i, val) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[i] = digit;
    setOtp(newOtp);
    if (digit && i < 5) refs.current[i + 1]?.focus();
  };
  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) refs.current[i - 1]?.focus();
  };
  return (
    <div className="animate-fade-in text-center">
      <div className="auth-otp-icon"><Mail size={28} /></div>
      <h1 className="auth-title">Check your email</h1>
      <p className="auth-subtitle">We sent a 6-digit code to <b>{email}</b>.</p>
      <div className="auth-otp-inputs">
        {otp.map((digit, i) => (
          <input key={i} ref={el => refs.current[i] = el} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={e => handleChange(i, e.target.value)} onKeyDown={e => handleKeyDown(i, e)} className="auth-otp-input" />
        ))}
      </div>
      <button onClick={onSubmit} disabled={loading || otp.join('').length !== 6} className="auth-btn-primary">
        {loading && <Loader2 size={16} className="animate-spin" />} Verify email
      </button>
      <div className="auth-resend-text mt-4">
        {resendSeconds > 0 ? <span>Resend in {resendSeconds}s</span> : <button onClick={onResend}>Resend code</button>}
      </div>
    </div>
  );
}

function ForgotPassword({ email, onEmail, onSend, loading, onBack }) {
  return (
    <div className="animate-fade-in">
      <h1 className="auth-title">Reset password</h1>
      <p className="auth-subtitle text-left">Enter your email address and we'll send a reset code.</p>
      <div className="auth-form">
        <div>
          <label className="auth-label">Email</label>
          <div className="auth-input-group">
            <Mail size={16} />
            <input type="email" placeholder="you@example.com" value={email} onChange={e => onEmail(e.target.value)} />
          </div>
        </div>
        <button onClick={onSend} disabled={loading} className="auth-btn-primary">
          {loading && <Loader2 size={16} className="animate-spin" />} Send reset code
        </button>
        <button onClick={onBack} className="auth-back-link">← Back to sign in</button>
      </div>
    </div>
  );
}

function ResetPassword({ resetOtp, setResetOtp, onReset, loading, email }) {
  const refs = useRef([]);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const code = resetOtp.join('');
  const match = password === confirm && password.length >= 8 && code.length === 6;

  const handleChange = (i, val) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const newOtp = [...resetOtp];
    newOtp[i] = digit;
    setResetOtp(newOtp);
    if (digit && i < 5) refs.current[i + 1]?.focus();
  };
  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !resetOtp[i] && i > 0) refs.current[i - 1]?.focus();
  };

  return (
    <div className="animate-fade-in">
      <h1 className="auth-title">Set new password</h1>
      <p className="auth-subtitle text-left">Enter the 6-digit code sent to <b>{email}</b> and choose a new password.</p>
      <div className="auth-form">
        {/* OTP code entry */}
        <div>
          <label className="auth-label">Reset code</label>
          <div className="auth-otp-inputs" style={{justifyContent:'flex-start', gap:'8px'}}>
            {resetOtp.map((digit, i) => (
              <input key={i} ref={el => refs.current[i] = el} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={e => handleChange(i, e.target.value)} onKeyDown={e => handleKeyDown(i, e)} className="auth-otp-input" />
            ))}
          </div>
        </div>
        <div>
          <label className="auth-label">New password</label>
          <div className="auth-input-group">
            <Lock size={16} />
            <input type="password" placeholder="Minimum 8 characters" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="auth-label">Confirm password</label>
          <div className="auth-input-group">
            <Lock size={16} />
            <input type="password" placeholder="Repeat new password" value={confirm} onChange={e => setConfirm(e.target.value)} />
          </div>
        </div>
        <button onClick={() => onReset(password)} disabled={loading || !match} className="auth-btn-primary">
          {loading && <Loader2 size={16} className="animate-spin" />} Update password
        </button>
      </div>
    </div>
  );
}

function SuccessScreen({ onContinue }) {
  return (
    <div className="animate-fade-in text-center">
      <div className="auth-success-icon"><CheckCircle size={40} /></div>
      <h1 className="auth-title">Email verified!</h1>
      <p className="auth-subtitle">Your account is ready. Sign in to continue.</p>
      <button onClick={onContinue} className="auth-btn-primary mt-6">Sign In</button>
    </div>
  );
}
