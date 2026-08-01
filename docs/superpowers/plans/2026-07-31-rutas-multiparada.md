# Rutas Multi-parada (map-first) — Plan de Implementación

> **Para agentes:** USAR SUB-SKILL OBLIGATORIA: superpowers:subagent-driven-development (recomendada) o superpowers:executing-plans para implementar este plan tarea por tarea. Los pasos usan checkboxes (`- [ ]`).

**Goal:** Permitir marcar rutas con hasta 8 paradas tocando el mapa (añadir/quitar/arrastrar) y calcular litros y $ de gasolina del recorrido completo.

**Architecture:** App guarda `puntos: PuntoRuta[]` (reemplaza origen/destino). `obtenerRuta` acepta N puntos y arma la URL OSRM multi-waypoint. MapView recibe el arreglo de puntos, gestiona tap/drag/eliminar y dibuja pines numerados + polilínea. El gasto se calcula con `calcularConsumoCombustible` sobre la distancia total.

**Tech Stack:** React 19 + TypeScript 6 + Vite 8, Tailwind v4, react-leaflet 5 / Leaflet 1.9, OSRM (routing), Nominatim (geocoding), Vitest (tests).

## Global Constraints

- TypeScript con `verbatimModuleSyntax`: usar `import type` para tipos. Sin `any` sin comentario que lo justifique.
- `noUnusedLocals`/`noUnusedParameters` activos: nada de imports/variables sin usar.
- UI en español; seguir las convenciones del repo (Tailwind v4 + variables CSS `--var(...)`, iconos `lucide-react`).
- Máximo **8 paradas**. Ignorar taps a menos de **30 m** de una parada existente. Ignorar taps mientras `cargandoRuta`.
- Orden de paradas = orden de inserción (1 = origen, última = destino, intermedias = waypoints).
- Comandos de verificación: `npm test` (vitest), `npm run lint` (oxlint), `npm run build` (`tsc -b && vite build`).
- **IMPORTANTE:** el repo está en `main` con cambios sin commitear (trabajo previo). Antes de cada commit, confirmar con el usuario. No commitear nunca en `main` sin permiso.

---

### Task 1: Infraestructura de tests + tipo PuntoRuta + tests de fuelCost

**Files:**
- Modify: `package.json`
- Modify: `src/types/tripcalc.ts`
- Create: `vitest.config.ts`
- Create: `src/utils/fuelCost.test.ts`

**Interfaces:**
- Produces: tipo `PuntoRuta { id: string; lat: number; lon: number; nombre: string }` exportado desde `src/types/tripcalc.ts`. Script `npm test`.

- [ ] **Step 1: Instalar vitest**

Run: `npm install -D vitest`
Expected: vitest añadido a `devDependencies` en `package.json`.

- [ ] **Step 2: Añadir script de test**

En `package.json`, dentro de `scripts`, añadir:

```json
"test": "vitest run"
```

- [ ] **Step 3: Crear `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Añadir `PuntoRuta` a `src/types/tripcalc.ts`**

Añadir al final del archivo (conservar lo existente):

```ts
export interface PuntoRuta {
  id: string;
  lat: number;
  lon: number;
  nombre: string;
}
```

- [ ] **Step 5: Crear `src/utils/fuelCost.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { calcularConsumoCombustible } from './fuelCost';

describe('calcularConsumoCombustible', () => {
  it('calcula litros y costo para una distancia válida', () => {
    const res = calcularConsumoCombustible(50, 10, 5000);
    expect(res.litros).toBe(5);
    expect(res.costo).toBe(25000);
  });

  it('redondea litros a 2 decimales', () => {
    const res = calcularConsumoCombustible(1, 3, 1000);
    expect(res.litros).toBe(0.33);
  });

  it('devuelve 0 cuando la distancia o el consumo son <= 0', () => {
    expect(calcularConsumoCombustible(0, 10, 5000)).toEqual({ litros: 0, costo: 0 });
    expect(calcularConsumoCombustible(50, 0, 5000)).toEqual({ litros: 0, costo: 0 });
  });
});
```

- [ ] **Step 6: Verificar tests**

Run: `npm test`
Expected: 3 tests PASS.

- [ ] **Step 7: Verificar build (test files compilan en `tsc -b`)**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 8: Commit (confirmar antes con el usuario)**

```bash
git add package.json package-lock.json vitest.config.ts src/types/tripcalc.ts src/utils/fuelCost.test.ts
git commit -m "test: añade vitest y cubre calcularConsumoCombustible"
```

---

### Task 2: Helpers puros OSRM multi-punto (TDD)

**Files:**
- Create: `src/services/routeService.test.ts`
- Modify: `src/services/routeService.ts`

**Interfaces:**
- Consumes: `RouteResult` (ya existe en routeService: `{ distanciaKm: number; duracionMin: number; coordenadas: LatLngTuple[] }`).
- Produces:
  - `construirUrlRuta(puntos: { lat: number; lon: number }[]): string | null`
  - `parsearRespuestaRuta(data: unknown): RouteResult | null`
  - Tipo interno `RutaOSRM`.

- [ ] **Step 1: Escribir los tests que fallan**

Crear `src/services/routeService.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { construirUrlRuta, parsearRespuestaRuta } from './routeService';

