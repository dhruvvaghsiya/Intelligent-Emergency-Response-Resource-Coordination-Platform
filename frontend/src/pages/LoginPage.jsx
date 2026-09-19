/* =========================================================================
   LOGIN PAGE — High-Stakes Emergency Command Center Authentication
   Spacious light theme, pure white cards, soft shadows, Blue 600 accents.
   ========================================================================= */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, LogIn, AlertCircle, ChevronRight, Lock } from 'lucide-react';
import { useStore } from '../lib/store';
import { Button } from '../components/ui/Button';

const DEMO_USERS = [
  { email: 'commander@prahari.in', name: 'Cdr. Arjun Shah', role: 'COMMANDER' },
  { email: 'dispatch@prahari.in', name: 'Disp. Priya Mehta', role: 'DISPATCHER' },
  { email: 'analyst@prahari.in', name: 'Anl. Ravi Kumar', role: 'ANALYST' },
  { email: 'unit07@prahari.in', name: 'FO Ketan Patel', role: 'FIELD_UNIT' },
  { email: 'admin@prahari.in', name: 'System Admin', role: 'ADMIN' },
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
    <div className="h-full w-full relative overflow-y-auto bg-slate-50">
      <div className="min-h-full flex items-center justify-center py-12 px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-[440px]"
        >
          {/* Logo & Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="flex flex-col items-center text-center mb-6"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center mb-3 shadow-sm text-blue-600">
              <ShieldCheck size={26} strokeWidth={2.4} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-none flex items-center gap-2">
              RESILIO
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                OPS
              </span>
            </h1>
            <p className="text-xs font-semibold text-slate-500 tracking-wider uppercase mt-2">
              Intelligent Emergency Response Console
            </p>
          </motion.div>

          {/* Login Card */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm"
          >
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Lock size={16} className="text-blue-600" />
                <span>Operator Authentication</span>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                SECURE
              </span>
            </div>

            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Operator ID / Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="
                    w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg
                    text-sm text-slate-900 placeholder:text-slate-400
                    focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600
                    transition-colors
                  "
                  placeholder="dispatch@prahari.in"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="
                    w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg
                    text-sm text-slate-900 placeholder:text-slate-400
                    focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600
                    transition-colors
                  "
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="flex items-center gap-2 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-700 overflow-hidden"
                >
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              variant="primary"
              size="default"
              className="w-full h-11 text-sm font-semibold"
              disabled={authLoading}
            >
              <LogIn size={16} />
              {authLoading ? 'Verifying Credentials...' : 'Authenticate & Launch Console'}
            </Button>

            {/* Quick-select Demo Users */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Select Role Preset
                </span>
                <span className="text-xs font-medium text-slate-400">
                  CLICK TO AUTOFILL
                </span>
              </div>
              <div className="space-y-1.5">
                {DEMO_USERS.map((u) => {
                  const isSelected = email === u.email;
                  return (
                    <button
                      key={u.email}
                      type="button"
                      onClick={() => { setEmail(u.email); setPassword('prahari123'); }}
                      className={`
                        w-full text-left px-3 py-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between
                        ${isSelected
                          ? 'bg-blue-50 border-blue-200 text-blue-900'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }
                      `}
                    >
                      <span className="flex items-center gap-2 text-xs font-semibold">
                        <ChevronRight size={13} className={isSelected ? 'text-blue-600' : 'text-slate-400'} />
                        {u.name}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                        {u.role}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.form>

          <p className="text-xs font-medium text-slate-400 text-center mt-5">
            Simulation Environment · Municipal Ops Gateway
          </p>
        </motion.div>
      </div>
    </div>
  );
}
