import type { LatLngTuple } from 'leaflet';

export interface LocationResult {
  name: string;
  displayName: string;
  lat: number;
  lon: number;
}

/**
 * Geocodificación usando Nominatim (OpenStreetMap) — gratuito, sin API key.
 * Acepta un bias de ciudad (lat/lon) para priorizar resultados locales
 * sin eliminar coincidencias de otras ciudades.
 */
export async function buscarUbicacion(
  query: string,
  pais: string = 'co',
  biasLat?: number,
  biasLon?: number
): Promise<LocationResult[]> {
  if (!query || query.trim().length < 2) return [];

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '8',
    countrycodes: pais,
    addressdetails: '1',
  });

  // Si hay un punto de referencia, pedimos más resultados y los ordenamos por proximidad
  if (biasLat !== undefined && biasLon !== undefined) {
    // Nominatim soporta 'bounded' + 'viewbox' para priorizar área, pero sin excluir el resto
    // Usamos un viewbox generoso de ~80 km alrededor del bias point para priorizar
    const delta = 0.8; // ~80 km en cada dirección
    params.set('viewbox', `${biasLon - delta},${biasLat - delta},${biasLon + delta},${biasLat + delta}`);
    params.set('bounded', '0'); // 0 = muestra fuera del viewbox también, solo prioriza dentro
  }

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'Accept-Language': 'es' },
    });
    const data = await res.json();

    const results: LocationResult[] = data.map((item: any) => ({
      name: item.display_name.split(',')[0],
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
    }));

    // Si tenemos bias, ordenamos: primero los del viewbox (más cercanos al bias point), luego el resto
    if (biasLat !== undefined && biasLon !== undefined) {
      const delta = 0.8;
      results.sort((a, b) => {
        const aLocal =
          Math.abs(a.lat - biasLat!) < delta && Math.abs(a.lon - biasLon!) < delta;
        const bLocal =
          Math.abs(b.lat - biasLat!) < delta && Math.abs(b.lon - biasLon!) < delta;
        if (aLocal && !bLocal) return -1;
        if (!aLocal && bLocal) return 1;
        return 0;
      });
    }

    return results;
  } catch {
    return [];
  }
}

export interface RouteResult {
  distanciaKm: number;
  duracionMin: number;
  coordenadas: LatLngTuple[];
}

/**
 * Obtiene la ruta real entre dos puntos usando OSRM (gratuito, sin API key).
 */
export async function obtenerRuta(
  origen: { lat: number; lon: number },
  destino: { lat: number; lon: number }
): Promise<RouteResult | null> {
  try {
    // Usamos el perfil 'driving' (o 'bike'/'motorcycle' si el servidor público lo expusiera, pero 'driving' es el estándar y es correcto)
    const url = `https://router.project-osrm.org/route/v1/driving/${origen.lon},${origen.lat};${destino.lon},${destino.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0];
    const coordenadas: LatLngTuple[] = route.geometry.coordinates.map(
      (coord: [number, number]) => [coord[1], coord[0]] as LatLngTuple
    );

    return {
      distanciaKm: Number((route.distance / 1000).toFixed(1)),
      duracionMin: Math.round(route.duration / 60),
      coordenadas,
    };
  } catch {
    return null;
  }
}

/**
 * Geocodificación inversa: convierte coordenadas (lat/lon) en dirección + country_code.
 * Usado cuando el usuario arrastra un marcador en el mapa.
 */
export async function geocodificacionReversa(
  lat: number,
  lon: number
): Promise<LocationResult | null> {
  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lon.toString(),
      format: 'json',
      addressdetails: '1',
      zoom: '17',
    });

    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      headers: { 'Accept-Language': 'es' },
    });
    const data = await res.json();

    if (!data || data.error) return null;

    const addr = data.address || {};
    const nombre =
      addr.road ||
      addr.pedestrian ||
      addr.neighbourhood ||
      addr.suburb ||
      data.display_name.split(',')[0];

    return {
      name: nombre,
      displayName: data.display_name,
      lat,
      lon,
    };
  } catch {
    return null;
  }
}

/**
 * Obtiene ciudad Y country_code desde coordenadas GPS.
 */
export async function obtenerCiudadDesdeCoords(
  lat: number,
  lon: number
): Promise<{ ciudad: string | null; countryCode: string | null }> {
  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lon.toString(),
      format: 'json',
      addressdetails: '1',
      zoom: '10',
    });

    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      headers: { 'Accept-Language': 'es' },
    });
    const data = await res.json();

    if (!data || data.error) return { ciudad: null, countryCode: null };

    const addr = data.address || {};
    const ciudad =
      addr.city || addr.town || addr.municipality || addr.county || addr.state_district || null;
    const countryCode = (addr.country_code as string | undefined)?.toLowerCase() ?? null;

    return { ciudad, countryCode };
  } catch {
    return { ciudad: null, countryCode: null };
  }
}
