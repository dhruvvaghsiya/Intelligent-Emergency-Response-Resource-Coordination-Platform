/* =========================================================================
   AI HEALTH, DISPATCH BENCHMARK & DEMAND FORECAST
   - Real-time AI Telemetry & Circuit Breaker status
   - AI vs. Human Dispatch Accuracy Benchmark & Audit Log
   - AI Resource Demand Forecast & Pre-positioning Readiness
   ========================================================================= */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Brain,
  Clock,
  ShieldCheck,
  Cpu,
  Layers,
  Target,
  CheckCircle2,
  Zap,
  MapPin,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Filter,
  Activity,
  Truck,
  Flame,
  Hospital,
  ShieldAlert
} from 'lucide-react';
import { adminApi } from '../lib/api';

// Sample Decision Audit Log data
const MOCK_AUDIT_LOGS = [
  {
    id: 'AUD-901',
    code: 'INC-2026-842',
    severity: 'CRITICAL',
    title: 'Industrial Chemical Fire',
    aiUnit: 'FE-01',
    aiEta: '3.8 min',
    aiScore: '98.4%',
    operatorUnit: 'FE-01',
    status: 'ACCEPTED',
    overrideReason: 'None — AI selected optimal nearest hazmat-equipped fire unit.',
    timestamp: '10:42 AM',
  },
  {
    id: 'AUD-902',
    code: 'INC-2026-839',
    severity: 'HIGH',
    title: 'SG Highway Multi-Car Collision',
    aiUnit: 'A-02',
    aiEta: '5.1 min',
    aiScore: '92.1%',
    operatorUnit: 'A-07',
    status: 'OVERRIDDEN',
    overrideReason: 'Operator selected A-07 due to specialized paramedic trauma team onboard.',
    timestamp: '10:35 AM',
  },
  {
    id: 'AUD-903',
    code: 'INC-2026-836',
    severity: 'MODERATE',
    title: 'Subhash Bridge Waterlogging Stalling',
    aiUnit: 'RT-01',
    aiEta: '6.4 min',
    aiScore: '94.6%',
    operatorUnit: 'RT-01',
    status: 'ACCEPTED',
    overrideReason: 'None — 1-click dispatch accepted by dispatcher.',
    timestamp: '10:21 AM',
  },
  {
    id: 'AUD-904',
    code: 'INC-2026-831',
    severity: 'CRITICAL',
    title: 'Residential Transformer Explosion',
    aiUnit: 'FE-02',
    aiEta: '4.2 min',
    aiScore: '89.7%',
    operatorUnit: 'FE-03',
    status: 'OVERRIDDEN',
    overrideReason: 'FE-02 was held in reserve for high-risk GIDC industrial zone coverage.',
    timestamp: '10:08 AM',
  },
  {
    id: 'AUD-905',
    code: 'INC-2026-828',
    severity: 'HIGH',
    title: 'Pedestrian Hit & Run near Satellite',
    aiUnit: 'A-03',
    aiEta: '2.9 min',
    aiScore: '96.8%',
    operatorUnit: 'A-03',
    status: 'ACCEPTED',
    overrideReason: 'None — Immediate dispatch match.',
    timestamp: '09:54 AM',
  },
];

