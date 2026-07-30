import React from 'react';
import type { ConfiguracionUsuario } from '../types/tripcalc';
import { Settings, X } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ConfiguracionUsuario;
  onSaveConfig: (newConfig: ConfiguracionUsuario) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig
}) => {
  const [precioCombustible, setPrecioCombustible] = React.useState(config.precioCombustiblePorLitro.toString());
  const [costoDesgaste, setCostoDesgaste] = React.useState(config.costoDesgastePorKm.toString());
  const [margenGanancia, setMargenGanancia] = React.useState(config.margenGananciaDeseadoPct.toString());

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      ...config,
      precioCombustiblePorLitro: parseFloat(precioCombustible) || 4200,
      costoDesgastePorKm: parseFloat(costoDesgaste) || 150,
      margenGananciaDeseadoPct: parseFloat(margenGanancia) || 40
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="notion-card w-full max-w-md p-5 space-y-4 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[var(--accent)]" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Configuración de Costos y Rentabilidad
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-[var(--text-primary)] mb-1">
              Precio del Combustible por Litro ($ COP)
            </label>
            <input
              type="number"
              className="notion-input w-full"
              value={precioCombustible}
              onChange={(e) => setPrecioCombustible(e.target.value)}
              placeholder="Ej. 4200"
            />
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              En Colombia, 1 galón ≈ 3.785 litros. (Ej. $16.000/galón ≈ $4.227/Litro).
            </p>
          </div>

          <div>
            <label className="block font-medium text-[var(--text-primary)] mb-1">
              Costo Estimado de Desgaste por Km ($ COP)
            </label>
            <input
              type="number"
              className="notion-input w-full"
              value={costoDesgaste}
              onChange={(e) => setCostoDesgaste(e.target.value)}
              placeholder="Ej. 150"
            />
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Incluye cambio de aceite cada 2.000 km, kit de arrastre, llantas y mantenimiento.
            </p>
          </div>

          <div>
            <label className="block font-medium text-[var(--text-primary)] mb-1">
              Margen de Ganancia Deseado (%)
            </label>
            <input
              type="number"
              className="notion-input w-full"
              value={margenGanancia}
              onChange={(e) => setMargenGanancia(e.target.value)}
              placeholder="Ej. 40"
            />
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Porcentaje adicional sobre tus costos para calcular tu "Tarifa Ideal".
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[var(--border-color)] pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-3.5 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold transition-colors"
            >
              Guardar Configuración
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
