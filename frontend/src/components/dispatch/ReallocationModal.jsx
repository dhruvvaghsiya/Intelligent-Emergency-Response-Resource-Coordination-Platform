/* =========================================================================
   REALLOCATION DIFF MODAL — Multi-Incident Resource Advisor (Light Theme)
   ========================================================================= */
import React, { useState } from 'react';
import { ArrowRight, AlertTriangle, Check, X, Shield, Zap, Clock } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatDuration } from '../../lib/format';

const STRATEGIES = [
  {
    id: 'balanced',
    name: 'Balanced Coverage Plan',
    icon: Shield,
    color: 'text-blue-700 bg-blue-50 border-blue-200',
    moves: [
      { unit: 'A-07', from: null, to: 'INC-0147', eta: '7:00', harm: null },
      { unit: 'RT-01', from: null, to: 'INC-0147', eta: '6:20', harm: null },
    ],
    benefit: 'Assigns ALS Medical + Technical Extrication to INC-0147 without preempting active dispatches',
    total_cost: 860,
    harm_delta: 0,
  },
  {
    id: 'fastest',
    name: 'Fastest Response Strategy',
    icon: Zap,
    color: 'text-orange-700 bg-orange-50 border-orange-200',
    moves: [
      { unit: 'FE-02', from: null, to: 'INC-0147', eta: '4:40', harm: null },
      { unit: 'RT-01', from: null, to: 'INC-0147', eta: '6:20', harm: null },
      { unit: 'A-07', from: null, to: 'INC-0147', eta: '7:00', harm: null },
    ],
    benefit: 'Max speed deployment — all 3 critical capabilities met',
    total_cost: 1240,
    harm_delta: 0,
  },
  {
    id: 'preemptive',
    name: 'Dynamic Preemption Option',
    icon: AlertTriangle,
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    moves: [
      { unit: 'A-03', from: 'INC-0153', to: 'INC-0147', eta: '3:20', harm: 'INC-0153 loses primary BLS unit. MODERATE crowd incident — acceptable operational risk.' },
      { unit: 'FE-02', from: null, to: 'INC-0147', eta: '4:40', harm: null },
    ],
    benefit: 'Fastest possible ALS arrival via preemption of low-priority unit',
    total_cost: 740,
    harm_delta: 320,
  },
];

export function ReallocationModal({ isOpen, onClose, incidentCode }) {
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [approved, setApproved] = useState(false);

  const handleApprove = (id) => {
    setSelectedStrategy(id);
    setApproved(true);
    setTimeout(() => {
      onClose();
      setApproved(false);
      setSelectedStrategy(null);
    }, 1600);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Reallocation Advisor — ${incidentCode || 'INC-0147'}`} size="lg">
      {approved ? (
        <div className="py-8 text-center bg-emerald-50 rounded-xl border border-emerald-100">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3 text-emerald-700">
            <Check size={26} strokeWidth={2.5} />
          </div>
          <p className="text-base font-bold text-slate-900 mb-1">Reallocation Plan Approved</p>
          <p className="text-sm text-slate-600">Executing unit preemption and automatic rerouting...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Target incident requires additional units. Select optimal trade-off plan:
          </p>

          {STRATEGIES.map(strat => {
            const Icon = strat.icon;
            return (
              <div key={strat.id} className="border border-slate-200 bg-white rounded-xl overflow-hidden hover:border-slate-300 transition-colors shadow-sm">
                {/* Header */}
                <div className="p-4 flex items-center justify-between bg-slate-50 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-md border ${strat.color}`}>
                      <Icon size={16} />
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{strat.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      {formatDuration(strat.total_cost)} cost
                    </span>
                    {strat.harm_delta > 0 && (
                      <span className="text-xs text-amber-800 font-semibold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        +{formatDuration(strat.harm_delta)} harm delta
                      </span>
                    )}
                  </div>
                </div>

                {/* Moves (as diffs) */}
                <div className="p-4 space-y-3">
                  <div className="space-y-2">
                    {strat.moves.map((move, i) => (
                      <div key={i} className="flex items-center gap-2.5 text-sm bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <span className="font-mono font-bold text-slate-900 w-14">{move.unit}</span>
                        {move.from ? (
                          <>
                            <span className="text-red-700 font-medium">{move.from}</span>
                            <ArrowRight size={14} className="text-slate-400" />
                          </>
                        ) : (
                          <>
                            <span className="text-emerald-700 font-medium">Available</span>
                            <ArrowRight size={14} className="text-slate-400" />
                          </>
                        )}
                        <span className="text-blue-700 font-bold">{move.to}</span>
                        <span className="text-slate-500 ml-auto font-mono text-xs">ETA {move.eta}</span>
                      </div>
                    ))}
                  </div>

                  {/* Harm warning */}
                  {strat.moves.some(m => m.harm) && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      {strat.moves.filter(m => m.harm).map((m, i) => (
                        <p key={i} className="text-xs text-red-700 flex items-start gap-1.5">
                          <AlertTriangle size={13} className="shrink-0 mt-0.5 text-red-600" />
                          <span>{m.harm}</span>
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="text-xs text-slate-600 leading-relaxed">{strat.benefit}</div>

                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <Button variant="primary" size="compact" onClick={() => handleApprove(strat.id)}>
                      <Check size={14} />
                      Approve & Dispatch
                    </Button>
                    <Button variant="ghost" size="compact" onClick={onClose}>
                      <X size={14} />
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
