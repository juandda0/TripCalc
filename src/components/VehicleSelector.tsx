import React from 'react';
import type { Vehiculo } from '../types/tripcalc';
import { Bike, Car, Check, Loader2, Search, AlertCircle } from 'lucide-react';

interface VehicleSelectorProps {
  vehiculos: Vehiculo[];
  vehiculoSeleccionado: Vehiculo | null;
  onSeleccionarVehiculo: (vehiculo: Vehiculo) => void;
  onConsultarIA: (modelo: string) => Promise<void>;
  cargandoIA: boolean;
  /** Indica si la última búsqueda no encontró resultados válidos */
  vehiculoNoEncontrado?: boolean;
}

/** Distancia de Levenshtein simplificada para fuzzy matching */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/** Ordena los vehículos por similitud al término de búsqueda */
function filtrarYOrdenarVehiculos(vehiculos: Vehiculo[], termino: string): Vehiculo[] {
  if (!termino.trim()) return vehiculos;
  const t = termino.toLowerCase().trim();

  // Exact / contains match first
  const exactas = vehiculos.filter(v =>
    `${v.marca} ${v.modelo}`.toLowerCase().includes(t) ||
    v.modelo.toLowerCase().includes(t) ||
    v.marca.toLowerCase().includes(t)
  );

  if (exactas.length > 0) return exactas;

  // Fuzzy: calcular distancia normalizada a marca+modelo
  const conDistancia = vehiculos.map(v => {
    const nombre = `${v.marca} ${v.modelo}`.toLowerCase();
    const dist = levenshtein(t, nombre.substring(0, t.length + 4));
    return { vehiculo: v, dist };
  });

  conDistancia.sort((a, b) => a.dist - b.dist);

  // Solo retornar si la distancia es razonable (≤ 4 errores tipográficos)
  return conDistancia.filter(x => x.dist <= 4).map(x => x.vehiculo);
}

