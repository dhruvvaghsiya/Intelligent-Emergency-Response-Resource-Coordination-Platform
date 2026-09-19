/* =========================================================================
   SEVERITY PANEL — §W3 Explainable Severity Engine
   "Why is this CRITICAL?" panel with per-factor contribution bars,
   hard-rule badges, counterfactual lines
   ========================================================================= */
import React from 'react';
import { AlertTriangle, ShieldAlert, Info } from 'lucide-react';
import { PanelSection } from '../ui/Panel';
import { SeverityChip } from '../ui/Chip';
import { SEVERITY_CONFIG } from '../../lib/constants';
import { formatAttribute } from '../../lib/format';

export function SeverityPanel({ assessment }) {
  if (!assessment) return null;

  const maxContribution = Math.max(...assessment.factors.map(f => f.contribution), 1);

  return (
    <div className="space-y-3">
      <PanelSection title="Why this severity?">
        {/* Score display */}
        <div className="flex items-center gap-3 mb-3">
          <SeverityChip severity={assessment.severity} score={assessment.score} />
          {assessment.confidence_note && (
            <span className="text-[11px] text-sev-high italic flex-1">
              {assessment.confidence_note}
            </span>
          )}
        </div>

        {/* Hard rules */}
        {assessment.hard_rules_triggered.length > 0 && (
          <div className="mb-3 space-y-1">
            {assessment.hard_rules_triggered.map(rule => (
              <div
                key={rule}
                className="flex items-center gap-1.5 px-2 py-1 bg-sev-critical-bg border border-sev-critical/30 rounded-[4px]"
              >
                <ShieldAlert size={12} className="text-sev-critical shrink-0" />
                <span className="text-[11px] text-sev-critical font-medium font-mono">
                  {rule}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Factor bars */}
        {assessment.factors.length > 0 && (
          <div className="space-y-2">
            {assessment.factors
              .sort((a, b) => b.contribution - a.contribution)
              .map(factor => (
                <div key={factor.key} className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-text-secondary">{factor.label}</span>
                    <span className="text-[11px] font-mono text-text-muted">
                      +{factor.contribution.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-[6px] bg-inset rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-[220ms] ${
                          factor.contribution > 15 ? 'bg-sev-critical' :
                          factor.contribution > 8 ? 'bg-sev-high' :
                          factor.contribution > 4 ? 'bg-sev-moderate' : 'bg-sev-info'
                        }`}
                        style={{ width: `${(factor.contribution / maxContribution) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-text-muted font-mono w-[24px] text-right">
                      {(factor.weight * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-[10px] text-text-muted leading-tight pl-0.5">
                    {factor.explanation}
                  </div>
                </div>
              ))}
          </div>
        )}
      </PanelSection>

      {/* Counterfactuals */}
      {assessment.counterfactuals && assessment.counterfactuals.length > 0 && (
        <PanelSection title="What if?">
          <div className="space-y-1.5">
            {assessment.counterfactuals.map((cf, i) => {
              const cfConfig = SEVERITY_CONFIG[cf.then_severity] || SEVERITY_CONFIG.INFO;
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 px-2 py-1.5 bg-inset border border-border-subtle rounded-[4px]"
                >
                  <Info size={12} className="text-text-muted shrink-0" />
                  <span className="text-[11px] text-text-secondary flex-1">
                    If <span className="font-medium text-text-primary">{formatAttribute(cf.if_attribute)}</span> were{' '}
                    <span className="font-medium">{cf.were ? 'true' : 'false'}</span>
                  </span>
                  <span className="text-[11px]">→</span>
                  <SeverityChip severity={cf.then_severity} score={cf.then_score} />
                </div>
              );
            })}
          </div>
        </PanelSection>
      )}

      {/* Override info */}
      {assessment.overridden_by && (
        <div className="px-2.5 py-2 bg-sev-moderate-bg border border-sev-moderate/30 rounded-[4px]">
          <div className="text-[11px] text-sev-moderate font-medium mb-0.5">
            Severity overridden by {assessment.overridden_by.name}
          </div>
          <div className="text-[11px] text-text-muted">
            Reason: {assessment.overridden_by.reason}
          </div>
        </div>
      )}

      {/* Engine version */}
      <div className="text-[10px] text-text-muted font-mono text-right">
        Engine: {assessment.engine_version}
      </div>
    </div>
  );
}
