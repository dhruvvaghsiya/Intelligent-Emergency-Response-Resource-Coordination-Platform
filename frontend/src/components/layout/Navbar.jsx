/* =========================================================================
   NAVBAR — Expanded 70% Navigation Bar with Premium Google Light Tooltips
   Clean layout, enlarged 22px icons, and sleek floating light/glass tooltips.
   ========================================================================= */
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ShieldCheck, Map, BarChart3, Clock, Sparkles,
  LogOut, Truck, FileText, Bell, WifiOff
} from 'lucide-react';
import { useStore } from '../../lib/store';

const NAV_ITEMS = [
  { path: '/ops', label: 'Situation Ops', icon: Map },
  { path: '/resources', label: 'Fleet & Hospitals', icon: Truck },
  { path: '/alerts', label: 'Alert Center', icon: Bell, badge: true },
  { path: '/analytics', label: 'Analytics & SLAs', icon: BarChart3 },
  { path: '/replay', label: 'Incident Replay', icon: Clock },
  { path: '/ai-health', label: 'AI Health', icon: Sparkles },
];

export function Navbar() {
  const location = useLocation();
  const { user, logout, connectionStatus, alerts } = useStore();

  const unackedAlerts = (alerts || []).filter(a => !a.acked_at);

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 z-40 flex items-center justify-between px-6 shrink-0 select-none shadow-2xs text-slate-900">
      {/* Brand Logo */}
      <Link to="/ops" className="flex items-center gap-3 no-underline group shrink-0" title="Resilio Ops">
        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 group-hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/25">
          <ShieldCheck size={22} strokeWidth={2.4} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-slate-900 tracking-tight whitespace-nowrap">
            Resilio
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/80">
            Ops
          </span>
        </div>
      </Link>

      {/* Center 70% Width Navigation Dock with Spaced Icons */}
      <div className="flex-1 flex justify-center items-center px-4 max-w-4xl">
        <nav className="w-full max-w-3xl flex items-center justify-between sm:justify-evenly px-6 py-1.5 bg-slate-50/90 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-2xs">
          {NAV_ITEMS.map(item => {
            const isActive = location.pathname === item.path ||
              (item.path === '/ops' && location.pathname.startsWith('/ops'));
            const hasBadge = item.badge && unackedAlerts.length > 0;

            return (
              <div key={item.path} className="relative group flex items-center justify-center">
                <Link
                  to={item.path}
                  className={`
                    w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 relative no-underline
                    ${isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-105'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-xs hover:scale-105 border border-transparent'
                    }
                  `}
                  aria-label={item.label}
                >
                  <item.icon
                    size={22}
                    className="shrink-0"
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />

                  {/* Badge Indicator */}
                  {hasBadge && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center ring-2 ring-white shadow-xs">
                      {unackedAlerts.length}
                    </span>
                  )}
                </Link>

                {/* Sleek Light Glass Tooltip on Hover */}
                <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 px-3.5 py-1.5 bg-white/95 backdrop-blur-md border border-slate-200/90 text-slate-800 text-xs font-semibold rounded-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-200 shadow-xl z-50 flex items-center gap-2 transform group-hover:translate-y-0 translate-y-1">
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-t border-l border-slate-200/90 rotate-45" />
                  <span className="text-slate-800 font-semibold">{item.label}</span>
                  {hasBadge && (
                    <span className="text-[10px] bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.2 rounded-full font-bold">
                      {unackedAlerts.length}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Real-time Status */}
        <div className="relative group flex items-center justify-center">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center cursor-default shadow-2xs">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600" />
            </span>
          </div>
          <div className="absolute top-full mt-3 right-0 px-3 py-1.5 bg-white/95 backdrop-blur-md border border-slate-200/90 text-slate-800 text-xs font-semibold rounded-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-200 shadow-xl z-50">
            <div className="absolute -top-1 right-4 w-2.5 h-2.5 bg-white border-t border-l border-slate-200/90 rotate-45" />
            <span className="text-emerald-700 font-bold">●</span> Status: {connectionStatus === 'connected' ? 'Realtime Connected' : 'Reconnecting...'}
          </div>
        </div>

        {/* Incident Ingest Action Button */}
        <div className="relative group flex items-center justify-center">
          <Link
            to="/report"
            className="h-10 px-3.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200/80 text-blue-700 text-xs font-bold flex items-center gap-1.5 transition-all no-underline shadow-2xs"
            aria-label="Report Incident"
          >
            <FileText size={17} className="shrink-0 text-blue-600" />
            <span className="hidden lg:inline whitespace-nowrap">+ Report</span>
          </Link>
          <div className="absolute top-full mt-3 right-0 px-3 py-1.5 bg-white/95 backdrop-blur-md border border-slate-200/90 text-slate-800 text-xs font-semibold rounded-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-200 shadow-xl z-50">
            <div className="absolute -top-1 right-4 w-2.5 h-2.5 bg-white border-t border-l border-slate-200/90 rotate-45" />
            Submit New Incident Report
          </div>
        </div>

        {/* User Cockpit */}
        {user && (
          <div className="flex items-center gap-2 pl-3 border-l border-slate-200 shrink-0">
            <div className="relative group flex items-center justify-center">
              <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center shrink-0 cursor-default">
                {user.name ? user.name.slice(0, 2).toUpperCase() : 'OP'}
              </div>
              <div className="absolute top-full mt-3 right-0 px-3.5 py-2 bg-white/95 backdrop-blur-md border border-slate-200/90 text-slate-800 rounded-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-200 shadow-xl z-50 text-left">
                <div className="absolute -top-1 right-3.5 w-2.5 h-2.5 bg-white border-t border-l border-slate-200/90 rotate-45" />
                <div className="text-xs font-bold text-slate-900">{user.name}</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{user.role}</div>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0 cursor-pointer"
              title="Sign Out"
              aria-label="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
