import React from 'react';
import type { Motocicleta } from '../types/tripcalc';
import { Bike, Check, Loader2, Search, AlertCircle } from 'lucide-react';

interface MotorcycleSelectorProps {
  motocicletas: Motocicleta[];
  motoSeleccionada: Motocicleta | null;
  onSeleccionarMoto: (moto: Motocicleta) => void;
  onConsultarIA: (modelo: string) => Promise<void>;
  cargandoIA: boolean;
  /** Indica si la última búsqueda no encontró resultados válidos */
  motoNoEncontrada?: boolean;
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

/** Ordena las motos por similitud al término de búsqueda */
function filtrarYOrdenarMotos(motos: Motocicleta[], termino: string): Motocicleta[] {
  if (!termino.trim()) return motos;
  const t = termino.toLowerCase().trim();

  // Exact / contains match first
  const exactas = motos.filter(m =>
    `${m.marca} ${m.modelo}`.toLowerCase().includes(t) ||
    m.modelo.toLowerCase().includes(t) ||
    m.marca.toLowerCase().includes(t)
  );

  if (exactas.length > 0) return exactas;

  // Fuzzy: calcular distancia normalizada a marca+modelo
  const conDistancia = motos.map(m => {
    const nombre = `${m.marca} ${m.modelo}`.toLowerCase();
    const dist = levenshtein(t, nombre.substring(0, t.length + 4));
    return { moto: m, dist };
  });

  conDistancia.sort((a, b) => a.dist - b.dist);

  // Solo retornar si la distancia es razonable (≤ 4 errores tipográficos)
  return conDistancia.filter(x => x.dist <= 4).map(x => x.moto);
}

export const MotorcycleSelector: React.FC<MotorcycleSelectorProps> = ({
  motocicletas,
  motoSeleccionada,
  onSeleccionarMoto,
  onConsultarIA,
  cargandoIA,
  motoNoEncontrada,
}) => {
  const [busqueda, setBusqueda] = React.useState('');
  const [openDropdown, setOpenDropdown] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const opcionesFiltradas = React.useMemo(
    () => filtrarYOrdenarMotos(motocicletas, busqueda),
    [busqueda, motocicletas]
  );

  // El usuario escribió algo concreto pero no hay coincidencias ni siquiera fuzzy
  const sinCoincidencias = busqueda.trim().length >= 2 && opcionesFiltradas.length === 0;

  const handleSelect = (moto: Motocicleta) => {
    onSeleccionarMoto(moto);
    setBusqueda(`${moto.marca} ${moto.modelo}`);
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

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
        Motocicleta
      </label>

      {/* Input wrapper — la posición del icono es FUERA del input */}
      <div className="relative flex items-center">
        <div className="pointer-events-none absolute left-0 inset-y-0 flex items-center pl-2.5">
          <Bike className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
        </div>
        <input
          type="text"
          style={{ paddingLeft: '2rem', paddingRight: cargandoIA ? '2rem' : '0.75rem' }}
          className="notion-input w-full text-sm font-medium"
          placeholder="Ej: NKD 125, Pulsar NS200, XTZ 150..."
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

      {/* Moto activa seleccionada */}
      {motoSeleccionada && !openDropdown && (
        <div className="mt-2 px-3 py-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-subtle)] flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-center text-[10px] font-bold text-[var(--text-secondary)] shrink-0">
            {motoSeleccionada.marca.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
              {motoSeleccionada.marca} {motoSeleccionada.modelo}
            </div>
            <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-2 mt-0.5">
              <span>{motoSeleccionada.cilindraje} cc</span>
              <span>·</span>
              <span className="text-[var(--text-secondary)] font-medium">
                {motoSeleccionada.consumoKmPorLitro} km/L
              </span>
              <span>·</span>
              <span>Tanque {motoSeleccionada.capacidadTanque} L</span>
            </div>
          </div>
          {motoSeleccionada.fuente === 'ia_gemini' && (
            <span className="text-[10px] font-medium text-[var(--text-muted)] border border-[var(--border-color)] px-1.5 py-0.5 rounded-md shrink-0">
              Búsqueda
            </span>
          )}
        </div>
      )}

      {/* Moto no encontrada (resultado de búsqueda fallida) */}
      {motoNoEncontrada && !openDropdown && (
        <div className="mt-2 px-3 py-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-subtle)] flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          <p className="text-xs text-[var(--text-secondary)]">
            Moto no encontrada. Verifica el nombre e intenta de nuevo.
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
              {opcionesFiltradas.map((moto) => (
                <button
                  key={moto.id}
                  type="button"
                  className="w-full text-left px-3 py-2.5 hover:bg-[var(--bg-subtle)] transition-colors flex items-center justify-between border-b border-[var(--border-color)] last:border-b-0"
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(moto); }}
                >
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">
                      {moto.marca} {moto.modelo}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {moto.cilindraje} cc · {moto.consumoKmPorLitro} km/L
                    </div>
                  </div>
                  {motoSeleccionada?.id === moto.id && (
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
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando moto...</>
                ) : (
                  <><Search className="w-3.5 h-3.5" /> Buscar moto</>
                )}
              </button>
            </div>
          ) : (
            <div className="px-3 py-2.5 text-xs text-[var(--text-muted)]">
              Escribe el nombre de tu moto
            </div>
          )}
        </div>
      )}
    </div>
  );
};
