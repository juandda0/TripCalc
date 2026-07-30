import type { Motocicleta, ParametrosConsulta, ResultadoCalculo, ConfiguracionUsuario, RentabilidadNivel } from '../types/tripcalc';
import type { ContextoTrafico } from '../services/trafficService';
import { calcularContextoTrafico } from '../services/trafficService';

export const CONFIGURACION_DEFECTO: ConfiguracionUsuario = {
  precioCombustiblePorLitro: 9800,
  costoDesgastePorKm: 150,
  margenGananciaDeseadoPct: 40,
  moneda: 'COP'
};

/**
 * Tarifa base mínima por arranque del servicio (independiente de la distancia).
 * Equivale al mínimo de arranque para mototaxi.
 */
const TARIFA_BASE_ARRANQUE_COP = 2500;

/**
 * Factor de mercado para mototaxismo de pasajeros.
 * Es menor que el de domicilios/mensajería (que tiene tiempos de espera, empaque, etc).
 * Calibrado a 1.5x para ajustarse a las tarifas del mundo real.
 */
const FACTOR_MERCADO = 1.5;

export function calcularRentabilidadCarrera(
  params: ParametrosConsulta,
  moto: Motocicleta,
  config: ConfiguracionUsuario = CONFIGURACION_DEFECTO,
  contextoPasado?: ContextoTrafico
): ResultadoCalculo {
  const { origen, destino, tipoTrayecto, kilometrosBase, kilometrosExtra } = params;

  // ── 1. Distancia total según tipo de trayecto ─────────────────────────────
  let distanciaRecorridoPrincipal = kilometrosBase;
  if (tipoTrayecto === 'ida_y_regreso') {
    distanciaRecorridoPrincipal = kilometrosBase * 2;
  } else if (tipoTrayecto === 'regreso_libre') {
    distanciaRecorridoPrincipal = kilometrosBase * 1.5;
  }
  const distanciaUnSentidoKm = kilometrosBase;
  const distanciaTotalKm = distanciaRecorridoPrincipal + kilometrosExtra;

  // ── 2. Contexto de tráfico ────────────────────────────────────────────────
  const trafico = contextoPasado ?? calcularContextoTrafico();

  // La distancia "efectiva" que siente la moto en tráfico:
  const factorConsumoTrafico = 1 + (trafico.factor - 1) * 0.4; // Ajuste suave de tráfico para mototaxi
  const distanciaEfectiva = distanciaTotalKm * factorConsumoTrafico;

  // ── 3. Costos operativos ──────────────────────────────────────────────────
  const consumoKmL = moto.consumoKmPorLitro > 0 ? moto.consumoKmPorLitro : 35;
  const litrosConsumidos = Number((distanciaEfectiva / consumoKmL).toFixed(2));
  const costoCombustible = Math.round(litrosConsumidos * config.precioCombustiblePorLitro);
  const costoDesgaste = Math.round(distanciaTotalKm * config.costoDesgastePorKm);
  const costoTotalOperativo = costoCombustible + costoDesgaste;

  // ── 4. Tarifa de mercado ──────────────────────────────────────────────────
  const ratioCOP = config.precioCombustiblePorLitro / 9800;
  const tarifaBaseArranque = Math.round(TARIFA_BASE_ARRANQUE_COP * ratioCOP);

  // Costo variable por km (combustible + desgaste) escalado con mercado de pasajeros
  const costoPorKmMercado = (costoTotalOperativo / distanciaTotalKm) * FACTOR_MERCADO;

  // Tarifa sin tráfico = base + variable lineal
  const tarifaSinTrafico = tarifaBaseArranque + Math.round(costoPorKmMercado * distanciaTotalKm);

  // Tarifa con tráfico aplicado como recargo porcentual moderado
  const recargoTrafico = (trafico.factor - 1.0) * 0.4;
  
  // Redondear tarifas a múltiplos de $500 para mayor realismo de uso en calle
  const tarifaMinima = Math.round((tarifaSinTrafico * (1 + recargoTrafico)) / 500) * 500;

  // Tarifa recomendada
  const tarifaRecomendada = Math.round((tarifaMinima * 1.1) / 500) * 500;

  // Tarifa ideal
  const factorGanancia = 1 + config.margenGananciaDeseadoPct / 100;
  const tarifaIdeal = Math.round((tarifaMinima * factorGanancia) / 500) * 500;

  // ── 5. Rentabilidad ───────────────────────────────────────────────────────
  const gananciaEstimada = tarifaRecomendada - costoTotalOperativo;
  const porcentajeRentabilidad = costoTotalOperativo > 0
    ? Math.round((gananciaEstimada / costoTotalOperativo) * 100)
    : 0;

  let nivelRentabilidad: RentabilidadNivel = 'rentable';
  if (gananciaEstimada <= 0) {
    nivelRentabilidad = 'no_recomendable';
  } else if (porcentajeRentabilidad < 20) {
    nivelRentabilidad = 'poco_rentable';
  } else if (porcentajeRentabilidad < 45) {
    nivelRentabilidad = 'rentable';
  } else {
    nivelRentabilidad = 'muy_rentable';
  }

  // ── 6. Fórmulas para el desglose ──────────────────────────────────────────
  let formulaDistancia = `${kilometrosBase.toFixed(1)} km`;
  if (tipoTrayecto === 'ida_y_regreso') {
    formulaDistancia = `${kilometrosBase.toFixed(1)} km × 2 = ${(kilometrosBase * 2).toFixed(1)} km (ida y regreso)`;
  } else if (tipoTrayecto === 'regreso_libre') {
    formulaDistancia = `${kilometrosBase.toFixed(1)} km + 50% retorno = ${(kilometrosBase * 1.5).toFixed(1)} km`;
  }
  if (kilometrosExtra > 0) formulaDistancia += ` + ${kilometrosExtra} km extra`;

  const formulaConsumo =
    `${distanciaEfectiva.toFixed(1)} km efectivos (×${factorConsumoTrafico.toFixed(2)} tráfico) ÷ ${consumoKmL} km/L = ${litrosConsumidos} L`;
  const formulaDesgaste =
    `${distanciaTotalKm.toFixed(1)} km × $${config.costoDesgastePorKm}/km (mant., llantas, aceite)`;

  return {
    id: `calc-${Date.now()}`,
    fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    moto,
    origen,
    destino,
    tipoTrayecto,
    distanciaUnSentidoKm,
    distanciaTotalKm,
    kilometrosExtra,
    litrosConsumidos,
    precioCombustible: config.precioCombustiblePorLitro,
    costoCombustible,
    costoDesgaste,
    costoTotalOperativo,
    tarifaMinima,
    tarifaRecomendada,
    tarifaIdeal,
    gananciaEstimada,
    porcentajeRentabilidad,
    nivelRentabilidad,
    trafico,
    desglose: {
      formulaDistancia,
      formulaConsumo,
      formulaDesgaste,
    },
  };
}
