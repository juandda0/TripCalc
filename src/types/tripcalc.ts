import type { ContextoTrafico } from '../services/trafficService';

export type TipoTrayecto = 'solo_ida' | 'ida_y_regreso' | 'regreso_libre';

export type RentabilidadNivel = 'muy_rentable' | 'rentable' | 'poco_rentable' | 'no_recomendable';

export interface Motocicleta {
  id: string;
  marca: string;
  modelo: string;
  cilindraje: number;
  tipoCombustible: string;
  consumoKmPorLitro: number;
  capacidadTanque: number;
  autonomia: number;
  fuente: 'local_db' | 'ia_gemini' | 'usuario';
  ultimaActualizacion: string;
}

export interface ConfiguracionUsuario {
  precioCombustiblePorLitro: number;
  costoDesgastePorKm: number;
  margenGananciaDeseadoPct: number;
  moneda: string;
}

export interface ParametrosConsulta {
  motoId: string;
  origen: string;
  destino: string;
  tipoTrayecto: TipoTrayecto;
  kilometrosBase: number;
  kilometrosExtra: number;
}

export interface ResultadoCalculo {
  id: string;
  fecha: string;
  moto: Motocicleta;
  origen: string;
  destino: string;
  tipoTrayecto: TipoTrayecto;
  distanciaUnSentidoKm: number;
  distanciaTotalKm: number;
  kilometrosExtra: number;
  litrosConsumidos: number;
  precioCombustible: number;
  costoCombustible: number;
  costoDesgaste: number;
  costoTotalOperativo: number;
  tarifaMinima: number;
  tarifaRecomendada: number;
  tarifaIdeal: number;
  gananciaEstimada: number;
  porcentajeRentabilidad: number;
  nivelRentabilidad: RentabilidadNivel;
  trafico: ContextoTrafico;
  desglose: {
    formulaDistancia: string;
    formulaConsumo: string;
    formulaDesgaste: string;
  };
}
