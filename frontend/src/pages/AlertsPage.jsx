/* =========================================================================
   ALERTS PAGE — Tactical Alert Inbox & Acknowledgment (Light Theme)
   ========================================================================= */
import React from 'react';
import { useStore } from '../lib/store';
import { Button } from '../components/ui/Button';
import { SeverityChip } from '../components/ui/Chip';
import { Check, AlertTriangle, Bell, Shield, Radio, Cpu, Users, CheckCircle2 } from 'lucide-react';
import { formatRelativeTime, formatTime } from '../lib/format';
import { SEVERITY_CONFIG } from '../lib/constants';

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
  const { alerts, ackAlert } = useStore();
  const unacked = alerts.filter(a => !a.acked_at);
  const acked = alerts.filter(a => a.acked_at);

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-50 select-none">
      <div className="max-w-[960px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Bell size={24} className="text-blue-600" />
              Tactical Alert Dispatch Inbox
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Active SLA Breaches, Preemption Advisories, & Cascading Event Warnings
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-xs">
              <strong className="text-slate-900 font-bold">{unacked.length}</strong> Unacknowledged
            </span>
          </div>
        </div>

        {/* Unacked Section */}
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Pending Immediate Attention ({unacked.length})</span>
          </div>

          {unacked.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center shadow-sm">
              <CheckCircle2 size={32} className="text-emerald-600 mx-auto mb-2" />
              <div className="text-base text-slate-900 font-semibold">All Escalations Acknowledged</div>
              <div className="text-sm text-slate-500 mt-1">No active unacknowledged incidents in queue.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {unacked.map(alert => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onAck={() => ackAlert(alert.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Acked Section */}
        {acked.length > 0 && (
          <div className="space-y-3 pt-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Resolved & Acknowledged Stream ({acked.length})
            </div>
            <div className="space-y-3 opacity-75">
              {acked.map(alert => (
                <AlertCard key={alert.id} alert={alert} acked />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AlertCard({ alert, onAck, acked = false }) {
  const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.INFO;
  const Icon = ALERT_ICONS[alert.type] || Bell;

  const leftBorderColor = alert.severity === 'CRITICAL' ? 'border-l-red-500'
    : alert.severity === 'HIGH' ? 'border-l-orange-500'
    : alert.severity === 'MODERATE' ? 'border-l-amber-500'
    : 'border-l-blue-500';

  return (
    <div
      className={`
        flex items-start gap-4 p-5
        bg-white border border-slate-200 ${!acked ? `${leftBorderColor} border-l-[4px]` : ''} rounded-xl shadow-xs
        transition-all duration-150
      `}
    >
      <div className="p-2.5 rounded-lg bg-slate-50 text-slate-600 shrink-0">
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 mb-1.5">
          <span className="text-base font-semibold text-slate-900 tracking-tight">{alert.title}</span>
          <SeverityChip severity={alert.severity} />
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">{alert.body}</p>
        <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 font-medium">
          <span>{formatTime(alert.raised_at)}</span>
          <span>·</span>
          <span>{formatRelativeTime(alert.raised_at)}</span>
          <span>·</span>
          <span className="uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[11px]">{alert.type.replace(/_/g, ' ')}</span>
        </div>
      </div>
      {!acked && onAck && (
        <Button variant="secondary" size="compact" onClick={onAck} className="shrink-0">
          <Check size={14} />
          Acknowledge
        </Button>
      )}
    </div>
  );
}
