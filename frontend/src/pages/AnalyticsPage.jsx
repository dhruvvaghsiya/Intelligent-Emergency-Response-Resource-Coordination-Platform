/* =========================================================================
   ANALYTICS PAGE — §28 Operational KPIs
   Every chart answers a question a commander would ask in a debrief.
   ========================================================================= */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { analyticsApi } from '../lib/api';
import { formatDuration } from '../lib/format';
import { TrendingUp, Clock, Users, Shield, Activity, Layers, Brain } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-raised border border-border-strong px-3 py-2 rounded-[4px] shadow-overlay">
        <p className="text-[12px] text-text-primary font-medium">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-[11px] text-text-secondary font-mono">
            {p.name}: {typeof p.value === 'number' && p.value > 100 ? formatDuration(p.value) : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
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

  const loading = overviewQ.isLoading || responseTimesQ.isLoading || utilizationQ.isLoading;
  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-[13px] text-text-muted">Loading analytics…</div>;
  }

  const overview = overviewQ.data || {};
  const responseTimes = responseTimesQ.data || {};
  const utilization = utilizationQ.data || {};
  const shortages = shortagesQ.data || [];
  const recommendations = recommendationsQ.data || {};

  const allP50 = Object.values(responseTimes).map(v => v.p50_s).filter(v => v != null);
  const allP90 = Object.values(responseTimes).map(v => v.p90_s).filter(v => v != null);
  const responseData = Object.entries(responseTimes).map(([type, v]) => ({ name: type.replace(/_/g, ' '), p50: v.p50_s, p90: v.p90_s }));

  const utilizationData = Object.entries(utilization).map(([type, v]) => ({ name: type.replace(/_/g, ' '), ratio: Math.round(v.ratio * 100), busy: v.busy, total: v.total }));

  const unitsTotal = Object.values(utilization).reduce((sum, v) => sum + v.total, 0);
  const unitsBusy = Object.values(utilization).reduce((sum, v) => sum + v.busy, 0);
  const overallResponseP50 = percentile(allP50, 0.5);
  const overallResponseP90 = percentile(allP90, 0.9);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-[1200px] mx-auto">
        <h1 className="text-[21px] font-semibold text-text-primary mb-4">Operational Analytics</h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <KPICard icon={Layers} label="Total Incidents" value={overview.incident_count ?? '—'} />
          <KPICard icon={Activity} label="Reports Ingested" value={overview.report_count ?? '—'} />
          <KPICard icon={Users} label="Units Busy" value={`${unitsBusy}/${unitsTotal}`} />
          <KPICard icon={Shield} label="Compression" value={overview.duplicate_compression_ratio != null ? `${overview.duplicate_compression_ratio.toFixed(1)}:1` : '—'} subtitle="reports/incidents" accent />
          <KPICard icon={Clock} label="Response p50" value={overallResponseP50 != null ? formatDuration(overallResponseP50) : '—'} />
          <KPICard icon={Clock} label="Response p90" value={overallResponseP90 != null ? formatDuration(overallResponseP90) : '—'} />
          <KPICard icon={TrendingUp} label="Recommendation Accept" value={recommendations.acceptance_rate != null ? `${(recommendations.acceptance_rate * 100).toFixed(0)}%` : '—'} />
          <KPICard icon={Brain} label="Model Disagreement" value={overview.model_operator_disagreement_rate != null ? `${(overview.model_operator_disagreement_rate * 100).toFixed(0)}%` : '—'} />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Response time chart */}
          <div className="bg-surface border border-border-subtle rounded-[4px] p-4">
            <h3 className="text-[12px] font-medium uppercase tracking-wider text-text-muted mb-3">
              Response Times by Incident Type (seconds)
            </h3>
            {responseData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={responseData} barCategoryGap="30%">
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6A7788' }} axisLine={{ stroke: '#232B35' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6A7788' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="p50" fill="#1FA7A0" radius={[2, 2, 0, 0]} name="p50" />
                  <Bar dataKey="p90" fill="#333F4D" radius={[2, 2, 0, 0]} name="p90" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-[12px] text-text-muted">No arrivals recorded yet</div>
            )}
          </div>

          {/* Unit utilization */}
          <div className="bg-surface border border-border-subtle rounded-[4px] p-4">
            <h3 className="text-[12px] font-medium uppercase tracking-wider text-text-muted mb-3">
              Unit Utilization by Type (%)
            </h3>
            {utilizationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={utilizationData} barCategoryGap="30%">
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6A7788' }} axisLine={{ stroke: '#232B35' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6A7788' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="ratio" fill="#5B8DEF" radius={[2, 2, 0, 0]} name="Busy %" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-[12px] text-text-muted">No unit data</div>
            )}
          </div>
        </div>

        {/* Shortages */}
        <div className="bg-surface border border-border-subtle rounded-[4px] p-4 mb-6">
          <h3 className="text-[12px] font-medium uppercase tracking-wider text-text-muted mb-3">
            High-Severity Incident Concentration by Ward
          </h3>
          {shortages.length > 0 ? (
            <div className="space-y-1.5">
              {shortages.map(s => (
                <div key={s.ward} className="flex items-center justify-between text-[12px]">
                  <span className="text-text-secondary">{s.ward}</span>
                  <span className="font-mono text-text-primary font-semibold">{s.high_severity_incident_count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[12px] text-text-muted">No high-severity incidents recorded</div>
          )}
        </div>

        {/* Additional metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Merged Incidents" value={overview.merged_incident_count ?? '—'} />
          <MetricCard label="Suggestions Total" value={recommendations.total_suggestions ?? '—'} />
          <MetricCard label="Suggestions Confirmed" value={recommendations.confirmed ?? '—'} />
          <MetricCard label="Report Count" value={overview.report_count ?? '—'} />
        </div>
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, subtitle, accent = false }) {
  return (
    <div className="bg-surface border border-border-subtle rounded-[4px] px-3 py-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={12} className="text-text-muted" />
        <span className="text-[10px] text-text-muted uppercase tracking-wider">{label}</span>
      </div>
      <div className={`font-mono text-[21px] font-semibold ${accent ? 'text-accent' : 'text-text-primary'}`}>
        {value}
      </div>
      {subtitle && <div className="text-[10px] text-text-muted">{subtitle}</div>}
    </div>
  );
}

function MetricCard({ label, value, color = 'text-text-primary' }) {
  return (
    <div className="bg-surface border border-border-subtle rounded-[4px] px-3 py-3">
      <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">{label}</div>
      <div className={`font-mono text-[21px] font-semibold ${color}`}>{value}</div>
    </div>
  );
}
