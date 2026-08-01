# Diseño: Rutas multi-parada (map-first)

Fecha: 2026-07-31
Estado: Aprobado por el usuario

## Contexto

TripCalc era una calculadora de rentabilidad (tarifas y ganancia para conductores).
Se pivoteó a una calculadora de **gasto de gasolina por trayecto**: litros y dinero
según ruta y vehículo. El marcado de puntos en el mapa es la acción central de la app.

Este spec define la evolución de "un solo origen/destino" a **rutas con N paradas**
marcadas tocando el mapa.

## Objetivos

- Marcar una ruta de N paradas tocando el mapa (map-first, sin modos explícitos).
- Añadir, quitar y arrastrar paradas.
- Calcular distancia total, duración, litros y costo del recorrido completo.
- Mínima fricción: pista contextual en un chip + botón deshacer.

## Requerimientos (acordados con el usuario)

- Ruta con varias paradas (A → B → C → D…).
- Añadir puntos tocando el mapa.
- Quitar con una X en cada punto; arrastrar para reubicar.
- La app ordena automáticamente: el orden es el de inserción (parada 1 = origen,
  última = destino, intermedias = waypoints).
- Enfoque aprobado: **map-first continuo** (tap = añadir, drag de dedo = mover mapa).

## Modelo de datos

Nuevo tipo en `src/types/tripcalc.ts`:

```ts
export interface PuntoRuta {
  id: string;
  lat: number;
  lon: number;
  nombre: string;
}
```

- La app guarda `puntos: PuntoRuta[]` en vez del par `origenLoc`/`destinoLoc`.
- El punto de GPS inicial se convierte en la parada 1 (origen).
- Límite: **máximo 8 paradas** (evita saturar el mapa y el servidor OSRM público).
- `id`: `crypto.randomUUID()` o contador + timestamp.

## Servicios

### `obtenerRuta` — multi-punto (src/services/routeService.ts)

Cambia la firma a aceptar N puntos:

```ts
export async function obtenerRuta(
  puntos: { lat: number; lon: number }[]
): Promise<RouteResult | null>
```

- Arma la URL OSRM con `;` como separador de waypoints:
  `https://router.project-osrm.org/route/v1/driving/lon1,lat1;lon2,lat2;lon3,lat3?overview=full&geometries=geojson`
- OSRM ya suma distancia y duración de todos los tramos.
- Con menos de 2 puntos devuelve `null`.
- Mismo `RouteResult` de siempre: `{ distanciaKm, duracionMin, coordenadas }`.

### Reverse geocoding

- Al crear una parada (tap) y al soltar un arrastre se llama
  `geocodificacionReversa(lat, lon)` para rellenar `nombre`.
- Si falla, el nombre queda como `lat, lon` con 5 decimales.

### Cálculo de gasto

Sin cambios: `calcularConsumoCombustible(distanciaKm, consumoKmPorLitro, precioPorLitro)`
en `src/utils/fuelCost.ts`, usando la distancia total de la ruta.

## Componentes y UI

### MapView (src/components/MapView.tsx)

Props nuevas:

```ts
interface MapViewProps {
  puntos: PuntoRuta[];
  rutaCoordenadas: LatLngTuple[];
  darkMode: boolean;
  ciudadCenter?: LatLngTuple;
  onMapTap?: (latlng: { lat: number; lon: number }) => void;
  onPuntoMoved?: (index: number, loc: LocationResult) => void;
  onPuntoEliminado?: (id: string) => void;
}
```

- **Tap en zona vacía** añade parada (componente interno con `useMapEvents({ click })`).
  El click sobre un pin no propaga (Leaflet lo gestiona); el drag no dispara click.
- **Pines numerados** con `divIcon`: parada 1 verde, intermedias azules (accent),
  última roja. Cada pin trae una **X** pequeña en la esquina que elimina el punto
  (se usa `L.DomEvent.stopPropagation` para que no inicie arrastre ni click).
- Pines **arrastrables**; al soltar → `onPuntoMoved(index, loc)` + reverse geocoding.
- `FitBounds` ajusta a todos los puntos y, si hay ruta, a la geometría.
- Polilínea de ruta sin cambios.

### Chip superior contextual (App.tsx)

- 0 paradas: "Toca el mapa para marcar tu origen".
- 1 parada: "Toca el mapa para añadir la siguiente parada".
- ≥2 paradas: "Toca el mapa para añadir otra parada".
- Botón **Deshacer** (visible con ≥1 parada): quita la última.
- Clic en la X de un pin no cuenta como "tap de mapa" (stopPropagation).

### Panel inferior (BottomSheet)

- **Lista de paradas**: filas numeradas con nombre + botón X.
- **Caja de ruta**: "Ruta: X km · ~Y min" (≥2 paradas).
- **FuelCostCard**: litros y plata totales del recorrido.
- Se **eliminan** los dos campos `LocationSearch` del panel: todo se marca tocando
  el mapa y se refina arrastrando. Se mantiene el botón "cambiar ciudad".

## Flujo de datos

```
tap vacío → añadir PuntoRuta → reverse geocode (nombre) → useEffect recalcula
                                                                  │
  drag pin → actualizar coords + nombre ───────────────────────────┤
                                                                  ▼
  X / Deshacer → quitar punto ─────────────────────→ obtenerRuta(puntos)
                                                        │
                                                        ▼
                                    calcularConsumoCombustible(distanciaTotal)
                                                        │
                                                        ▼
                                              ruta + FuelCostCard
```

- 0-1 paradas: sin ruta ni tarjeta; el chip guía al usuario.
- El recálculo de ruta corre en `useEffect` dependiente de `puntos`.

## Manejo de errores

- Reverse geocode falla → nombre = coordenadas (nunca rompe el flujo).
- `obtenerRuta` falla o devuelve `null` → se conservan los puntos; la caja de ruta
  muestra "No se pudo calcular la ruta".
- Tap durante `cargandoRuta`: se ignora para evitar rachas de requests.
- Tap a menos de ~30 m de una parada existente: se ignora (evita duplicados
  accidentales al tocar el mismo pin).

## Testing

- No hay framework de tests en el repo (sin `test` script en package.json).
- Se añadirá **vitest** para cubrir lógica no trivial:
  - `obtenerRuta`: construcción de URL multi-waypoint y parseo de la respuesta.
  - `calcularConsumoCombustible`: casos límite (distancia/consumo ≤ 0).
- Reglas del repo: probar comportamiento (entradas/salidas), no internals.

## Fuera de alcance (YAGNI)

- Guardar rutas favoritas / historial.
- Reordenar paradas arrastrando en la lista.
- Modo edición explícito ("Listo").
- Perfiles de múltiples vehículos por usuario.
