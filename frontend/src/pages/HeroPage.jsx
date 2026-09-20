/* =========================================================================
   HERO PAGE — Public landing page. This is what anyone visiting the site sees
   first, no account required. It only links out to the already-public live
   views (Ops, Alerts, Report) — signing in (top-right "Admin") is strictly
   for the one role that can modify anything.
   ========================================================================= */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, Bell, FileText, ArrowRight } from 'lucide-react';
import { useStore } from '../lib/store';

export function HeroPage() {
  const navigate = useNavigate();
  const { incidents, alerts, units } = useStore();

  const activeIncidents = incidents.filter((i) => !['CLOSED', 'RESOLVED', 'MERGED', 'FALSE_ALARM'].includes(i.status)).length;
  const unackedAlerts = alerts.filter((a) => !a.acked_at).length;
  const unitsAvailable = units.filter((u) => u.status === 'AVAILABLE').length;

  return (
    <div className="flex-1 relative overflow-hidden">
      <img
        src="/satellite-hero.jpg"
        alt="Metropolitan Emergency Command Grid"
        className="absolute inset-0 w-full h-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/40 to-slate-950/80" />

      <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 text-center">
        <span className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-[11px] font-semibold text-white mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Ahmedabad Operations Grid · Live Daylight Feed
        </span>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight max-w-3xl drop-shadow-sm">
          Every Second Counts In Critical Response.
        </h1>
        <p className="mt-4 text-sm sm:text-base text-slate-100/90 font-medium max-w-xl leading-relaxed">
          Live multi-source incident fusion, automated dispatch, and citywide situational awareness —
          open to anyone, in real time. No account needed to look.
        </p>

        {/* Live stat strip — real store data, already fetched publicly on load */}
        <div className="flex items-center gap-6 sm:gap-10 mt-8 px-6 py-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
          <Stat value={activeIncidents} label="Active Incidents" />
          <div className="w-px h-8 bg-white/20" />
          <Stat value={unackedAlerts} label="Open Alerts" />
          <div className="w-px h-8 bg-white/20" />
          <Stat value={unitsAvailable} label="Units Available" />
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-9">
          <button
            onClick={() => navigate('/ops')}
            className="h-12 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-blue-900/30 cursor-pointer"
          >
            <Map size={17} />
            View Live Situation Map
            <ArrowRight size={15} />
          </button>
          <button
            onClick={() => navigate('/alerts')}
            className="h-12 px-5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/25 text-white text-sm font-bold flex items-center gap-2 transition-colors backdrop-blur-md cursor-pointer"
          >
            <Bell size={16} />
            View Alerts
          </button>
          <button
            onClick={() => navigate('/report')}
            className="h-12 px-5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/25 text-white text-sm font-bold flex items-center gap-2 transition-colors backdrop-blur-md cursor-pointer"
          >
            <FileText size={16} />
            Report an Incident
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-extrabold text-white tabular-nums">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-200/80 mt-0.5">{label}</div>
    </div>
  );
}
