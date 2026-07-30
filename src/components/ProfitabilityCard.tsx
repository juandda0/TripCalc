import React, { useState } from 'react';
import type { ResultadoCalculo } from '../types/tripcalc';
import type { MonedaInfo } from '../services/currencyService';
import { formatearMoneda } from '../services/currencyService';
import { colorTrafico, labelTrafico } from '../services/trafficService';
import {
  Fuel, Wrench, TrendingUp, ChevronDown, ChevronUp,
  Clock, Route, Droplets, BadgeCheck, Info,
  CheckCircle, AlertTriangle, XCircle, Circle,
  Activity,
} from 'lucide-react';

interface ProfitabilityCardProps {
  resultado: ResultadoCalculo;
  duracionMin?: number;
  moneda: MonedaInfo;
}

const RentabilidadIcon = ({ nivel }: { nivel: ResultadoCalculo['nivelRentabilidad'] }) => {
  switch (nivel) {
    case 'muy_rentable':  return <CheckCircle  className="w-3.5 h-3.5" style={{ color: '#16a34a' }} />;
    case 'rentable':      return <CheckCircle  className="w-3.5 h-3.5" style={{ color: '#ca8a04' }} />;
    case 'poco_rentable': return <AlertTriangle className="w-3.5 h-3.5" style={{ color: '#ea580c' }} />;
    default:              return <XCircle      className="w-3.5 h-3.5" style={{ color: '#dc2626' }} />;
  }
};

const labelRentabilidad: Record<ResultadoCalculo['nivelRentabilidad'], string> = {
  muy_rentable:    'Muy rentable',
  rentable:        'Rentable',
  poco_rentable:   'Poco rentable',
  no_recomendable: 'No recomendable',
};

