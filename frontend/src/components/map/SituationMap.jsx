/* =========================================================================
   SITUATION MAP — §14.2 Map rules
   Dark basemap, incidents as circles (radius by severity), units as chevrons
   colored by status. No ambient animation.
   Uses a free tile source since MapLibre needs a style URL.
   ========================================================================= */
import React, { useEffect, useRef, useState } from 'react';
import { Layers, Minus, Plus, Crosshair } from 'lucide-react';
import { useStore } from '../../lib/store';
import { SEVERITY_CONFIG } from '../../lib/constants';
import { Button } from '../ui/Button';
import { CoverageRadar } from './CoverageRadar';

// Severity color map for map markers (raw hex values)
const SEV_COLORS = {
  CRITICAL: '#E5484D',
  HIGH: '#EF6C1A',
  MODERATE: '#E3B341',
  LOW: '#3DA160',
  INFO: '#5B8DEF',
};

const STATUS_COLORS = {
  AVAILABLE: '#3DA160',
  ASSIGNED: '#E3B341',
  EN_ROUTE: '#5B8DEF',
  ON_SCENE: '#1FA7A0',
  RETURNING: '#5B8DEF',
  OUT_OF_SERVICE: '#6A7788',
  OFFLINE: '#6A7788',
};

// Severity to radius
const SEV_RADIUS = {
  CRITICAL: 16,
  HIGH: 13,
  MODERATE: 11,
  LOW: 9,
  INFO: 8,
};

export function SituationMap() {
  const mapContainer = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const { incidents, units, selectedIncidentId, selectIncident, mapLayers, toggleMapLayer } = useStore();

  return (
    <div className="flex-1 relative bg-canvas overflow-hidden">
      {/* Map canvas — using a styled div as placeholder since MapLibre needs tiles */}
      <div
        ref={mapContainer}
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 60% 40%, #151A21 0%, #0E1217 100%)
          `,
        }}
      >
        {/* Grid overlay for coordinate reference */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#9BA7B6" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Ahmedabad label */}
        <div className="absolute top-4 left-4 text-[11px] text-text-muted font-mono opacity-50">
          AHMEDABAD AOI · 72.45°E – 72.72°E · 22.95°N – 23.13°N
        </div>

        {/* Incident markers */}
        {mapLayers.incidents && incidents
          .filter(i => !['CLOSED','MERGED','FALSE_ALARM'].includes(i.status))
          .map(incident => {
            const x = mapLngToX(incident.location.lng);
            const y = mapLatToY(incident.location.lat);
            const color = SEV_COLORS[incident.severity] || SEV_COLORS.INFO;
            const radius = SEV_RADIUS[incident.severity] || 8;
            const isSelected = incident.id === selectedIncidentId;

            return (
              <button
                key={incident.id}
                onClick={() => selectIncident(incident.id)}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                style={{ left: `${x}%`, top: `${y}%` }}
                title={`${incident.code} — ${incident.title}`}
              >
                {/* Outer ring */}
                <div
                  className={`rounded-full border-2 transition-all duration-[220ms] ${isSelected ? 'scale-150' : 'group-hover:scale-125'}`}
                  style={{
                    width: radius * 2,
                    height: radius * 2,
                    borderColor: color,
                    backgroundColor: `${color}33`,
                    boxShadow: isSelected ? `0 0 12px ${color}66` : 'none',
                  }}
                />
                {/* Label */}
                <div className={`
                  absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap
                  text-[10px] font-mono text-text-muted
                  opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none
                  bg-raised px-1.5 py-0.5 rounded border border-border-subtle
                `}>
                  {incident.code}
                </div>
              </button>
            );
          })}

        {/* Unit markers */}
        {mapLayers.units && units
          .filter(u => !['OUT_OF_SERVICE','OFFLINE'].includes(u.status))
          .map(unit => {
            const x = mapLngToX(unit.location.lng);
            const y = mapLatToY(unit.location.lat);
            const color = STATUS_COLORS[unit.status] || STATUS_COLORS.OFFLINE;

            return (
              <div
                key={unit.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                style={{ left: `${x}%`, top: `${y}%` }}
                title={`${unit.call_sign} — ${unit.status}`}
              >
                {/* Chevron */}
                <div
                  className="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[10px] border-l-transparent border-r-transparent"
                  style={{
                    borderBottomColor: color,
                    transform: `rotate(${unit.heading || 0}deg)`,
                  }}
                />
                {/* Label */}
                <div className={`
                  absolute left-full ml-1.5 top-1/2 -translate-y-1/2 whitespace-nowrap
                  text-[9px] font-mono opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none
                  px-1 py-0.5 rounded bg-raised border border-border-subtle
                `} style={{ color }}>
                  {unit.call_sign}
                </div>
              </div>
            );
          })}
      </div>

      {/* Coverage overlay */}
      <CoverageRadar visible={mapLayers.coverage} />

      {/* Map controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1">
        <Button variant="secondary" size="icon" title="Zoom in" onClick={() => {}}>
          <Plus size={14} />
        </Button>
        <Button variant="secondary" size="icon" title="Zoom out" onClick={() => {}}>
          <Minus size={14} />
        </Button>
        <Button variant="secondary" size="icon" title="Center on Ahmedabad" onClick={() => {}}>
          <Crosshair size={14} />
        </Button>
      </div>

      {/* Layer switcher */}
      <div className="absolute bottom-3 right-3 bg-raised border border-border-strong rounded-[4px] p-2 shadow-overlay">
        <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5 font-medium">
          Layers
        </div>
        {['incidents', 'units', 'coverage', 'closures'].map(layer => (
          <label key={layer} className="flex items-center gap-2 py-0.5 cursor-pointer">
            <input
              type="checkbox"
              checked={mapLayers[layer]}
              onChange={() => toggleMapLayer(layer)}
              className="w-3 h-3 rounded-sm accent-accent"
            />
            <span className="text-[11px] text-text-secondary capitalize">{layer}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// Map coordinates to percentage positions within the map container
// Ahmedabad AOI: lng [72.45, 72.72], lat [22.95, 23.13]
function mapLngToX(lng) {
  return ((lng - 72.45) / (72.72 - 72.45)) * 100;
}

function mapLatToY(lat) {
  // Invert Y because screen Y goes down, lat goes up
  return (1 - (lat - 22.95) / (23.13 - 22.95)) * 100;
}