describe('construirUrlRuta', () => {
  it('devuelve null con menos de 2 puntos', () => {
    expect(construirUrlRuta([{ lat: 6.24, lon: -75.58 }])).toBeNull();
  });

  it('construye URL con 2 puntos separados por ;', () => {
    const url = construirUrlRuta([
      { lat: 6.24, lon: -75.58 },
      { lat: 6.26, lon: -75.6 },
    ]);
    expect(url).toBe(
      'https://router.project-osrm.org/route/v1/driving/-75.58,6.24;-75.6,6.26?overview=full&geometries=geojson'
    );
  });

  it('encadena N puntos en orden', () => {
    const url = construirUrlRuta([
      { lat: 1, lon: 2 },
      { lat: 3, lon: 4 },
      { lat: 5, lon: 6 },
    ]);
    expect(url).toContain('2,1;4,3;6,5');
  });
});

describe('parsearRespuestaRuta', () => {
  it('devuelve null si el código no es Ok', () => {
    expect(parsearRespuestaRuta({ code: 'NoRoute' })).toBeNull();
  });

  it('devuelve null si no hay geometría', () => {
    expect(parsearRespuestaRuta({ code: 'Ok', routes: [{ distance: 1 }] })).toBeNull();
  });

  it('parsa distancia, duración y coordenadas', () => {
    const res = parsearRespuestaRuta({
      code: 'Ok',
      routes: [
        {
          distance: 12000,
          duration: 900,
          geometry: { coordinates: [[-75.58, 6.24], [-75.6, 6.26]] },
        },
      ],
    });
    expect(res).toEqual({
      distanciaKm: 12,
      duracionMin: 15,
      coordenadas: [[6.24, -75.58], [6.26, -75.6]],
    });
  });
});
```

- [ ] **Step 2: Ejecutar y confirmar que fallan**

Run: `npm test`
Expected: FAIL — `construirUrlRuta` y `parsearRespuestaRuta` no existen.

- [ ] **Step 3: Implementar los helpers**

En `src/services/routeService.ts`, añadir (antes de `obtenerRuta`):

```ts
/**
 * Construye la URL de OSRM para una ruta de N puntos.
 * Devuelve null si hay menos de 2 puntos.
 */