export const ProfitabilityCard: React.FC<ProfitabilityCardProps> = ({
  resultado,
  duracionMin,
  moneda,
}) => {
  const [mostrarDesglose, setMostrarDesglose] = useState(false);
  const fmt = (n: number) => formatearMoneda(n, moneda);
  const { trafico } = resultado;
  const colorT = colorTrafico(trafico.nivelTrafico);

  return (
    <div className="space-y-2.5">

      {/* ══ BLOQUE 1: Tráfico actual ══════════════════════════════════════════ */}
      <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-subtle)]">
        <Activity className="w-3.5 h-3.5 shrink-0" style={{ color: colorT }} />
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-[var(--text-primary)]">
            {labelTrafico(trafico.nivelTrafico)}
          </span>
          <span className="text-[11px] text-[var(--text-muted)] ml-1.5">
            {trafico.descripcion}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--text-muted)] shrink-0">
          <span className="flex items-center gap-0.5">
            <Route className="w-3 h-3" />{resultado.distanciaTotalKm.toFixed(1)} km
          </span>
          {duracionMin && (
            <span className="flex items-center gap-0.5">
              <Clock className="w-3 h-3" />{duracionMin} min
            </span>
          )}
        </div>
      </div>

      {/* ══ BLOQUE 2: GASOLINA (lo más importante) ═══════════════════════════ */}
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] overflow-hidden">
        <div className="px-3 pt-2.5 pb-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
            Gasto estimado en gasolina
          </p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-[var(--border-color)] border-t border-[var(--border-color)]">
          {/* Litros */}
          <div className="px-3 py-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-subtle)] flex items-center justify-center shrink-0">
              <Droplets className="w-4 h-4 text-[var(--text-secondary)]" />
            </div>
            <div>
              <div className="text-lg font-black text-[var(--text-primary)] leading-none">
                {resultado.litrosConsumidos} L
              </div>
              <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                de combustible
              </div>
            </div>
          </div>
          {/* Dinero */}
          <div className="px-3 py-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-subtle)] flex items-center justify-center shrink-0">
              <Fuel className="w-4 h-4 text-[var(--text-secondary)]" />
            </div>
            <div>
              <div className="text-lg font-black text-[var(--text-primary)] leading-none">
                {fmt(resultado.costoCombustible)}
              </div>
              <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                en dinero
              </div>
            </div>
          </div>
        </div>
        <div className="px-3 py-2 border-t border-[var(--border-color)] bg-[var(--bg-subtle)]">
          <p className="text-[11px] text-[var(--text-muted)]">
            {fmt(resultado.precioCombustible)}/L
            {' · '}{resultado.moto.consumoKmPorLitro} km/L
            {trafico.factor > 1.05 && (
              <span className="ml-1 text-[var(--text-muted)]">
                (+{Math.round((trafico.factor - 1) * 60)}% consumo por tráfico)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* ══ BLOQUE 3: CUÁNTO COBRAR ══════════════════════════════════════════ */}
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] overflow-hidden">
        <div className="px-3 pt-2.5 pb-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
            Tarifa recomendada
          </p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-[var(--border-color)] border-t border-[var(--border-color)]">
          {/* Mínimo */}
          <div className="px-3 py-3 text-center">
            <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
              Mínimo
            </div>
            <div className="text-sm font-bold text-[var(--text-primary)]">
              {fmt(resultado.tarifaMinima)}
            </div>
            <div className="text-[9px] text-[var(--text-muted)] mt-0.5">cubre costos</div>
          </div>
          {/* Cobrar — destacado */}
          <div className="px-3 py-3 text-center bg-[var(--accent-subtle)]">
            <div className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider mb-1">
              Cobrar
            </div>
            <div className="text-xl font-black text-[var(--accent)]">
              {fmt(resultado.tarifaRecomendada)}
            </div>
            <div className="text-[9px] text-[var(--text-muted)] mt-0.5">+35% ganancia</div>
          </div>
          {/* Con margen */}
          <div className="px-3 py-3 text-center">
            <div className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
              Ideal
            </div>
            <div className="text-sm font-bold text-[var(--text-secondary)]">
              {fmt(resultado.tarifaIdeal)}
            </div>
            <div className="text-[9px] text-[var(--text-muted)] mt-0.5">máx ganancia</div>
          </div>
        </div>
        {trafico.factor > 1.15 && (
          <div className="px-3 py-2 border-t border-[var(--border-color)] bg-[var(--bg-subtle)]">
            <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
              <Circle className="w-2 h-2 shrink-0" style={{ color: colorT, fill: colorT }} />
              Incluye recargo de tráfico ({Math.round((trafico.factor - 1) * 100)}%)
            </p>
          </div>
        )}
      </div>

      {/* ══ BLOQUE 4: Rentabilidad badge compacto ════════════════════════════ */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)]">
        <RentabilidadIcon nivel={resultado.nivelRentabilidad} />
        <span className="text-xs font-semibold text-[var(--text-primary)]">
          {labelRentabilidad[resultado.nivelRentabilidad]}
        </span>
        <span className="text-[11px] text-[var(--text-muted)] flex-1">
          · Ganancia ~{fmt(resultado.gananciaEstimada)} ({resultado.porcentajeRentabilidad}%)
        </span>
      </div>

      {/* ══ BLOQUE 5: Desglose colapsable ════════════════════════════════════ */}
      <div className="rounded-xl border border-[var(--border-color)] overflow-hidden">
        <button
          type="button"
          onClick={() => setMostrarDesglose(!mostrarDesglose)}
          className="w-full flex items-center justify-between px-3 py-2.5 text-[11px] font-medium text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" /> Desglose de costos
          </span>
          {mostrarDesglose
            ? <ChevronUp className="w-3.5 h-3.5" />
            : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {mostrarDesglose && (
          <div className="border-t border-[var(--border-color)] divide-y divide-[var(--border-color)]">
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <Fuel className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Combustible
              </span>
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                {fmt(resultado.costoCombustible)} ({resultado.litrosConsumidos} L)
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <Wrench className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Desgaste / Mant.
              </span>
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                {fmt(resultado.costoDesgaste)}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2.5 bg-[var(--bg-subtle)]">
              <span className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                <BadgeCheck className="w-3.5 h-3.5 text-[var(--accent)]" /> Costo operativo total
              </span>
              <span className="text-xs font-bold text-[var(--accent)]">
                {fmt(resultado.costoTotalOperativo)}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <TrendingUp className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Ganancia estimada
              </span>
              <span className={`text-xs font-bold ${resultado.gananciaEstimada >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600'}`}>
                {fmt(resultado.gananciaEstimada)}
              </span>
            </div>
            <div className="px-3 py-2.5 bg-[var(--bg-subtle)] space-y-1">
              <p className="text-[10px] text-[var(--text-muted)]">{resultado.desglose.formulaDistancia}</p>
              <p className="text-[10px] text-[var(--text-muted)]">{resultado.desglose.formulaConsumo}</p>
              <p className="text-[10px] text-[var(--text-muted)]">{resultado.desglose.formulaDesgaste}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
