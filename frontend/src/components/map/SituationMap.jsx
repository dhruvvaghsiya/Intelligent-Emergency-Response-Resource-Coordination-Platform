/* =========================================================================
   SITUATION MAP — Spacious Light Cartography (Esri Light Gray Canvas)
   Features soft light tiles, high-contrast markers, and pure white floating controls.
   ========================================================================= */
import React, { useEffect, useRef, useState } from 'react';
import { Map as MapLibreMap, Marker, setWorkerCount } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Minus, Plus, Crosshair, Layers, Globe, Map as MapIcon } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Button } from '../ui/Button';
import { CoverageRadar } from './CoverageRadar';

// GeoJSON sources (used by the coverage overlay) are tiled/parsed on a background
// Web Worker by default. Some sandboxed/embedded browser contexts never complete
// that worker round-trip, silently leaving the layer with zero rendered features.
// Forcing everything onto the main thread is negligible at our data volumes (tens
// of polygons, not tiled vector basemaps) and works everywhere.
setWorkerCount(0);

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

function incidentMarkerEl(incident, isSelected, showLabels = true) {
  const color = SEV_COLORS[incident.severity] || SEV_COLORS.INFO;
  const radius = SEV_RADIUS[incident.severity] || 10;

  const el = document.createElement('div');
  el.className = 'group cursor-pointer select-none relative';
  el.innerHTML = `
    <div class="relative flex items-center justify-center">
      ${incident.severity === 'CRITICAL' ? `
        <span class="animate-ping absolute inset-0 rounded-full opacity-60 pointer-events-none" style="background-color:${color};"></span>
      ` : ''}
      <div class="rounded-full border-2 transition-transform duration-150 flex items-center justify-center shadow-sm ${isSelected ? 'scale-125 ring-2 ring-offset-1 ring-blue-600' : 'group-hover:scale-110'}"
        style="width:${radius * 2}px;height:${radius * 2}px;border-color:${color};background-color:${color}26;">
        <span class="rounded-full" style="width:${Math.max(4, radius - 4)}px;height:${Math.max(4, radius - 4)}px;background-color:${color};"></span>
      </div>
    </div>

    ${showLabels ? `
      <div class="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 whitespace-nowrap pointer-events-auto transition-all duration-150 ${
        isSelected
          ? 'scale-105 z-30'
          : 'group-hover:scale-105 z-20 group-hover:z-30'
      }">
        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/95 backdrop-blur-xs border shadow-sm transition-all ${
          isSelected
            ? 'border-blue-500 ring-2 ring-blue-500/25 shadow-md'
            : 'border-slate-200 group-hover:border-slate-300 group-hover:shadow-md'
        }">
          <span class="w-2 h-2 rounded-full shrink-0" style="background-color:${color};"></span>
          <span class="text-xs font-semibold text-slate-800 max-w-[180px] truncate">${incident.title}</span>
          <span class="text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded" style="background-color:${color}18;color:${color};">
            ${incident.severity}
          </span>
        </div>
      </div>
    ` : `
      <div class="absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap text-xs font-semibold text-slate-800 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-md z-50">
        <span style="color:${color}">●</span> ${incident.title}
      </div>
    `}
  `;
  el.title = `${incident.title} (${incident.severity})`;
  return el;
}

function unitMarkerEl(unit) {
  const color = STATUS_COLORS[unit.status] || STATUS_COLORS.OFFLINE;
  const el = document.createElement('div');
  el.className = 'group cursor-default relative select-none';
  el.innerHTML = `
    <div class="flex items-center gap-1">
      <div class="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[11px] border-l-transparent border-r-transparent drop-shadow-sm"
        style="border-bottom-color:${color};transform:rotate(${unit.heading || 0}deg)">
      </div>
      <div class="px-1.5 py-0.5 rounded bg-white/95 border border-slate-200 shadow-xs text-[10px] font-mono font-bold" style="color:${color}">
        ${unit.call_sign}
      </div>
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
  const [showLabels, setShowLabels] = useState(true);
  const [basemap, setBasemap] = useState('satellite'); // By default satellite view
  const [showLayersPopup, setShowLayersPopup] = useState(false);
  const layersPopupRef = useRef(null);
  const {
    incidents, units, selectedIncidentId, selectIncident,
    mapLayers, toggleMapLayer, mapViewport, setMapViewport,
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
      const el = incidentMarkerEl(incident, isSelected, showLabels);
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
  }, [incidents, mapLayers.incidents, selectedIncidentId, showLabels, mapReady, selectIncident]);

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
    <div className="flex-1 relative bg-slate-100 overflow-hidden">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Coverage overlay */}
      <CoverageRadar visible={mapLayers.coverage} map={mapReady ? mapRef.current : null} />

      {/* Map floating controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
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
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={showLabels}
                      onChange={() => setShowLabels(!showLabels)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
                    />
                    <span className="text-sm text-slate-700 group-hover:text-slate-900 font-medium">
                      Incident Labels
                    </span>
                  </label>
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
