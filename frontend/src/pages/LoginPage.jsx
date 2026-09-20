/* =========================================================================
   LOGIN & SIGN UP PAGE — Resilio Emergency Response Console
   Theme: Bright White Theme, Daylight Aerial Cartography Hero,
   Consistent with app typography (Inter/Geist sans-serif) and brand colors (Blue-600).
   ========================================================================= */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Eye, EyeOff, AlertCircle, CheckCircle2,
  Lock, Mail, User, Building2, ChevronRight, ArrowRight
} from 'lucide-react';
import { useStore, DEMO_USERS } from '../lib/store';
import { BackgroundMap } from '../components/map/BackgroundMap';

const ROLE_PRESETS = [
  { id: 'COMMANDER',  label: 'Commander',   badge: 'bg-red-50 text-red-700 border-red-200',      email: 'commander@prahari.in' },
  { id: 'DISPATCHER', label: 'Dispatcher',  badge: 'bg-blue-50 text-blue-700 border-blue-200',    email: 'dispatch@prahari.in' },
  { id: 'ANALYST',    label: 'Analyst',     badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', email: 'analyst@prahari.in' },
  { id: 'FIELD_UNIT', label: 'Field Unit',  badge: 'bg-amber-50 text-amber-700 border-amber-200',   email: 'unit07@prahari.in' },
  { id: 'ADMIN',      label: 'Admin',       badge: 'bg-purple-50 text-purple-700 border-purple-200', email: 'admin@prahari.in' },
];

export function LoginPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, login, register, logout, authLoading } = useStore();

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'

  // Sign In State
  const [email, setEmail] = useState('dispatch@prahari.in');
  const [password, setPassword] = useState('prahari123');
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Sign Up State
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupRole, setSignupRole] = useState('DISPATCHER');
  const [signupStation, setSignupStation] = useState('Ahmedabad Central HQ');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPass, setShowSignupPass] = useState(false);

  // Feedback messages
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const executeLogin = async (emailToUse, passToUse) => {
    setErrorMessage('');
    setSuccessMessage('');
    const res = await login(emailToUse, passToUse);
    if (res.ok) {
      navigate('/ops');
    } else {
      setErrorMessage(res.error || 'Invalid credentials. Check email and password.');
    }
  };

  const handleSignInSubmit = async (e) => {
    e.preventDefault();
    await executeLogin(email, password);
  };

  const handleQuickLogin = (demoEmail, autoSubmit = false) => {
    const demo = DEMO_USERS.find(u => u.email === demoEmail);
    if (demo) {
      setEmail(demo.email);
      setPassword(demo.password);
      if (autoSubmit) {
        executeLogin(demo.email, demo.password);
      }
    }
  };

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!signupName.trim()) {
      setErrorMessage('Please provide operator full name.');
      return;
    }
    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      setErrorMessage('Please enter a valid official email address.');
      return;
    }
    if (!signupPassword || signupPassword.length < 4) {
      setErrorMessage('Password must be at least 4 characters.');
      return;
    }

    const res = await register({
      name: signupName.trim(),
      email: signupEmail.trim(),
      role: signupRole,
      station_id: signupStation.trim() || null,
      password: signupPassword,
    });

    if (res.ok) {
      setSuccessMessage('Account created! Entering operational console…');
      setTimeout(() => {
        navigate('/ops');
      }, 500);
    } else {
      setErrorMessage(res.error || 'Account creation failed.');
    }
  };

  return (
    <div className="min-h-full w-full relative flex items-center justify-center p-3 sm:p-6 lg:p-8 bg-slate-900 overflow-y-auto font-sans">
      {/* ── Aerial City View Satellite Background with Subtle 3px Blur ── */}
      <div
        className="absolute inset-0 z-0 scale-105 pointer-events-none filter blur-[3px] brightness-95 contrast-105 opacity-95"
        style={{
          backgroundImage: `url('/satellite-hero.jpg')`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
        }}
      />
      {/* Subtle overlay for depth and contrast */}
      <div className="absolute inset-0 z-0 bg-slate-950/20 pointer-events-none" />

      {/* ── Outer White Card Frame ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[1060px] rounded-[32px] sm:rounded-[36px] bg-white border border-slate-200/90 shadow-2xl p-3 sm:p-4 my-auto overflow-hidden"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 min-h-[620px] lg:min-h-[660px]">

          {/* ───────────────────────────────────────────────────────────
              LEFT COLUMN: DAYLIGHT METROPOLITAN SHOWCASE CARD
              ─────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-6 relative rounded-[24px] sm:rounded-[28px] overflow-hidden min-h-[380px] lg:min-h-full flex flex-col justify-between p-6 sm:p-9 text-white select-none shadow-sm">
            {/* High-res daylight aerial photograph with helipad */}
            <img
              src="/satellite-hero.jpg"
              alt="Metropolitan Emergency Command Grid"
              className="absolute inset-0 w-full h-full object-cover object-center"
            />

            {/* Clean balanced gradients for supreme text legibility without making the image dark */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-transparent to-transparent h-44" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-transparent mt-auto h-72" />

            {/* Top Directive Tag (Inter/Geist font, uppercase tracking) */}
            <div className="relative z-10 flex items-center gap-2.5">
              <span className="text-[11px] font-bold tracking-[0.2em] text-white/90 uppercase drop-shadow-xs">
                MUNICIPAL EMERGENCY NETWORK
              </span>
              <div className="h-[1.5px] w-12 bg-white/60" />
            </div>

            {/* Bottom Headline & Narrative (Clean sans-serif consistent with app) */}
            <div className="relative z-10 mt-auto pt-12">
              <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-bold text-white tracking-tight leading-snug drop-shadow-sm">
                Every Second Counts In Critical Response.
              </h2>
              <p className="mt-2.5 text-xs sm:text-[13px] text-slate-100/90 font-medium leading-relaxed max-w-md drop-shadow-xs">
                Intelligent multi-agency incident management, automated fleet dispatch, and live GIS situational awareness for municipal resilience.
              </p>

              {/* Status pill on image */}
              <div className="mt-5 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 w-fit text-[11px] font-medium text-white shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Ahmedabad Operations Grid · Live Daylight Feed</span>
              </div>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────
              RIGHT COLUMN: CLEAN WHITE AUTH FORM
              ───────────────────────────────────────────────────────── */}
          <div className="lg:col-span-6 flex flex-col justify-between p-4 sm:p-8 lg:p-10 bg-white rounded-[24px] sm:rounded-[28px]">

            {/* Top Brand Header (Consistent with Navbar logo) */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/25">
                  <ShieldCheck size={18} strokeWidth={2.4} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-bold text-slate-900 tracking-tight">Resilio</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 border border-sky-200">
                    Ops
                  </span>
                </div>
              </div>

              {/* Active session pill if logged in */}
              {isAuthenticated && user && (
                <button
                  type="button"
                  onClick={() => navigate('/ops')}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer transition-colors"
                >
                  <span>Open Console</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>

            {/* Form Container */}
            <div className="my-auto max-w-[380px] w-full mx-auto">
              {/* Heading (Consistent font-sans typography) */}
              <div className="text-center mb-6">
                <h1 className="text-2xl sm:text-[30px] font-extrabold text-slate-900 tracking-tight leading-tight">
                  {mode === 'signin' ? 'Welcome Back' : 'Create Operator Account'}
                </h1>
                <p className="text-xs font-medium text-slate-500 mt-1">
                  {mode === 'signin'
                    ? 'Enter your operator credentials to access the console'
                    : 'Register a new municipal operator profile'
                  }
                </p>
              </div>

              {/* Error Message */}
              <AnimatePresence>
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-2 p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium"
                  >
                    <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-600" />
                    <span>{errorMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Success Message */}
              <AnimatePresence>
                {successMessage && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium"
                  >
                    <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                    <span>{successMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ───────────────────────────────────────────────────────
                  MODE: SIGN IN
                  ─────────────────────────────────────────────────────── */}
              {mode === 'signin' ? (
                <form onSubmit={handleSignInSubmit} className="space-y-4">
                  {/* Email Input */}
                  <div>
                    <label
                      htmlFor="signin-email"
                      className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                    >
                      Email / Operator ID
                    </label>
                    <div className="relative">
                      <input
                        id="signin-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="dispatch@prahari.in"
                        className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none transition-colors"
                        required
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div>
                    <label
                      htmlFor="signin-password"
                      className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="signin-password"
                        type={showPass ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-11 px-3.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none transition-colors"
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                        aria-label={showPass ? 'Hide password' : 'Show password'}
                      >
                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me & Password Hint */}
                  <div className="flex items-center justify-between text-xs text-slate-600 pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                      />
                      <span className="font-medium">Remember me</span>
                    </label>
                    <span className="text-slate-400 font-medium">
                      Pass: <span className="font-bold text-slate-700">prahari123</span>
                    </span>
                  </div>

                  {/* Blue-600 Primary Button (Consistent with app primary button) */}
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full h-11 mt-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {authLoading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        Authenticating…
                      </span>
                    ) : (
                      'Sign In & Launch Console'
                    )}
                  </button>

                  {/* ── Quick Operator 1-Click Select Chips ─────────── */}
                  <div className="pt-3.5 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Quick Operator Select
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        1-Click Autofill
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {ROLE_PRESETS.map((r) => {
                        const isSelected = email === r.email;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => handleQuickLogin(r.email, false)}
                            className={`
                              px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1
                              ${isSelected
                                ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-xs'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }
                            `}
                          >
                            <span>{r.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </form>
              ) : (
                /* ───────────────────────────────────────────────────────
                    MODE: SIGN UP
                    ─────────────────────────────────────────────────────── */
                <form onSubmit={handleSignUpSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      placeholder="Officer Arjun Shah"
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Official Email
                    </label>
                    <input
                      type="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="arjun@prahari.in"
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Role
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { id: 'DISPATCHER', label: 'Dispatcher' },
                        { id: 'COMMANDER',  label: 'Commander' },
                        { id: 'ANALYST',    label: 'Analyst' },
                        { id: 'FIELD_UNIT', label: 'Field' },
                        { id: 'ADMIN',      label: 'Admin' },
                      ].map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setSignupRole(r.id)}
                          className={`
                            py-1 px-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center
                            ${signupRole === r.id
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }
                          `}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Create Password
                    </label>
                    <div className="relative">
                      <input
                        type={showSignupPass ? 'text' : 'password'}
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-10 px-3.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none transition-colors"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPass(!showSignupPass)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                      >
                        {showSignupPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full h-11 mt-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {authLoading ? 'Registering…' : 'Create Account & Sign In'}
                  </button>
                </form>
              )}
            </div>

            {/* Bottom Switch Link */}
            <div className="text-center pt-4">
              {mode === 'signin' ? (
                <p className="text-xs text-slate-500 font-medium">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('signup'); setErrorMessage(''); setSuccessMessage(''); }}
                    className="font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Sign Up
                  </button>
                </p>
              ) : (
                <p className="text-xs text-slate-500 font-medium">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('signin'); setErrorMessage(''); setSuccessMessage(''); }}
                    className="font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Sign In
                  </button>
                </p>
              )}
            </div>

          </div>

        </div>
      </motion.div>
    </div>
  );
}
