export interface ResultadoConsumo {
  litros: number;
  costo: number;
}

export function calcularConsumoCombustible(
  distanciaKm: number,
  consumoKmPorLitro: number,
  precioPorLitro: number
): ResultadoConsumo {
  if (distanciaKm <= 0 || consumoKmPorLitro <= 0) {
    return { litros: 0, costo: 0 };
  }
  const litros = Number((distanciaKm / consumoKmPorLitro).toFixed(2));
  const costo = Math.round(litros * precioPorLitro);
  return { litros, costo };
}
