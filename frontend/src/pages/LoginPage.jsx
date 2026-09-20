/* =========================================================================
   LOGIN & SIGN UP PAGE — Resilio Emergency Response Console
   Theme: Clean White, Google Maps style vibe, real satellite map background,
   consistent with app typography, buttons, and card surfaces.
   ========================================================================= */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  ShieldCheck, LogIn, UserPlus, AlertCircle, ChevronRight,
  Lock, Eye, EyeOff, User, Mail, Building2, CheckCircle2, ArrowRight
} from 'lucide-react';
import { useStore, DEMO_USERS } from '../lib/store';
import { Button } from '../components/ui/Button';

/* ── Role styling tokens matching the app's badge palette ─────────── */
const ROLE_CONFIG = {
  COMMANDER:  { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     label: 'Incident Commander' },
  DISPATCHER: { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    label: 'Dispatcher / CAD' },
  ANALYST:    { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Tactical Analyst' },
  FIELD_UNIT: { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   label: 'Field Responder' },
  ADMIN:      { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200',  label: 'System Admin' },
};

/* ── Live pulsing status indicator ───────────────────────────────── */
function LiveDot({ color = 'bg-emerald-500' }) {
  return (
    <span className="relative flex h-2 w-2">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`} />
      <span className={`relative inline-flex rounded-full h-2 w-2 ${color}`} />
    </span>
  );
}

/* ── Real Satellite Map Background Component ─────────────────────── */
function SatelliteMapBackground() {
  const containerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      const map = new MapLibreMap({
        container: containerRef.current,
        style: {
          version: 8,
          sources: {
            'esri-satellite': {
              type: 'raster',
              tiles: [
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
              ],
              tileSize: 256,
              maxzoom: 19,
              attribution: '© Esri, Maxar',
            },
            'esri-labels': {
              type: 'raster',
              tiles: [
                'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
              ],
              tileSize: 256,
              maxzoom: 19,
            },
          },
          layers: [
            { id: 'satellite', type: 'raster', source: 'esri-satellite' },
            { id: 'labels', type: 'raster', source: 'esri-labels' },
          ],
        },
        center: [72.5714, 23.0225], // Ahmedabad coordinates
        zoom: 12.8,
        pitch: 0,
        bearing: 0,
        interactive: false,
        attributionControl: false,
      });

      mapInstanceRef.current = map;

      // Subtle slow continuous drift to make the satellite background feel alive
      let animId;
      let curLng = 72.5714;
      const step = () => {
        curLng += 0.00002;
        if (mapInstanceRef.current && mapInstanceRef.current.isStyleLoaded()) {
          mapInstanceRef.current.setCenter([curLng, 23.0225]);
        }
        animId = requestAnimationFrame(step);
      };

      map.on('load', () => {
        animId = requestAnimationFrame(step);
      });

      return () => {
        if (animId) cancelAnimationFrame(animId);
        map.remove();
      };
    } catch {
      // Fallback handled by CSS
    }
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
      {/* MapLibre WebGL container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Light soft white vignette overlay matching the app's clean white theme */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.35) 0%, rgba(248, 250, 252, 0.70) 50%, rgba(241, 245, 249, 0.90) 100%)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
        }}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT: LoginPage
   ══════════════════════════════════════════════════════════════════════════ */
export function LoginPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, login, register, logout, authLoading } = useStore();

  // Mode: 'signin' | 'signup'
  const [activeTab, setActiveTab] = useState('signin');

  // Sign In Form State
  const [loginEmail, setLoginEmail] = useState(DEMO_USERS[1].email); // Default to Dispatcher
  const [loginPassword, setLoginPassword] = useState(DEMO_USERS[1].password);
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Sign Up Form State
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupRole, setSignupRole] = useState('DISPATCHER');
  const [signupStation, setSignupStation] = useState('Ahmedabad Central HQ');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPass, setShowSignupPass] = useState(false);

  // Status & Errors
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Handle Quick Login click
  const handleSelectDemoUser = (u, autoSubmit = false) => {
    setLoginEmail(u.email);
    setLoginPassword(u.password);
    setErrorMessage('');
    if (autoSubmit) {
      executeLogin(u.email, u.password);
    }
  };

  const executeLogin = async (emailToUse, passToUse) => {
    setErrorMessage('');
    setSuccessMessage('');
    const res = await login(emailToUse, passToUse);
    if (res.ok) {
      navigate('/ops');
    } else {
      setErrorMessage(res.error || 'Authentication failed. Please verify credentials.');
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    await executeLogin(loginEmail, loginPassword);
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!signupName.trim()) {
      setErrorMessage('Please enter the operator full name.');
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
      setSuccessMessage('Account created successfully! Launching console…');
      setTimeout(() => {
        navigate('/ops');
      }, 600);
    } else {
      setErrorMessage(res.error || 'Registration failed.');
    }
  };

  return (
    <div className="h-full w-full relative flex flex-col justify-between overflow-y-auto overflow-x-hidden">
      {/* ── Satellite Background ───────────────────────────────────────── */}
      <SatelliteMapBackground />

      {/* ── Top Header Brand Bar (Matching App Navbar aesthetic) ──────── */}
      <header className="relative z-20 flex items-center justify-between px-6 py-4 select-none">
        {/* Brand Badge */}
        <div
          className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl border border-sky-300/70 shadow-sm"
          style={{
            backgroundColor: 'azure',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/25">
            <ShieldCheck size={19} strokeWidth={2.4} />
          </div>
          <div className="flex items-center gap-1.5 pr-1">
            <span className="text-base font-bold text-slate-900 tracking-tight">Resilio</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 border border-sky-200">
              Ops
            </span>
          </div>
        </div>

        {/* Live Status Pill */}
        <div
          className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl border border-slate-200/90 shadow-xs"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.90)', backdropFilter: 'blur(8px)' }}
        >
          <LiveDot color="bg-emerald-500" />
          <span className="text-xs font-semibold text-slate-700">Municipal Ops Center</span>
          <span className="text-[11px] font-medium text-slate-400">· Ahmedabad Zone</span>
        </div>
      </header>

      {/* ── Center Content Area: Floating White Card ──────────────────── */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[460px]"
        >
          {/* Active Session Notification (if already logged in) */}
          {isAuthenticated && user && (
            <div className="mb-3.5 p-3 rounded-xl bg-white/95 border border-blue-200 shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 truncate">
                    Active Session: <span className="text-blue-600">{user.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Role: <span className="font-semibold">{user.role}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="compact"
                  variant="primary"
                  onClick={() => navigate('/ops')}
                  className="text-xs font-semibold"
                >
                  Enter Console <ArrowRight size={13} />
                </Button>
                <Button
                  size="compact"
                  variant="ghost"
                  onClick={() => logout()}
                  className="text-xs text-slate-600"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          )}

          {/* Main White Card */}
          <div
            className="rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.96)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
          >
            {/* Card Header with Segmented Tab Switcher */}
            <div className="p-4 border-b border-slate-100 bg-white/80">
              <div className="flex bg-slate-100/90 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setActiveTab('signin'); setErrorMessage(''); setSuccessMessage(''); }}
                  className={`
                    flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer
                    ${activeTab === 'signin'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                    }
                  `}
                >
                  <LogIn size={14} className={activeTab === 'signin' ? 'text-blue-600' : ''} />
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('signup'); setErrorMessage(''); setSuccessMessage(''); }}
                  className={`
                    flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer
                    ${activeTab === 'signup'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                    }
                  `}
                >
                  <UserPlus size={14} className={activeTab === 'signup' ? 'text-blue-600' : ''} />
                  Create Account (Sign Up)
                </button>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-6 space-y-5">
              {/* Error Message */}
              <AnimatePresence>
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium"
                  >
                    <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-600" />
                    <span className="flex-1">{errorMessage}</span>
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
                    className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium"
                  >
                    <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
                    <span>{successMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ─────────────────────────────────────────────────────────
                  TAB 1: SIGN IN
                  ───────────────────────────────────────────────────────── */}
              {activeTab === 'signin' && (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  {/* Operator Email */}
                  <div>
                    <label
                      htmlFor="login-email"
                      className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                    >
                      Operator Email / ID
                    </label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="login-email"
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="dispatch@prahari.in"
                        className="w-full h-10 pl-10 pr-3.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
                        required
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="login-password"
                        className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                      >
                        Password
                      </label>
                      <span className="text-[11px] font-semibold text-slate-400">
                        Default: prahari123
                      </span>
                    </div>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="login-password"
                        type={showLoginPass ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-10 pl-10 pr-10 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPass(!showLoginPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                        aria-label={showLoginPass ? 'Hide password' : 'Show password'}
                      >
                        {showLoginPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Sign In Button */}
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={authLoading}
                    className="w-full h-11 text-sm font-bold shadow-sm"
                  >
                    {authLoading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        Authenticating Operator…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <LogIn size={16} />
                        Sign In &amp; Launch Console
                      </span>
                    )}
                  </Button>
                </form>
              )}

              {/* ─────────────────────────────────────────────────────────
                  TAB 2: SIGN UP / REGISTER
                  ───────────────────────────────────────────────────────── */}
              {activeTab === 'signup' && (
                <form onSubmit={handleSignupSubmit} className="space-y-3.5">
                  {/* Full Name */}
                  <div>
                    <label
                      htmlFor="signup-name"
                      className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
                    >
                      Operator Full Name
                    </label>
                    <div className="relative">
                      <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="signup-name"
                        type="text"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        placeholder="e.g. Officer Vikram Sen"
                        className="w-full h-10 pl-10 pr-3.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
                        required
                      />
                    </div>
                  </div>

                  {/* Official Email */}
                  <div>
                    <label
                      htmlFor="signup-email"
                      className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
                    >
                      Official Email
                    </label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="signup-email"
                        type="email"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        placeholder="vikram@prahari.in"
                        className="w-full h-10 pl-10 pr-3.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
                        required
                      />
                    </div>
                  </div>

                  {/* Role Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Operational Role
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'DISPATCHER', label: 'Dispatcher' },
                        { id: 'COMMANDER',  label: 'Commander' },
                        { id: 'ANALYST',    label: 'Analyst' },
                        { id: 'FIELD_UNIT', label: 'Field Responder' },
                        { id: 'ADMIN',      label: 'Admin' },
                      ].map((r) => {
                        const isSel = signupRole === r.id;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setSignupRole(r.id)}
                            className={`
                              py-1.5 px-2 rounded-lg text-xs font-bold transition-all border cursor-pointer text-center truncate
                              ${isSel
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }
                            `}
                          >
                            {r.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Station / Base */}
                  <div>
                    <label
                      htmlFor="signup-station"
                      className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
                    >
                      Assigned Base / Station (Optional)
                    </label>
                    <div className="relative">
                      <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="signup-station"
                        type="text"
                        value={signupStation}
                        onChange={(e) => setSignupStation(e.target.value)}
                        placeholder="Ahmedabad Central HQ"
                        className="w-full h-10 pl-10 pr-3.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label
                      htmlFor="signup-pass"
                      className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
                    >
                      Create Password
                    </label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="signup-pass"
                        type={showSignupPass ? 'text' : 'password'}
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        placeholder="At least 4 characters"
                        className="w-full h-10 pl-10 pr-10 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPass(!showSignupPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                      >
                        {showSignupPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Create Account Button */}
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={authLoading}
                    className="w-full h-11 text-sm font-bold shadow-sm mt-2"
                  >
                    {authLoading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        Registering Operator…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <UserPlus size={16} />
                        Register &amp; Enter Console
                      </span>
                    )}
                  </Button>
                </form>
              )}

              {/* ─────────────────────────────────────────────────────────
                  QUICK OPERATOR PRESETS (Clean Google Maps style list)
                  ───────────────────────────────────────────────────────── */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Quick Operator Login
                  </span>
                  <span className="text-[11px] font-medium text-slate-400">
                    1-Click test accounts
                  </span>
                </div>

                <div className="space-y-1.5">
                  {DEMO_USERS.map((u) => {
                    const isSelected = loginEmail === u.email;
                    const roleCfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.DISPATCHER;

                    return (
                      <div
                        key={u.email}
                        className={`
                          group w-full p-2 rounded-xl border transition-all duration-150 flex items-center justify-between gap-2.5
                          ${isSelected
                            ? 'bg-blue-50/80 border-blue-200 shadow-xs'
                            : 'bg-white border-slate-200/90 hover:bg-slate-50 hover:border-slate-300'
                          }
                        `}
                      >
                        {/* Left: Info click to autofill */}
                        <button
                          type="button"
                          onClick={() => handleSelectDemoUser(u, false)}
                          className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${roleCfg.bg} ${roleCfg.border}`}>
                            <User size={13} className={roleCfg.text} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-bold truncate ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                                {u.name}
                              </span>
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border shrink-0 ${roleCfg.bg} ${roleCfg.text} ${roleCfg.border}`}>
                                {u.role.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-medium truncate">
                              {u.email} · <span className="font-semibold text-slate-600">prahari123</span>
                            </div>
                          </div>
                        </button>

                        {/* Right: Instant 1-Click Launch Button */}
                        <button
                          type="button"
                          onClick={() => handleSelectDemoUser(u, true)}
                          title="Instant 1-Click Login"
                          className="h-7 px-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-bold hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors shadow-2xs shrink-0 flex items-center gap-1 cursor-pointer"
                        >
                          Launch <ChevronRight size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Subtext */}
          <div className="text-center mt-4">
            <p className="text-[11px] font-medium text-slate-500">
              Ahmedabad Disaster Response Platform · Resilio Ops v2.4
            </p>
          </div>
        </motion.div>
      </main>

      {/* ── Map Attribution Footer ────────────────────────────────────── */}
      <footer className="relative z-10 px-6 py-2 flex items-center justify-between text-[10px] text-slate-500 pointer-events-none">
        <div>Official Incident Management Network</div>
        <div className="pointer-events-auto bg-white/80 px-2 py-0.5 rounded border border-slate-200/80 shadow-2xs">
          Imagery: © Esri, Maxar, Earthstar Geographics
        </div>
      </footer>
    </div>
  );
}
