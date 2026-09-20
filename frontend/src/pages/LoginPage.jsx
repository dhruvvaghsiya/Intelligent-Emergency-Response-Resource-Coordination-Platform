/* =========================================================================
   LOGIN PAGE — Emergency Command Center Authentication
   Dark cinematic aesthetic matching the satellite map hero of OpsPage.
   Split layout: glassmorphic login panel left | animated "live map" right.
   ========================================================================= */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, LogIn, AlertCircle, Eye, EyeOff,
  Zap, Activity, Radio, BarChart3, Wrench, User,
} from 'lucide-react';
import { useStore } from '../lib/store';

/* ── Operator role presets ─────────────────────────────────────────────── */
const ROLES = [
  {
    key: 'commander',
    label: 'Commander',
    email: 'commander@resilio.in',
    password: 'Resilio@2026',
    icon: ShieldCheck,
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.35)',
    description: 'Full strategic command & resource allocation',
  },
  {
    key: 'dispatch',
    label: 'Dispatcher',
    email: 'dispatch@resilio.in',
    password: 'Resilio@2026',
    icon: Radio,
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.12)',
    border: 'rgba(59,130,246,0.35)',
    description: 'Unit deployment, routing & coordination',
  },
  {
    key: 'analyst',
    label: 'Analyst',
    email: 'analyst@resilio.in',
    password: 'Resilio@2026',
    icon: BarChart3,
    color: '#10B981',
    bg: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.35)',
    description: 'Analytics, SLAs, AI evaluation & reports',
  },
  {
    key: 'field',
    label: 'Field Unit',
    email: 'unit07@resilio.in',
    password: 'Resilio@2026',
    icon: Activity,
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.35)',
    description: 'Field responder mobile view & status updates',
  },
  {
    key: 'admin',
    label: 'Admin',
    email: 'admin@resilio.in',
    password: 'Resilio@2026',
    icon: Wrench,
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.12)',
    border: 'rgba(139,92,246,0.35)',
    description: 'System admin, simulation control & seed',
  },
];

/* ── Animated pulse ring used for map decoration ──────────────────────── */
function PulseRing({ x, y, color, delay = 0, size = 40 }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ left: x - size / 2, top: y - size / 2, width: size, height: size }}
    >
      {/* Core dot */}
      <div
        className="absolute inset-0 rounded-full opacity-90"
        style={{ background: color, transform: 'scale(0.2)', boxShadow: `0 0 12px 4px ${color}` }}
      />
      {/* Outer ring pulse */}
      <motion.div
        className="absolute rounded-full border-2"
        style={{ inset: 0, borderColor: color }}
        animate={{ scale: [1, 2.8], opacity: [0.7, 0] }}
        transition={{ duration: 2.5, delay, repeat: Infinity, ease: 'easeOut' }}
      />
      <motion.div
        className="absolute rounded-full border"
        style={{ inset: 0, borderColor: color }}
        animate={{ scale: [1, 2], opacity: [0.4, 0] }}
        transition={{ duration: 2.5, delay: delay + 0.5, repeat: Infinity, ease: 'easeOut' }}
      />
    </motion.div>
  );
}

/* ── Unit dot on decorative "map" ─────────────────────────────────────── */
function UnitDot({ x, y, color }) {
  return (
    <div
      className="absolute w-2.5 h-2.5 rounded-full border-2 border-white/80 pointer-events-none"
      style={{ left: x - 5, top: y - 5, background: color, boxShadow: `0 0 8px ${color}` }}
    />
  );
}

