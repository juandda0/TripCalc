import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { LocationResult } from '../services/routeService';
import { buscarUbicacion } from '../services/routeService';
import { MapPin, Search, Loader2, X } from 'lucide-react';

interface LocationSearchProps {
  label: string;
  placeholder: string;
  value: LocationResult | null;
  onSelect: (location: LocationResult) => void;
  onClear: () => void;
  iconColor: string;
  /** Bias coordinates (ciudad actual) para priorizar resultados locales */
  biasLat?: number;
  biasLon?: number;
}

export const LocationSearch: React.FC<LocationSearchProps> = ({
  label,
  placeholder,
  value,
  onSelect,
  onClear,
  iconColor,
  biasLat,
  biasLon,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.trim().length < 3) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      const res = await buscarUbicacion(text, 'co', biasLat, biasLon);
      setResults(res);
      setShowDropdown(res.length > 0);
      setIsSearching(false);
    }, 400);
  }, [biasLat, biasLon]);

  const handleSelect = (loc: LocationResult) => {
    onSelect(loc);
    setQuery(loc.name);
    setShowDropdown(false);
    setResults([]);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    onClear();
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Sincronizar nombre cuando value cambia externamente (ej. drag del marcador)
  useEffect(() => {
    if (value) {
      setQuery(value.name);
    } else {
      setQuery('');
    }
  }, [value]);

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
        {label}
      </label>
      <div className="relative flex items-center">
        <MapPin
          className="absolute left-2.5 w-4 h-4 shrink-0"
          style={{ color: iconColor }}
        />
        <input
          type="text"
          style={{ paddingLeft: '2rem', paddingRight: '2rem' }}
          className="notion-input w-full text-sm font-medium"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
        />
        {isSearching && (
          <Loader2 className="absolute right-2.5 w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
        )}
        {!isSearching && value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-[9999] mt-1 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] shadow-2xl overflow-hidden overflow-y-auto"
          style={{ maxHeight: '200px' }}>
          {results.map((loc, i) => (
            <button
              key={`${loc.lat}-${loc.lon}-${i}`}
              type="button"
              className="w-full text-left px-3 py-2.5 hover:bg-[var(--bg-subtle)] transition-colors flex items-start gap-2.5 border-b border-[var(--border-color)] last:border-b-0"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(loc); }}
            >
              <Search className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[var(--text-muted)]" />
              <div className="min-w-0">
                <div className="text-sm font-medium text-[var(--text-primary)] truncate">
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
    </div>
  );
};
