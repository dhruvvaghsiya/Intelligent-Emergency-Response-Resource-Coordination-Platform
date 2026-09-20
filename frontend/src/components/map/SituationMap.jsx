/* =========================================================================
   SITUATION MAP — Spacious Light Cartography (Esri Light Gray Canvas)
   Features soft light tiles, high-contrast markers, and pure white floating controls.
   ========================================================================= */
import React, { useEffect, useRef, useState } from 'react';
import { Map as MapLibreMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Minus, Plus, Crosshair, Layers, Globe, Map as MapIcon, Menu } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Button } from '../ui/Button';
import { CoverageRadar } from './CoverageRadar';

const MAP_STYLE = {
  version: 8,
  sources: {
    'esri-light-gray': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 16,
      attribution: '© Esri, © OpenStreetMap contributors',
    },
    'esri-light-gray-labels': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 16,
    },
    'esri-satellite': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© Esri, Maxar, Earthstar Geographics',
    },
    'esri-satellite-labels': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'esri-satellite',
      type: 'raster',
      source: 'esri-satellite',
      layout: { visibility: 'visible' },
    },
    {
      id: 'esri-satellite-labels',
      type: 'raster',
      source: 'esri-satellite-labels',
      layout: { visibility: 'visible' },
    },
    {
      id: 'esri-light-gray',
      type: 'raster',
      source: 'esri-light-gray',
      layout: { visibility: 'none' },
    },
    {
      id: 'esri-light-gray-labels',
      type: 'raster',
      source: 'esri-light-gray-labels',
      layout: { visibility: 'none' },
    },
  ],
};
const AHMEDABAD_CENTER = [72.5714, 23.0258];
const DEFAULT_ZOOM = 12;

const SEV_COLORS = {
  CRITICAL: '#DC2626',
  HIGH: '#EA580C',
  MODERATE: '#D97706',
  LOW: '#059669',
  INFO: '#2563EB',
};

const STATUS_COLORS = {
  AVAILABLE: '#059669',
  ASSIGNED: '#D97706',
  EN_ROUTE: '#2563EB',
  ON_SCENE: '#0891B2',
  RETURNING: '#2563EB',
  OUT_OF_SERVICE: '#64748B',
  OFFLINE: '#94A3B8',
};

const SEV_RADIUS = {
  CRITICAL: 16,
  HIGH: 13,
  MODERATE: 11,
  LOW: 9,
  INFO: 8,
};

const SYNC_PULSE_DURATION = 2.0;

function getSyncAnimationDelay() {
  const elapsedSec = (performance.now() / 1000) % SYNC_PULSE_DURATION;
  return `-${elapsedSec.toFixed(3)}s`;
}

function incidentMarkerEl(incident, isSelected, hasSelected) {
  const color = SEV_COLORS[incident.severity] || SEV_COLORS.INFO;
  const r = SEV_RADIUS[incident.severity] || 12;
  const d = r * 2;
  const inner = Math.max(5, Math.round(r * 0.45));
  const animDelay = getSyncAnimationDelay();

  const isDull = hasSelected && !isSelected;

  const el = document.createElement('div');
  el.className = `incident-marker ${isSelected ? 'incident-marker--selected' : ''}`;
  el.style.width = `${d}px`;
  el.style.height = `${d}px`;
  el.style.cursor = 'pointer';
  el.style.zIndex = isSelected ? '45' : isDull ? '10' : '40';
  el.style.opacity = isDull ? '0.38' : '1';
  el.style.filter = isDull ? 'grayscale(0.35) opacity(0.4)' : isSelected ? `drop-shadow(0 0 14px ${color}) brightness(1.25)` : 'none';

  el.innerHTML = `
    <!-- Pulse Ring -->
    <div class="incident-pulse-ring" style="
      position: absolute;
      top: 0;
      left: 0;
      width: ${d}px;
      height: ${d}px;
      border-radius: 50%;
      background: ${color};
      box-shadow: 0 0 14px ${color};
      animation: incident-pulse-anim ${SYNC_PULSE_DURATION}s cubic-bezier(0, 0, 0.2, 1) infinite;
      animation-delay: ${animDelay};
      pointer-events: none;
      display: ${isDull ? 'none' : 'block'};
    "></div>

    <!-- Core Circle -->
    <div class="incident-core-circle" style="
      position: absolute;
      top: 0;
      left: 0;
      width: ${d}px;
      height: ${d}px;
      border-radius: 50%;
      border: 3px solid #FFFFFF;
      background: ${color};
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 0 2px ${color}90, 0 4px 16px rgba(0,0,0,0.55)${isSelected ? `, 0 0 24px ${color}` : ''};
      transform: ${isSelected ? 'scale(1.35)' : 'scale(1)'};
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    ">
      <span style="
        width: ${inner}px;
        height: ${inner}px;
        border-radius: 50%;
        background: #FFFFFF;
        display: block;
        box-shadow: 0 0 3px rgba(0,0,0,0.4);
      "></span>
    </div>

    <!-- Hover Info Tooltip -->
    <div class="incident-tooltip" style="
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translate(-50%, -6px);
      margin-bottom: 6px;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.15s ease, transform 0.15s ease;
      white-space: nowrap;
      z-index: 1050;
    ">
      <div style="
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 6px 12px;
        border-radius: 10px;
        background: #FFFFFF;
        border: 1.5px solid ${isSelected ? '#2563EB' : '#CBD5E1'};
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22)${isSelected ? `, 0 0 0 3px rgba(37,99,235,0.3)` : ''};
      ">
        <span style="width: 10px; height: 10px; border-radius: 50%; background: ${color}; flex-shrink: 0;"></span>
        <span style="font-size: 12px; font-weight: 700; color: #0F172A; max-width: 220px; overflow: hidden; text-overflow: ellipsis;">${incident.title}</span>
        <span style="
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 2px 7px;
          border-radius: 6px;
          background: ${color}20;
          color: ${color};
        ">${incident.severity}</span>
      </div>
    </div>
  `;
  return el;
}

