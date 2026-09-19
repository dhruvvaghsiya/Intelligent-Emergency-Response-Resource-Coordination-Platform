/* =========================================================================
   AI HEALTH PAGE — §W8 AI Guardrail & Health Layer
   p50/p95 latency, fallback/error rate, circuit breaker state,
   operational eval metrics
   ========================================================================= */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Brain, Activity, AlertTriangle, Clock } from 'lucide-react';
import { Panel } from '../components/ui/Panel';
import { adminApi } from '../lib/api';
import { formatDateTime } from '../lib/format';

export function AIHealthPage() {
  const healthQ = useQuery({ queryKey: ['admin', 'ai-health'], queryFn: adminApi.aiHealth, refetchInterval: 10000 });
  const evalQ = useQuery({ queryKey: ['admin', 'ai-eval'], queryFn: adminApi.aiEval, refetchInterval: 30000 });

  if (healthQ.isLoading || evalQ.isLoading) {
    return <div className="flex-1 flex items-center justify-center text-[13px] text-text-muted">Loading AI health…</div>;
  }

  const health = healthQ.data || {};
  const eval_ = evalQ.data || {};
  const isHealthy = health.circuit_breaker === 'CLOSED' && (health.error_rate ?? 0) < 0.2;

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-[1000px] mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <Brain size={24} className="text-accent" />
          <h1 className="text-[21px] font-semibold text-text-primary">AI Service Health</h1>
          <span className={`
            inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium uppercase
            ${isHealthy
              ? 'bg-sev-low-bg text-sev-low border border-sev-low/30'
              : 'bg-sev-critical-bg text-sev-critical border border-sev-critical/30'
            }
          `}>
            <span className={`w-1.5 h-1.5 rounded-full ${isHealthy ? 'bg-sev-low' : 'bg-sev-critical'}`} />
            {health.circuit_breaker === 'OPEN' ? 'degraded' : 'healthy'}
          </span>
        </div>

        {/* Health metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <HealthCard label="p50 Latency" value={health.p50_ms != null ? `${health.p50_ms} ms` : '—'} icon={Clock} good={(health.p50_ms ?? 0) < 500} />
          <HealthCard label="p95 Latency" value={health.p95_ms != null ? `${health.p95_ms} ms` : '—'} icon={Clock} good={(health.p95_ms ?? 0) < 2000} />
          <HealthCard label="Error Rate" value={`${((health.error_rate ?? 0) * 100).toFixed(1)}%`} icon={AlertTriangle} good={(health.error_rate ?? 0) < 0.1} />
          <HealthCard label="Fallback Rate" value={`${((health.fallback_rate ?? 0) * 100).toFixed(1)}%`} icon={Activity} good={(health.fallback_rate ?? 0) < 0.2} />
          <HealthCard label="Calls (5 min)" value={health.calls_last_5m ?? 0} icon={Activity} good />
          <HealthCard label="Circuit Breaker" value={health.circuit_breaker || 'CLOSED'} icon={Brain} good={health.circuit_breaker !== 'OPEN'} />
          <HealthCard label="Consecutive Failures" value={health.consecutive_failures ?? 0} icon={AlertTriangle} good={(health.consecutive_failures ?? 0) === 0} />
        </div>

        {/* Eval metrics */}
        <Panel title="Operational Eval Metrics">
          <div className="space-y-3">
            <MetricRow label="Reports Processed" value={eval_.reports_processed ?? '—'} />
            <MetricRow label="Extraction Fallback Rate" value={eval_.extraction_fallback_rate != null ? `${(eval_.extraction_fallback_rate * 100).toFixed(1)}%` : '—'} good={eval_.extraction_fallback_rate != null ? eval_.extraction_fallback_rate < 0.2 : undefined} />
            <MetricRow label="Golden Set Size" value={eval_.golden_set_size ?? 0} />
          </div>
          {eval_.note && (
            <p className="text-[11px] text-text-muted mt-3 italic">{eval_.note}</p>
          )}
          <div className="text-[10px] text-text-muted mt-2 font-mono">
            {eval_.evaluated_at ? `Evaluated: ${formatDateTime(eval_.evaluated_at)}` : ''}
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