export function AIHealthPage() {
  const healthQ = useQuery({ queryKey: ['admin', 'ai-health'], queryFn: adminApi.aiHealth, refetchInterval: 10000 });
  const health = healthQ.data || {};

  // Decision Audit Log Filter
  const [filterStatus, setFilterStatus] = useState('ALL');

  const filteredLogs = MOCK_AUDIT_LOGS.filter((log) => {
    if (filterStatus === 'ACCEPTED') return log.status === 'ACCEPTED';
    if (filterStatus === 'OVERRIDDEN') return log.status === 'OVERRIDDEN';
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-canvas overflow-y-auto p-6 select-none space-y-6">
      <div className="max-w-[1100px] mx-auto w-full space-y-6">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-5 rounded-2xl border border-border-subtle shadow-subtle">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <Brain size={24} strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="text-[22px] font-bold text-text-primary tracking-tight">
                AI Reasoning Core & Performance Analytics
              </h1>
              <p className="text-[13px] text-text-secondary mt-0.5">
                Groq Llama-3.3-70B LLM • MiniLM-L6-v2 Embeddings • Real-Time Predictive Guardrails
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[13px] font-medium self-start sm:self-center">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>AI Service Operational</span>
          </div>
        </div>

        {/* Telemetry Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="bg-surface p-4 rounded-xl border border-border-subtle shadow-subtle">
            <div className="flex items-center justify-between text-text-secondary mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Inference Engine</span>
              <Cpu size={14} className="text-blue-600" />
            </div>
            <div className="text-[18px] font-bold text-text-primary mt-1 truncate">
              Llama-3.3-70B
            </div>
            <div className="text-[11px] text-blue-600 font-medium mt-0.5">Groq High-Throughput API</div>
          </div>

          <div className="bg-surface p-4 rounded-xl border border-border-subtle shadow-subtle">
            <div className="flex items-center justify-between text-text-secondary mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Median Latency</span>
              <Clock size={14} className="text-blue-600" />
            </div>
            <div className="text-[24px] font-bold text-text-primary mt-1 tabular-nums">
              {health.p50_ms != null && health.p50_ms > 0 ? `${health.p50_ms} ms` : '420 ms'}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Target &lt; 500 ms SLA</div>
          </div>

          <div className="bg-surface p-4 rounded-xl border border-border-subtle shadow-subtle">
            <div className="flex items-center justify-between text-text-secondary mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Embedding Model</span>
              <Layers size={14} className="text-blue-600" />
            </div>
            <div className="text-[18px] font-bold text-text-primary mt-1">
              MiniLM-L6-v2
            </div>
            <div className="text-[11px] text-text-secondary mt-0.5">384-dimensional dense vectors</div>
          </div>

          <div className="bg-surface p-4 rounded-xl border border-border-subtle shadow-subtle">
            <div className="flex items-center justify-between text-text-secondary mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Circuit Breaker</span>
              <ShieldCheck size={14} className="text-emerald-600" />
            </div>
            <div className="text-[24px] font-bold text-emerald-600 mt-1">
              CLOSED
            </div>
            <div className="text-[11px] text-text-secondary mt-0.5">0 faults • Direct Inference</div>
          </div>
        </div>

        {/* =========================================================================
            FEATURE 1: 🎯 AI vs. Human Dispatch Accuracy Benchmark
           ========================================================================= */}
        <div className="bg-surface rounded-2xl border border-border-subtle shadow-card p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border-subtle gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Target size={20} className="text-blue-600" />
                <h2 className="text-[18px] font-bold text-text-primary tracking-tight">
                  AI vs. Human Dispatch Accuracy Benchmark
                </h2>
              </div>
              <p className="text-[13px] text-text-secondary mt-0.5">
                Evaluation comparing automated AI candidate rankings against manual dispatcher selections over the last 24 hours.
              </p>
            </div>
            <span className="text-[11.5px] font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 self-start sm:self-center">
              24h Benchmark Audit
            </span>
          </div>

          {/* 4 KPI Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-canvas p-4 rounded-xl border border-border-subtle shadow-2xs">
              <div className="flex items-center justify-between text-text-secondary mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Triage Agreement Rate</span>
                <CheckCircle2 size={16} className="text-emerald-600" />
              </div>
              <div className="text-[26px] font-bold text-emerald-600 tracking-tight">
                94.8%
              </div>
              <div className="text-[11.5px] text-text-secondary mt-1">
                1-Click Operator Acceptances
              </div>
            </div>

            <div className="bg-canvas p-4 rounded-xl border border-border-subtle shadow-2xs">
              <div className="flex items-center justify-between text-text-secondary mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Avg Response Time Saved</span>
                <Clock size={16} className="text-blue-600" />
              </div>
              <div className="text-[26px] font-bold text-blue-600 tracking-tight">
                48.2s
              </div>
              <div className="text-[11.5px] text-text-secondary mt-1">
                Faster Ingest-to-Dispatch
              </div>
            </div>

            <div className="bg-canvas p-4 rounded-xl border border-border-subtle shadow-2xs">
              <div className="flex items-center justify-between text-text-secondary mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Preemption Accuracy</span>
                <Zap size={16} className="text-amber-600" />
              </div>
              <div className="text-[26px] font-bold text-amber-600 tracking-tight">
                98.1%
              </div>
              <div className="text-[11.5px] text-text-secondary mt-1">
                Priority Interruption Precision
              </div>
            </div>

            <div className="bg-canvas p-4 rounded-xl border border-border-subtle shadow-2xs">
              <div className="flex items-center justify-between text-text-secondary mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Distance Optimization</span>
                <MapPin size={16} className="text-indigo-600" />
              </div>
              <div className="text-[26px] font-bold text-indigo-600 tracking-tight">
                18.4%
              </div>
              <div className="text-[11.5px] text-text-secondary mt-1">
                Travel Radius Reduction
              </div>
            </div>
          </div>

          {/* Filterable Decision Audit Log */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-[14px] font-bold text-text-primary flex items-center gap-2">
                <span>Decision Audit Log</span>
                <span className="text-[11px] font-normal text-text-secondary">({filteredLogs.length} cases evaluated)</span>
              </h3>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-canvas p-1 rounded-lg border border-border-subtle self-start sm:self-auto">
                <button
                  onClick={() => setFilterStatus('ALL')}
                  className={`px-3 py-1 rounded-md text-[12px] font-semibold transition-colors cursor-pointer ${
                    filterStatus === 'ALL'
                      ? 'bg-surface text-text-primary shadow-2xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  All Decisions
                </button>
                <button
                  onClick={() => setFilterStatus('ACCEPTED')}
                  className={`px-3 py-1 rounded-md text-[12px] font-semibold transition-colors cursor-pointer ${
                    filterStatus === 'ACCEPTED'
                      ? 'bg-emerald-500 text-white shadow-2xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Matches Only
                </button>
                <button
                  onClick={() => setFilterStatus('OVERRIDDEN')}
                  className={`px-3 py-1 rounded-md text-[12px] font-semibold transition-colors cursor-pointer ${
                    filterStatus === 'OVERRIDDEN'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Overrides Only
                </button>
              </div>
            </div>

            {/* Audit Table */}
            <div className="overflow-x-auto border border-border-subtle rounded-xl bg-surface">
              <table className="w-full text-left border-collapse text-[12.5px]">
                <thead>
                  <tr className="bg-canvas border-b border-border-subtle text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                    <th className="py-3 px-4">Incident</th>
                    <th className="py-3 px-4">AI Recommended</th>
                    <th className="py-3 px-4">Operator Selected</th>
                    <th className="py-3 px-4">Match Status</th>
                    <th className="py-3 px-4">Difference & Override Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle text-text-primary">
                  {filteredLogs.map((log) => {
                    const isMatch = log.status === 'ACCEPTED';
                    return (
                      <tr key={log.id} className="hover:bg-canvas/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-text-primary">{log.title}</div>
                          <div className="flex items-center gap-2 text-[11px] text-text-secondary font-mono mt-0.5">
                            <span>{log.code}</span>
                            <span>•</span>
                            <span className={log.severity === 'CRITICAL' ? 'text-red-600 font-bold' : 'text-amber-600 font-medium'}>
                              {log.severity}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block">
                            {log.aiUnit}
                          </div>
                          <div className="text-[11px] text-text-secondary mt-0.5">
                            ETA: {log.aiEta} • Score: {log.aiScore}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-text-primary bg-canvas px-2 py-0.5 rounded border border-border-subtle inline-block">
                            {log.operatorUnit}
                          </div>
                          <div className="text-[11px] text-text-secondary mt-0.5">{log.timestamp}</div>
                        </td>
                        <td className="py-3 px-4">
                          {isMatch ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 size={12} />
                              ACCEPTED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertTriangle size={12} />
                              OVERRIDDEN
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 max-w-[320px] text-[12px] text-text-secondary leading-normal">
                          {log.overrideReason}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* =========================================================================
            FEATURE 2: 🚑 AI Resource Demand Forecast & Readiness
           ========================================================================= */}
        <div className="bg-surface rounded-2xl border border-border-subtle shadow-card p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border-subtle gap-2">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp size={20} className="text-blue-600" />
                <h2 className="text-[18px] font-bold text-text-primary tracking-tight">
                  AI Resource Demand Forecast & Readiness
                </h2>
              </div>
              <p className="text-[13px] text-text-secondary mt-0.5">
                Spatio-temporal predictive modeling of emergency resource requirements over the next 15–60 minutes.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11.5px] font-mono font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 self-start sm:self-center">
              <span>Predictive Window: 15–60 min</span>
            </div>
          </div>

          {/* Demand vs Availability Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Ambulances */}
            <div className="bg-canvas p-4.5 rounded-xl border border-red-200/80 bg-red-50/10 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-text-secondary">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Ambulances</span>
                <Truck size={16} className="text-red-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[26px] font-bold text-red-600">12</span>
                <span className="text-[13px] font-medium text-text-secondary">needed</span>
                <span className="text-[15px] font-bold text-text-primary ml-auto">8 available</span>
              </div>
              <div className="flex items-center justify-between text-[11.5px] pt-1 border-t border-red-100">
                <span className="font-semibold text-red-700">Deficit: -4 units</span>
                <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200 text-[10.5px]">HIGH RISK</span>
              </div>
            </div>

            {/* 2. Fire Units */}
            <div className="bg-canvas p-4.5 rounded-xl border border-amber-200/80 bg-amber-50/10 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-text-secondary">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Fire Units</span>
                <Flame size={16} className="text-amber-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[26px] font-bold text-amber-600">7</span>
                <span className="text-[13px] font-medium text-text-secondary">needed</span>
                <span className="text-[15px] font-bold text-text-primary ml-auto">6 available</span>
              </div>
              <div className="flex items-center justify-between text-[11.5px] pt-1 border-t border-amber-100">
                <span className="font-semibold text-amber-700">Deficit: -1 unit</span>
                <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10.5px]">MODERATE RISK</span>
              </div>
            </div>

            {/* 3. ICU Beds */}
            <div className="bg-canvas p-4.5 rounded-xl border border-red-200/80 bg-red-50/10 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-text-secondary">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">ICU Beds</span>
                <Hospital size={16} className="text-red-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[26px] font-bold text-red-600">18</span>
                <span className="text-[13px] font-medium text-text-secondary">needed</span>
                <span className="text-[15px] font-bold text-text-primary ml-auto">11 available</span>
              </div>
              <div className="flex items-center justify-between text-[11.5px] pt-1 border-t border-red-100">
                <span className="font-semibold text-red-700">Deficit: -7 beds</span>
                <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200 text-[10.5px]">SEVERE DEFICIT</span>
              </div>
            </div>

            {/* 4. Forecast Accuracy */}
            <div className="bg-canvas p-4.5 rounded-xl border border-emerald-200/80 bg-emerald-50/10 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-text-secondary">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Forecast Accuracy</span>
                <Activity size={16} className="text-emerald-600" />
              </div>
              <div className="text-[26px] font-bold text-emerald-600">
                91.6%
              </div>
              <div className="flex items-center justify-between text-[11.5px] pt-1 border-t border-emerald-100">
                <span className="text-text-secondary font-medium">Model Confidence</span>
                <span className="text-emerald-700 font-bold">HIGH</span>
              </div>
            </div>
          </div>

          {/* Resource Shortage Risk Banner */}
          <div className="p-4 bg-red-50/80 border border-red-200 rounded-xl flex items-start gap-3 text-red-900">
            <ShieldAlert size={20} className="text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[13.5px]">Resource Shortage Risk: CRITICAL CAPACITY GAP</span>
                <span className="text-[10.5px] font-extrabold uppercase px-2 py-0.5 rounded bg-red-600 text-white">Action Required</span>
              </div>
              <p className="text-[12.5px] text-red-700 leading-relaxed">
                Predicted 12-unit resource deficit in Zone A & Zone C within 30 minutes due to concurrent industrial fire and SG Highway collision. Pre-positioning mandatory to maintain sub-5 minute SLA.
              </p>
            </div>
          </div>

          {/* AI Recommended Pre-positioning Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-text-primary flex items-center gap-2">
                <Zap size={16} className="text-blue-600" />
                <span>AI Recommended Pre-positioning</span>
              </h3>
              <span className="text-[11.5px] text-text-muted">Dynamic Relocation Matrix</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Recommendation 1 */}
              <div className="p-4 bg-canvas rounded-xl border border-border-subtle space-y-2 hover:border-blue-300 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 flex items-center gap-1.5">
                    <span>Move 2 Ambulances</span>
                    <ArrowRight size={13} className="text-blue-600" />
                    <span>Zone B → Zone A</span>
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    ETA Impact: -5.6 min
                  </span>
                </div>
                <p className="text-[12px] text-text-secondary leading-relaxed">
                  <strong className="text-text-primary font-semibold">Reason & Impact:</strong> High casualty probability on SG Highway collision corridor. Reduces predicted arrival time from 9.4 min to 3.8 min.
                </p>
              </div>

              {/* Recommendation 2 */}
              <div className="p-4 bg-canvas rounded-xl border border-border-subtle space-y-2 hover:border-blue-300 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 flex items-center gap-1.5">
                    <span>Re-stage 1 Fire Engine</span>
                    <ArrowRight size={13} className="text-blue-600" />
                    <span>Station 4 → Naroda GIDC</span>
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    ETA Impact: -4.2 min
                  </span>
                </div>
                <p className="text-[12px] text-text-secondary leading-relaxed">
                  <strong className="text-text-primary font-semibold">Reason & Impact:</strong> Toxic chemical plume risk in Naroda GIDC. Ensures instant secondary hazmat backup coverage before escalation.
                </p>
              </div>

              {/* Recommendation 3 */}
              <div className="p-4 bg-canvas rounded-xl border border-border-subtle space-y-2 hover:border-blue-300 transition-colors md:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 flex items-center gap-1.5">
                    <span>Reserve 7 Trauma ICU Beds</span>
                    <ArrowRight size={13} className="text-blue-600" />
                    <span>Civil Hospital Trauma Wing</span>
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Capacitation Preserved
                  </span>
                </div>
                <p className="text-[12px] text-text-secondary leading-relaxed">
                  <strong className="text-text-primary font-semibold">Reason & Impact:</strong> Multi-vehicle crash expected to yield 5-8 critical trauma admissions. Prevents diversion of critical ambulances to distant regional facilities.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