export const VehicleSelector: React.FC<VehicleSelectorProps> = ({
  vehiculos,
  vehiculoSeleccionado,
  onSeleccionarVehiculo,
  onConsultarIA,
  cargandoIA,
  vehiculoNoEncontrado,
}) => {
  const [busqueda, setBusqueda] = React.useState('');
  const [openDropdown, setOpenDropdown] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const opcionesFiltradas = React.useMemo(
    () => filtrarYOrdenarVehiculos(vehiculos, busqueda),
    [busqueda, vehiculos]
  );

  // El usuario escribió algo concreto pero no hay coincidencias ni siquiera fuzzy
  const sinCoincidencias = busqueda.trim().length >= 2 && opcionesFiltradas.length === 0;

  const handleSelect = (vehiculo: Vehiculo) => {
    onSeleccionarVehiculo(vehiculo);
    setBusqueda(`${vehiculo.marca} ${vehiculo.modelo}`);
    setOpenDropdown(false);
  };

  const handleBuscar = async () => {
    if (!busqueda.trim() || cargandoIA) return;
    await onConsultarIA(busqueda);
    setOpenDropdown(false);
  };

  // Cerrar dropdown al hacer click fuera
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const renderIcono = (tipo: 'moto' | 'carro', className: string) => {
    return tipo === 'carro' ? <Car className={className} /> : <Bike className={className} />;
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
        Vehículo (Moto o Carro)
      </label>

      {/* Input wrapper */}
      <div className="relative flex items-center">
        <div className="pointer-events-none absolute left-0 inset-y-0 flex items-center pl-2.5">
          {vehiculoSeleccionado ? (
            renderIcono(vehiculoSeleccionado.tipo, "w-4 h-4 text-[var(--text-muted)] shrink-0")
          ) : (
            <Bike className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          )}
        </div>
        <input
          type="text"
          style={{ paddingLeft: '2rem', paddingRight: cargandoIA ? '2rem' : '0.75rem' }}
          className="notion-input w-full text-sm font-medium"
          placeholder="Ej: NKD 125, Spark GT, Logan, XTZ 150..."
          value={busqueda}
          onChange={(e) => { setBusqueda(e.target.value); setOpenDropdown(true); }}
          onFocus={() => setOpenDropdown(true)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleBuscar(); }}
        />
        {cargandoIA && (
          <div className="pointer-events-none absolute right-0 inset-y-0 flex items-center pr-2.5">
            <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
          </div>
        )}
      </div>

      {/* Vehículo activo seleccionado */}
      {vehiculoSeleccionado && !openDropdown && (
        <div className="mt-2 px-3 py-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-subtle)] flex items-center gap-2.5">
          {vehiculoSeleccionado.tipo === 'carro' ? <Car className="w-5 h-5 text-[var(--text-secondary)] shrink-0" /> : <Bike className="w-5 h-5 text-[var(--text-secondary)] shrink-0" />}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
              {vehiculoSeleccionado.marca} {vehiculoSeleccionado.modelo}
            </div>
            <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-2 mt-0.5">
              <span>
                {vehiculoSeleccionado.tipo === 'carro' 
                  ? `${(vehiculoSeleccionado.cilindraje / 1000).toFixed(1)}L` 
                  : `${vehiculoSeleccionado.cilindraje} cc`}
              </span>
              <span>·</span>
              <span className="text-[var(--text-secondary)] font-medium">
                {vehiculoSeleccionado.consumoKmPorLitro} km/L
              </span>
              <span>·</span>
              <span>Tanque {vehiculoSeleccionado.capacidadTanque} L</span>
            </div>
          </div>
          {vehiculoSeleccionado.fuente === 'ia_gemini' && (
            <span className="text-[10px] font-medium text-[var(--text-muted)] border border-[var(--border-color)] px-1.5 py-0.5 rounded-md shrink-0">
              Búsqueda
            </span>
          )}
        </div>
      )}

      {/* Vehículo no encontrado (resultado de búsqueda fallida) */}
      {vehiculoNoEncontrado && !openDropdown && (
        <div className="mt-2 px-3 py-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-subtle)] flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          <p className="text-xs text-[var(--text-secondary)]">
            Vehículo no encontrado. Verifica el nombre e intenta de nuevo.
          </p>
        </div>
      )}

      {/* Dropdown */}
      {openDropdown && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] shadow-xl overflow-hidden max-h-56 overflow-y-auto">

          {opcionesFiltradas.length > 0 ? (
            <>
              {busqueda.trim() && opcionesFiltradas[0].modelo.toLowerCase() !== busqueda.toLowerCase() && (
                <div className="px-3 py-1.5 border-b border-[var(--border-color)] bg-[var(--bg-subtle)]">
                  <p className="text-[10px] text-[var(--text-muted)]">Resultados más parecidos a "{busqueda}"</p>
                </div>
              )}
              {opcionesFiltradas.map((vehiculo) => (
                <button
                  key={vehiculo.id}
                  type="button"
                  className="w-full text-left px-3 py-2.5 hover:bg-[var(--bg-subtle)] transition-colors flex items-center justify-between border-b border-[var(--border-color)] last:border-b-0"
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(vehiculo); }}
                >
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                      {vehiculo.tipo === 'carro' ? <Car className="w-3.5 h-3.5 text-[var(--text-muted)]" /> : <Bike className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                      {vehiculo.marca} {vehiculo.modelo}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] ml-5">
                      {vehiculo.tipo === 'carro' 
                        ? `${(vehiculo.cilindraje / 1000).toFixed(1)}L` 
                        : `${vehiculo.cilindraje} cc`} · {vehiculo.consumoKmPorLitro} km/L
                    </div>
                  </div>
                  {vehiculoSeleccionado?.id === vehiculo.id && (
                    <Check className="w-4 h-4 text-[var(--accent)] shrink-0" />
                  )}
                </button>
              ))}
            </>
          ) : sinCoincidencias ? (
            <div className="p-3">
              <p className="text-xs text-[var(--text-secondary)] mb-2">
                "{busqueda}" no está en la base de datos local.
              </p>
              <button
                type="button"
                disabled={cargandoIA}
                onMouseDown={(e) => { e.preventDefault(); handleBuscar(); }}
                className="w-full py-2 px-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {cargandoIA ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando vehículo...</>
                ) : (
                  <><Search className="w-3.5 h-3.5" /> Buscar con IA</>
                )}
              </button>
            </div>
          ) : (
            <div className="px-3 py-2.5 text-xs text-[var(--text-muted)]">
              Escribe el nombre de tu vehículo
            </div>
          )}
        </div>
      )}
    </div>
  );
};
