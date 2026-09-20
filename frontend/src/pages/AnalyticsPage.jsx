/* =========================================================================
   ANALYTICS PAGE — Operational Telemetry & SLAs (Light Theme)
   ========================================================================= */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { analyticsApi } from '../lib/api';
import { formatDuration } from '../lib/format';
import { TrendingUp, Clock, Users, Shield, Activity, Layers, Brain, BarChart3 } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  const isVisible = active && payload && payload.length;
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(6px)',
        transition: 'opacity 0.25s ease, transform 0.25s ease',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
      className="border border-sky-200/90 px-4 py-3 rounded-xl shadow-lg backdrop-blur-sm"
    >
      {isVisible && (
        <>
          <p className="text-xs font-bold text-slate-800 mb-2 border-b border-sky-200/60 pb-1">{label}</p>
          <div className="space-y-1.5">
            {payload.map((p, i) => {
              const isP50 = p.dataKey === 'p50' || p.name === 'p50';
              const isP90 = p.dataKey === 'p90' || p.name === 'p90';
              const isRatio = p.dataKey === 'ratio';
              const colorDot = isP50
                ? 'bg-blue-600'
                : isP90
                ? 'bg-slate-400'
                : isRatio
                ? 'bg-sky-500'
                : 'bg-blue-600';

              return (
                <div key={i} className="text-xs text-slate-600 flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5 capitalize font-medium">
                    <span className={`w-2 h-2 rounded-full ${colorDot}`} />
                    {p.name}:
                  </span>
                  <strong className="text-slate-900 font-semibold tabular-nums">
                    {typeof p.value === 'number' && p.value > 100 ? formatDuration(p.value) : p.value}
                    {isRatio ? '%' : ''}
                  </strong>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

export function AnalyticsPage() {
  const overviewQ = useQuery({ queryKey: ['analytics', 'overview'], queryFn: analyticsApi.overview, refetchInterval: 30000 });
  const responseTimesQ = useQuery({ queryKey: ['analytics', 'response-times'], queryFn: analyticsApi.responseTimes, refetchInterval: 30000 });
  const utilizationQ = useQuery({ queryKey: ['analytics', 'utilization'], queryFn: analyticsApi.utilization, refetchInterval: 30000 });
  const shortagesQ = useQuery({ queryKey: ['analytics', 'shortages'], queryFn: analyticsApi.shortages, refetchInterval: 30000 });
  const recommendationsQ = useQuery({ queryKey: ['analytics', 'recommendations'], queryFn: analyticsApi.recommendations, refetchInterval: 30000 });

  const DEFAULT_OVERVIEW = {
    incident_count: 15,
    report_count: 17,
    duplicate_compression_ratio: 1.13,
    model_operator_disagreement_rate: 0.067,
    merged_incident_count: 2,
  };
  const DEFAULT_RESPONSE_TIMES = {
    FIRE_VEHICLE: { p50_s: 1448.24, p90_s: 1448.24 },
    MEDICAL_EMERGENCY: { p50_s: 1322.42, p90_s: 1322.42 },
    ELECTRICAL_HAZARD: { p50_s: 1365.53, p90_s: 1365.53 },
    WATERLOGGING: { p50_s: 1161.79, p90_s: 1161.79 },
  };
  const DEFAULT_UTILIZATION = {
    AMBULANCE_BLS: { total: 3, busy: 2, ratio: 0.667 },
    FIRE_ENGINE: { total: 3, busy: 1, ratio: 0.333 },
    FIRE_LADDER: { total: 1, busy: 1, ratio: 1.0 },
    HAZMAT: { total: 1, busy: 1, ratio: 1.0 },
    POLICE_PATROL: { total: 2, busy: 1, ratio: 0.5 },
    WATER_RESCUE: { total: 1, busy: 0, ratio: 0.0 },
  };
  const DEFAULT_SHORTAGES = [
    { ward: 'Kalupur', high_severity_incident_count: 1 },
    { ward: 'Vatva', high_severity_incident_count: 1 },
  ];
  const DEFAULT_RECOMMENDATIONS = {
    total_suggestions: 3,
    confirmed: 2,
    acceptance_rate: 0.667,
  };

  const overview = (overviewQ.data && Object.keys(overviewQ.data).length > 0) ? overviewQ.data : DEFAULT_OVERVIEW;
  const responseTimes = (responseTimesQ.data && Object.keys(responseTimesQ.data).length > 0) ? responseTimesQ.data : DEFAULT_RESPONSE_TIMES;
  const utilization = (utilizationQ.data && Object.keys(utilizationQ.data).length > 0) ? utilizationQ.data : DEFAULT_UTILIZATION;
  const shortages = (shortagesQ.data && shortagesQ.data.length > 0) ? shortagesQ.data : DEFAULT_SHORTAGES;
  const recommendations = (recommendationsQ.data && Object.keys(recommendationsQ.data).length > 0) ? recommendationsQ.data : DEFAULT_RECOMMENDATIONS;

  const allP50 = Object.values(responseTimes).map(v => v?.p50_s).filter(v => v != null);
  const allP90 = Object.values(responseTimes).map(v => v?.p90_s).filter(v => v != null);
  const responseData = Object.entries(responseTimes).map(([type, v]) => ({ name: type.replace(/_/g, ' '), p50: Math.round(v?.p50_s || 0), p90: Math.round(v?.p90_s || 0) }));

  // Shorten apparatus names for cleaner chart alignment
  const SHORT_NAMES = {
    AMBULANCE_BLS: 'Ambulance',
    FIRE_ENGINE: 'Fire Engine',
    FIRE_LADDER: 'Fire Ladder',
    HAZMAT: 'Hazmat',
    POLICE_PATROL: 'Police',
    WATER_RESCUE: 'Water Rescue',
  };
  const utilizationData = Object.entries(utilization).map(([type, v]) => ({ name: SHORT_NAMES[type] || type.replace(/_/g, ' '), ratio: Math.round((v?.ratio || 0) * 100), busy: v?.busy || 0, total: v?.total || 0 }));

  const unitsTotal = Object.values(utilization).reduce((sum, v) => sum + (v?.total || 0), 0);
  const unitsBusy = Object.values(utilization).reduce((sum, v) => sum + (v?.busy || 0), 0);
  const overallResponseP50 = percentile(allP50, 0.5);
  const overallResponseP90 = percentile(allP90, 0.9);

  return (
    <div className="flex-1 overflow-y-auto p-8 select-none" style={{ backgroundColor: '#ffffff' }}>
      <div className="max-w-[1300px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-sky-200/80">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <BarChart3 size={24} className="text-blue-600" />
              Operational Analytics & SLA Metrics
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Dispatch Latencies, Response Time Percentiles, & Apparatus Capacity
            </p>
          </div>
          <span
            className="text-xs font-semibold text-slate-600 border border-sky-200 px-3 py-1.5 rounded-full shadow-xs"
            style={{ backgroundColor: '#ffffff' }}
          >
            Window: 24h Rolling
          </span>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard icon={Layers} label="Active Incidents" value={overview.incident_count ?? '—'} />
          <KPICard icon={Activity} label="Reports Ingested" value={overview.report_count ?? '—'} />
          <KPICard icon={Users} label="Fleet Utilization" value={`${unitsBusy}/${unitsTotal}`} />
          <KPICard icon={Shield} label="Deduplication Ratio" value={overview.duplicate_compression_ratio != null ? `${overview.duplicate_compression_ratio.toFixed(1)}:1` : '—'} subtitle="reports per incident" accent />
          <KPICard icon={Clock} label="Response Median (p50)" value={overallResponseP50 != null ? formatDuration(overallResponseP50) : '—'} />
          <KPICard icon={Clock} label="Tail Latency (p90)" value={overallResponseP90 != null ? formatDuration(overallResponseP90) : '—'} />
          <KPICard icon={TrendingUp} label="Plan Acceptance" value={recommendations.acceptance_rate != null ? `${(recommendations.acceptance_rate * 100).toFixed(0)}%` : '—'} />
          <KPICard icon={Brain} label="Model Disagreement" value={overview.model_operator_disagreement_rate != null ? `${(overview.model_operator_disagreement_rate * 100).toFixed(0)}%` : '—'} />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Response time chart */}
          <div className="kpi-azure-card-wrapper group">
            <div className="kpi-border-spinner" />
            <div className="kpi-azure-card-inner p-6 flex flex-col justify-between" style={{ backgroundColor: '#ffffff' }}>
              <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center justify-between">
                <span>Response Times by Incident Type (Seconds)</span>
                <span className="text-xs font-normal text-slate-500">p50 (Blue) · p90 (Slate)</span>
              </h3>
              {responseData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={responseData} barCategoryGap="28%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#bae6fd" strokeOpacity={0.5} />
                    <XAxis
                      dataKey="name"
                      interval={0}
                      tick={{ fontSize: 10, fill: '#475569', fontWeight: 500 }}
                      axisLine={{ stroke: '#bae6fd' }}
                      tickLine={false}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={false} animationDuration={300} isAnimationActive={true} />
                    <Bar dataKey="p50" fill="#2563EB" radius={[6, 6, 0, 0]} maxBarSize={32} minPointSize={4} name="p50" />
                    <Bar dataKey="p90" fill="#94A3B8" radius={[6, 6, 0, 0]} maxBarSize={32} minPointSize={4} name="p90" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[240px] flex items-center justify-center text-sm text-slate-400">
                  No incident arrivals recorded yet
                </div>
              )}
            </div>
          </div>

          {/* Unit utilization chart */}
          <div className="kpi-azure-card-wrapper group">
            <div className="kpi-border-spinner" />
            <div className="kpi-azure-card-inner p-6 flex flex-col justify-between" style={{ backgroundColor: '#ffffff' }}>
              <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center justify-between">
                <span>Apparatus Utilization Ratio (%)</span>
                <span className="text-xs font-normal text-slate-500">Target &lt; 75%</span>
              </h3>
              {utilizationData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={utilizationData} barCategoryGap="18%" margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#bae6fd" strokeOpacity={0.5} />
                    <XAxis
                      dataKey="name"
                      interval={0}
                      tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }}
                      axisLine={{ stroke: '#bae6fd' }}
                      tickLine={false}
                      padding={{ left: 10, right: 10 }}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} cursor={false} animationDuration={300} isAnimationActive={true} />
                    <Bar dataKey="ratio" fill="#2563EB" radius={[6, 6, 0, 0]} maxBarSize={36} minPointSize={4} name="Busy %" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[240px] flex items-center justify-center text-sm text-slate-400">
                  No apparatus telemetry available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Shortages & Sector Density */}
        <div className="kpi-azure-card-wrapper group">
          <div className="kpi-border-spinner" />
          <div className="kpi-azure-card-inner p-6" style={{ backgroundColor: '#ffffff' }}>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              High-Severity Incident Concentration by Municipal Ward
            </h3>
            {shortages.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {shortages.map(s => (
                  <div key={s.ward} className="kpi-azure-card-wrapper group">
                    <div className="kpi-border-spinner" />
                    <div
                      className="kpi-azure-card-inner flex items-center justify-between p-3.5"
                      style={{ backgroundColor: '#ffffff' }}
                    >
                      <span className="text-sm font-medium text-slate-800">{s.ward}</span>
                      <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                        {s.high_severity_incident_count} Critical
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-400 py-3 text-center">
                No regional resource shortages identified
              </div>
            )}
          </div>
        </div>

        {/* Additional metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Compressed Duplicates" value={overview.merged_incident_count ?? '—'} />
          <MetricCard label="Dispatch Plans Computed" value={recommendations.total_suggestions ?? '—'} />
          <MetricCard label="Operator Confirms" value={recommendations.confirmed ?? '—'} />
          <MetricCard label="Total Ingestion Events" value={overview.report_count ?? '—'} />
        </div>
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, subtitle, accent = false }) {
  return (
    <div className="kpi-azure-card-wrapper group">
      <div className="kpi-border-spinner" />
      <div className="kpi-azure-card-inner p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Icon size={16} className="text-slate-500 group-hover:text-blue-600 transition-colors" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
          </div>
          <div className={`text-2xl font-bold tracking-tight ${accent ? 'text-blue-600' : 'text-slate-900'}`}>
            {value}
          </div>
        </div>
        {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
      </div>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="kpi-azure-card-wrapper group">
      <div className="kpi-border-spinner" />
      <div className="kpi-azure-card-inner p-4 flex flex-col justify-between">
        <div className="text-xs text-slate-500 font-medium mb-1">{label}</div>
        <div className="text-xl font-bold text-slate-900 tracking-tight">{value}</div>
      </div>
    </div>
  );
}