export function construirUrlRuta(puntos: { lat: number; lon: number }[]): string | null {
  if (puntos.length < 2) return null;
  const coords = puntos.map((p) => `${p.lon},${p.lat}`).join(';');
  return `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
}

interface RutaOSRM {
  code?: string;
  routes?: {
    distance?: number;
    duration?: number;
    geometry?: { coordinates?: [number, number][] };
  }[];
}

/**
 * Parsea la respuesta de OSRM a RouteResult. Devuelve null si es inválida.
 */
export function parsearRespuestaRuta(data: unknown): RouteResult | null {
  const ruta = data as RutaOSRM;
  if (!ruta || ruta.code !== 'Ok' || !ruta.routes || ruta.routes.length === 0) return null;
  const route = ruta.routes[0];
  if (!route.geometry?.coordinates) return null;

  const coordenadas: LatLngTuple[] = route.geometry.coordinates.map(
    (coord: [number, number]) => [coord[1], coord[0]] as LatLngTuple
  );

  return {
    distanciaKm: Number(((route.distance ?? 0) / 1000).toFixed(1)),
    duracionMin: Math.round((route.duration ?? 0) / 60),
    coordenadas,
  };
}
```

- [ ] **Step 4: Ejecutar y confirmar que pasan**

Run: `npm test`
Expected: 3 tests de fuelCost + 5 tests de routeService PASS.

- [ ] **Step 5: Commit (confirmar antes con el usuario)**

```bash
git add src/services/routeService.ts src/services/routeService.test.ts
git commit -m "feat(route): añade helpers puros para ruta de N puntos"
```

---

### Task 3: `obtenerRuta` multi-punto + call site

**Files:**
- Modify: `src/services/routeService.ts`
- Modify: `src/App.tsx` (solo el call site de `obtenerRuta`)

**Interfaces:**
- Consumes: `construirUrlRuta`, `parsearRespuestaRuta` (Task 2).
- Produces: `obtenerRuta(puntos: { lat: number; lon: number }[]): Promise<RouteResult | null>`.

- [ ] **Step 1: Reescribir `obtenerRuta`**

Reemplazar la función `obtenerRuta` actual (que recibía `origen`/`destino` por separado) por:

```ts
/**
 * Obtiene la ruta real entre N puntos usando OSRM (gratuito, sin API key).
 */
export async function obtenerRuta(
  puntos: { lat: number; lon: number }[]
): Promise<RouteResult | null> {
  const url = construirUrlRuta(puntos);
  if (!url) return null;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return parsearRespuestaRuta(data);
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Actualizar el call site en `src/App.tsx`**

En la función `calcularRuta`, reemplazar:

```ts
    const resultado = await obtenerRuta(
      { lat: origenLoc.lat, lon: origenLoc.lon },
      { lat: destinoLoc.lat, lon: destinoLoc.lon }
    );
```

por:

```ts
    const resultado = await obtenerRuta([
      { lat: origenLoc.lat, lon: origenLoc.lon },
      { lat: destinoLoc.lat, lon: destinoLoc.lon },
    ]);
```

- [ ] **Step 3: Verificar**

Run: `npm test && npm run build`
Expected: tests PASS y build OK.

- [ ] **Step 4: Commit (confirmar antes con el usuario)**

```bash
git add src/services/routeService.ts src/App.tsx
git commit -m "feat(route): obtenerRuta acepta N puntos"
```

---

### Task 4: Helper geo `distanciaMetros` (TDD)

**Files:**
- Create: `src/utils/geo.test.ts`
- Create: `src/utils/geo.ts`

**Interfaces:**
- Produces: `distanciaMetros(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number` (distancia en metros, Haversine).

- [ ] **Step 1: Escribir el test que falla**

Crear `src/utils/geo.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { distanciaMetros } from './geo';

describe('distanciaMetros', () => {
  it('devuelve ~0 para el mismo punto', () => {
    expect(distanciaMetros({ lat: 6.24, lon: -75.58 }, { lat: 6.24, lon: -75.58 })).toBeLessThan(1);
  });

  it('calcula ~111 km por grado de latitud', () => {
    const d = distanciaMetros({ lat: 6.0, lon: -75.58 }, { lat: 7.0, lon: -75.58 });
    expect(d).toBeGreaterThan(110000);
    expect(d).toBeLessThan(112000);
  });
});
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

Run: `npm test`
Expected: FAIL — módulo `./geo` no existe.

- [ ] **Step 3: Implementar `src/utils/geo.ts`**

```ts
/**
 * Distancia en metros entre dos coordenadas (fórmula de Haversine).
 */
export function distanciaMetros(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
): number {
  const radioTierra = 6371000;
  const aRad = (a.lat * Math.PI) / 180;
  const bRad = (b.lat * Math.PI) / 180;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(aRad) * Math.cos(bRad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return 2 * radioTierra * Math.asin(Math.sqrt(h));
}
```

- [ ] **Step 4: Ejecutar y confirmar que pasa**

Run: `npm test`
Expected: 10 tests PASS.

- [ ] **Step 5: Commit (confirmar antes con el usuario)**

```bash
git add src/utils/geo.ts src/utils/geo.test.ts
git commit -m "feat(geo): añade distanciaMetros con Haversine"
```

---

### Task 5: Migración multi-parada (MapView + App + panel)

**Files:**
- Rewrite: `src/components/MapView.tsx`
- Rewrite: `src/App.tsx`
- Delete: `src/components/LocationSearch.tsx`
- Modify: `src/services/routeService.ts` (quitar `corregirUbicacionConIA` y constantes GROQ, que quedan sin uso)

**Interfaces:**
- Consumes: `PuntoRuta` (Task 1), `construirUrlRuta`/`parsearRespuestaRuta` (Task 2), `obtenerRuta(puntos[])` (Task 3), `distanciaMetros` (Task 4), `calcularConsumoCombustible` (existente).
- Produces:
  - `MapViewProps { puntos: PuntoRuta[]; rutaCoordenadas: LatLngTuple[]; darkMode: boolean; ciudadCenter?: LatLngTuple; onMapTap?: (latlng: { lat: number; lon: number }) => void; onPuntoMoved?: (index: number, loc: LocationResult) => void; onPuntoEliminado?: (id: string) => void }`
  - App: `handleMapTap(latlng)`, `handlePuntoMoved(index, loc)`, `handlePuntoEliminado(id)`, `handleDeshacer()`.

- [ ] **Step 1: Reescribir `src/components/MapView.tsx`**

Contenido completo:

```tsx
import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { LatLngTuple } from 'leaflet';
import type { PuntoRuta } from '../types/tripcalc';
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

const COLOR_PRIMERO = '#22c55e';
const COLOR_INTERMEDIO = '#3b82f6';
const COLOR_ULTIMO = '#ef4444';

/** Pin circular numerado estilo ride-hailing, con botón X para quitar la parada */
const createPinIcon = (color: string, label: string) =>
  L.divIcon({
    className: '',
    html: `
      <div style="position: relative; width: 44px; height: 48px; display: flex; flex-direction: column; align-items: center;">
        <div style="width: 36px; height: 36px; background: ${color}; border: 3px solid white; border-radius: 50%; box-shadow: 0 3px 10px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; color: white; font-family: -apple-system, sans-serif; cursor: grab;">${label}</div>
        <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 8px solid ${color}; margin-top: -2px; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.2));"></div>
        <button class="pin-remove" type="button" title="Quitar parada" style="position: absolute; top: -6px; right: -2px; width: 18px; height: 18px; border-radius: 50%; background: rgba(17,17,17,0.9); color: #fff; font-size: 12px; line-height: 14px; text-align: center; cursor: pointer; border: 2px solid #fff; padding: 0;">×</button>
      </div>`,
    iconSize: [44, 48],
    iconAnchor: [22, 48],
    popupAnchor: [0, -48],
  });

interface PuntoMarkerProps {
  index: number;
  punto: PuntoRuta;
  icon: L.DivIcon;
  onPuntoMoved: (index: number, loc: LocationResult) => void;
  onPuntoEliminado: (id: string) => void;
}

/** Marcador de una parada: arrastrable y con botón X que no propaga al mapa */
const PuntoMarker: React.FC<PuntoMarkerProps> = ({
  index,
  punto,
  icon,
  onPuntoMoved,
  onPuntoEliminado,
}) => {
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!markerRef.current) return;
    markerRef.current.setLatLng([punto.lat, punto.lon]);

    const btn = markerRef.current.getElement()?.querySelector<HTMLButtonElement>('.pin-remove');
    if (!btn) return;
    const handleRemove = (e: Event) => {
      L.DomEvent.stopPropagation(e);
      onPuntoEliminado(punto.id);
    };
    btn.addEventListener('click', handleRemove);
    return () => btn.removeEventListener('click', handleRemove);
  }, [punto.lat, punto.lon, punto.id, onPuntoEliminado]);

  return (
    <Marker
      position={[punto.lat, punto.lon]}
      icon={icon}
      draggable
      ref={markerRef}
      eventHandlers={{
        dragend: async () => {
          if (!markerRef.current) return;
          const { lat, lng } = markerRef.current.getLatLng();
          const loc = await geocodificacionReversa(lat, lng);
          onPuntoMoved(index, loc ?? {
            name: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            displayName: `Coordenadas: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            lat,
            lon: lng,
          });
        },
      }}
    />
  );
};

