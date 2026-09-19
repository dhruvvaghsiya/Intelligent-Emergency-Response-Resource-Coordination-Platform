/* =========================================================================
   TOPBAR — glass navbar with animated active-pill indicator
   ========================================================================= */
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheck, Radio, Bell, Map, BarChart3, Clock, Brain,
  LogOut, WifiOff, HeartHandshake, FileText
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { Button } from '../ui/Button';

const NAV_ITEMS = [
  { path: '/ops', label: 'Situation', icon: Map },
  { path: '/resources', label: 'Resources', icon: HeartHandshake },
  { path: '/alerts', label: 'Alerts', icon: Bell },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/replay', label: 'Replay', icon: Clock },
  { path: '/ai-health', label: 'AI Health', icon: Brain },
  { path: '/report', label: 'Report', icon: FileText },
];

export function Topbar() {
  const location = useLocation();
  const { user, logout, connectionStatus, alerts } = useStore();
  const unackedAlerts = alerts.filter(a => !a.acked_at);
  const criticalAlerts = unackedAlerts.filter(a => a.severity === 'CRITICAL');

  return (
    <header className="h-[56px] glass border-b border-border-subtle flex items-center px-4 gap-1 shrink-0 z-30 relative">
      {/* Logo */}
      <Link to="/ops" className="flex items-center gap-2 mr-5 no-underline group">
        <div className="w-8 h-8 rounded-lg glass-strong flex items-center justify-center group-hover:glow-ring transition-shadow duration-300">
          <ShieldCheck size={16} className="text-accent" strokeWidth={2.4} />
        </div>
        <span className="font-[family-name:var(--font-display)] text-[15px] font-bold text-text-primary tracking-tight hidden sm:inline">
          RESILIO
        </span>
      </Link>

      {/* Nav */}
      <nav className="flex items-center gap-0.5 relative">
        {NAV_ITEMS.map(item => {
          const isActive = location.pathname === item.path ||
            (item.path === '/ops' && location.pathname.startsWith('/ops'));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                relative flex items-center gap-1.5 px-3 h-[36px] rounded-[var(--radius-md)]
                text-[13px] font-medium no-underline
                transition-colors duration-[160ms]
                ${isActive
                  ? 'text-accent'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.05]'
                }
              `}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-active-pill"
                  className="absolute inset-0 bg-accent/[0.12] border border-accent/25 rounded-[var(--radius-md)]"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <item.icon size={14} className="relative" />
              <span className="hidden lg:inline relative">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Connection status */}
      <div className="flex items-center gap-2 mr-3">
        {connectionStatus === 'connected' ? (
          <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-status-available px-2.5 py-1 rounded-full bg-status-available/10 border border-status-available/25">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-available opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-status-available" />
            </span>
            LIVE
          </span>
        ) : connectionStatus === 'stale' ? (
          <span className="flex items-center gap-1 text-[11px] text-status-stale font-semibold px-2.5 py-1 rounded-full bg-status-stale/10 border border-status-stale/25">
            <WifiOff size={12} />
            STALE
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[11px] text-sev-high font-semibold px-2.5 py-1 rounded-full bg-sev-high/10 border border-sev-high/25">
            <WifiOff size={12} />
            RECONNECTING
          </span>
        )}
      </div>

      {/* Alert count */}
      {unackedAlerts.length > 0 && (
        <Link
          to="/alerts"
          className={`
            flex items-center gap-1.5 px-2.5 h-[32px] rounded-full mr-2 no-underline
            text-[12px] font-semibold border transition-transform hover:scale-105
            ${criticalAlerts.length > 0
              ? 'bg-sev-critical-bg text-sev-critical border-sev-critical/30'
              : 'bg-sev-high-bg text-sev-high border-sev-high/30'
            }
          `}
        >
          <Bell size={13} />
          <span className="font-mono">{unackedAlerts.length}</span>
        </Link>
      )}

      {/* User */}
      {user && (
        <div className="flex items-center gap-3 ml-1 border-l border-border-subtle pl-4">
          <div className="text-right hidden sm:block">
            <div className="text-[12.5px] font-semibold text-text-primary leading-tight">{user.name}</div>
            <div className="text-[10px] text-text-muted uppercase tracking-wider">{user.role}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} aria-label="Logout" title="Logout">
            <LogOut size={15} />
          </Button>
        </div>
      )}
    </header>
  );
}
