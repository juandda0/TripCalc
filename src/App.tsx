import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Vehiculo } from './types/tripcalc';
import type { LocationResult, RouteResult } from './services/routeService';
import type { LatLngTuple } from 'leaflet';
import type { MonedaInfo } from './services/currencyService';
import { VEHICULOS_LOCAL_DB, consultarEspecificacionesConIA } from './services/vehicleService';
import { obtenerRuta, geocodificacionReversa, obtenerCiudadDesdeCoords } from './services/routeService';
import { getMonedaPorPais } from './services/currencyService';
import { calcularConsumoCombustible } from './utils/fuelCost';
import { MapView } from './components/MapView';
import { LocationSearch } from './components/LocationSearch';
import { VehicleSelector } from './components/VehicleSelector';
import { FuelCostCard } from './components/FuelCostCard';
import { SettingsModal } from './components/SettingsModal';
import { CityPicker } from './components/CityPicker';
import { BottomSheet } from './components/BottomSheet';
import {
  Bike, Car, Sun, Moon, Settings, Loader2, Calculator, Navigation, AlertTriangle,
} from 'lucide-react';

type GeoStep = 'requesting' | 'locating' | 'city_picker' | 'ready';

const snapPoints = () => [
  56,
  Math.round(window.innerHeight * 0.45),
  Math.round(window.innerHeight * 0.82),
];

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

        // Actualizar moneda y precio de gasolina según país detectado
        if (countryCode) {
          const monedaDetectada = getMonedaPorPais(countryCode);
          setMoneda(monedaDetectada);
          setPrecioCombustible(monedaDetectada.precioCombustibleEstimado);
        }

        setCiudad(cityName ?? 'Tu ubicación');
        setCiudadCoords({ lat: latitude, lon: longitude });
        if (loc) setOrigenLoc(loc);
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

  // ── Locations & Route ──────────────────────────────────────────────────────
  const [origenLoc, setOrigenLoc] = useState<LocationResult | null>(null);
  const [destinoLoc, setDestinoLoc] = useState<LocationResult | null>(null);
  const [ruta, setRuta] = useState<RouteResult | null>(null);
  const [rutaCoordenadas, setRutaCoordenadas] = useState<LatLngTuple[]>([]);
  const [cargandoRuta, setCargandoRuta] = useState(false);

  // ── Derived map coords ─────────────────────────────────────────────────────
  const origenCoord: LatLngTuple | null = origenLoc ? [origenLoc.lat, origenLoc.lon] : null;
  const destinoCoord: LatLngTuple | null = destinoLoc ? [destinoLoc.lat, destinoLoc.lon] : null;
  const ciudadCenter: LatLngTuple | undefined = ciudadCoords
    ? [ciudadCoords.lat, ciudadCoords.lon]
    : undefined;

  // ── Fetch route ────────────────────────────────────────────────────────────
  const calcularRuta = useCallback(async () => {
    if (!origenLoc || !destinoLoc) return;
    setCargandoRuta(true);
    setRuta(null);
    setRutaCoordenadas([]);
    const resultado = await obtenerRuta(
      { lat: origenLoc.lat, lon: origenLoc.lon },
      { lat: destinoLoc.lat, lon: destinoLoc.lon }
    );
    if (resultado) {
      setRuta(resultado);
      setRutaCoordenadas(resultado.coordenadas);
    }
    setCargandoRuta(false);
  }, [origenLoc, destinoLoc]);

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

  const [vehiculoNoEncontrado, setVehiculoNoEncontrado] = useState(false);

  // ── IA lookup ──────────────────────────────────────────────────────────────
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

  // ── Marker drag handlers ───────────────────────────────────────────────────
  const handleOrigenDragged = useCallback((loc: LocationResult) => setOrigenLoc(loc), []);
  const handleDestinoDragged = useCallback((loc: LocationResult) => setDestinoLoc(loc), []);

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

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      {/* CityPicker */}
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
          origen={origenCoord}
          destino={destinoCoord}
          rutaCoordenadas={rutaCoordenadas}
          darkMode={darkMode}
          ciudadCenter={ciudadCenter}
          onOrigenDragged={handleOrigenDragged}
          onDestinoDragged={handleDestinoDragged}
        />
      </div>

      {cargandoRuta && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-surface)]/95 backdrop-blur-md border border-[var(--border-color)] shadow-lg text-xs font-medium text-[var(--text-primary)]">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
          Calculando ruta...
        </div>
      )}

      {(origenCoord && !destinoCoord) || (!origenCoord && destinoCoord) ? (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-surface)]/90 backdrop-blur-md border border-[var(--border-color)] shadow text-[11px] font-medium text-[var(--text-secondary)] whitespace-nowrap">
          <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
          Arrastra el marcador o escribe el {origenCoord ? 'destino' : 'origen'}
        </div>
      ) : null}

      {/* ── BOTTOM SHEET ────────────────────────────────────────────────────── */}
      <BottomSheet
        minHeight={56}
        snapPoints={snapPoints()}
        defaultHeight={Math.round(window.innerHeight * 0.45)}
      >
        <div className="px-4 pb-6 space-y-4">

          {/* Búsqueda de ubicaciones */}
          <div className="space-y-2">
            <LocationSearch
              label="Origen"
              placeholder={ciudad ? `Barrio o dirección en ${ciudad}...` : '¿Dónde estás?'}
              value={origenLoc}
              onSelect={setOrigenLoc}
              onClear={() => { setOrigenLoc(null); setRuta(null); setRutaCoordenadas([]); }}
              iconColor="#22c55e"
              biasLat={ciudadCoords?.lat}
              biasLon={ciudadCoords?.lon}
              ciudad={ciudad}
            />
            <LocationSearch
              label="Destino"
              placeholder={ciudad ? `Barrio o dirección en ${ciudad}...` : '¿A dónde vas?'}
              value={destinoLoc}
              onSelect={setDestinoLoc}
              onClear={() => { setDestinoLoc(null); setRuta(null); setRutaCoordenadas([]); }}
              iconColor="#ef4444"
              biasLat={ciudadCoords?.lat}
              biasLon={ciudadCoords?.lon}
              ciudad={ciudad}
            />
          </div>

          {/* Tip drag marcadores */}
          <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
            <span className="flex gap-1">
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center">A</span>
              <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">B</span>
            </span>
            Mantén presionado y arrastra los pines del mapa para ajustar el punto exacto
          </div>

          {/* Selector de vehículo */}
          <VehicleSelector
            vehiculos={vehiculos}
            vehiculoSeleccionado={vehiculoSeleccionado}
            onSeleccionarVehiculo={setVehiculoSeleccionado}
            onConsultarIA={handleConsultarIA}
            cargandoIA={cargandoIA}
            vehiculoNoEncontrado={vehiculoNoEncontrado}
          />

          {/* Info de ruta */}
          {ruta && (
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs">
              <Calculator className="w-4 h-4 text-[var(--accent)] shrink-0" />
              <div className="text-[var(--text-primary)] font-medium">
                Ruta: <strong>{ruta.distanciaKm} km</strong> · ~{ruta.duracionMin} min estimados
              </div>
            </div>
          )}

          {/* Consumo de gasolina */}
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

      {/* Settings */}
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
