/* =========================================================================
   COVERAGE RADAR — §W6 Coverage Layer
   Hex grid overlay on the map showing coverage quality.
   Green = good, Yellow = degraded, Red = hole.
   ========================================================================= */
import React from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { PanelSection } from '../ui/Panel';

// Generate a hex grid covering Ahmedabad AOI
// bbox: [72.45, 22.95, 72.72, 23.13]
function generateHexGrid() {
  const hexes = [];
  const rows = 8;
  const cols = 10;
  const lngMin = 72.45, lngMax = 72.72;
  const latMin = 22.95, latMax = 23.13;
  const lngStep = (lngMax - lngMin) / cols;
  const latStep = (latMax - latMin) / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lng = lngMin + c * lngStep + lngStep / 2 + (r % 2 ? lngStep / 2 : 0);
      const lat = latMin + r * latStep + latStep / 2;
      if (lng > lngMax) continue;

      // Simulate coverage based on distance from stations
      const stations = [
        { lng: 72.5714, lat: 23.0258 },
        { lng: 72.5572, lat: 23.0369 },
        { lng: 72.5977, lat: 23.0012 },
        { lng: 72.6281, lat: 22.9872 },
        { lng: 72.5621, lat: 23.0325 },
      ];

      const minDist = Math.min(...stations.map(s =>
        Math.sqrt(Math.pow(s.lng - lng, 2) + Math.pow(s.lat - lat, 2))
      ));

      let coverage;
      if (minDist < 0.04) coverage = 'good';
      else if (minDist < 0.08) coverage = 'degraded';
      else coverage = 'hole';

      hexes.push({ id: `hex_${r}_${c}`, lng, lat, coverage, minDist });
    }
  }
  return hexes;
}

const COVERAGE_COLORS = {
  good: { fill: 'rgba(61, 161, 96, 0.25)', stroke: 'rgba(61, 161, 96, 0.4)' },
  degraded: { fill: 'rgba(227, 179, 65, 0.25)', stroke: 'rgba(227, 179, 65, 0.4)' },
  hole: { fill: 'rgba(229, 72, 77, 0.25)', stroke: 'rgba(229, 72, 77, 0.4)' },
};

export function CoverageRadar({ visible = false }) {
  if (!visible) return null;

  const hexes = generateHexGrid();
  const holes = hexes.filter(h => h.coverage === 'hole');
  const degraded = hexes.filter(h => h.coverage === 'degraded');

  return (
    <>
      {/* Hex overlay on map */}
      <div className="absolute inset-0 pointer-events-none">
        {hexes.map(hex => {
          const x = ((hex.lng - 72.45) / (72.72 - 72.45)) * 100;
          const y = (1 - (hex.lat - 22.95) / (23.13 - 22.95)) * 100;
          const colors = COVERAGE_COLORS[hex.coverage];

          return (
            <div
              key={hex.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: 40,
                height: 40,
              }}
            >
              <svg viewBox="0 0 40 40" className="w-full h-full">
                <polygon
                  points="20,2 37,11 37,29 20,38 3,29 3,11"
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth="1"
                />
              </svg>
            </div>
          );
        })}
      </div>

      {/* Coverage stats panel */}
      <div className="absolute top-12 left-3 bg-raised border border-border-strong rounded-[4px] p-2.5 shadow-overlay w-[200px]">
        <div className="text-[10px] text-text-muted uppercase tracking-wider mb-2 font-medium flex items-center gap-1">
          <Shield size={10} />
          Coverage Radar
        </div>
        <div className="space-y-1.5">
          <CoverageStat label="Good" count={hexes.filter(h => h.coverage === 'good').length} total={hexes.length} color="bg-status-available" />
          <CoverageStat label="Degraded" count={degraded.length} total={hexes.length} color="bg-sev-moderate" />
          <CoverageStat label="Holes" count={holes.length} total={hexes.length} color="bg-sev-critical" />
        </div>
        {holes.length > 0 && (
          <div className="mt-2 px-2 py-1 bg-sev-critical-bg border border-sev-critical/20 rounded text-[10px] text-sev-critical flex items-center gap-1">
            <AlertTriangle size={10} />
            {holes.length} coverage hole{holes.length !== 1 ? 's' : ''} detected
          </div>
        )}
      </div>
    </>
  );
}

function CoverageStat({ label, count, total, color }) {
  const pct = Math.round((count / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-[11px] text-text-secondary flex-1">{label}</span>
      <span className="font-mono text-[11px] text-text-muted">{count}</span>
      <span className="font-mono text-[10px] text-text-muted">({pct}%)</span>
    </div>
  );
}
