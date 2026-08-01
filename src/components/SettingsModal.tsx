import React from 'react';
import type { MonedaInfo } from '../services/currencyService';
import { Settings, X } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  precioCombustible: number;
  moneda: MonedaInfo;
  onSave: (precio: number) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  precioCombustible,
  moneda,
  onSave,
}) => {
  const [precio, setPrecio] = React.useState(precioCombustible.toString());

  React.useEffect(() => {
    setPrecio(precioCombustible.toString());
  }, [precioCombustible, isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(parseFloat(precio) || 0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="notion-card w-full max-w-md p-5 space-y-4 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[var(--accent)]" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Configuración de combustible
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
              Precio de gasolina por litro ({moneda.codigo})
            </label>
            <input
              type="number"
              className="notion-input w-full"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder="Ej. 9800"
            />
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Se usa para calcular cuánto gastas en gasolina por trayecto.
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
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
