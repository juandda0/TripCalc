import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { LatLngTuple } from 'leaflet';
import type { LocationResult } from '../services/routeService';
import { geocodificacionReversa } from '../services/routeService';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon paths (bundler issue)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/** Marcadores circulares estilo ride-hailing */
const createPinIcon = (color: string, label: string) =>
  L.divIcon({
    className: '',
    html: `
      <div style="
        position: relative;
        width: 36px; height: 44px;
        display: flex; flex-direction: column; align-items: center;
      ">
        <div style="
          width: 36px; height: 36px;
          background: ${color};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 3px 10px rgba(0,0,0,0.35);
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 800; color: white;
          font-family: -apple-system, sans-serif;
          cursor: grab;
        ">${label}</div>
        <div style="
          width: 0; height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 8px solid ${color};
          margin-top: -2px;
          filter: drop-shadow(0 2px 2px rgba(0,0,0,0.2));
        "></div>
      </div>`,
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -44],
  });

const origenIcon = createPinIcon('#22c55e', 'A');
const destinoIcon = createPinIcon('#ef4444', 'B');

/** Ajusta los bounds del mapa cuando cambian los puntos o la ruta */
const FitBounds: React.FC<{
  origen: LatLngTuple | null;
  destino: LatLngTuple | null;
  ruta: LatLngTuple[];
}> = ({ origen, destino, ruta }) => {
  const map = useMap();

  useEffect(() => {
    if (ruta.length > 1) {
      map.fitBounds(L.latLngBounds(ruta), { padding: [60, 60], maxZoom: 16, animate: true });
    } else if (origen && destino) {
      map.fitBounds(L.latLngBounds([origen, destino]), { padding: [70, 70], maxZoom: 15, animate: true });
    } else if (origen) {
      map.setView(origen, 14, { animate: true });
    } else if (destino) {
      map.setView(destino, 14, { animate: true });
    }
  }, [origen?.[0], origen?.[1], destino?.[0], destino?.[1], ruta.length, map]);

  return null;
};

interface MapViewProps {
  origen: LatLngTuple | null;
  destino: LatLngTuple | null;
  rutaCoordenadas: LatLngTuple[];
  darkMode: boolean;
  ciudadCenter?: LatLngTuple;
  onOrigenDragged?: (loc: LocationResult) => void;
  onDestinoDragged?: (loc: LocationResult) => void;
}

/** Marcador arrastrable con reverse-geocoding al soltar */
const DraggableMarker: React.FC<{
  position: LatLngTuple;
  icon: L.DivIcon;
  onDragEnd: (loc: LocationResult) => void;
}> = ({ position, icon, onDragEnd }) => {
  const markerRef = useRef<L.Marker | null>(null);

  // Actualizamos posición si viene desde afuera sin recrear el marcador
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLatLng(position);
    }
  }, [position]);

  return (
    <Marker
      position={position}
      icon={icon}
      draggable={true}
      ref={markerRef}
      eventHandlers={{
        dragend: async () => {
          if (!markerRef.current) return;
          const { lat, lng } = markerRef.current.getLatLng();
          // Reverse geocoding asíncrono para obtener la dirección
          const loc = await geocodificacionReversa(lat, lng);
          if (loc) {
            onDragEnd(loc);
          } else {
            // Fallback si Nominatim no responde
            onDragEnd({
              name: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
              displayName: `Coordenadas: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
              lat,
              lon: lng,
            });
          }
        },
      }}
    />
  );
};

export const MapView: React.FC<MapViewProps> = ({
  origen,
  destino,
  rutaCoordenadas,
  darkMode,
  ciudadCenter,
  onOrigenDragged,
  onDestinoDragged,
}) => {
  const defaultCenter: LatLngTuple = ciudadCenter ?? [6.2442, -75.5812];

  const tileUrl = darkMode
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  return (
    <MapContainer
      center={origen ?? defaultCenter}
      zoom={13}
      className="w-full h-full"
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer url={tileUrl} />

      <FitBounds origen={origen} destino={destino} ruta={rutaCoordenadas} />

      {origen && (
        onOrigenDragged ? (
          <DraggableMarker
            position={origen}
            icon={origenIcon}
            onDragEnd={onOrigenDragged}
          />
        ) : (
          <Marker position={origen} icon={origenIcon} />
        )
      )}

      {destino && (
        onDestinoDragged ? (
          <DraggableMarker
            position={destino}
            icon={destinoIcon}
            onDragEnd={onDestinoDragged}
          />
        ) : (
          <Marker position={destino} icon={destinoIcon} />
        )
      )}

      {/* Outline (profundidad estilo Uber) */}
      {rutaCoordenadas.length > 0 && (
        <Polyline
          positions={rutaCoordenadas}
          pathOptions={{ color: '#1e3a8a', weight: 9, opacity: 0.2, lineCap: 'round', lineJoin: 'round' }}
        />
      )}
      {/* Línea principal */}
      {rutaCoordenadas.length > 0 && (
        <Polyline
          positions={rutaCoordenadas}
          pathOptions={{ color: '#3b82f6', weight: 5, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }}
        />
      )}
    </MapContainer>
  );
};
