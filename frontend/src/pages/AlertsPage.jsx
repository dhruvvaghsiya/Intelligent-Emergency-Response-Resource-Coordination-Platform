/* =========================================================================
   ALERTS PAGE — Alert inbox with ack workflow
   ========================================================================= */
import React from 'react';
import { useStore } from '../lib/store';
import { Button } from '../components/ui/Button';
import { SeverityChip } from '../components/ui/Chip';
import { Check, AlertTriangle, Bell, Shield, Radio, Cpu, Users } from 'lucide-react';
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
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-[800px] mx-auto">
        <h1 className="text-[21px] font-semibold text-text-primary mb-4">Alerts</h1>

        {/* Unacked */}
        <div className="mb-6">
          <h2 className="text-[12px] font-medium uppercase tracking-wider text-text-muted mb-2">
            Pending ({unacked.length})
          </h2>
          {unacked.length === 0 ? (
            <div className="bg-surface border border-border-subtle rounded-[4px] p-6 text-center text-[13px] text-text-muted">
              All alerts acknowledged. No pending actions.
            </div>
          ) : (
            <div className="space-y-1.5">
              {unacked.map(alert => (
                <AlertCard key={alert.id} alert={alert} onAck={() => ackAlert(alert.id)} />
              ))}
            </div>
          )}
        </div>

        {/* Acked */}
        {acked.length > 0 && (
          <div>
            <h2 className="text-[12px] font-medium uppercase tracking-wider text-text-muted mb-2">
              Acknowledged ({acked.length})
            </h2>
            <div className="space-y-1.5 opacity-60">
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

  return (
    <div className={`
      flex items-start gap-3 px-3 py-2.5
      bg-surface border rounded-[4px]
      ${acked ? 'border-border-subtle' : config.border}
      transition-colors
    `}>
      <Icon size={16} className={`mt-0.5 shrink-0 ${config.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[13px] font-medium text-text-primary">{alert.title}</span>
          <SeverityChip severity={alert.severity} />
        </div>
        <p className="text-[12px] text-text-secondary">{alert.body}</p>
        <div className="flex items-center gap-3 mt-1 text-[11px] text-text-muted">
          <span className="font-mono">{formatTime(alert.raised_at)}</span>
          <span>{formatRelativeTime(alert.raised_at)}</span>
          <span className="uppercase tracking-wider">{alert.type.replace(/_/g, ' ')}</span>
        </div>
      </div>
      {!acked && onAck && (
        <Button variant="secondary" size="compact" onClick={onAck}>
          <Check size={12} />
          Ack
        </Button>
      )}
    </div>
  );
}
