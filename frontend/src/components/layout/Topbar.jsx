/* =========================================================================
   TOPBAR — 48px, bg-surface, border-bottom
   Shows: Prahari logo, connection status, alert count, user info
   ========================================================================= */
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Shield, Radio, Bell, Map, BarChart3, Clock, Brain,
  User, LogOut, Wifi, WifiOff, Layers, FileText
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { Button } from '../ui/Button';

const NAV_ITEMS = [
  { path: '/ops', label: 'Situation', icon: Map },
  { path: '/resources', label: 'Resources', icon: Layers },
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
    <header className="h-[48px] bg-surface border-b border-border-subtle flex items-center px-3 gap-1 shrink-0 z-30">
      {/* Logo */}
      <Link to="/ops" className="flex items-center gap-2 mr-4 no-underline">
        <Shield size={20} className="text-accent" />
        <span className="text-[15px] font-semibold text-text-primary tracking-tight">PRAHARI</span>
      </Link>

      {/* Nav */}
      <nav className="flex items-center gap-0.5">
        {NAV_ITEMS.map(item => {
          const isActive = location.pathname === item.path ||
            (item.path === '/ops' && location.pathname.startsWith('/ops'));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-1.5 px-2.5 h-[32px] rounded-[4px]
                text-[13px] font-medium no-underline
                transition-colors duration-[140ms]
                ${isActive
                  ? 'bg-accent-muted text-accent'
                  : 'text-text-secondary hover:text-text-primary hover:bg-hover'
                }
              `}
            >
              <item.icon size={14} />
              <span className="hidden lg:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Connection status */}
      <div className="flex items-center gap-2 mr-3">
        {connectionStatus === 'connected' ? (
          <span className="flex items-center gap-1 text-[11px] text-status-available">
            <Radio size={12} className="animate-pulse" />
            LIVE
          </span>
        ) : connectionStatus === 'stale' ? (
          <span className="flex items-center gap-1 text-[11px] text-status-stale font-medium">
            <WifiOff size={12} />
            STALE
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[11px] text-sev-high font-medium">
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
            flex items-center gap-1 px-2 h-[28px] rounded-[4px] mr-2 no-underline
            text-[12px] font-medium
            ${criticalAlerts.length > 0
              ? 'bg-sev-critical-bg text-sev-critical border border-sev-critical/30'
              : 'bg-sev-high-bg text-sev-high border border-sev-high/30'
            }
          `}
        >
          <Bell size={13} />
          <span className="font-mono">{unackedAlerts.length}</span>
        </Link>
      )}

      {/* User */}
      {user && (
        <div className="flex items-center gap-2 ml-2 border-l border-border-subtle pl-3">
          <div className="text-right">
            <div className="text-[12px] font-medium text-text-primary leading-tight">{user.name}</div>
            <div className="text-[10px] text-text-muted uppercase tracking-wider">{user.role}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} aria-label="Logout" title="Logout">
            <LogOut size={14} />
          </Button>
        </div>
      )}
    </header>
  );
}
