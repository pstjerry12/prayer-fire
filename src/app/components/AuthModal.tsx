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
  Loader2,
  User as UserIcon,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { COUNTRY_CODES, DEFAULT_COUNTRY } from '@/lib/countryCodes';
import { apiRegister, apiLogin, type AuthUser } from '@/lib/authClient';

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

  if (!isOpen) return null;

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
    </div>
  );
}
