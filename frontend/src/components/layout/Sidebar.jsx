/* =========================================================================
   SIDEBAR — Spacious Clean Navigation Rail (Slate 50 / Pure White)
   Inspired by wardalerts.com clean hierarchy and generous breathing room.
   ========================================================================= */
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Shield, Map, BarChart3, Clock, Brain,
  LogOut, Truck, FileText, Bell, CheckCircle2, WifiOff
} from 'lucide-react';
import { useStore } from '../../lib/store';

const NAV_ITEMS = [
  { path: '/ops', label: 'Situation Ops', icon: Map },
  { path: '/resources', label: 'Fleet & Hospitals', icon: Truck },
  { path: '/alerts', label: 'Alert Center', icon: Bell, badge: true },
  { path: '/analytics', label: 'Analytics & SLAs', icon: BarChart3 },
  { path: '/replay', label: 'Incident Replay', icon: Clock },
  { path: '/ai-health', label: 'AI System Health', icon: Brain },
  { path: '/report', label: 'Public Ingest', icon: FileText },
];

export function Sidebar() {
  const location = useLocation();
  const { user, logout, connectionStatus, alerts } = useStore();

  const unackedAlerts = alerts.filter(a => !a.acked_at);

  return (
    <aside className="w-72 h-screen bg-white border-r border-slate-200 z-30 flex flex-col shrink-0 select-none shadow-sm">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100">
        <Link to="/ops" className="flex items-center gap-3 no-underline group">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
            <Shield size={20} className="text-blue-600" strokeWidth={2.2} />
          </div>
          <div>
            <div className="text-[16px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Prahari
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                Ops
              </span>
            </div>
            <div className="text-[12px] text-slate-400 font-medium">
              Emergency Coordination
            </div>
          </div>
        </Link>
      </div>

      {/* System Telemetry Status Banner */}
      <div className="px-5 py-3.5 border-b border-slate-100">
        {connectionStatus === 'connected' ? (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
            </span>
            <span>Realtime Feed Connected</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100 text-amber-800 text-xs font-medium">
            <WifiOff size={13} />
            <span>Reconnecting Telemetry...</span>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const isActive = location.pathname === item.path ||
            (item.path === '/ops' && location.pathname.startsWith('/ops'));
          const hasBadge = item.badge && unackedAlerts.length > 0;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center justify-between h-11 px-3.5 rounded-lg text-[15px] font-medium no-underline transition-colors
                ${isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <item.icon
                  size={19}
                  className={isActive ? 'text-blue-600' : 'text-slate-400'}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                <span>{item.label}</span>
              </div>

              {hasBadge && (
                <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                  {unackedAlerts.length}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      {user && (
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/60">
          <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm flex items-center justify-center shrink-0">
                {user.name ? user.name.slice(0, 2).toUpperCase() : 'OP'}
              </div>
              <div className="overflow-hidden">
                <div className="text-[14px] font-semibold text-slate-900 truncate">
                  {user.name}
                </div>
                <div className="text-[12px] text-slate-500 truncate">
                  {user.role}
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
              title="Sign Out"
              aria-label="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
