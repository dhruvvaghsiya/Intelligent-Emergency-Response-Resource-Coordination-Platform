/* =========================================================================
   LOGIN PAGE — flagship entry point: aurora backdrop, glass card, motion
   ========================================================================= */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, LogIn, AlertCircle, ChevronRight } from 'lucide-react';
import { useStore } from '../lib/store';
import { Button } from '../components/ui/Button';

const DEMO_USERS = [
  { email: 'commander@prahari.in', name: 'Cdr. Arjun Shah', role: 'COMMANDER' },
  { email: 'dispatch@prahari.in', name: 'Disp. Priya Mehta', role: 'DISPATCHER' },
  { email: 'analyst@prahari.in', name: 'Anl. Ravi Kumar', role: 'ANALYST' },
  { email: 'unit07@prahari.in', name: 'FO Ketan Patel', role: 'FIELD_UNIT' },
  { email: 'admin@prahari.in', name: 'Admin', role: 'ADMIN' },
];

export function LoginPage() {
  const [email, setEmail] = useState('dispatch@prahari.in');
  const [password, setPassword] = useState('prahari123');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const login = useStore(s => s.login);
  const authLoading = useStore(s => s.authLoading);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(email, password);
    if (result.ok) {
      navigate('/ops');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="h-full w-full relative overflow-y-auto">
      <div className="fixed inset-0 -z-10">
        <div className="aurora-bg" />
        <div className="grain-overlay" />
      </div>

      <div className="min-h-full flex items-center justify-center py-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 0.84, 0.32, 1] }}
        className="relative z-10 w-full max-w-[400px] mx-4"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="flex items-center justify-center gap-3 mb-7"
        >
          <div className="relative">
            <div className="absolute inset-0 blur-xl bg-accent/50 rounded-full" />
            <div className="relative w-11 h-11 rounded-2xl glass-strong flex items-center justify-center glow-ring">
              <Shield size={22} className="text-accent" strokeWidth={2.2} />
            </div>
          </div>
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-[26px] font-bold text-text-primary tracking-tight leading-none">
              PRAHARI
            </h1>
            <p className="text-[11px] text-text-muted tracking-[0.18em] uppercase mt-1">Emergency Response Console</p>
          </div>
        </motion.div>

        {/* Login form */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="glass-strong rounded-[var(--radius-xl)] p-6"
        >
          <h2 className="text-[17px] font-semibold text-text-primary mb-5 tracking-tight">Sign in to continue</h2>

          <div className="mb-4">
            <label className="block text-[12px] font-medium text-text-secondary mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="
                w-full h-[42px] px-3.5 bg-black/25 border border-border-subtle rounded-[var(--radius-md)]
                text-[13.5px] text-text-primary placeholder:text-text-muted
                focus:border-accent/60 focus:bg-black/40 focus:outline-none
                focus:shadow-[0_0_0_3px_rgba(45,212,191,0.15)]
                transition-all duration-200
              "
              placeholder="dispatch@prahari.in"
            />
          </div>

          <div className="mb-5">
            <label className="block text-[12px] font-medium text-text-secondary mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="
                w-full h-[42px] px-3.5 bg-black/25 border border-border-subtle rounded-[var(--radius-md)]
                text-[13.5px] text-text-primary placeholder:text-text-muted
                focus:border-accent/60 focus:bg-black/40 focus:outline-none
                focus:shadow-[0_0_0_3px_rgba(45,212,191,0.15)]
                transition-all duration-200
              "
              placeholder="••••••••"
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="flex items-center gap-2 px-3 py-2.5 bg-sev-critical-bg border border-sev-critical/30 rounded-[var(--radius-md)] text-[12.5px] text-sev-critical overflow-hidden"
              >
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <Button variant="primary" size="default" className="w-full h-[44px] text-[14px]" disabled={authLoading}>
            <LogIn size={15} />
            {authLoading ? 'Signing in...' : 'Sign in'}
          </Button>

          {/* Quick-select users */}
          <div className="mt-6 pt-5 border-t border-border-subtle">
            <div className="text-[10.5px] text-text-muted uppercase tracking-[0.14em] mb-2.5 font-semibold">Demo accounts</div>
            <div className="space-y-1">
              {DEMO_USERS.map((user, i) => (
                <motion.button
                  key={user.email}
                  type="button"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 + i * 0.04 }}
                  whileHover={{ x: 3 }}
                  onClick={() => { setEmail(user.email); setPassword('prahari123'); }}
                  className="group w-full text-left px-3 py-2 rounded-[var(--radius-sm)] hover:bg-white/[0.06] transition-colors cursor-pointer flex items-center justify-between"
                >
                  <span className="flex items-center gap-1.5 text-[12.5px] text-text-secondary group-hover:text-text-primary transition-colors">
                    <ChevronRight size={12} className="opacity-0 -ml-3.5 group-hover:opacity-60 group-hover:ml-0 transition-all duration-200 text-accent" />
                    {user.name}
                  </span>
                  <span className="text-[9.5px] text-text-muted uppercase tracking-wider font-mono px-1.5 py-0.5 rounded bg-white/[0.04]">{user.role}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.form>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-[11px] text-text-muted text-center mt-5 font-mono tracking-wide"
        >
          SIM · Demo environment · All data simulated
        </motion.p>
      </motion.div>
      </div>
    </div>
  );
}
