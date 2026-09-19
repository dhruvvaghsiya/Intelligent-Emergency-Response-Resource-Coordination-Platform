/* =========================================================================
   REALLOCATION DIFF MODAL — §W5 Reallocation Advisor
   Shows 3 strategies as diffs: what moves, what's the harm-delta,
   what's the benefit. Commander approves one.
   ========================================================================= */
import React, { useState } from 'react';
import { ArrowRight, AlertTriangle, Check, X, Shield, Zap, Clock } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { SeverityChip } from '../ui/Chip';
import { formatDuration } from '../../lib/format';

const STRATEGIES = [
  {
    id: 'balanced',
    name: 'Balanced',
    icon: Shield,
    color: 'text-accent',
    moves: [
      { unit: 'A-07', from: null, to: 'INC-0147', eta: '7:00', harm: null },
      { unit: 'RT-01', from: null, to: 'INC-0147', eta: '6:20', harm: null },
    ],
    benefit: 'Adds ALS + extrication to INC-0147',
    total_cost: 860,
    harm_delta: 0,
  },
  {
    id: 'fastest',
    name: 'Fastest Response',
    icon: Zap,
    color: 'text-sev-high',
    moves: [
      { unit: 'FE-02', from: null, to: 'INC-0147', eta: '4:40', harm: null },
      { unit: 'RT-01', from: null, to: 'INC-0147', eta: '6:20', harm: null },
      { unit: 'A-07', from: null, to: 'INC-0147', eta: '7:00', harm: null },
    ],
    benefit: 'Fastest coverage — all 3 capabilities met',
    total_cost: 1240,
    harm_delta: 0,
  },
  {
    id: 'preemptive',
    name: 'With Preemption',
    icon: AlertTriangle,
    color: 'text-sev-moderate',
    moves: [
      { unit: 'A-03', from: 'INC-0153', to: 'INC-0147', eta: '3:20', harm: 'INC-0153 loses only BLS unit. MODERATE crowd incident — acceptable risk.' },
      { unit: 'FE-02', from: null, to: 'INC-0147', eta: '4:40', harm: null },
    ],
    benefit: 'Fastest possible ALS arrival via preemption',
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
    }, 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Reallocation Advisor — ${incidentCode || 'INC-0147'}`} size="lg">
      {approved ? (
        <div className="py-6 text-center">
          <Check size={36} className="text-accent mx-auto mb-3" />
          <p className="text-[15px] font-medium text-text-primary mb-1">Plan approved</p>
          <p className="text-[12px] text-text-secondary">Preemption executing transactionally...</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[12px] text-text-secondary mb-3">
            INC-0147 requires 3 more units. Choose a reallocation strategy:
          </p>

          {STRATEGIES.map(strat => {
            const Icon = strat.icon;
            return (
              <div key={strat.id} className="border border-border-subtle rounded-[4px] overflow-hidden hover:border-border-strong transition-colors">
                {/* Header */}
                <div className="px-3 py-2 flex items-center gap-2 bg-inset">
                  <Icon size={14} className={strat.color} />
                  <span className={`text-[13px] font-medium ${strat.color}`}>{strat.name}</span>
                  <div className="flex-1" />
                  <span className="font-mono text-[13px] font-semibold text-text-primary">
                    {formatDuration(strat.total_cost)}
                  </span>
                  {strat.harm_delta > 0 && (
                    <span className="text-[10px] text-sev-high font-mono ml-2">
                      +{formatDuration(strat.harm_delta)} harm
                    </span>
                  )}
                </div>

                {/* Moves (as diffs) */}
                <div className="px-3 py-2 space-y-1.5">
                  {strat.moves.map((move, i) => (
                    <div key={i} className="flex items-center gap-2 text-[12px]">
                      <span className="font-mono font-semibold text-text-primary w-[48px]">{move.unit}</span>
                      {move.from ? (
                        <>
                          <span className="text-sev-critical">{move.from}</span>
                          <ArrowRight size={12} className="text-text-muted" />
                        </>
                      ) : (
                        <>
                          <span className="text-status-available">Available</span>
                          <ArrowRight size={12} className="text-text-muted" />
                        </>
                      )}
                      <span className="text-accent font-medium">{move.to}</span>
                      <span className="text-text-muted ml-auto font-mono">{move.eta}</span>
                    </div>
                  ))}

                  {/* Harm warning */}
                  {strat.moves.some(m => m.harm) && (
                    <div className="mt-2 px-2 py-1.5 bg-sev-high-bg/50 border border-sev-high/20 rounded-[4px]">
                      {strat.moves.filter(m => m.harm).map((m, i) => (
                        <p key={i} className="text-[11px] text-sev-high">
                          <AlertTriangle size={10} className="inline mr-1" />
                          {m.harm}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="text-[11px] text-text-muted mt-1">{strat.benefit}</div>

                  <div className="flex gap-2 mt-2">
                    <Button variant="primary" size="compact" onClick={() => handleApprove(strat.id)}>
                      <Check size={12} />
                      Approve
                    </Button>
                    <Button variant="ghost" size="compact">
                      <X size={12} />
                      Reject
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
