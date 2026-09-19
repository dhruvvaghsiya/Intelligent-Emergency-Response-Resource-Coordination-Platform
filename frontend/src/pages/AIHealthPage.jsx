/* =========================================================================
   AI HEALTH PAGE — §W8 AI Guardrail & Health Layer
   p50/p95 latency, schema-failure rate, fallback rate,
   golden-set metrics (confusion matrix)
   ========================================================================= */
import React from 'react';
import { Brain, Activity, AlertTriangle, Check, X, Clock } from 'lucide-react';
import { Panel, PanelSection } from '../components/ui/Panel';

const MOCK_AI_HEALTH = {
  status: 'healthy',
  model_loaded: true,
  llm_ok: true,
  p50_ms: 180,
  p95_ms: 420,
  schema_failure_rate: 0.02,
  fallback_rate: 0.05,
  calls_last_5m: 38,
};

const MOCK_EVAL = {
  golden_set_size: 120,
  type_accuracy: 0.87,
  macro_f1: 0.83,
  attribute_precision: 0.91,
  attribute_recall: 0.78,
  correlation: { precision: 0.91, recall: 0.85, f1: 0.88, threshold: 0.86 },
  confusion_matrix: {
    labels: ['FIRE', 'FLOOD', 'ROAD_ACC', 'MEDICAL', 'GAS_LEAK', 'CHEM', 'ELEC', 'OTHER'],
    matrix: [
      [18, 1, 0, 0, 0, 1, 0, 0],
      [0, 15, 0, 0, 0, 0, 0, 1],
      [0, 0, 14, 1, 0, 0, 0, 0],
      [0, 0, 1, 12, 0, 0, 0, 1],
      [0, 0, 0, 0, 8, 1, 1, 0],
      [1, 0, 0, 0, 1, 7, 0, 0],
      [0, 0, 0, 0, 1, 0, 9, 0],
      [1, 1, 0, 1, 0, 0, 0, 24],
    ],
  },
  evaluated_at: new Date().toISOString(),
};

export function AIHealthPage() {
  const health = MOCK_AI_HEALTH;
  const eval_ = MOCK_EVAL;

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-[1000px] mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <Brain size={24} className="text-accent" />
          <h1 className="text-[21px] font-semibold text-text-primary">AI Service Health</h1>
          <span className={`
            inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium uppercase
            ${health.status === 'healthy'
              ? 'bg-sev-low-bg text-sev-low border border-sev-low/30'
              : 'bg-sev-critical-bg text-sev-critical border border-sev-critical/30'
            }
          `}>
            <span className={`w-1.5 h-1.5 rounded-full ${health.status === 'healthy' ? 'bg-sev-low' : 'bg-sev-critical'}`} />
            {health.status}
          </span>
        </div>

        {/* Health metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <HealthCard label="p50 Latency" value={`${health.p50_ms} ms`} icon={Clock} good={health.p50_ms < 500} />
          <HealthCard label="p95 Latency" value={`${health.p95_ms} ms`} icon={Clock} good={health.p95_ms < 2000} />
          <HealthCard label="Schema Fail Rate" value={`${(health.schema_failure_rate * 100).toFixed(1)}%`} icon={AlertTriangle} good={health.schema_failure_rate < 0.05} />
          <HealthCard label="Fallback Rate" value={`${(health.fallback_rate * 100).toFixed(1)}%`} icon={Activity} good={health.fallback_rate < 0.1} />
          <HealthCard label="Calls (5 min)" value={health.calls_last_5m} icon={Activity} good />
          <HealthCard label="Model Loaded" value={health.model_loaded ? 'Yes' : 'No'} icon={Brain} good={health.model_loaded} />
          <HealthCard label="LLM Status" value={health.llm_ok ? 'Online' : 'Down'} icon={Brain} good={health.llm_ok} />
        </div>

        {/* Golden set metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <Panel title="Classification Metrics">
            <div className="space-y-3">
              <MetricRow label="Golden Set Size" value={eval_.golden_set_size} />
              <MetricRow label="Type Accuracy" value={`${(eval_.type_accuracy * 100).toFixed(1)}%`} good={eval_.type_accuracy > 0.8} />
              <MetricRow label="Macro F1" value={`${(eval_.macro_f1 * 100).toFixed(1)}%`} good={eval_.macro_f1 > 0.75} />
              <MetricRow label="Attribute Precision" value={`${(eval_.attribute_precision * 100).toFixed(1)}%`} good={eval_.attribute_precision > 0.85} />
              <MetricRow label="Attribute Recall" value={`${(eval_.attribute_recall * 100).toFixed(1)}%`} good={eval_.attribute_recall > 0.7} />
            </div>
          </Panel>

          <Panel title="Correlation Metrics">
            <div className="space-y-3">
              <MetricRow label="Threshold" value={eval_.correlation.threshold} />
              <MetricRow label="Precision" value={`${(eval_.correlation.precision * 100).toFixed(1)}%`} good={eval_.correlation.precision > 0.85} />
              <MetricRow label="Recall" value={`${(eval_.correlation.recall * 100).toFixed(1)}%`} good={eval_.correlation.recall > 0.8} />
              <MetricRow label="F1 Score" value={`${(eval_.correlation.f1 * 100).toFixed(1)}%`} good={eval_.correlation.f1 > 0.8} />
            </div>
          </Panel>
        </div>

        {/* Confusion matrix */}
        <Panel title="Type Classification — Confusion Matrix">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="text-[10px] text-text-muted font-medium px-1 py-1 text-left">Actual ↓ / Pred →</th>
                  {eval_.confusion_matrix.labels.map(l => (
                    <th key={l} className="text-[9px] text-text-muted font-mono px-1 py-1 text-center" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', minWidth: 28 }}>
                      {l}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {eval_.confusion_matrix.matrix.map((row, i) => (
                  <tr key={i}>
                    <td className="text-[10px] text-text-muted font-mono px-1 py-0.5">{eval_.confusion_matrix.labels[i]}</td>
                    {row.map((val, j) => {
                      const isDiag = i === j;
                      const max = Math.max(...row);
                      return (
                        <td
                          key={j}
                          className={`text-center text-[11px] font-mono px-1 py-0.5 ${
                            isDiag && val > 0
                              ? 'text-accent font-semibold bg-accent-muted/30'
                              : val > 0
                              ? 'text-sev-high bg-sev-high-bg/30'
                              : 'text-text-muted/30'
                          }`}
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-[10px] text-text-muted mt-2 font-mono">
            Evaluated: {new Date(eval_.evaluated_at).toLocaleString()} · {eval_.golden_set_size} reports (40 multilingual, 20 adversarial)
          </div>
        </Panel>
      </div>
    </div>
  );
}

function HealthCard({ label, value, icon: Icon, good = true }) {
  return (
    <div className="bg-surface border border-border-subtle rounded-[4px] px-3 py-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={12} className="text-text-muted" />
        <span className="text-[10px] text-text-muted uppercase tracking-wider">{label}</span>
      </div>
      <div className={`font-mono text-[17px] font-semibold ${good ? 'text-accent' : 'text-sev-high'}`}>
        {value}
      </div>
    </div>
  );
}

function MetricRow({ label, value, good }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-border-subtle last:border-b-0">
      <span className="text-[12px] text-text-secondary">{label}</span>
      <span className={`font-mono text-[13px] font-semibold ${good === undefined ? 'text-text-primary' : good ? 'text-accent' : 'text-sev-high'}`}>
        {value}
      </span>
    </div>
  );
}