const MapClickHandler: React.FC<{ onMapTap?: (latlng: { lat: number; lon: number }) => void }> = ({
  onMapTap,
}) => {
  useMapEvents({
    click: (e) => onMapTap?.({ lat: e.latlng.lat, lon: e.latlng.lng }),
  });
  return null;
};

/** Ajusta los bounds del mapa cuando cambian los puntos o la ruta */
const FitBounds: React.FC<{ puntos: PuntoRuta[]; ruta: LatLngTuple[] }> = ({ puntos, ruta }) => {
  const map = useMap();
  const coords: LatLngTuple[] = puntos.map((p) => [p.lat, p.lon]);
  const coordsKey = JSON.stringify(coords);

  useEffect(() => {
    if (ruta.length > 1) {
      map.fitBounds(L.latLngBounds(ruta), { padding: [60, 60], maxZoom: 16, animate: true });
    } else if (coords.length > 1) {
      map.fitBounds(L.latLngBounds(coords), { padding: [70, 70], maxZoom: 15, animate: true });
    } else if (coords.length === 1) {
      map.setView(coords[0], 14, { animate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordsKey, ruta.length, map]);

  return null;
};

interface MapViewProps {
  puntos: PuntoRuta[];
  rutaCoordenadas: LatLngTuple[];
  darkMode: boolean;
  ciudadCenter?: LatLngTuple;
  onMapTap?: (latlng: { lat: number; lon: number }) => void;
  onPuntoMoved?: (index: number, loc: LocationResult) => void;
  onPuntoEliminado?: (id: string) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  puntos,
  rutaCoordenadas,
  darkMode,
  ciudadCenter,
  onMapTap,
  onPuntoMoved,
  onPuntoEliminado,
}) => {
  const defaultCenter: LatLngTuple = ciudadCenter ?? [6.2442, -75.5812];
  const centroInicial: LatLngTuple = puntos.length > 0 ? [puntos[0].lat, puntos[0].lon] : defaultCenter;

  const tileUrl = darkMode
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  return (
    <MapContainer
      center={centroInicial}
      zoom={13}
      className="w-full h-full"
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer url={tileUrl} />
      <MapClickHandler onMapTap={onMapTap} />
      <FitBounds puntos={puntos} ruta={rutaCoordenadas} />

      {puntos.map((punto, i) => {
        const esPrimero = i === 0;
        const esUltimo = i === puntos.length - 1;
        const color = esPrimero ? COLOR_PRIMERO : esUltimo ? COLOR_ULTIMO : COLOR_INTERMEDIO;
        return (
          <PuntoMarker
            key={punto.id}
            index={i}
            punto={punto}
            icon={createPinIcon(color, String(i + 1))}
            onPuntoMoved={onPuntoMoved!}
            onPuntoEliminado={onPuntoEliminado!}
          />
        );
      })}

      {rutaCoordenadas.length > 0 && (
        <Polyline
          positions={rutaCoordenadas}
          pathOptions={{ color: '#1e3a8a', weight: 9, opacity: 0.2, lineCap: 'round', lineJoin: 'round' }}
        />
      )}
      {rutaCoordenadas.length > 0 && (
        <Polyline
          positions={rutaCoordenadas}
          pathOptions={{ color: '#3b82f6', weight: 5, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }}
        />
      )}
    </MapContainer>
  );
};
```

- [ ] **Step 2: Reescribir `src/App.tsx`**

Contenido completo:

```tsx
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Vehiculo, PuntoRuta } from './types/tripcalc';
import type { LocationResult, RouteResult } from './services/routeService';
import type { LatLngTuple } from 'leaflet';
import type { MonedaInfo } from './services/currencyService';
import { VEHICULOS_LOCAL_DB, consultarEspecificacionesConIA } from './services/vehicleService';
import { obtenerRuta, geocodificacionReversa, obtenerCiudadDesdeCoords } from './services/routeService';
import { getMonedaPorPais } from './services/currencyService';
import { calcularConsumoCombustible } from './utils/fuelCost';
import { distanciaMetros } from './utils/geo';
import { MapView } from './components/MapView';
import { VehicleSelector } from './components/VehicleSelector';
import { FuelCostCard } from './components/FuelCostCard';
import { SettingsModal } from './components/SettingsModal';
import { CityPicker } from './components/CityPicker';
import { BottomSheet } from './components/BottomSheet';
import {
  Bike, Car, Sun, Moon, Settings, Loader2, Calculator, Navigation,
  AlertTriangle, MapPin, X, Undo2,
} from 'lucide-react';

type GeoStep = 'requesting' | 'locating' | 'city_picker' | 'ready';

const MAX_PARADAS = 8;
const TAP_IGNORAR_METROS = 30;

const snapPoints = () => [
  56,
  Math.round(window.innerHeight * 0.45),
  Math.round(window.innerHeight * 0.82),
];

let contadorParadas = 0;
function nuevoIdPunto(): string {
  contadorParadas += 1;
  return `punto-${Date.now()}-${contadorParadas}`;
}

function nombrePorCoordenadas(lat: number, lon: number): string {
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

export function App() {
  // ── Theme ──────────────────────────────────────────────────────────────────
  const [darkMode, setDarkMode] = useState<boolean>(() =>
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
  );
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // ── GPS & Ciudad & Moneda ──────────────────────────────────────────────────
  const [geoStep, setGeoStep] = useState<GeoStep>('requesting');
  const [ciudad, setCiudad] = useState<string>('');
  const [ciudadCoords, setCiudadCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [moneda, setMoneda] = useState<MonedaInfo>(getMonedaPorPais('co'));
  const [precioCombustible, setPrecioCombustible] = useState<number>(moneda.precioCombustibleEstimado);
  const geoWatchId = useRef<number | null>(null);

  const requestGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoStep('city_picker');
      return;
    }
    setGeoStep('locating');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const { ciudad: cityName, countryCode } = await obtenerCiudadDesdeCoords(latitude, longitude);
        const loc = await geocodificacionReversa(latitude, longitude);

        if (countryCode) {
          const monedaDetectada = getMonedaPorPais(countryCode);
          setMoneda(monedaDetectada);
          setPrecioCombustible(monedaDetectada.precioCombustibleEstimado);
        }

        setCiudad(cityName ?? 'Tu ubicación');
        setCiudadCoords({ lat: latitude, lon: longitude });
        setPuntos([{
          id: nuevoIdPunto(),
          lat: latitude,
          lon: longitude,
          nombre: loc?.name ?? nombrePorCoordenadas(latitude, longitude),
        }]);
        setGeoStep('ready');
      },
      (_err) => {
        setGeoStep('city_picker');
      },
      { timeout: 12000, enableHighAccuracy: true, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    requestGPS();
    return () => {
      if (geoWatchId.current !== null) navigator.geolocation.clearWatch(geoWatchId.current);
    };
  }, [requestGPS]);

  const handleCitySelected = useCallback((name: string, lat: number, lon: number, countryCode?: string) => {
    setCiudad(name);
    setCiudadCoords({ lat, lon });
    if (countryCode) {
      const m = getMonedaPorPais(countryCode);
      setMoneda(m);
      setPrecioCombustible(m.precioCombustibleEstimado);
    }
    setGeoStep('ready');
  }, []);

  // ── Vehicles ──────────────────────────────────────────────────────────────
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>(VEHICULOS_LOCAL_DB);
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<Vehiculo | null>(VEHICULOS_LOCAL_DB[0]);
  const [cargandoIA, setCargandoIA] = useState(false);

  // ── Settings ──────────────────────────────────────────────────────────────
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // ── Puntos de la ruta ──────────────────────────────────────────────────────
  const [puntos, setPuntos] = useState<PuntoRuta[]>([]);
  const [ruta, setRuta] = useState<RouteResult | null>(null);
  const [rutaCoordenadas, setRutaCoordenadas] = useState<LatLngTuple[]>([]);
  const [cargandoRuta, setCargandoRuta] = useState(false);

  const ciudadCenter: LatLngTuple | undefined = ciudadCoords
    ? [ciudadCoords.lat, ciudadCoords.lon]
    : undefined;

  // ── Fetch route ────────────────────────────────────────────────────────────
  const calcularRuta = useCallback(async () => {
    if (puntos.length < 2) {
      setRuta(null);
      setRutaCoordenadas([]);
      return;
    }
    setCargandoRuta(true);
    const resultado = await obtenerRuta(puntos);
    setRuta(resultado);
    setRutaCoordenadas(resultado?.coordenadas ?? []);
    setCargandoRuta(false);
  }, [puntos]);

  useEffect(() => { calcularRuta(); }, [calcularRuta]);

  // ── Fuel cost ──────────────────────────────────────────────────────────────
  const consumo = useMemo(() => {
    if (!vehiculoSeleccionado || !ruta || ruta.distanciaKm <= 0) return null;
    return calcularConsumoCombustible(
      ruta.distanciaKm,
      vehiculoSeleccionado.consumoKmPorLitro,
      precioCombustible
    );
  }, [vehiculoSeleccionado, ruta, precioCombustible]);

  // ── Handlers de puntos ─────────────────────────────────────────────────────
  const handleMapTap = useCallback((latlng: { lat: number; lon: number }) => {
    if (cargandoRuta) return;
    if (puntos.length >= MAX_PARADAS) return;
    const demasiadoCerca = puntos.some((p) => distanciaMetros(p, latlng) < TAP_IGNORAR_METROS);
    if (demasiadoCerca) return;

    const nuevo: PuntoRuta = {
      id: nuevoIdPunto(),
      lat: latlng.lat,
      lon: latlng.lon,
      nombre: 'Cargando dirección…',
    };
    setPuntos((prev) => [...prev, nuevo]);

    geocodificacionReversa(latlng.lat, latlng.lon)
      .then((loc) => {
        setPuntos((prev) => prev.map((p) =>
          p.id === nuevo.id
            ? { ...p, nombre: loc?.name ?? nombrePorCoordenadas(latlng.lat, latlng.lon) }
            : p
        ));
      })
      .catch(() => {
        setPuntos((prev) => prev.map((p) =>
          p.id === nuevo.id
            ? { ...p, nombre: nombrePorCoordenadas(latlng.lat, latlng.lon) }
            : p
        ));
      });
  }, [puntos, cargandoRuta]);

  const handlePuntoMoved = useCallback((index: number, loc: LocationResult) => {
    setPuntos((prev) =>
      prev.map((p, i) => (i === index ? { ...p, lat: loc.lat, lon: loc.lon, nombre: loc.name } : p))
    );
  }, []);

  const handlePuntoEliminado = useCallback((id: string) => {
    setPuntos((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleDeshacer = useCallback(() => {
    setPuntos((prev) => prev.slice(0, -1));
  }, []);

  // ── IA lookup ──────────────────────────────────────────────────────────────
  const [vehiculoNoEncontrado, setVehiculoNoEncontrado] = useState(false);
  const handleConsultarIA = async (modelo: string) => {
    setCargandoIA(true);
    setVehiculoNoEncontrado(false);
    try {
      const nueva = await consultarEspecificacionesConIA(modelo);
      setVehiculos((prev) => [nueva, ...prev]);
      setVehiculoSeleccionado(nueva);
    } catch (e) {
      console.error('Error IA:', e);
      setVehiculoNoEncontrado(true);
    } finally {
      setCargandoIA(false);
    }
  };

  // ── Loading screen ────────────────────────────────────────────────────────
  if (geoStep === 'requesting' || geoStep === 'locating') {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center gap-5 bg-[var(--bg-primary)]">
        <div className="w-16 h-16 rounded-3xl bg-[var(--text-primary)] flex items-center justify-center shadow-xl">
          <Bike className="w-8 h-8 text-[var(--bg-surface)]" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">TripCalc</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Obteniendo tu ubicación...</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)] shadow-sm">
          <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">Buscando señal GPS...</span>
        </div>
        <button
          onClick={() => setGeoStep('city_picker')}
          className="text-xs text-[var(--text-muted)] underline underline-offset-2"
        >
          Elegir ciudad manualmente
        </button>
      </div>
    );
  }

  const hintTexto = puntos.length === 0
    ? 'Toca el mapa para marcar tu origen'
    : puntos.length === 1
      ? 'Toca el mapa para añadir la siguiente parada'
      : 'Toca el mapa para añadir otra parada';

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      {geoStep === 'city_picker' && (
        <CityPicker onCitySelected={handleCitySelected} />
      )}

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <header className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
        <div className="flex items-center justify-between px-3 pt-3">
          <div className="pointer-events-auto flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--bg-surface)]/90 backdrop-blur-md border border-[var(--border-color)] shadow-lg">
            {vehiculoSeleccionado?.tipo === 'carro' ? <Car className="w-4 h-4 text-[var(--accent)] shrink-0" /> : <Bike className="w-4 h-4 text-[var(--accent)] shrink-0" />}
            {ciudad && (
              <span className="text-xs font-bold text-[var(--text-primary)]">
                {ciudad} · {moneda.codigo}
              </span>
            )}
          </div>

          <div className="pointer-events-auto flex items-center gap-1.5">
            <button
              onClick={() => setGeoStep('city_picker')}
              className="p-2.5 rounded-xl bg-[var(--bg-surface)]/90 backdrop-blur-md border border-[var(--border-color)] shadow-lg text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
              title="Cambiar ciudad"
            >
              <Navigation className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2.5 rounded-xl bg-[var(--bg-surface)]/90 backdrop-blur-md border border-[var(--border-color)] shadow-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              title="Configurar precio de gasolina"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 rounded-xl bg-[var(--bg-surface)]/90 backdrop-blur-md border border-[var(--border-color)] shadow-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── MAP ─────────────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <MapView
          puntos={puntos}
          rutaCoordenadas={rutaCoordenadas}
          darkMode={darkMode}
          ciudadCenter={ciudadCenter}
          onMapTap={handleMapTap}
          onPuntoMoved={handlePuntoMoved}
          onPuntoEliminado={handlePuntoEliminado}
        />
      </div>

      {/* ── Chip contextual + deshacer ──────────────────────────────────────── */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--bg-surface)]/95 backdrop-blur-md border border-[var(--border-color)] shadow text-[11px] font-medium text-[var(--text-primary)] whitespace-nowrap">
          <MapPin className="w-3 h-3 text-[var(--accent)] shrink-0" />
          {hintTexto}
        </div>
        {puntos.length > 0 && (
          <button
            onClick={handleDeshacer}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[var(--bg-surface)]/95 backdrop-blur-md border border-[var(--border-color)] shadow text-[11px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
            title="Quitar la última parada"
          >
            <Undo2 className="w-3 h-3" />
            Deshacer
          </button>
        )}
      </div>

      {cargandoRuta && (
        <div className="absolute top-[6.75rem] left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-surface)]/95 backdrop-blur-md border border-[var(--border-color)] shadow-lg text-xs font-medium text-[var(--text-primary)]">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
          Calculando ruta...
        </div>
      )}

      {/* ── BOTTOM SHEET ────────────────────────────────────────────────────── */}
      <BottomSheet
        minHeight={56}
        snapPoints={snapPoints()}
        defaultHeight={Math.round(window.innerHeight * 0.45)}
      >
        <div className="px-4 pb-6 space-y-4">
          {puntos.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Paradas de la ruta
              </label>
              {puntos.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-subtle)]"
                >
                  <span
                    className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0"
                    style={{ background: i === 0 ? '#22c55e' : i === puntos.length - 1 ? '#ef4444' : '#3b82f6' }}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 min-w-0 text-xs font-medium text-[var(--text-primary)] truncate">
                    {p.nombre}
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePuntoEliminado(p.id)}
                    className="p-1 rounded-md text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    title={`Quitar parada ${i + 1}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {puntos.length >= 2 && (
            <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
              <span className="flex gap-1">
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center">1</span>
                <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">N</span>
              </span>
              Arrastra los pines del mapa para ajustar cada punto exacto
            </div>
          )}

          <VehicleSelector
            vehiculos={vehiculos}
            vehiculoSeleccionado={vehiculoSeleccionado}
            onSeleccionarVehiculo={setVehiculoSeleccionado}
            onConsultarIA={handleConsultarIA}
            cargandoIA={cargandoIA}
            vehiculoNoEncontrado={vehiculoNoEncontrado}
          />

          {ruta && (
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs">
              <Calculator className="w-4 h-4 text-[var(--accent)] shrink-0" />
              <div className="text-[var(--text-primary)] font-medium">
                Ruta: <strong>{ruta.distanciaKm} km</strong> · ~{ruta.duracionMin} min estimados
              </div>
            </div>
          )}

          {ruta === null && puntos.length >= 2 && !cargandoRuta && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/5 border border-red-500/20 text-xs text-red-500">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              No se pudo calcular la ruta. Revisa los puntos marcados.
            </div>
          )}

          {consumo && ruta && vehiculoSeleccionado && (
            <FuelCostCard
              distanciaKm={ruta.distanciaKm}
              vehiculo={vehiculoSeleccionado}
              precioCombustible={precioCombustible}
              moneda={moneda}
            />
          )}
        </div>
      </BottomSheet>

      {/* ── Settings ────────────────────────────────────────────────────────── */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        precioCombustible={precioCombustible}
        moneda={moneda}
        onSave={setPrecioCombustible}
      />
    </div>
  );
}

