/* =========================================================================
   LOGIN PAGE
   ========================================================================= */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, LogIn } from 'lucide-react';
import { useStore } from '../lib/store';
import { Button } from '../components/ui/Button';
import { MOCK_USERS } from '../mocks/fixtures';

export function LoginPage() {
  const [email, setEmail] = useState('dispatch@prahari.in');
  const [password, setPassword] = useState('prahari123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useStore(s => s.login);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Mock auth — match against seeded users
    setTimeout(() => {
      const user = MOCK_USERS.find(u => u.email === email);
      if (user && password === 'prahari123') {
        login(user, 'mock_jwt_token_' + user.id);
        navigate('/ops');
      } else {
        setError('Invalid credentials. Try dispatch@prahari.in / prahari123');
      }
      setLoading(false);
    }, 400);
  };

  return (
    <div className="h-full w-full bg-canvas flex items-center justify-center">
      <div className="w-full max-w-[380px] mx-4">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Shield size={36} className="text-accent" />
          <div>
            <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">PRAHARI</h1>
            <p className="text-[12px] text-text-muted tracking-widest uppercase">Emergency Response Console</p>
          </div>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="bg-surface border border-border-subtle rounded-[6px] p-6">
          <h2 className="text-[15px] font-medium text-text-primary mb-4">Sign in to continue</h2>

          <div className="mb-3">
            <label className="block text-[12px] text-text-secondary mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="
                w-full h-[32px] px-3 bg-inset border border-border-subtle rounded-[4px]
                text-[13px] text-text-primary placeholder:text-text-muted
                focus:border-border-focus focus:outline-none
                transition-colors
              "
              placeholder="dispatch@prahari.in"
            />
          </div>

          <div className="mb-4">
            <label className="block text-[12px] text-text-secondary mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="
                w-full h-[32px] px-3 bg-inset border border-border-subtle rounded-[4px]
                text-[13px] text-text-primary placeholder:text-text-muted
                focus:border-border-focus focus:outline-none
                transition-colors
              "
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="mb-3 px-3 py-2 bg-sev-critical-bg border border-sev-critical/30 rounded-[4px] text-[12px] text-sev-critical">
              {error}
            </div>
          )}

          <Button variant="primary" className="w-full" disabled={loading}>
            <LogIn size={14} />
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>

          {/* Quick-select users */}
          <div className="mt-4 pt-4 border-t border-border-subtle">
            <div className="text-[11px] text-text-muted uppercase tracking-wider mb-2">Demo accounts</div>
            <div className="space-y-1">
              {MOCK_USERS.map(user => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => { setEmail(user.email); setPassword('prahari123'); }}
                  className="w-full text-left px-2 py-1 rounded-[4px] hover:bg-hover transition-colors cursor-pointer flex items-center justify-between"
                >
                  <span className="text-[12px] text-text-secondary">{user.name}</span>
                  <span className="text-[10px] text-text-muted uppercase font-mono">{user.role}</span>
                </button>
              ))}
            </div>
          </div>
        </form>

        <p className="text-[11px] text-text-muted text-center mt-4 font-mono">
          SIM · Demo environment · All data simulated
        </p>
      </div>
    </div>
  );
}
