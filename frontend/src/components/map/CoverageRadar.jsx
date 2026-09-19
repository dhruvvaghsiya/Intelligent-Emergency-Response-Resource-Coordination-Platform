/* =========================================================================
   COVERAGE RADAR — §W6 Coverage Layer
   Hex grid overlay on the map showing coverage quality.
   Green = good, Yellow = degraded, Red = hole.
   Rendered as a real GeoJSON layer on the MapLibre map so it stays aligned
   with the basemap when panning/zooming.
   ========================================================================= */
import React, { useEffect } from 'react';
import { Shield, AlertTriangle } from 'lucide-react';

const SOURCE_ID = 'coverage-hex-source';
const FILL_LAYER_ID = 'coverage-hex-fill';
const LINE_LAYER_ID = 'coverage-hex-line';

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

function hexPolygon(lng, lat, lngRadius, latRadius) {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    points.push([lng + lngRadius * Math.cos(angle), lat + latRadius * Math.sin(angle)]);
  }
  points.push(points[0]);
  return points;
}

function hexGridGeoJson(hexes) {
  return {
    type: 'FeatureCollection',
    features: hexes.map(hex => ({
      type: 'Feature',
      properties: { coverage: hex.coverage },
      geometry: {
        type: 'Polygon',
        coordinates: [hexPolygon(hex.lng, hex.lat, hex.lngStep * 0.48, hex.latStep * 0.48)],
      },
    })),
  };
}

const COVERAGE_FILL = ['match', ['get', 'coverage'],
  'good', 'rgba(61, 161, 96, 0.25)',
  'degraded', 'rgba(227, 179, 65, 0.25)',
  'hole', 'rgba(229, 72, 77, 0.25)',
  'rgba(155,167,182,0.1)',
];

const COVERAGE_LINE = ['match', ['get', 'coverage'],
  'good', 'rgba(61, 161, 96, 0.4)',
  'degraded', 'rgba(227, 179, 65, 0.4)',
  'hole', 'rgba(229, 72, 77, 0.4)',
  'rgba(155,167,182,0.2)',
];

export function CoverageRadar({ visible = false, map }) {
  const hexes = generateHexGrid();

  useEffect(() => {
    if (!map) return;

    const addLayers = () => {
      if (map.getSource(SOURCE_ID)) return;
      map.addSource(SOURCE_ID, { type: 'geojson', data: hexGridGeoJson(hexes) });
      map.addLayer({ id: FILL_LAYER_ID, type: 'fill', source: SOURCE_ID, paint: { 'fill-color': COVERAGE_FILL } });
      map.addLayer({ id: LINE_LAYER_ID, type: 'line', source: SOURCE_ID, paint: { 'line-color': COVERAGE_LINE, 'line-width': 1 } });
    };

    if (map.isStyleLoaded()) addLayers();
    else map.once('load', addLayers);

    return () => {
      if (!map.getStyle) return;
      if (map.getLayer(LINE_LAYER_ID)) map.removeLayer(LINE_LAYER_ID);
      if (map.getLayer(FILL_LAYER_ID)) map.removeLayer(FILL_LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => {
    if (!map || !map.getLayer(FILL_LAYER_ID)) return;
    const visibility = visible ? 'visible' : 'none';
    map.setLayoutProperty(FILL_LAYER_ID, 'visibility', visibility);
    map.setLayoutProperty(LINE_LAYER_ID, 'visibility', visibility);
  }, [visible, map]);

  if (!visible) return null;

  const holes = hexes.filter(h => h.coverage === 'hole');
  const degraded = hexes.filter(h => h.coverage === 'degraded');

  return (
    <div className="absolute top-4 left-4 bg-white border border-slate-200 rounded-xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.06)] w-[220px] z-10 select-none">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <Shield size={14} className="text-blue-600" />
        Coverage Radar
      </div>
      <div className="space-y-2">
        <CoverageStat label="Adequate" count={hexes.filter(h => h.coverage === 'good').length} total={hexes.length} color="bg-emerald-500" />
        <CoverageStat label="Degraded" count={degraded.length} total={hexes.length} color="bg-amber-500" />
        <CoverageStat label="Coverage Holes" count={holes.length} total={hexes.length} color="bg-red-500" />
      </div>
      {holes.length > 0 && (
        <div className="mt-3 px-2.5 py-1.5 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-700 flex items-center gap-1.5">
          <AlertTriangle size={13} className="shrink-0" />
          <span>{holes.length} coverage hole{holes.length !== 1 ? 's' : ''} detected</span>
        </div>
      )}
    </div>
  );
}

function CoverageStat({ label, count, total, color }) {
  const pct = Math.round((count / total) * 100);
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-slate-600 flex-1">{label}</span>
      <span className="font-semibold text-slate-900">{count}</span>
      <span className="text-xs text-slate-400 font-mono">({pct}%)</span>
    </div>
  );
}
