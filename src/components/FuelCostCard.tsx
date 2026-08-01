import React from 'react';
import type { Vehiculo } from '../types/tripcalc';
import type { MonedaInfo } from '../services/currencyService';
import { formatearMoneda } from '../services/currencyService';
import { calcularConsumoCombustible } from '../utils/fuelCost';
import { Droplets, Wallet, Fuel } from 'lucide-react';

interface FuelCostCardProps {
  distanciaKm: number;
  vehiculo: Vehiculo;
  precioCombustible: number;
  moneda: MonedaInfo;
}

export const FuelCostCard: React.FC<FuelCostCardProps> = ({
  distanciaKm,
  vehiculo,
  precioCombustible,
  moneda,
}) => {
  const { litros, costo } = calcularConsumoCombustible(
    distanciaKm,
    vehiculo.consumoKmPorLitro,
    precioCombustible
  );

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] overflow-hidden">
      <div className="px-3 pt-2.5 pb-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
          Gasto estimado en gasolina
        </p>
      </div>
      <div className="grid grid-cols-2 divide-x divide-[var(--border-color)] border-t border-[var(--border-color)]">
        <div className="px-3 py-3 flex items-center gap-2.5">
          <Droplets className="w-5 h-5 text-[var(--text-secondary)] shrink-0" />
          <div>
            <div className="text-lg font-black text-[var(--text-primary)] leading-none">
              {litros} L
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
              de combustible
            </div>
          </div>
        </div>
        <div className="px-3 py-3 flex items-center gap-2.5">
          <Wallet className="w-5 h-5 text-[var(--accent)] shrink-0" />
          <div>
            <div className="text-lg font-black text-[var(--accent)] leading-none">
              {formatearMoneda(costo, moneda)}
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
              en gasolina
            </div>
          </div>
        </div>
      </div>
      <div className="px-3 py-2 border-t border-[var(--border-color)] bg-[var(--bg-subtle)]">
        <p className="text-[11px] text-[var(--text-muted)]">
          {formatearMoneda(precioCombustible, moneda)}/L
          {' · '}{vehiculo.consumoKmPorLitro} km/L
          {' · '}{distanciaKm.toFixed(1)} km
        </p>
      </div>
      <div className="px-3 py-2 flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] bg-[var(--bg-subtle)] border-t border-[var(--border-color)]">
        <Fuel className="w-3.5 h-3.5 shrink-0" />
        Estimación según rendimiento de {vehiculo.marca} {vehiculo.modelo}
      </div>
    </div>
  );
};
