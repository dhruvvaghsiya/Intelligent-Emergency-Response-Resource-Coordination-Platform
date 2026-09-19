/* =========================================================================
   NAVBAR — Sleek Top Navigation Bar Layout (Pure White / Slate 50)
   Full-width responsive header maximizing map and dashboard space.
   ========================================================================= */
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Shield, Map, BarChart3, Clock, Brain,
  LogOut, Layers, FileText, Bell, WifiOff
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { Button } from '../ui/Button';

const NAV_ITEMS = [
  { path: '/ops', label: 'Situation Ops', icon: Map },
  { path: '/resources', label: 'Fleet & Hospitals', icon: Layers },
  { path: '/alerts', label: 'Alert Center', icon: Bell, badge: true },
  { path: '/analytics', label: 'Analytics & SLAs', icon: BarChart3 },
  { path: '/replay', label: 'Incident Replay', icon: Clock },
  { path: '/ai-health', label: 'AI Health', icon: Brain },
];

export function Navbar() {
  const location = useLocation();
  const { user, logout, connectionStatus, alerts } = useStore();

  const unackedAlerts = (alerts || []).filter(a => !a.acked_at);

  return (
    <header className="h-16 bg-white border-b border-slate-200 z-40 flex items-center justify-between px-6 shrink-0 select-none shadow-sm">
      {/* Brand Section */}
      <div className="flex items-center gap-8">
        <Link to="/ops" className="flex items-center gap-3 no-underline group">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors shadow-sm">
            <Shield size={20} className="text-blue-600" strokeWidth={2.4} />
          </div>
          <div>
            <div className="text-[16px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Prahari
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Ops
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium leading-none mt-0.5">
              Emergency Coordination
            </div>
          </div>
        </Link>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5">
          {NAV_ITEMS.map(item => {
            const isActive = location.pathname === item.path ||
              (item.path === '/ops' && location.pathname.startsWith('/ops'));
            const hasBadge = item.badge && unackedAlerts.length > 0;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-2 px-3.5 py-2 rounded-lg text-[14px] font-medium no-underline transition-colors
                  ${isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                  }
                `}
              >
                <item.icon
                  size={17}
                  className={isActive ? 'text-blue-600' : 'text-slate-400'}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                <span>{item.label}</span>

                {hasBadge && (
                  <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-red-50 text-red-700 border border-red-200">
                    {unackedAlerts.length}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right Controls & User Menu */}
      <div className="flex items-center gap-4">
        {/* Real-time Connection Status */}
        {connectionStatus === 'connected' ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
            </span>
            <span>Realtime Connected</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
            <WifiOff size={13} />
            <span>Reconnecting...</span>
          </div>
        )}

        {/* Public Ingest Report Link */}
        <Link to="/report" className="no-underline">
          <Button variant="secondary" size="compact" className="h-9 font-semibold text-xs">
            <FileText size={14} className="text-slate-500" />
            + Report Incident
          </Button>
        </Link>

        {/* User Cockpit */}
        {user && (
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                {user.name ? user.name.slice(0, 2).toUpperCase() : 'OP'}
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-[13px] font-bold text-slate-900 leading-tight">
                  {user.name}
                </div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {user.role}
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              title="Sign Out"
              aria-label="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
