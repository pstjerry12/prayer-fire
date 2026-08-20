'use client';

import { useState } from 'react';
import {
  X,
  Flame,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Check,
  Loader2,
  User as UserIcon,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { COUNTRY_CODES, DEFAULT_COUNTRY } from '@/lib/countryCodes';
import { apiRegister, apiLogin, type AuthUser } from '@/lib/authClient';
import { TERMS_SECTIONS, PRIVACY_SECTIONS } from '@/app/data/legal';
import LegalModal from './LegalModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: AuthUser) => void;
  initialMode?: 'login' | 'register';
}

type Mode = 'login' | 'register';

export default function AuthModal({ isOpen, onClose, onSuccess, initialMode = 'login' }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login fields
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isHuman, setIsHuman] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [legalDoc, setLegalDoc] = useState<'terms' | 'privacy' | null>(null);

  if (!isOpen) return null;

  // Password strength: 0 = empty, 1 = weak, 2 = fair, 3 = strong, 4 = very strong.
  const strength = (() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return Math.min(4, score);
  })();

  const strengthLabel = ['', 'Weak', 'Fair', 'Strong', 'Very Strong'][strength];
  const strengthColor = [
    '',
    'bg-red-500',
    'bg-amber-500',
    'bg-emerald-500',
    'bg-emerald-600',
  ][strength];
  const strengthTextColor = [
    '',
    'text-red-500',
    'text-amber-600',
    'text-emerald-600',
    'text-emerald-700',
  ][strength];

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !loginPassword) {
      setError('Please enter your email/phone and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { user } = await apiLogin(identifier, loginPassword);
      onSuccess(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setError('Please provide an email address or phone number.');
      return;
    }
    if (!isHuman) {
      setError('Please confirm you are human to continue.');
      return;
    }
    if (!agreedTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { user } = await apiRegister({
        name,
        email,
        phone,
        countryCode: country.dial,
        password,
      });
      onSuccess(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4 py-10">
        <div className="bg-card rounded-3xl w-full max-w-md border border-edge shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-edge flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-danger-soft ring-1 ring-red-200 flex items-center justify-center overflow-hidden">
                <img src="/logo.png" alt="Prayer Fire Movement" className="w-full h-full object-cover" />
              </div>
              <div>
                <h2 className="font-serif-heading text-lg font-bold text-ink">
                  {mode === 'login' ? 'Welcome Back' : 'Join the Movement'}
                </h2>
                <p className="text-ink-muted text-xs">
                  {mode === 'login' ? 'Sign in to continue your prayer journey' : 'Create your Prayer Fire account'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-card-3 rounded-full text-ink-muted">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="grid grid-cols-2 border-b border-edge">
            <button
              onClick={() => switchMode('login')}
              className={cn(
                'py-3 text-sm font-bold transition-all border-b-2',
                mode === 'login'
                  ? 'text-acc border-emerald-600'
                  : 'text-ink-faint border-transparent hover:text-ink-muted'
              )}
            >
              Sign In
            </button>
            <button
              onClick={() => switchMode('register')}
              className={cn(
                'py-3 text-sm font-bold transition-all border-b-2',
                mode === 'register'
                  ? 'text-acc border-emerald-600'
                  : 'text-ink-faint border-transparent hover:text-ink-muted'
              )}
            >
              Create Account
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Google sign-in (real OAuth) */}
            <button
              type="button"
              onClick={() => {
                window.location.href = '/api/auth/google/start';
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-card border border-edge-strong text-ink rounded-xl text-sm font-bold hover:bg-card-2 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-card-3" />
              <span className="text-ink-faint text-xs">or</span>
              <div className="h-px flex-1 bg-card-3" />
            </div>

            {error && (
              <div className="bg-danger-soft border border-danger-edge rounded-xl p-3 text-danger text-xs">
                {error}
              </div>
            )}

            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-3">
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
                  <input
                    type="text"
                    placeholder="Email or phone number"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full bg-card border border-edge-strong rounded-xl pl-10 pr-4 py-3 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-card border border-edge-strong rounded-xl pl-10 pr-11 py-3 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-muted"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Sign In
                </button>
                <p className="text-center text-ink-muted text-xs">
                  No account?{' '}
                  <button type="button" onClick={() => switchMode('register')} className="text-acc font-semibold hover:text-emerald-500">
                    Create one
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3">
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
                  <input
                    type="text"
                    placeholder="Full name (optional)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-card border border-edge-strong rounded-xl pl-10 pr-4 py-3 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-card border border-edge-strong rounded-xl pl-10 pr-4 py-3 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-shrink-0">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none" />
                    <select
                      value={country.code}
                      onChange={(e) => {
                        const c = COUNTRY_CODES.find((cc) => cc.code === e.target.value);
                        if (c) setCountry(c);
                      }}
                      className="bg-card border border-edge-strong rounded-xl pl-10 pr-2 py-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 appearance-none cursor-pointer"
                      title={country.name}
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.dial}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="tel"
                    placeholder="Phone number (optional)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1 min-w-0 bg-card border border-edge-strong rounded-xl px-4 py-3 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password (min. 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-card border border-edge-strong rounded-xl pl-10 pr-11 py-3 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-muted"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength meter */}
                {password && (
                  <div>
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4].map((seg) => (
                        <div
                          key={seg}
                          className={cn(
                            'h-1.5 flex-1 rounded-full transition-colors',
                            strength >= seg ? strengthColor : 'bg-card-3'
                          )}
                        />
                      ))}
                    </div>
                    <p className={cn('text-[11px] font-semibold', strengthTextColor)}>
                      Password strength: {strengthLabel}
                    </p>
                  </div>
                )}

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-card border border-edge-strong rounded-xl pl-10 pr-4 py-3 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                  />
                </div>

                {/* Human confirmation */}
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <button
                    type="button"
                    onClick={() => setIsHuman(!isHuman)}
                    className={cn(
                      'mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all',
                      isHuman ? 'bg-emerald-600 border-emerald-600' : 'border-edge-strong bg-card'
                    )}
                  >
                    {isHuman && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                  <span className="text-ink-muted text-xs leading-relaxed">
                    I confirm I am human. My prayer points are private and protected.
                  </span>
                </label>

                {/* Terms & Privacy */}
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <button
                    type="button"
                    onClick={() => setAgreedTerms(!agreedTerms)}
                    className={cn(
                      'mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all',
                      agreedTerms ? 'bg-emerald-600 border-emerald-600' : 'border-edge-strong bg-card'
                    )}
                  >
                    {agreedTerms && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                  <span className="text-ink-muted text-xs leading-relaxed">
                    I agree to the{' '}
                    <button type="button" onClick={() => setLegalDoc('terms')} className="text-acc font-semibold hover:underline">
                      Terms of Service
                    </button>{' '}
                    and{' '}
                    <button type="button" onClick={() => setLegalDoc('privacy')} className="text-acc font-semibold hover:underline">
                      Privacy Policy
                    </button>
                    .
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Account
                </button>
              </form>
            )}

            {/* Guest option */}
            <button
              onClick={onClose}
              className="w-full text-center text-ink-faint text-xs hover:text-ink-muted transition-colors py-1"
            >
              Continue as guest
            </button>
          </div>
        </div>
      </div>

      {/* Terms / Privacy modals */}
      <LegalModal
        isOpen={legalDoc === 'terms'}
        title="Terms of Service"
        sections={TERMS_SECTIONS}
        onClose={() => setLegalDoc(null)}
      />
      <LegalModal
        isOpen={legalDoc === 'privacy'}
        title="Privacy Policy"
        sections={PRIVACY_SECTIONS}
        onClose={() => setLegalDoc(null)}
      />
    </div>
  );
}
