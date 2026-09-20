import React, { useEffect, useRef, useState } from 'react';
import { Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export function BackgroundMap({ mode = 'satellite' }) {
  const mapContainer = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;

    const isSat = mode === 'satellite';

    const map = new MapLibreMap({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'carto-voyager': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
              'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
              'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 256,
            maxzoom: 19,
            attribution: '© OpenStreetMap, © CARTO',
          },
          'esri-satellite': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            maxzoom: 19,
          },
          'esri-labels': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            maxzoom: 19,
          },
        },
        layers: isSat
          ? [
              {
                id: 'sat-base',
                type: 'raster',
                source: 'esri-satellite',
              },
              {
                id: 'sat-labels',
                type: 'raster',
                source: 'esri-labels',
              },
            ]
          : [
              {
                id: 'voyager-base',
                type: 'raster',
                source: 'carto-voyager',
              },
            ],
      },
      center: [72.5714, 23.0258], // Ahmedabad Map Center
      zoom: 13,
      interactive: false,
      attributionControl: false,
    });

    let animFrame;
    let angle = 0;
    const animate = () => {
      angle += 0.0002;
      const centerLng = 72.5714 + Math.sin(angle) * 0.003;
      const centerLat = 23.0258 + Math.cos(angle) * 0.003;
      map.setCenter([centerLng, centerLat]);
      animFrame = requestAnimationFrame(animate);
    };

    map.on('load', () => {
      setMapLoaded(true);
      animFrame = requestAnimationFrame(animate);
    });

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
      map.remove();
    };
  }, [mode]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none bg-slate-900">
      {/* Real Map Canvas with smooth blur filter */}
      <div
        ref={mapContainer}
        className={`w-full h-full scale-110 filter blur-[6px] brightness-95 contrast-105 transition-opacity duration-700 ${
          mapLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Fallback instant imagery until MapLibre map tiles complete */}
      <div
        className={`absolute inset-0 scale-105 filter blur-[6px] brightness-90 contrast-105 transition-opacity duration-700 ${
          mapLoaded ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          backgroundImage: `url('/satellite-hero.jpg')`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      />

      {/* Subtle overlay for depth and contrast */}
      <div className="absolute inset-0 bg-slate-950/25 pointer-events-none" />
    </div>
  );
}