export default App;
```

- [ ] **Step 3: Eliminar `src/components/LocationSearch.tsx` y código muerto**

Eliminar el archivo:

```bash
Remove-Item -LiteralPath "src\components\LocationSearch.tsx"
```

En `src/services/routeService.ts`, eliminar la función `corregirUbicacionConIA` y las constantes `GROQ_API_KEY` y `GROQ_API_URL` (quedan sin uso tras eliminar LocationSearch). Conservar `buscarUbicacion` (la usa `CityPicker`).

- [ ] **Step 4: Verificar tests, lint y build**

Run: `npm test`
Expected: 10 tests PASS.

Run: `npm run lint`
Expected: sin errores (los warnings de `MapView.tsx:73` y `App.tsx:80` desaparecen o cambian; no deben quedar errores).

Run: `npm run build`
Expected: build OK.

- [ ] **Step 5: Commit (confirmar antes con el usuario)**

```bash
git add -A src/components/MapView.tsx src/App.tsx src/components/LocationSearch.tsx src/services/routeService.ts
git commit -m "feat(map): rutas multi-parada con tap, arrastre y eliminación"
```

---

## Self-Review (verificado)

- **Cobertura del spec:** PuntoRuta ✓ (T1), obtenerRuta N puntos ✓ (T2/T3), tap añade parada ✓ (T5), quitar X en pin y lista ✓ (T5), arrastrar reubica ✓ (T5), pines numerados (1º verde, últimos rojo, intermedios azul) ✓ (T5), chip contextual + deshacer ✓ (T5), ajuste de mapa ✓ (T5), lista de paradas en panel ✓ (T5), max 8 paradas ✓ (T5), tap a <30 m ignorado ✓ (T5), tap durante carga ignorado ✓ (T5), error de ruta visible ✓ (T5), quitar LocationSearch ✓ (T5).
- **Sin placeholders:** todos los pasos contienen código o comandos exactos.
- **Consistencia de tipos:** `PuntoRuta`, `construirUrlRuta`, `parsearRespuestaRuta`, `obtenerRuta(puntos[])`, `distanciaMetros`, `MapViewProps` y los handlers de App coinciden entre tareas.
