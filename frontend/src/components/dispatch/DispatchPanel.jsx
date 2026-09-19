/* =========================================================================
   DISPATCH PANEL — §W5 Resource Allocation Engine
   Shows 3 strategy plans (BALANCED, FASTEST_RESPONSE, MINIMAL_DISRUPTION)
   with cost breakdown, Approve/Modify/Reject triad, preemption warnings
   ========================================================================= */
import React, { useState } from 'react';
import { Check, X, Edit3, Clock, AlertTriangle, Zap, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { Panel, PanelSection } from '../ui/Panel';
import { Button } from '../ui/Button';
import { SeverityChip } from '../ui/Chip';
import { formatDuration, formatDistance } from '../../lib/format';
import { MOCK_DISPATCH_PLANS } from '../../mocks/fixtures';

const STRATEGY_CONFIG = {
  BALANCED: { label: 'Balanced', icon: Shield, color: 'text-accent', desc: 'Best trade-off between speed and disruption' },
  FASTEST_RESPONSE: { label: 'Fastest Response', icon: Zap, color: 'text-sev-high', desc: 'Minimizes total ETA at any cost' },
  MINIMAL_DISRUPTION: { label: 'Minimal Disruption', icon: Clock, color: 'text-sev-info', desc: 'Avoids preempting busy units' },
};

export function DispatchPanel({ incidentId }) {
  const [expandedPlan, setExpandedPlan] = useState(null);
  const [approvedPlan, setApprovedPlan] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(null);

  const plans = MOCK_DISPATCH_PLANS.filter(p => p.incident_id === incidentId);

  if (plans.length === 0) {
    return (
      <PanelSection title="Dispatch Recommendation">
        <div className="text-[13px] text-text-muted py-3 text-center">
          No dispatch plans generated for this incident.
        </div>
      </PanelSection>
    );
  }

  return (
    <div className="space-y-3">
      <PanelSection title={`Dispatch Plans (${plans.length})`}>
        <p className="text-[11px] text-text-muted mb-3">
          Compare plans by total cost (seconds-equivalent). Lower is better.
        </p>

        <div className="space-y-2">
          {plans.map(plan => {
            const strategy = STRATEGY_CONFIG[plan.strategy] || STRATEGY_CONFIG.BALANCED;
            const isExpanded = expandedPlan === plan.id;
            const isApproved = approvedPlan === plan.id;
            const StrategyIcon = strategy.icon;

            return (
              <div
                key={plan.id}
                className={`
                  border rounded-[4px] overflow-hidden transition-colors
                  ${isApproved ? 'border-accent bg-accent-muted/20' :
                    !plan.feasible ? 'border-border-subtle opacity-60' :
                    'border-border-subtle hover:border-border-strong'}
                `}
              >
                {/* Plan header */}
                <button
                  onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                  className="w-full px-3 py-2 flex items-center gap-2 cursor-pointer"
                >
                  <StrategyIcon size={14} className={strategy.color} />
                  <span className={`text-[13px] font-medium ${strategy.color}`}>{strategy.label}</span>
                  {!plan.feasible && (
                    <span className="text-[10px] text-sev-high font-medium uppercase">INFEASIBLE</span>
                  )}
                  {plan.requires_preemption && (
                    <span className="text-[10px] text-sev-moderate font-medium uppercase flex items-center gap-0.5">
                      <AlertTriangle size={10} />PREEMPTION
                    </span>
                  )}
                  <div className="flex-1" />
                  <span className="font-mono text-[15px] font-semibold text-text-primary">
                    {formatDuration(plan.total_cost)}
                  </span>
                  <span className="text-[10px] text-text-muted">cost</span>
                  {isExpanded ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-border-subtle">
                    <p className="text-[11px] text-text-muted mt-2 mb-2">{strategy.desc}</p>

                    {/* Unit moves */}
                    <div className="space-y-1.5 mb-3">
                      {plan.moves.map((move, i) => (
                        <div key={i} className="flex items-center gap-2 px-2 py-1.5 bg-inset rounded-[4px] border border-border-subtle">
                          <span className="font-mono text-[12px] font-semibold text-text-primary w-[48px]">
                            {move.unit_call_sign}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-text-secondary">
                                ETA: <span className="font-mono font-medium text-accent">{formatDuration(move.eta_seconds)}</span>
                              </span>
                              <span className="text-[10px] text-text-muted font-mono">{move.eta_method.replace(/_/g, ' ')}</span>
                            </div>
                            <div className="text-[10px] text-text-muted">{move.impact_note}</div>
                          </div>
                          {move.preemption_regret > 0 && (
                            <span className="text-[10px] text-sev-high font-mono">
                              +{formatDuration(move.preemption_regret)} regret
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Unmet requirements */}
                    {plan.unmet_requirements.length > 0 && (
                      <div className="mb-3 px-2 py-1.5 bg-sev-high-bg/50 border border-sev-high/20 rounded-[4px]">
                        <span className="text-[10px] text-sev-high font-medium uppercase tracking-wider">Unmet:</span>
                        <span className="text-[11px] text-sev-high ml-1">
                          {plan.unmet_requirements.join(', ')}
                        </span>
                      </div>
                    )}

                    {/* Approve/Reject/Modify */}
                    {!isApproved && plan.feasible && (
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          size="compact"
                          onClick={() => setApprovedPlan(plan.id)}
                        >
                          <Check size={12} />
                          Approve
                        </Button>
                        <Button variant="ghost" size="compact" onClick={() => {}}>
                          <Edit3 size={12} />
                          Modify
                        </Button>
                        <Button
                          variant="ghost"
                          size="compact"
                          className="text-sev-critical"
                          onClick={() => setShowReject(showReject === plan.id ? null : plan.id)}
                        >
                          <X size={12} />
                          Reject
                        </Button>
                      </div>
                    )}

                    {/* Reject with reason */}
                    {showReject === plan.id && (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          placeholder="Reason for rejection..."
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          className="flex-1 h-[28px] px-2 bg-inset border border-border-subtle rounded-[4px] text-[12px] text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
                        />
                        <Button variant="danger" size="compact" onClick={() => setShowReject(null)}>
                          Confirm Reject
                        </Button>
                      </div>
                    )}

                    {isApproved && (
                      <div className="mt-2 px-2 py-1.5 bg-accent-muted/30 border border-accent/30 rounded-[4px] text-[11px] text-accent font-medium">
                        ✓ Plan approved — units dispatching
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </PanelSection>

      {/* Hungarian vs Greedy comparison badge */}
      <div className="px-2.5 py-2 bg-inset border border-border-subtle rounded-[4px]">
        <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Optimization Method</div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-text-primary">Hungarian assignment</span>
          <span className="text-[11px] font-mono font-medium text-accent">−3:20 vs greedy</span>
        </div>
      </div>
    </div>
  );
}