/* ── Road-like connector lines (SVG) ─────────────────────────────────── */
function MapGrid({ width, height }) {
  return (
    <svg className="absolute inset-0 opacity-[0.07]" width={width} height={height}>
      {/* Horizontal grid */}
      {Array.from({ length: 12 }, (_, i) => (
        <line key={`h${i}`} x1={0} y1={(i + 1) * (height / 13)} x2={width} y2={(i + 1) * (height / 13)}
          stroke="#38BDF8" strokeWidth="1" />
      ))}
      {/* Vertical grid */}
      {Array.from({ length: 16 }, (_, i) => (
        <line key={`v${i}`} x1={(i + 1) * (width / 17)} y1={0} x2={(i + 1) * (width / 17)} y2={height}
          stroke="#38BDF8" strokeWidth="1" />
      ))}
      {/* Diagonal roads */}
      <line x1="15%" y1="25%" x2="55%" y2="60%" stroke="#60A5FA" strokeWidth="1.5" />
      <line x1="55%" y1="60%" x2="85%" y2="45%" stroke="#60A5FA" strokeWidth="1.5" />
      <line x1="20%" y1="70%" x2="60%" y2="30%" stroke="#60A5FA" strokeWidth="1" />
      <line x1="60%" y1="30%" x2="90%" y2="20%" stroke="#60A5FA" strokeWidth="1" />
      {/* Arc road */}
      <path d="M 10% 50% Q 50% 10% 90% 55%" stroke="#38BDF8" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════════ */
export function LoginPage() {
  const [selectedRole, setSelectedRole] = useState(ROLES[1]); // default Dispatcher
  const [email, setEmail] = useState(ROLES[1].email);
  const [password, setPassword] = useState(ROLES[1].password);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [time, setTime] = useState(new Date());
  const navigate = useNavigate();
  const login = useStore(s => s.login);
  const authLoading = useStore(s => s.authLoading);

  /* Live clock */
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleSelectRole = (role) => {
    setSelectedRole(role);
    setEmail(role.email);
    setPassword(role.password);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(email, password);
    if (result.ok) {
      navigate('/ops');
    } else {
      setError(result.error || 'Authentication failed. Check credentials.');
    }
  };

  const timeStr = time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const dateStr = time.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: '#080C14' }}>

      {/* ── Dark satellite-style background ─────────────────────────── */}
      <div className="absolute inset-0">
        {/* Base dark map gradient */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 80% 60% at 65% 50%, #0D1B2A 0%, #080C14 100%)',
        }} />
        {/* City glow cluster */}
        <div className="absolute" style={{
          right: '8%', top: '15%', width: '55%', height: '70%',
          background: 'radial-gradient(ellipse at 50% 50%, rgba(20,40,80,0.8) 0%, transparent 70%)',
          filter: 'blur(4px)',
        }} />
        {/* Road grid overlay */}
        <MapGrid width={window.innerWidth} height={window.innerHeight} />

        {/* ── Decorative incident markers ──────────────────────────── */}
        <PulseRing x={window.innerWidth * 0.62} y={window.innerHeight * 0.32} color="#EF4444" delay={0} size={44} />
        <PulseRing x={window.innerWidth * 0.75} y={window.innerHeight * 0.55} color="#F59E0B" delay={0.8} size={34} />
        <PulseRing x={window.innerWidth * 0.55} y={window.innerHeight * 0.65} color="#EF4444" delay={1.4} size={28} />
        <PulseRing x={window.innerWidth * 0.82} y={window.innerHeight * 0.30} color="#F97316" delay={0.3} size={22} />

        {/* Unit markers */}
        <UnitDot x={window.innerWidth * 0.58} y={window.innerHeight * 0.42} color="#3B82F6" />
        <UnitDot x={window.innerWidth * 0.70} y={window.innerHeight * 0.38} color="#3B82F6" />
        <UnitDot x={window.innerWidth * 0.79} y={window.innerHeight * 0.62} color="#10B981" />
        <UnitDot x={window.innerWidth * 0.65} y={window.innerHeight * 0.70} color="#3B82F6" />
        <UnitDot x={window.innerWidth * 0.88} y={window.innerHeight * 0.45} color="#10B981" />

        {/* Floating label callouts */}
        <motion.div
          className="absolute text-[10px] font-semibold px-2 py-0.5 rounded border"
          style={{
            left: window.innerWidth * 0.61, top: window.innerHeight * 0.22,
            color: '#FCA5A5', borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(17,24,39,0.85)',
          }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          ● CRITICAL · Structure Fire
        </motion.div>
        <motion.div
          className="absolute text-[10px] font-semibold px-2 py-0.5 rounded border"
          style={{
            left: window.innerWidth * 0.73, top: window.innerHeight * 0.63,
            color: '#FCD34D', borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(17,24,39,0.85)',
          }}
          animate={{ opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 4, repeat: Infinity, delay: 1.5 }}
        >
          ◆ HIGH · Flood Zone
        </motion.div>

        {/* ── Scan line animation ──────────────────────────────────── */}
        <motion.div
          className="absolute left-0 right-0 h-px opacity-20 pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, #38BDF8, transparent)' }}
          animate={{ top: ['10%', '90%'] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear', repeatType: 'reverse' }}
        />
      </div>

      {/* ── Top status bar ───────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 h-10 flex items-center justify-between px-6 z-20"
        style={{ background: 'rgba(8,12,20,0.8)', borderBottom: '1px solid rgba(56,189,248,0.15)' }}>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#10B981' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            SYSTEM OPERATIONAL
          </span>
          <span className="text-xs font-medium" style={{ color: 'rgba(148,163,184,0.6)' }}>|</span>
          <motion.span
            className="text-xs font-semibold"
            style={{ color: '#F59E0B' }}
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            LIVE INCIDENTS: 12
          </motion.span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium" style={{ color: 'rgba(148,163,184,0.5)' }}>{dateStr}</span>
          <span className="text-xs font-mono font-bold" style={{ color: '#38BDF8' }}>{timeStr} IST</span>
        </div>
      </div>

      {/* ── Main content: login card ────────────────────────────────── */}
      <div className="absolute inset-0 flex items-center justify-start pl-12 pt-10 z-10">
        <motion.div
          initial={{ opacity: 0, x: -32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[460px]"
        >
          {/* Logo header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1D4ED8, #0EA5E9)', boxShadow: '0 0 24px rgba(14,165,233,0.4)' }}>
              <ShieldCheck size={24} color="white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#F1F5F9' }}>RESILIO</h1>
                <span className="text-xs font-bold px-2 py-0.5 rounded"
                  style={{ background: 'rgba(14,165,233,0.15)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.3)' }}>
                  OPS
                </span>
              </div>
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(148,163,184,0.6)' }}>
                Emergency Response Platform
              </p>
            </div>
          </div>

          {/* Card */}
          <div className="rounded-2xl overflow-hidden" style={{
            background: 'rgba(15,23,42,0.75)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(56,189,248,0.18)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(56,189,248,0.06)',
          }}>
            {/* Card header */}
            <div className="px-7 pt-6 pb-5" style={{ borderBottom: '1px solid rgba(56,189,248,0.1)' }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold" style={{ color: '#CBD5E1' }}>
                  Operator Authentication
                </span>
                <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(16,185,129,0.12)', color: '#34D399', border: '1px solid rgba(16,185,129,0.25)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ENCRYPTED
                </span>
              </div>
            </div>

            <div className="px-7 pb-7 pt-5 space-y-5">
              {/* Role selector */}
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase mb-3"
                  style={{ color: 'rgba(148,163,184,0.7)' }}>
                  Select Role Preset
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {ROLES.map((role) => {
                    const Icon = role.icon;
                    const isSelected = selectedRole.key === role.key;
                    return (
                      <motion.button
                        key={role.key}
                        type="button"
                        onClick={() => handleSelectRole(role)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.97 }}
                        title={`${role.label}: ${role.description}`}
                        className="flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl transition-all cursor-pointer"
                        style={{
                          background: isSelected ? role.bg : 'rgba(30,41,59,0.5)',
                          border: `1px solid ${isSelected ? role.border : 'rgba(51,65,85,0.5)'}`,
                          boxShadow: isSelected ? `0 0 16px ${role.color}30` : 'none',
                        }}
                      >
                        <Icon size={16} color={isSelected ? role.color : 'rgba(148,163,184,0.5)'} strokeWidth={2.2} />
                        <span className="text-[9px] font-bold uppercase tracking-wide leading-none"
                          style={{ color: isSelected ? role.color : 'rgba(148,163,184,0.45)' }}>
                          {role.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
                {/* Selected role description */}
                <AnimatePresence mode="wait">
                  <motion.p
                    key={selectedRole.key}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs mt-2 px-1"
                    style={{ color: 'rgba(148,163,184,0.5)' }}
                  >
                    {selectedRole.description}
                  </motion.p>
                </AnimatePresence>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-xs font-bold tracking-widest uppercase mb-2"
                    style={{ color: 'rgba(148,163,184,0.7)' }}>
                    Operator ID / Email
                  </label>
                  <div className="relative">
                    <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2"
                      style={{ color: 'rgba(148,163,184,0.4)' }} />
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-11 pl-9 pr-3.5 rounded-lg text-sm font-medium outline-none transition-all"
                      style={{
                        background: 'rgba(15,23,42,0.6)',
                        border: '1px solid rgba(51,65,85,0.6)',
                        color: '#E2E8F0',
                      }}
                      onFocus={e => e.target.style.borderColor = 'rgba(56,189,248,0.6)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(51,65,85,0.6)'}
                      placeholder="dispatch@resilio.in"
                      required
                      autoComplete="username"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold tracking-widest uppercase mb-2"
                    style={{ color: 'rgba(148,163,184,0.7)' }}>
                    Access Code
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-11 pl-3.5 pr-10 rounded-lg text-sm font-medium outline-none transition-all"
                      style={{
                        background: 'rgba(15,23,42,0.6)',
                        border: '1px solid rgba(51,65,85,0.6)',
                        color: '#E2E8F0',
                      }}
                      onFocus={e => e.target.style.borderColor = 'rgba(56,189,248,0.6)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(51,65,85,0.6)'}
                      placeholder="••••••••••"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: 'rgba(148,163,184,0.4)' }}
                      tabIndex={-1}
                    >
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-medium overflow-hidden"
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#FCA5A5' }}
                    >
                      <AlertCircle size={13} className="shrink-0" />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <motion.button
                  type="submit"
                  disabled={authLoading}
                  whileHover={{ scale: authLoading ? 1 : 1.02 }}
                  whileTap={{ scale: authLoading ? 1 : 0.98 }}
                  className="w-full h-12 rounded-xl flex items-center justify-center gap-2.5 text-sm font-bold tracking-wide transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    background: authLoading
                      ? 'rgba(14,165,233,0.3)'
                      : 'linear-gradient(135deg, #1D4ED8 0%, #0EA5E9 100%)',
                    color: '#FFFFFF',
                    boxShadow: authLoading ? 'none' : '0 0 24px rgba(14,165,233,0.35)',
                    border: '1px solid rgba(56,189,248,0.3)',
                  }}
                >
                  {authLoading ? (
                    <>
                      <motion.span
                        className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      />
                      VERIFYING CREDENTIALS...
                    </>
                  ) : (
                    <>
                      <Zap size={16} />
                      LAUNCH COMMAND CENTER
                    </>
                  )}
                </motion.button>
              </form>

              {/* Credentials table */}
              <div className="pt-4" style={{ borderTop: '1px solid rgba(56,189,248,0.1)' }}>
                <p className="text-xs font-bold tracking-widest uppercase mb-3"
                  style={{ color: 'rgba(148,163,184,0.5)' }}>
                  Team Access Credentials
                </p>
                <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(51,65,85,0.4)' }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: 'rgba(15,23,42,0.8)', borderBottom: '1px solid rgba(51,65,85,0.4)' }}>
                        <th className="text-left px-3 py-2 font-bold tracking-wider"
                          style={{ color: 'rgba(148,163,184,0.6)' }}>ROLE</th>
                        <th className="text-left px-3 py-2 font-bold tracking-wider"
                          style={{ color: 'rgba(148,163,184,0.6)' }}>EMAIL</th>
                        <th className="text-left px-3 py-2 font-bold tracking-wider"
                          style={{ color: 'rgba(148,163,184,0.6)' }}>PASSWORD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ROLES.map((r, i) => (
                        <tr
                          key={r.key}
                          className="cursor-pointer transition-colors"
                          style={{
                            background: i % 2 === 0 ? 'rgba(15,23,42,0.4)' : 'rgba(15,23,42,0.2)',
                            borderBottom: i < ROLES.length - 1 ? '1px solid rgba(51,65,85,0.2)' : 'none',
                          }}
                          onClick={() => handleSelectRole(r)}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(56,189,248,0.06)'}
                          onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'rgba(15,23,42,0.4)' : 'rgba(15,23,42,0.2)'}
                        >
                          <td className="px-3 py-2 font-semibold" style={{ color: r.color }}>{r.label}</td>
                          <td className="px-3 py-2 font-mono" style={{ color: '#94A3B8' }}>{r.email}</td>
                          <td className="px-3 py-2 font-mono font-bold" style={{ color: '#64748B' }}>Resilio@2026</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs font-medium text-center mt-4" style={{ color: 'rgba(100,116,139,0.5)' }}>
            Encrypted · Simulation Environment · Municipal Gateway
          </p>
        </motion.div>
      </div>
    </div>
  );
}
