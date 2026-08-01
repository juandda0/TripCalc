export type TipoVehiculo = 'moto' | 'carro';

export interface Vehiculo {
  id: string;
  tipo: TipoVehiculo;
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
