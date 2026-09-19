/* =========================================================================
   SITUATION MAP — §14.2 Map rules
   Dark basemap, incidents as circles (radius by severity), units as chevrons
   colored by status. No ambient animation.
   Real MapLibre GL map using Esri's free World_Dark_Gray_Base raster tiles
   (no API key required) — a raster source avoids the vector-tile worker
   pipeline, which some sandboxed/embedded renderers don't complete.
   ========================================================================= */
import React, { useEffect, useRef, useState } from 'react';
import { Map as MapLibreMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Minus, Plus, Crosshair } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Button } from '../ui/Button';
import { CoverageRadar } from './CoverageRadar';

const MAP_STYLE = {
  version: 8,
  sources: {
    'esri-dark-gray': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 16,
      attribution: '© Esri, © OpenStreetMap contributors',
    },
    'esri-dark-gray-labels': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 16,
    },
  },
  layers: [
    { id: 'esri-dark-gray', type: 'raster', source: 'esri-dark-gray' },
    { id: 'esri-dark-gray-labels', type: 'raster', source: 'esri-dark-gray-labels' },
  ],
};
const AHMEDABAD_CENTER = [72.5714, 23.0258];
const DEFAULT_ZOOM = 12;

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

const SEV_RADIUS = {
  CRITICAL: 16,
  HIGH: 13,
  MODERATE: 11,
  LOW: 9,
  INFO: 8,
};

function incidentMarkerEl(incident, isSelected) {
  const color = SEV_COLORS[incident.severity] || SEV_COLORS.INFO;
  const radius = SEV_RADIUS[incident.severity] || 8;

  const el = document.createElement('div');
  el.className = 'group cursor-pointer';
  el.innerHTML = `
    <div class="rounded-full border-2 transition-all duration-[220ms] ${isSelected ? 'scale-150' : 'group-hover:scale-125'}"
      style="width:${radius * 2}px;height:${radius * 2}px;border-color:${color};background-color:${color}33;${isSelected ? `box-shadow:0 0 12px ${color}66;` : ''}">
    </div>
    <div class="absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-mono text-text-muted opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-raised px-1.5 py-0.5 rounded border border-border-subtle">
      ${incident.code}
    </div>
  `;
  el.title = `${incident.code} — ${incident.title}`;
  return el;
}

function unitMarkerEl(unit) {
  const color = STATUS_COLORS[unit.status] || STATUS_COLORS.OFFLINE;
  const el = document.createElement('div');
  el.className = 'group cursor-default relative';
  el.innerHTML = `
    <div class="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[10px] border-l-transparent border-r-transparent"
      style="border-bottom-color:${color};transform:rotate(${unit.heading || 0}deg)">
    </div>
    <div class="absolute left-full ml-1.5 top-1/2 -translate-y-1/2 whitespace-nowrap text-[9px] font-mono opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none px-1 py-0.5 rounded bg-raised border border-border-subtle" style="color:${color}">
      ${unit.call_sign}
    </div>
  `;
  el.title = `${unit.call_sign} — ${unit.status}`;
  return el;
}

export function SituationMap() {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const incidentMarkersRef = useRef(new Map());
  const unitMarkersRef = useRef(new Map());
  const [mapReady, setMapReady] = useState(false);
  const {
    incidents, units, selectedIncidentId, selectIncident,
    mapLayers, toggleMapLayer, mapViewport, setMapViewport,
  } = useStore();

  // ── Init map once ──
  useEffect(() => {
    const map = new MapLibreMap({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: mapViewport?.center || AHMEDABAD_CENTER,
      zoom: mapViewport?.zoom || DEFAULT_ZOOM,
      attributionControl: { compact: true },
    });

    map.on('load', () => setMapReady(true));
    map.on('moveend', () => {
      const c = map.getCenter();
      setMapViewport({ center: [c.lng, c.lat], zoom: map.getZoom() });
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Incident markers ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const markers = incidentMarkersRef.current;
    const visible = mapLayers.incidents
      ? incidents.filter(i => !['CLOSED', 'MERGED', 'FALSE_ALARM'].includes(i.status))
      : [];
    const seen = new Set();

    visible.forEach(incident => {
      if (!incident.location) return;
      seen.add(incident.id);
      const isSelected = incident.id === selectedIncidentId;
      const existing = markers.get(incident.id);
      if (existing) {
        existing.remove();
      }
      const el = incidentMarkerEl(incident, isSelected);
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        selectIncident(incident.id);
      });
      const marker = new Marker({ element: el, anchor: 'center' })
        .setLngLat([incident.location.lng, incident.location.lat])
        .addTo(map);
      markers.set(incident.id, marker);
    });

    for (const [id, marker] of markers.entries()) {
      if (!seen.has(id)) {
        marker.remove();
        markers.delete(id);
      }
    }
  }, [incidents, mapLayers.incidents, selectedIncidentId, mapReady, selectIncident]);

  // ── Unit markers ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const markers = unitMarkersRef.current;
    const visible = mapLayers.units
      ? units.filter(u => !['OUT_OF_SERVICE', 'OFFLINE'].includes(u.status))
      : [];
    const seen = new Set();

    visible.forEach(unit => {
      if (!unit.location) return;
      seen.add(unit.id);
      const existing = markers.get(unit.id);
      if (existing) existing.remove();
      const el = unitMarkerEl(unit);
      const marker = new Marker({ element: el, anchor: 'center' })
        .setLngLat([unit.location.lng, unit.location.lat])
        .addTo(map);
      markers.set(unit.id, marker);
    });

    for (const [id, marker] of markers.entries()) {
      if (!seen.has(id)) {
        marker.remove();
        markers.delete(id);
      }
    }
  }, [units, mapLayers.units, mapReady]);

  return (
    <div className="flex-1 relative bg-canvas overflow-hidden">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Coverage overlay */}
      <CoverageRadar visible={mapLayers.coverage} map={mapReady ? mapRef.current : null} />

      {/* Map controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1">
        <Button variant="secondary" size="icon" title="Zoom in" onClick={() => mapRef.current?.zoomIn()}>
          <Plus size={14} />
        </Button>
        <Button variant="secondary" size="icon" title="Zoom out" onClick={() => mapRef.current?.zoomOut()}>
          <Minus size={14} />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          title="Center on Ahmedabad"
          onClick={() => mapRef.current?.flyTo({ center: AHMEDABAD_CENTER, zoom: DEFAULT_ZOOM })}
        >
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
