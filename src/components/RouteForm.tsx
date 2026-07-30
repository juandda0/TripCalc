import React from 'react';
import type { TipoTrayecto } from '../types/tripcalc';
import { ArrowRight, RefreshCw, Undo2 } from 'lucide-react';

interface RouteFormProps {
  origen: string;
  setOrigen: (v: string) => void;
  destino: string;
  setDestino: (v: string) => void;
  tipoTrayecto: TipoTrayecto;
  setTipoTrayecto: (t: TipoTrayecto) => void;
  kilometrosBase: number;
  setKilometrosBase: (k: number) => void;
  kilometrosExtra: number;
  setKilometrosExtra: (k: number) => void;
  tarifaOfrecida: string;
  setTarifaOfrecida: (t: string) => void;
}

export const RouteForm: React.FC<RouteFormProps> = ({
  origen,
  setOrigen,
  destino,
  setDestino,
  tipoTrayecto,
  setTipoTrayecto,
  kilometrosBase,
  setKilometrosBase,
  kilometrosExtra,
  setKilometrosExtra,
  tarifaOfrecida,
  setTarifaOfrecida
}) => {
  return (
    <div className="space-y-4">
      {/* Puntos de Origen y Destino */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
          2. Ruta del Recorrido
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <div>
            <input
              type="text"
              className="notion-input w-full"
              placeholder="Origen (Ej. Centro, Calle 45...)"
              value={origen}
              onChange={(e) => setOrigen(e.target.value)}
            />
          </div>
          <div>
            <input
              type="text"
              className="notion-input w-full"
              placeholder="Destino (Ej. Poblado, Cra 80...)"
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Tipo de Trayecto */}
      <div>
        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
          Tipo de Recorrido
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setTipoTrayecto('solo_ida')}
            className={`p-2.5 rounded-lg border text-left flex flex-col items-center sm:items-start transition-all ${
              tipoTrayecto === 'solo_ida'
                ? 'border-[var(--accent)] bg-blue-500/10 text-[var(--accent)] font-semibold'
                : 'border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center gap-1 text-xs font-medium mb-0.5">
              <span>A</span>
              <ArrowRight className="w-3 h-3" />
              <span>B</span>
            </div>
            <span className="text-[11px]">Solo ida</span>
          </button>

          <button
            type="button"
            onClick={() => setTipoTrayecto('ida_y_regreso')}
            className={`p-2.5 rounded-lg border text-left flex flex-col items-center sm:items-start transition-all ${
              tipoTrayecto === 'ida_y_regreso'
                ? 'border-[var(--accent)] bg-blue-500/10 text-[var(--accent)] font-semibold'
                : 'border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center gap-1 text-xs font-medium mb-0.5">
              <span>A</span>
              <RefreshCw className="w-3 h-3" />
              <span>A</span>
            </div>
            <span className="text-[11px]">Ida y regreso</span>
          </button>

          <button
            type="button"
            onClick={() => setTipoTrayecto('regreso_libre')}
            className={`p-2.5 rounded-lg border text-left flex flex-col items-center sm:items-start transition-all ${
              tipoTrayecto === 'regreso_libre'
                ? 'border-[var(--accent)] bg-blue-500/10 text-[var(--accent)] font-semibold'
                : 'border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center gap-1 text-xs font-medium mb-0.5">
              <span>A</span>
              <Undo2 className="w-3 h-3" />
              <span>B~</span>
            </div>
            <span className="text-[11px]">Regreso libre</span>
          </button>
        </div>
      </div>

      {/* Kilometraje y Ajustes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
            Distancia estimada (km)
          </label>
          <div className="relative">
            <input
              type="number"
              min="0.5"
              step="0.5"
              className="notion-input w-full pr-12 font-medium"
              value={kilometrosBase || ''}
              onChange={(e) => setKilometrosBase(parseFloat(e.target.value) || 0)}
            />
            <span className="absolute right-3 top-2.5 text-xs text-[var(--text-muted)]">km</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 flex items-center justify-between">
            <span>Km adicionales (Tráfico/Conjuntos)</span>
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              step="0.5"
              className="notion-input w-full pr-12 font-medium"
              value={kilometrosExtra || ''}
              onChange={(e) => setKilometrosExtra(parseFloat(e.target.value) || 0)}
            />
            <span className="absolute right-3 top-2.5 text-xs text-[var(--text-muted)]">+km</span>
          </div>
        </div>
      </div>

      {/* Tarifa propuesta por cliente / App de Reparto */}
      <div className="pt-1">
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
          Tarifa sugerida por el cliente / cliente propone ($ COP) — Opcional
        </label>
        <div className="relative">
          <input
            type="number"
            step="500"
            className="notion-input w-full font-medium"
            placeholder="Ej. 7000 (para evaluar si te conviene)"
            value={tarifaOfrecida}
            onChange={(e) => setTarifaOfrecida(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};
