import React from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import { Button } from '../components/ui/Button';
import { SeverityChip } from '../components/ui/Chip';
import {
  Check, AlertTriangle, Bell, Shield, Radio, Cpu, Users,
  CheckCircle2, Clock, MapPin, ArrowRight
} from 'lucide-react';
import { formatRelativeTime } from '../lib/format';
import { hasPermission, PERMISSIONS } from '../lib/permissions';

const ALERT_ICONS = {
  NEW_CRITICAL: AlertTriangle,
  SEVERITY_ESCALATED: AlertTriangle,
  EVIDENCE_CONFLICT: AlertTriangle,
  DUPLICATE_SUSPECTED: Users,
  COVERAGE_HOLE: Shield,
  RESOURCE_SHORTAGE: Bell,
  REALLOCATION_PROPOSED: Radio,
  SLA_BREACH: Bell,
  CASCADE_RISK: AlertTriangle,
  UNIT_UNRESPONSIVE: Radio,
  AI_DEGRADED: Cpu,
};

export function AlertsPage() {
  const { alerts, ackAlert, ackAllAlerts, incidents = [], units = [], user, isAuthenticated } = useStore();

  // Admin and authorized incident operators can acknowledge/modify alerts
  const canModify = Boolean(
    isAuthenticated && (
      user?.role === 'ADMIN' ||
      hasPermission(user, PERMISSIONS.EDIT_INCIDENT) ||
      hasPermission(user, PERMISSIONS.ADMIN)
    )
  );

  const unacked = alerts.filter(a => !a.acked_at);
  const acked = alerts.filter(a => a.acked_at);

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-50 select-none">
      <div className="max-w-[920px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Bell size={22} className="text-slate-700" />
              Tactical Alert & Notifications
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Active SLA breaches, preemption advisories, and system dispatch warnings
            </p>
          </div>
          <div className="flex items-center gap-3">
            {canModify ? (
              unacked.length > 0 && (
                <Button
                  variant="primary"
                  size="compact"
                  onClick={ackAllAlerts}
                  className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 border-emerald-600 shadow-xs cursor-pointer flex items-center gap-1.5 rounded-lg px-3 py-1.5"
                >
                  <CheckCircle2 size={15} />
                  Acknowledge All ({unacked.length})
                </Button>
              )
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs flex items-center gap-1.5">
                  <Shield size={13} className="text-slate-400" />
                  Read-Only
                </span>
                {!isAuthenticated && (
                  <Link
                    to="/login"
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 px-3 py-1.5 rounded-lg shadow-2xs transition-colors flex items-center gap-1"
                  >
                    Admin Sign In <ArrowRight size={12} />
                  </Link>
                )}
              </div>
            )}
            <span className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-xs flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${unacked.length > 0 ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
              <strong className="text-slate-900 font-bold">{unacked.length}</strong> Unacknowledged
            </span>
          </div>
        </div>

        {/* Read-only Advisory Banner for non-logged-in visitors */}
        {!canModify && (
          <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-800 shadow-2xs">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle size={15} className="text-amber-600 shrink-0" />
              <span>Public Observer View: You can view live alert statuses. Sign in as Admin to acknowledge or modify notifications.</span>
            </div>
            {!isAuthenticated && (
              <Link
                to="/login"
                className="font-bold text-blue-700 hover:text-blue-800 underline shrink-0 flex items-center gap-1"
              >
                Admin Login →
              </Link>
            )}
          </div>
        )}

        {/* Pending Unacknowledged Alerts */}
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between px-0.5">
            <span>Pending Immediate Attention ({unacked.length})</span>
          </div>

          {unacked.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-xs">
              <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" />
              <div className="text-base text-slate-900 font-semibold">All Escalations Acknowledged</div>
              <div className="text-xs text-slate-500 mt-1">No active unacknowledged alerts in your queue.</div>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-5">
              {unacked.map(alert => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  incidents={incidents}
                  units={units}
                  canModify={canModify}
                  onAck={() => ackAlert(alert.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Resolved / Acknowledged Stream */}
        {acked.length > 0 && (
          <div className="space-y-3 pt-6 border-t border-slate-200/80">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-0.5">
              Resolved &amp; Acknowledged Stream ({acked.length})
            </div>
            <div className="space-y-4 sm:space-y-5 opacity-90">
              {acked.map(alert => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  incidents={incidents}
                  units={units}
                  canModify={canModify}
                  acked
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AlertCard({ alert, onAck, acked = false, canModify = false, incidents = [], units = [] }) {
  const Icon = ALERT_ICONS[alert.type] || Bell;

  const incident = alert.incident_id ? incidents.find(i => i.id === alert.incident_id) : null;
  const unit = alert.unit_id ? units.find(u => u.id === alert.unit_id) : null;

  const leftBorderColor = alert.severity === 'CRITICAL' ? 'border-l-red-500'
    : alert.severity === 'HIGH' ? 'border-l-orange-500'
    : alert.severity === 'MODERATE' ? 'border-l-amber-500'
    : 'border-l-blue-500';

  // Extract location label
  const locationLabel = incident?.address || incident?.ward || incident?.title || '';

  return (
    <div
      className={`
        flex items-start gap-4 sm:gap-5 p-5 sm:p-6
        bg-white border border-slate-200 ${leftBorderColor} border-l-[4px]
        rounded-xl shadow-xs transition-all duration-200 hover:border-slate-400 hover:ring-2 hover:ring-slate-300/40 hover:shadow-md
      `}
    >
      {/* Neutral Slate Severity Icon */}
      <div className="p-2.5 rounded-lg bg-slate-100 text-slate-600 shrink-0 mt-0.5">
        <Icon size={20} strokeWidth={2.2} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Title + Severity + Type Badge */}
        <div className="flex items-center justify-between gap-2.5 flex-wrap">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-base sm:text-[17px] font-bold text-slate-900 tracking-tight leading-snug">{alert.title}</span>
            <SeverityChip severity={alert.severity} />
          </div>
          <span className="uppercase px-2.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[11px] font-semibold border border-slate-200/60">
            {alert.type.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Spacious Body Text with airy line-height */}
        <p className="text-sm text-slate-600 leading-[1.7] my-2.5">
          {alert.body}
        </p>

        {/* Separated Bottom Information Footer: Time, Location, Evidence Conflict Info */}
        <div className="flex items-center gap-x-4 gap-y-2 text-xs text-slate-500 font-medium flex-wrap pt-3 border-t border-slate-100">
          {/* Time */}
          <span className="flex items-center gap-1.5">
            <Clock size={13.5} className="text-slate-400" />
            {formatRelativeTime(alert.raised_at)}
          </span>

          {/* Location & Incident Code */}
          {incident && (
            <>
              <span className="text-slate-300">·</span>
              <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                <MapPin size={13.5} className="text-slate-400 shrink-0" />
                <span>{incident.code}</span>
                {locationLabel && (
                  <span className="text-slate-500 font-normal truncate max-w-[280px]">
                    ({locationLabel})
                  </span>
                )}
              </span>
            </>
          )}

          {/* Evidence Conflict Detail Tag in Bottom Bar */}
          {alert.type === 'EVIDENCE_CONFLICT' && (
            <>
              <span className="text-slate-300">·</span>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/80 text-[11px] font-semibold">
                <AlertTriangle size={12.5} className="text-slate-400 shrink-0" />
                Contested: people_trapped
              </span>
            </>
          )}

          {/* Related Unit if applicable */}
          {unit && (
            <>
              <span className="text-slate-300">·</span>
              <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                <Shield size={13.5} className="text-slate-400 shrink-0" />
                {unit.call_sign}
              </span>
            </>
          )}

          {/* Acknowledged Status Timestamp */}
          {acked && alert.acked_at && (
            <>
              <span className="text-slate-300">·</span>
              <span className="flex items-center gap-1.5 text-slate-600 font-medium ml-auto">
                <CheckCircle2 size={13.5} className="text-emerald-500" />
                Acknowledged {formatRelativeTime(alert.acked_at)} {alert.acked_by ? `· by ${alert.acked_by}` : ''}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right-hand Action / Status Indicator */}
      {acked ? (
        <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold select-none shadow-2xs mt-0.5">
          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
          <span>Acknowledged</span>
        </div>
      ) : canModify ? (
        <Button
          variant="primary"
          size="compact"
          onClick={onAck}
          className="shrink-0 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 border-emerald-600 shadow-xs transition-colors cursor-pointer mt-0.5 flex items-center gap-1.5"
        >
          <Check size={14} strokeWidth={2.5} />
          Acknowledge
        </Button>
      ) : (
        <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold select-none shadow-2xs mt-0.5">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <span>Unacknowledged</span>
        </div>
      )}
    </div>
  );
}
