import React, { useState, useCallback } from 'react';
import { buscarUbicacion } from '../services/routeService';
import type { LocationResult } from '../services/routeService';
import { MapPin, Search, Loader2, Navigation, X } from 'lucide-react';

interface CityPickerProps {
  onCitySelected: (city: string, lat: number, lon: number, countryCode?: string) => void;
}

export const CityPicker: React.FC<CityPickerProps> = ({ onCitySelected }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      // Buscar ciudades/municipios — sin bias inicial ya que aún no sabemos dónde estamos
      const res = await buscarUbicacion(text, 'co');
      // Filtrar solo resultados de tipo ciudad/pueblo/municipio cuando sea posible
      setResults(res.slice(0, 5));
      setIsSearching(false);
    }, 350);
  }, []);

  const handleSelect = (loc: LocationResult) => {
    const cityName = loc.name;
    // Try to extract country from displayName (last segment usually has country)
    const parts = loc.displayName.split(',');
    const lastPart = parts[parts.length - 1]?.trim().toLowerCase();
    // Map common country names to codes
    const countryMap: Record<string, string> = {
      'colombia': 'co', 'méxico': 'mx', 'mexico': 'mx', 'argentina': 'ar',
      'chile': 'cl', 'perú': 'pe', 'peru': 'pe', 'ecuador': 'ec',
      'bolivia': 'bo', 'venezuela': 've', 'uruguay': 'uy', 'paraguay': 'py',
      'panamá': 'pa', 'panama': 'pa', 'costa rica': 'cr', 'guatemala': 'gt',
      'el salvador': 'sv', 'honduras': 'hn', 'nicaragua': 'ni',
      'república dominicana': 'do', 'cuba': 'cu', 'brasil': 'br', 'brazil': 'br',
      'españa': 'es', 'spain': 'es', 'united states': 'us', 'estados unidos': 'us',
    };
    const detectedCode = countryMap[lastPart] ?? 'co';
    onCitySelected(cityName, loc.lat, loc.lon, detectedCode);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
      {/* Backdrop blur */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div className="relative w-full sm:max-w-sm mx-auto bg-[var(--bg-surface)] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-[var(--border-color)] overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-6 pb-4">
          {/* Pill handle for mobile */}
          <div className="w-10 h-1 rounded-full bg-[var(--border-color)] mx-auto mb-5 sm:hidden" />

          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-[var(--text-primary)] flex items-center justify-center shrink-0">
              <Navigation className="w-5 h-5 text-[var(--bg-surface)]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)] leading-tight">
                ¿En qué ciudad estás?
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Para priorizar resultados cerca de ti
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-5 pb-2">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-[var(--text-muted)]" />
            <input
              autoFocus
              type="text"
              className="notion-input pl-9 pr-8 text-sm font-medium"
              placeholder="Ej. Medellín, Bogotá, Cali..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
            />
            {isSearching && (
              <Loader2 className="absolute right-3 w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
            )}
            {!isSearching && query && (
              <button
                type="button"
                onClick={() => { setQuery(''); setResults([]); }}
                className="absolute right-3 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="px-5 pb-2 max-h-52 overflow-y-auto">
            {results.map((loc, i) => (
              <button
                key={`${loc.lat}-${loc.lon}-${i}`}
                type="button"
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[var(--bg-subtle)] transition-colors flex items-start gap-2.5 mb-0.5"
                onClick={() => handleSelect(loc)}
              >
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-[var(--accent)]" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    {loc.name}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] truncate">
                    {loc.displayName}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Ciudades populares */}
        {results.length === 0 && query.length < 2 && (
          <div className="px-5 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Ciudades populares
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { name: 'Medellín', lat: 6.2442, lon: -75.5812, code: 'co' },
                { name: 'Bogotá', lat: 4.7110, lon: -74.0721, code: 'co' },
                { name: 'Cali', lat: 3.4516, lon: -76.5320, code: 'co' },
                { name: 'Ciudad de México', lat: 19.4326, lon: -99.1332, code: 'mx' },
                { name: 'Lima', lat: -12.0464, lon: -77.0428, code: 'pe' },
                { name: 'Buenos Aires', lat: -34.6037, lon: -58.3816, code: 'ar' },
              ].map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => onCitySelected(c.name, c.lat, c.lon, (c as any).code)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] hover:border-[var(--accent)] hover:bg-blue-500/5 transition-all text-sm font-medium text-[var(--text-primary)]"
                >
                  <MapPin className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="h-5" />
      </div>
    </div>
  );
};
