/* =========================================================================
   SEVERITY PANEL — Explainable Severity Attribution Model (Light Theme)
   ========================================================================= */
import React from 'react';
import { ShieldAlert, Info } from 'lucide-react';
import { PanelSection } from '../ui/Panel';
import { SeverityChip } from '../ui/Chip';
import { formatAttribute } from '../../lib/format';

export function SeverityPanel({ assessment }) {
  if (!assessment) return null;

  const maxContribution = Math.max(...assessment.factors.map(f => f.contribution), 1);

  return (
    <div className="space-y-4">
      <PanelSection title="Severity Attribution Model">
        {/* Score display */}
        <div className="flex items-center gap-3 mb-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <SeverityChip severity={assessment.severity} score={assessment.score} />
          {assessment.confidence_note && (
            <span className="text-xs text-amber-800 font-medium flex-1 truncate">
              {assessment.confidence_note}
            </span>
          )}
        </div>

        {/* Hard rules */}
        {assessment.hard_rules_triggered.length > 0 && (
          <div className="mb-3 space-y-1.5">
            {assessment.hard_rules_triggered.map(rule => (
              <div
                key={rule}
                className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700"
              >
                <ShieldAlert size={15} className="text-red-600 shrink-0" />
                <span className="font-semibold font-mono">
                  Triggered Rule: {rule}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Factor bars */}
        {assessment.factors.length > 0 && (
          <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            {assessment.factors
              .sort((a, b) => b.contribution - a.contribution)
              .map(factor => (
                <div key={factor.key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800">{factor.label}</span>
                    <span className="text-xs font-bold text-slate-600">
                      +{factor.contribution.toFixed(1)} pts
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-200 ${
                          factor.contribution > 15 ? 'bg-red-500' :
                          factor.contribution > 8 ? 'bg-orange-500' :
                          factor.contribution > 4 ? 'bg-amber-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${(factor.contribution / maxContribution) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 font-mono w-7 text-right">
                      {(factor.weight * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 leading-tight">
                    {factor.explanation}
                  </div>
                </div>
              ))}
          </div>
        )}
      </PanelSection>

      {/* Counterfactuals */}
      {assessment.counterfactuals && assessment.counterfactuals.length > 0 && (
        <PanelSection title="What-If Counterfactual Scenarios">
          <div className="space-y-2">
            {assessment.counterfactuals.map((cf, i) => (
              <div
                key={i}
                className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl text-xs shadow-xs"
              >
                <Info size={14} className="text-slate-400 shrink-0" />
                <span className="text-slate-700 flex-1">
                  If <strong className="font-semibold text-slate-900">{formatAttribute(cf.if_attribute)}</strong> was{' '}
                  <span className={cf.were ? 'text-blue-600 font-semibold' : 'text-slate-500'}>{cf.were ? 'True' : 'False'}</span>
                </span>
                <span className="text-slate-400">→</span>
                <SeverityChip severity={cf.then_severity} score={cf.then_score} />
              </div>
            ))}
          </div>
        </PanelSection>
      )}

      {/* Override info */}
      {assessment.overridden_by && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="text-xs text-amber-800 font-bold mb-0.5">
            Manual Override by {assessment.overridden_by.name}
          </div>
          <div className="text-xs text-slate-600">
            Reason: {assessment.overridden_by.reason}
          </div>
        </div>
      )}

      {/* Engine version */}
      <div className="text-xs text-slate-400 font-mono text-right">
        Engine version {assessment.engine_version}
      </div>
    </div>
  );
}
