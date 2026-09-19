/* =========================================================================
   DISPATCH PANEL — Resource Allocation Strategy Cockpit (Light Theme)
   ========================================================================= */
import React, { useState } from 'react';
import { Check, X, Edit3, Clock, AlertTriangle, Zap, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { PanelSection } from '../ui/Panel';
import { Button } from '../ui/Button';
import { formatDuration } from '../../lib/format';
import { MOCK_DISPATCH_PLANS } from '../../mocks/fixtures';

const STRATEGY_CONFIG = {
  BALANCED: { label: 'Balanced Plan', icon: Shield, color: 'text-blue-700 bg-blue-50 border-blue-200', desc: 'Optimal equilibrium between ETA and secondary network disruption' },
  FASTEST_RESPONSE: { label: 'Fastest Response', icon: Zap, color: 'text-orange-700 bg-orange-50 border-orange-200', desc: 'Minimizes first unit on scene at all costs' },
  MINIMAL_DISRUPTION: { label: 'Minimal Disruption', icon: Clock, color: 'text-emerald-700 bg-emerald-50 border-emerald-200', desc: 'Avoids preempting units currently responding' },
};

export function DispatchPanel({ incidentId }) {
  const [expandedPlan, setExpandedPlan] = useState(null);
  const [approvedPlan, setApprovedPlan] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(null);

  const plans = MOCK_DISPATCH_PLANS.filter(p => p.incident_id === incidentId);

  if (plans.length === 0) {
    return (
      <PanelSection title="Dispatch Optimization">
        <div className="text-sm text-slate-400 py-3 text-center">
          No automated dispatch plans generated for this incident.
        </div>
      </PanelSection>
    );
  }

  return (
    <div className="space-y-4">
      <PanelSection title={`Recommended Dispatch Plans (${plans.length})`}>
        <p className="text-sm text-slate-500 mb-3">
          Compare candidate plans scored by composite cost penalty (lower is better):
        </p>

        <div className="space-y-3">
          {plans.map(plan => {
            const strategy = STRATEGY_CONFIG[plan.strategy] || STRATEGY_CONFIG.BALANCED;
            const isExpanded = expandedPlan === plan.id;
            const isApproved = approvedPlan === plan.id;
            const StrategyIcon = strategy.icon;

            return (
              <div
                key={plan.id}
                className={`
                  border rounded-xl overflow-hidden transition-all duration-150
                  ${isApproved ? 'border-blue-300 bg-blue-50/50 shadow-sm' :
                    !plan.feasible ? 'border-slate-200 bg-slate-50/70 opacity-70' :
                    'border-slate-200 bg-white hover:border-slate-300 shadow-sm'}
                `}
              >
                {/* Plan header */}
                <button
                  onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                  className="w-full p-4 flex items-center gap-3 cursor-pointer text-left select-none"
                >
                  <div className={`p-2 rounded-lg border ${strategy.color}`}>
                    <StrategyIcon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{strategy.label}</span>
                      {!plan.feasible && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                          Infeasible
                        </span>
                      )}
                      {plan.requires_preemption && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <AlertTriangle size={12} /> Preemption
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right mr-1">
                    <div className="text-base font-bold text-slate-900">
                      {formatDuration(plan.total_cost)}
                    </div>
                    <div className="text-xs text-slate-400">composite cost</div>
                  </div>

                  {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50/50">
                    <p className="text-xs text-slate-600 mb-3 font-sans leading-relaxed">{strategy.desc}</p>

                    {/* Unit moves */}
                    <div className="space-y-2 mb-3">
                      {plan.moves.map((move, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 shadow-xs">
                          <span className="font-mono text-sm font-bold text-slate-900 w-12 shrink-0">
                            {move.unit_call_sign}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-slate-800">
                              ETA: <strong className="font-semibold text-blue-600">{formatDuration(move.eta_seconds)}</strong>
                              <span className="text-xs text-slate-400 font-mono ml-2">[{move.eta_method.replace(/_/g, ' ')}]</span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">{move.impact_note}</div>
                          </div>
                          {move.preemption_regret > 0 && (
                            <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                              +{formatDuration(move.preemption_regret)} regret
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Unmet requirements */}
                    {plan.unmet_requirements.length > 0 && (
                      <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                        <strong>Unmet: </strong>{plan.unmet_requirements.join(', ')}
                      </div>
                    )}

                    {/* Action buttons */}
                    {!isApproved && plan.feasible && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="primary"
                          size="compact"
                          onClick={() => setApprovedPlan(plan.id)}
                        >
                          <Check size={14} />
                          Approve Plan
                        </Button>
                        <Button
                          variant="secondary"
                          size="compact"
                          onClick={() => {}}
                        >
                          <Edit3 size={14} />
                          Adjust
                        </Button>
                        <Button
                          variant="ghost"
                          size="compact"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => setShowReject(showReject === plan.id ? null : plan.id)}
                        >
                          <X size={14} />
                          Reject
                        </Button>
                      </div>
                    )}

                    {/* Reject with reason */}
                    {showReject === plan.id && (
                      <div className="mt-3 flex gap-2">
                        <input
                          type="text"
                          placeholder="Reason for rejection..."
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          className="flex-1 h-8 px-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                        />
                        <Button variant="danger" size="compact" onClick={() => setShowReject(null)}>
                          Confirm
                        </Button>
                      </div>
                    )}

                    {isApproved && (
                      <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 font-medium flex items-center gap-2">
                        <Check size={16} className="text-emerald-600" />
                        Plan approved — units are dispatching
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
      <div className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-sm">
        <div>
          <div className="text-xs text-slate-500 font-medium">Optimization Algorithm</div>
          <div className="text-sm font-semibold text-slate-900">Hungarian Matrix Assignment</div>
        </div>
        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
          −3:20 vs Greedy Baseline
        </span>
      </div>
    </div>
  );
}
