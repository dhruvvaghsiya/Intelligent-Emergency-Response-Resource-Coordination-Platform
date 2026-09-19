/* =========================================================================
   ANALYTICS PAGE — §28 Operational KPIs
   Every chart answers a question a commander would ask in a debrief.
   ========================================================================= */
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, PieChart } from 'recharts';
import { MOCK_ANALYTICS } from '../mocks/fixtures';
import { formatDuration } from '../lib/format';
import { TrendingUp, TrendingDown, Clock, Users, Shield, Activity, Layers, Brain } from 'lucide-react';

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

export function AnalyticsPage() {
  const data = MOCK_ANALYTICS;

  const responseData = [
    { name: 'Time to Triage', p50: data.time_to_triage.p50, p90: data.time_to_triage.p90 },
    { name: 'Time to Dispatch', p50: data.time_to_dispatch.p50, p90: data.time_to_dispatch.p90 },
    { name: 'Time to Arrival', p50: data.time_to_arrival.p50, p90: data.time_to_arrival.p90 },
  ];

  const etaData = [
    { name: 'Mean Error', value: data.eta_accuracy.mean_error },
    { name: 'p50 Error', value: data.eta_accuracy.p50_error },
    { name: 'p90 Error', value: data.eta_accuracy.p90_error },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-[1200px] mx-auto">
        <h1 className="text-[21px] font-semibold text-text-primary mb-4">Operational Analytics</h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <KPICard icon={Layers} label="Active Incidents" value={data.active_incidents} />
          <KPICard icon={Activity} label="Reports Today" value={data.total_reports_today} />
          <KPICard icon={Users} label="Units Available" value={`${data.units_available}/${data.units_total}`} />
          <KPICard icon={Shield} label="Compression" value={`${data.compression_ratio.toFixed(1)}:1`} subtitle="reports/incidents" accent />
          <KPICard icon={Clock} label="Response p50" value={formatDuration(data.time_to_arrival.p50)} />
          <KPICard icon={Clock} label="Response p90" value={formatDuration(data.time_to_arrival.p90)} />
          <KPICard icon={TrendingUp} label="Recommendation Accept" value={`${(data.recommendation_acceptance * 100).toFixed(0)}%`} />
          <KPICard icon={Brain} label="Correlation Precision" value={`${(data.correlation_precision * 100).toFixed(0)}%`} />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Response time chart */}
          <div className="bg-surface border border-border-subtle rounded-[4px] p-4">
            <h3 className="text-[12px] font-medium uppercase tracking-wider text-text-muted mb-3">
              Response Times (seconds)
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={responseData} barCategoryGap="30%">
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6A7788' }} axisLine={{ stroke: '#232B35' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6A7788' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="p50" fill="#1FA7A0" radius={[2, 2, 0, 0]} name="p50" />
                <Bar dataKey="p90" fill="#333F4D" radius={[2, 2, 0, 0]} name="p90" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ETA accuracy */}
          <div className="bg-surface border border-border-subtle rounded-[4px] p-4">
            <h3 className="text-[12px] font-medium uppercase tracking-wider text-text-muted mb-3">
              ETA Accuracy (seconds error)
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={etaData} barCategoryGap="30%">
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6A7788' }} axisLine={{ stroke: '#232B35' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6A7788' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#5B8DEF" radius={[2, 2, 0, 0]} name="Error (s)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Additional metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Resource Utilization" value={`${(data.resource_utilization * 100).toFixed(0)}%`} color={data.resource_utilization > 0.8 ? 'text-sev-high' : 'text-accent'} />
          <MetricCard label="Coverage Hole Minutes" value={data.coverage_hole_minutes} color={data.coverage_hole_minutes > 30 ? 'text-sev-high' : 'text-status-available'} />
          <MetricCard label="Escalation Rate" value={`${(data.escalation_rate * 100).toFixed(0)}%`} color="text-sev-moderate" />
          <MetricCard label="Model Disagreement" value={`${(data.model_operator_disagreement * 100).toFixed(0)}%`} color={data.model_operator_disagreement > 0.2 ? 'text-sev-high' : 'text-accent'} />
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