function unitMarkerEl(unit) {
  const color = STATUS_COLORS[unit.status] || STATUS_COLORS.OFFLINE;
  const el = document.createElement('div');
  el.className = 'unit-marker group cursor-default select-none';
  el.style.zIndex = '20';
  el.style.pointerEvents = 'auto';

  el.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: 12px;
      background: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(6px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
      transform: translate(8px, -12px);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    ">
      <div style="
        width: 0;
        height: 0;
        border-left: 4px solid transparent;
        border-right: 4px solid transparent;
        border-bottom: 9px solid ${color};
        transform: rotate(${unit.heading || 0}deg);
        flex-shrink: 0;
        filter: drop-shadow(0 0 4px ${color});
      "></div>
      <span style="
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 11px;
        font-weight: 800;
        color: #FFFFFF;
        letter-spacing: 0.02em;
        white-space: nowrap;
      ">${unit.call_sign}</span>
      <span style="
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: ${color};
        flex-shrink: 0;
        box-shadow: 0 0 6px ${color};
      "></span>
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

  const [basemap, setBasemap] = useState('satellite'); // By default satellite view
  const [showLayersPopup, setShowLayersPopup] = useState(false);
  const layersPopupRef = useRef(null);
  const {
    incidents, units, selectedIncidentId, selectIncident,
    mapLayers, toggleMapLayer, mapViewport, setMapViewport,
    sidebarOpen, toggleSidebar,
  } = useStore();

  // ── Close layers popup on click outside ──
  useEffect(() => {
    function handleClickOutside(event) {
      if (layersPopupRef.current && !layersPopupRef.current.contains(event.target)) {
        setShowLayersPopup(false);
      }
    }
    if (showLayersPopup) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showLayersPopup]);

  // ── Basemap toggle ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const isSat = basemap === 'satellite';
    if (map.getLayer('esri-satellite')) {
      map.setLayoutProperty('esri-satellite', 'visibility', isSat ? 'visible' : 'none');
    }
    if (map.getLayer('esri-satellite-labels')) {
      map.setLayoutProperty('esri-satellite-labels', 'visibility', isSat ? 'visible' : 'none');
    }
    if (map.getLayer('esri-light-gray')) {
      map.setLayoutProperty('esri-light-gray', 'visibility', isSat ? 'none' : 'visible');
    }
    if (map.getLayer('esri-light-gray-labels')) {
      map.setLayoutProperty('esri-light-gray-labels', 'visibility', isSat ? 'none' : 'visible');
    }
  }, [basemap, mapReady]);

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
    const hasSelected = Boolean(selectedIncidentId);

    // Build set of incident IDs linked or merged to currently selected incident
    const selectedIncident = incidents.find(i => i.id === selectedIncidentId || i.code === selectedIncidentId);
    const linkedIncidentIds = new Set([
      selectedIncidentId,
      ...(selectedIncident?.links || []).flatMap(l => [l.from_incident_id, l.to_incident_id])
    ]);

    const visible = mapLayers.incidents
      ? incidents.filter(i =>
          !['CLOSED', 'MERGED', 'FALSE_ALARM'].includes(i.status) ||
          linkedIncidentIds.has(i.id) ||
          linkedIncidentIds.has(i.code)
        )
      : [];
    const seen = new Set();

    visible.forEach(incident => {
      if (!incident.location) return;
      seen.add(incident.id);
      const isSelected = incident.id === selectedIncidentId || incident.code === selectedIncidentId;
      const existing = markers.get(incident.id);
      if (existing) {
        existing.remove();
      }
      const el = incidentMarkerEl(incident, isSelected, hasSelected);
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        selectIncident(incident.id);
      });
      const marker = new Marker({ element: el, anchor: 'center', subpixelPositioning: true })
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
      const marker = new Marker({ element: el, anchor: 'center', subpixelPositioning: true })
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
    <div className="flex-1 relative bg-slate-100 overflow-hidden h-full w-full z-0 isolate">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Floating 3-Line Sidebar Menu Toggle Button on Map (Only visible when sidebar is closed) */}
      {!sidebarOpen && (
        <div className="absolute top-20 left-4 z-20">
          <button
            type="button"
            onClick={toggleSidebar}
            className="
              w-10 h-10 rounded-xl backdrop-blur-md transition-all cursor-pointer flex items-center justify-center border
              bg-white/40 border-white/50 text-slate-800 hover:bg-white/75 hover:border-white/80 hover:text-slate-900 shadow-md hover:scale-105
            "
            title="Open Incident Sidebar (3-Line)"
            aria-label="Open Incident Sidebar"
          >
            <Menu size={20} strokeWidth={2.2} />
          </button>
        </div>
      )}

      {/* Map floating controls */}
      <div className="absolute top-20 right-4 flex flex-col gap-2 z-10">
        <div className="bg-white border border-slate-200 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex flex-col overflow-hidden">
          <button
            onClick={() => mapRef.current?.zoomIn()}
            className="p-2.5 hover:bg-slate-50 text-slate-700 transition-colors border-b border-slate-100 cursor-pointer"
            title="Zoom In"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={() => mapRef.current?.zoomOut()}
            className="p-2.5 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <Minus size={16} />
          </button>
        </div>

        <button
          onClick={() => mapRef.current?.flyTo({ center: AHMEDABAD_CENTER, zoom: DEFAULT_ZOOM })}
          className="bg-white border border-slate-200 rounded-xl p-2.5 text-slate-700 hover:bg-slate-50 shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-colors cursor-pointer"
          title="Center on Operations Hub"
        >
          <Crosshair size={16} />
        </button>

        {/* Combined Map Layers & Basemap Button with Popover */}
        <div className="relative" ref={layersPopupRef}>
          <button
            type="button"
            onClick={() => setShowLayersPopup(prev => !prev)}
            className={`bg-white border rounded-xl p-2.5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-colors cursor-pointer flex items-center justify-center ${
              showLayersPopup
                ? 'border-blue-500 text-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Map Style & Operational Layers"
          >
            <Layers size={16} />
          </button>

          {/* Popover anchored to the left of the button */}
          {showLayersPopup && (
            <div className="absolute right-full mr-2 top-0 bg-white border border-slate-200 rounded-xl p-3.5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-30 min-w-[220px] animate-in fade-in zoom-in-95 duration-150 select-none">
              {/* Basemap Mode Selector */}
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Globe size={13} className="text-blue-600" />
                Basemap Style
              </div>
              <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-lg mb-3">
                <button
                  type="button"
                  onClick={() => setBasemap('normal')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    basemap === 'normal'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MapIcon size={13} />
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setBasemap('satellite')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    basemap === 'satellite'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Globe size={13} />
                  Satellite
                </button>
              </div>

              {/* Operational Layers */}
              <div className="pt-2.5 border-t border-slate-100">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Layers size={13} className="text-blue-600" />
                  Operational Layers
                </div>
                <div className="space-y-1.5">
                  {['incidents', 'units', 'coverage', 'closures'].map(layer => (
                    <label key={layer} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={mapLayers[layer]}
                        onChange={() => toggleMapLayer(layer)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
                      />
                      <span className="text-sm text-slate-700 group-hover:text-slate-900 capitalize font-medium">
                        {layer}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
