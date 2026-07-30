/**
 * Servicio de tráfico basado en tiempo — estimación inteligente sin API externa.
 *
 * Metodología:
 * - Se usan patrones de tráfico reales de ciudades latinoamericanas
 * - El factor se aplica como multiplicador sobre la distancia efectiva
 *   (más tráfico = más tiempo en carretera = más combustible quemado + valor del tiempo)
 * - Calibrado para reflejar precios reales de InDrive/Maxim en Colombia
 *
 * Ejemplo de referencia:
 *   Torres de Caracolí → Universidad de Córdoba (Montería), ~4.5 km, 7 PM miércoles → ~9,000 COP
 */

export type NivelTrafico = 'muy_alto' | 'alto' | 'moderado' | 'bajo' | 'muy_bajo';

export interface ContextoTrafico {
  factor: number;          // Multiplicador sobre costo base (1.0 = sin efecto)
  nivelTrafico: NivelTrafico;
  descripcion: string;     // Descripción legible para el usuario
  hora: number;            // Hora actual (0-23)
  esFinDeSemana: boolean;
}

/**
 * Retorna el contexto de tráfico para el momento actual del día.
 * Los factores están calibrados para ciudades colombianas medianas/grandes
 * pero aplican bien para toda Latinoamérica con ajuste mínimo.
 */
export function calcularContextoTrafico(fecha?: Date): ContextoTrafico {
  const ahora = fecha ?? new Date();
  const hora = ahora.getHours();
  const diaSemana = ahora.getDay(); // 0=domingo, 6=sábado
  const esFinDeSemana = diaSemana === 0 || diaSemana === 6;

  // ── Tabla de factores por hora (días hábiles) ─────────────────────────────
  // Basado en patrones de tráfico real en ciudades latinoamericanas
  const factoresDiaHabil: Record<string, { factor: number; nivel: NivelTrafico; desc: string }> = {
    '0-4':   { factor: 1.00, nivel: 'muy_bajo', desc: 'Madrugada — tráfico muy ligero' },
    '5':     { factor: 1.05, nivel: 'muy_bajo', desc: 'Madrugada temprana' },
    '6':     { factor: 1.15, nivel: 'bajo',     desc: 'Inicio de jornada — tráfico leve' },
    '7':     { factor: 1.35, nivel: 'alto',     desc: 'Hora pico mañana — tráfico intenso' },
    '8':     { factor: 1.40, nivel: 'muy_alto', desc: 'Pico máximo mañana — alta congestión' },
    '9':     { factor: 1.25, nivel: 'alto',     desc: 'Post-pico mañana — tráfico elevado' },
    '10':    { factor: 1.12, nivel: 'moderado', desc: 'Media mañana — tráfico moderado' },
    '11':    { factor: 1.10, nivel: 'moderado', desc: 'Pre-almuerzo — tráfico moderado' },
    '12':    { factor: 1.20, nivel: 'alto',     desc: 'Hora de almuerzo — tráfico elevado' },
    '13':    { factor: 1.18, nivel: 'moderado', desc: 'Salida de almuerzo' },
    '14':    { factor: 1.10, nivel: 'moderado', desc: 'Tarde temprana — flujo normal' },
    '15':    { factor: 1.12, nivel: 'moderado', desc: 'Tarde — tráfico moderado' },
    '16':    { factor: 1.28, nivel: 'alto',     desc: 'Inicio hora pico tarde' },
    '17':    { factor: 1.42, nivel: 'muy_alto', desc: 'Pico máximo tarde — alta congestión' },
    '18':    { factor: 1.45, nivel: 'muy_alto', desc: 'Rush hour tarde — máxima congestión' },
    '19':    { factor: 1.30, nivel: 'alto',     desc: 'Noche temprana — tráfico elevado' },
    '20':    { factor: 1.15, nivel: 'moderado', desc: 'Noche — tráfico moderado' },
    '21':    { factor: 1.08, nivel: 'bajo',     desc: 'Noche — tráfico leve' },
    '22-23': { factor: 1.02, nivel: 'muy_bajo', desc: 'Noche tardía — tráfico mínimo' },
  };

  // ── Tabla fin de semana (30% menos tráfico en horas pico) ────────────────
  const factoresFinDeSemana: Record<string, { factor: number; nivel: NivelTrafico; desc: string }> = {
    '0-7':   { factor: 1.00, nivel: 'muy_bajo', desc: 'Madrugada/mañana fin de semana — libre' },
    '8-9':   { factor: 1.05, nivel: 'muy_bajo', desc: 'Mañana fin de semana — tráfico muy leve' },
    '10-11': { factor: 1.10, nivel: 'bajo',     desc: 'Media mañana fin de semana' },
    '12-14': { factor: 1.20, nivel: 'moderado', desc: 'Mediodía fin de semana — moderado' },
    '15-17': { factor: 1.15, nivel: 'moderado', desc: 'Tarde fin de semana' },
    '18-20': { factor: 1.22, nivel: 'moderado', desc: 'Noche fin de semana — salidas' },
    '21-23': { factor: 1.08, nivel: 'bajo',     desc: 'Noche fin de semana — ligero' },
  };

  const tabla = esFinDeSemana ? factoresFinDeSemana : factoresDiaHabil;

  // Encontrar la entrada que aplica para la hora actual
  let resultado = { factor: 1.10, nivel: 'moderado' as NivelTrafico, desc: 'Tráfico estimado' };
  for (const [rango, val] of Object.entries(tabla)) {
    const partes = rango.split('-').map(Number);
    const desde = partes[0];
    const hasta = partes.length > 1 ? partes[1] : partes[0];
    if (hora >= desde && hora <= hasta) {
      resultado = val;
      break;
    }
  }

  return {
    factor: resultado.factor,
    nivelTrafico: resultado.nivel,
    descripcion: resultado.desc,
    hora,
    esFinDeSemana,
  };
}

/**
 * Convierte el nivel de tráfico a un label corto para mostrar en UI.
 */
export function labelTrafico(nivel: NivelTrafico): string {
  switch (nivel) {
    case 'muy_alto':  return 'Tráfico muy alto';
    case 'alto':      return 'Tráfico alto';
    case 'moderado':  return 'Tráfico moderado';
    case 'bajo':      return 'Tráfico bajo';
    case 'muy_bajo':  return 'Tráfico mínimo';
  }
}

/**
 * Color del indicador de tráfico (para el badge en UI — sin emojis, solo semántica).
 */
export function colorTrafico(nivel: NivelTrafico): string {
  switch (nivel) {
    case 'muy_alto':  return '#ef4444'; // red
    case 'alto':      return '#f97316'; // orange
    case 'moderado':  return '#eab308'; // yellow
    case 'bajo':      return '#22c55e'; // green
    case 'muy_bajo':  return '#3b82f6'; // blue
  }
}
