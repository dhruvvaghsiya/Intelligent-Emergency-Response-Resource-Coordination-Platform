/* =========================================================================
   AI HEALTH PAGE — Guardrails, Latency Distribution & Circuit Breakers
   ========================================================================= */
import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Brain, Activity, AlertTriangle, Clock, ShieldCheck, Cpu } from 'lucide-react';
import { Panel } from '../components/ui/Panel';
import { adminApi } from '../lib/api';
import { formatDateTime } from '../lib/format';

export function AIHealthPage() {
  const healthQ = useQuery({ queryKey: ['admin', 'ai-health'], queryFn: adminApi.aiHealth, refetchInterval: 10000 });
  const evalQ = useQuery({ queryKey: ['admin', 'ai-eval'], queryFn: adminApi.aiEval, refetchInterval: 30000 });

  if (healthQ.isLoading || evalQ.isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm font-medium text-slate-500 bg-slate-50">
        Querying inference model telemetry...
      </div>
    );
  }

  const health = healthQ.data || {};
  const eval_ = evalQ.data || {};
  const isHealthy = health.circuit_breaker === 'CLOSED' && (health.error_rate ?? 0) < 0.2;

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
      <div className="max-w-[1100px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
              <Brain size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                AI Reasoning Core Health & Latency
              </h1>
              <p className="text-sm font-medium text-slate-500 mt-0.5">
                SLO Latency Envelopes, Circuit Breaker State & Neural Extraction Accuracy
              </p>
            </div>
          </div>
          <span className={`
            inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold
            ${isHealthy
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
            }
          `}>
            <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-500' : 'bg-red-500'}`} />
            {health.circuit_breaker === 'OPEN' ? 'Circuit Open (Degraded)' : 'Nominal Inference'}
          </span>
        </div>

        {/* Health Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <HealthCard label="p50 Latency" value={health.p50_ms != null ? `${health.p50_ms} ms` : '—'} icon={Clock} good={(health.p50_ms ?? 0) < 500} />
          <HealthCard label="p95 Tail Latency" value={health.p95_ms != null ? `${health.p95_ms} ms` : '—'} icon={Clock} good={(health.p95_ms ?? 0) < 2000} />
          <HealthCard label="Inference Error Rate" value={`${((health.error_rate ?? 0) * 100).toFixed(1)}%`} icon={AlertTriangle} good={(health.error_rate ?? 0) < 0.1} />
          <HealthCard label="Rule Fallback Rate" value={`${((health.fallback_rate ?? 0) * 100).toFixed(1)}%`} icon={Activity} good={(health.fallback_rate ?? 0) < 0.2} />
          <HealthCard label="Recent Calls (5m)" value={health.calls_last_5m ?? 0} icon={Cpu} good />
          <HealthCard label="Circuit Breaker" value={health.circuit_breaker || 'CLOSED'} icon={ShieldCheck} good={health.circuit_breaker !== 'OPEN'} />
          <HealthCard label="Consecutive Faults" value={health.consecutive_failures ?? 0} icon={AlertTriangle} good={(health.consecutive_failures ?? 0) === 0} />
          <HealthCard label="Model Engine" value="Gemini 1.5 Flash" icon={Brain} good />
        </div>

        {/* Eval metrics */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4">Continuous Operational Evaluation (Ground Truth Benchmark)</h2>
          <div className="space-y-3 divide-y divide-slate-100">
            <MetricRow label="Reports Benchmarked in Window" value={eval_.reports_processed ?? '—'} />
            <MetricRow label="Entity Extraction Heuristic Fallback Rate" value={eval_.extraction_fallback_rate != null ? `${(eval_.extraction_fallback_rate * 100).toFixed(1)}%` : '—'} good={eval_.extraction_fallback_rate != null ? eval_.extraction_fallback_rate < 0.2 : undefined} />
            <MetricRow label="Golden Incident Validation Set Size" value={`${eval_.golden_set_size ?? 0} samples`} />
          </div>
          {eval_.note && (
            <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 leading-relaxed">
              {eval_.note}
            </div>
          )}
          <div className="text-xs font-medium text-slate-400 mt-4 text-right">
            {eval_.evaluated_at ? `Last evaluation cycle: ${formatDateTime(eval_.evaluated_at)}` : ''}
          </div>
        </div>
      </div>
    </div>
  );
}

function HealthCard({ label, value, icon: Icon, good = true }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-slate-300 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={15} className="text-slate-400" />
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-2xl font-bold tracking-tight ${good ? 'text-slate-900' : 'text-red-600'}`}>
        {value}
      </div>
    </div>
  );
}

function MetricRow({ label, value, good }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <span className={`text-sm font-semibold ${good === undefined ? 'text-slate-900' : good ? 'text-emerald-700' : 'text-red-600'}`}>
        {value}
      </span>
    </div>
  );
}
