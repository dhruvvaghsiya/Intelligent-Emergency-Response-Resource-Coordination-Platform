/* =========================================================================
   COVERAGE RADAR — §W6 Coverage Layer
   Hex grid overlay on the map showing coverage quality.
   Green = good, Yellow = degraded, Red = hole.
   Rendered as an SVG overlay whose points are recomputed from the real
   MapLibre projection on every move/zoom — not a MapLibre GL layer. A
   dynamically-added fill/circle layer was found to silently render zero
   pixels against a raster-only style in this MapLibre 6.10.0 build (fully
   reproducible outside React too), so this overlay uses the same
   HTML/SVG-over-canvas technique already proven reliable for the
   incident/unit markers instead.
   ========================================================================= */
import React, { useEffect, useState } from 'react';
import { Shield, AlertTriangle } from 'lucide-react';

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

      hexes.push({ id: `hex_${r}_${c}`, lng, lat, coverage, minDist, lngStep, latStep });
    }
  }
  return hexes;
}

function hexPolygonLngLat(lng, lat, lngRadius, latRadius) {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    points.push([lng + lngRadius * Math.cos(angle), lat + latRadius * Math.sin(angle)]);
  }
  return points;
}

const COVERAGE_COLORS = {
  good: { fill: 'rgba(61, 161, 96, 0.28)', stroke: 'rgba(61, 161, 96, 0.5)' },
  degraded: { fill: 'rgba(227, 179, 65, 0.28)', stroke: 'rgba(227, 179, 65, 0.5)' },
  hole: { fill: 'rgba(229, 72, 77, 0.28)', stroke: 'rgba(229, 72, 77, 0.5)' },
};

const HEXES = generateHexGrid();

export function CoverageRadar({ visible = false, map }) {
  const [, forceRerender] = useState(0);

  useEffect(() => {
    if (!map || !visible) return;
    const tick = () => forceRerender((n) => n + 1);
    tick();
    map.on('move', tick);
    map.on('zoom', tick);
    map.on('resize', tick);
    return () => {
      map.off('move', tick);
      map.off('zoom', tick);
      map.off('resize', tick);
    };
  }, [map, visible]);

  if (!visible) return null;

  const holes = HEXES.filter(h => h.coverage === 'hole');
  const degraded = HEXES.filter(h => h.coverage === 'degraded');

  return (
    <>
      {/* Hex overlay, projected live from the map */}
      {map && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
          {HEXES.map(hex => {
            const colors = COVERAGE_COLORS[hex.coverage];
            const pts = hexPolygonLngLat(hex.lng, hex.lat, hex.lngStep * 0.48, hex.latStep * 0.48)
              .map(([lng, lat]) => {
                const p = map.project([lng, lat]);
                return `${p.x},${p.y}`;
              })
              .join(' ');
            return (
              <polygon key={hex.id} points={pts} fill={colors.fill} stroke={colors.stroke} strokeWidth={1} />
            );
          })}
        </svg>
      )}

      {/* Coverage stats panel */}
      <div className="absolute top-12 left-3 bg-raised border border-border-strong rounded-[4px] p-2.5 shadow-overlay w-[200px]">
        <div className="text-[10px] text-text-muted uppercase tracking-wider mb-2 font-medium flex items-center gap-1">
          <Shield size={10} />
          Coverage Radar
        </div>
        <div className="space-y-1.5">
          <CoverageStat label="Good" count={HEXES.filter(h => h.coverage === 'good').length} total={HEXES.length} color="bg-status-available" />
          <CoverageStat label="Degraded" count={degraded.length} total={HEXES.length} color="bg-sev-moderate" />
          <CoverageStat label="Holes" count={holes.length} total={HEXES.length} color="bg-sev-critical" />
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
