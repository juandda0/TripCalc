/**
 * Servicio de moneda — detecta moneda y formato según código de país (ISO 3166-1 alpha-2).
 * Compatible con todos los países de América Latina + otros.
 */

export interface MonedaInfo {
  /** Código ISO 4217 (ej: COP, USD, MXN) */
  codigo: string;
  /** Símbolo corto (ej: $, S/, Bs) */
  simbolo: string;
  /** Nombre completo */
  nombre: string;
  /** Locale para Intl.NumberFormat (ej: es-CO) */
  locale: string;
  /** Precio de combustible por litro, en la moneda local (estimado promedio 2025) */
  precioCombustibleEstimado: number;
}

const MONEDAS_POR_PAIS: Record<string, MonedaInfo> = {
  co: { codigo: 'COP', simbolo: '$', nombre: 'Peso colombiano', locale: 'es-CO', precioCombustibleEstimado: 9800 },
  mx: { codigo: 'MXN', simbolo: '$', nombre: 'Peso mexicano',   locale: 'es-MX', precioCombustibleEstimado: 22 },
  us: { codigo: 'USD', simbolo: '$', nombre: 'Dólar americano', locale: 'en-US', precioCombustibleEstimado: 1.0 },
  ar: { codigo: 'ARS', simbolo: '$', nombre: 'Peso argentino',  locale: 'es-AR', precioCombustibleEstimado: 1100 },
  cl: { codigo: 'CLP', simbolo: '$', nombre: 'Peso chileno',    locale: 'es-CL', precioCombustibleEstimado: 1100 },
  pe: { codigo: 'PEN', simbolo: 'S/', nombre: 'Sol peruano',    locale: 'es-PE', precioCombustibleEstimado: 15 },
  ec: { codigo: 'USD', simbolo: '$', nombre: 'Dólar (Ecuador)', locale: 'es-EC', precioCombustibleEstimado: 2.0 },
  bo: { codigo: 'BOB', simbolo: 'Bs', nombre: 'Boliviano',      locale: 'es-BO', precioCombustibleEstimado: 3.7 },
  ve: { codigo: 'VES', simbolo: 'Bs', nombre: 'Bolívar soberano',locale:'es-VE', precioCombustibleEstimado: 0.5 },
  uy: { codigo: 'UYU', simbolo: '$', nombre: 'Peso uruguayo',   locale: 'es-UY', precioCombustibleEstimado: 80 },
  py: { codigo: 'PYG', simbolo: '₲', nombre: 'Guaraní paraguayo',locale:'es-PY', precioCombustibleEstimado: 8000 },
  pa: { codigo: 'USD', simbolo: '$', nombre: 'Dólar (Panamá)',  locale: 'es-PA', precioCombustibleEstimado: 1.1 },
  cr: { codigo: 'CRC', simbolo: '₡', nombre: 'Colón costarricense',locale:'es-CR', precioCombustibleEstimado: 1050 },
  gt: { codigo: 'GTQ', simbolo: 'Q', nombre: 'Quetzal guatemalteco',locale:'es-GT', precioCombustibleEstimado: 35 },
  sv: { codigo: 'USD', simbolo: '$', nombre: 'Dólar (El Salvador)',locale:'es-SV', precioCombustibleEstimado: 1.1 },
  hn: { codigo: 'HNL', simbolo: 'L', nombre: 'Lempira hondureño',locale:'es-HN', precioCombustibleEstimado: 40 },
  ni: { codigo: 'NIO', simbolo: 'C$', nombre: 'Córdoba nicaragüense',locale:'es-NI', precioCombustibleEstimado: 40 },
  do: { codigo: 'DOP', simbolo: '$', nombre: 'Peso dominicano', locale: 'es-DO', precioCombustibleEstimado: 270 },
  cu: { codigo: 'CUP', simbolo: '$', nombre: 'Peso cubano',     locale: 'es-CU', precioCombustibleEstimado: 30 },
  br: { codigo: 'BRL', simbolo: 'R$', nombre: 'Real brasileño', locale: 'pt-BR', precioCombustibleEstimado: 6.0 },
  es: { codigo: 'EUR', simbolo: '€', nombre: 'Euro',            locale: 'es-ES', precioCombustibleEstimado: 1.8 },
};

const MONEDA_DEFECTO: MonedaInfo = {
  codigo: 'USD', simbolo: '$', nombre: 'Dólar', locale: 'en-US',
  precioCombustibleEstimado: 1.5,
};

export function getMonedaPorPais(codigoPais: string): MonedaInfo {
  return MONEDAS_POR_PAIS[codigoPais.toLowerCase()] ?? MONEDA_DEFECTO;
}

/**
 * Formatea un número como moneda según la MonedaInfo dada.
 * Para COP/CLP/ARS/PYG (valores altos) no muestra decimales.
 * Para USD/EUR/etc. muestra 2 decimales.
 */
export function formatearMoneda(valor: number, moneda: MonedaInfo): string {
  const sinDecimals = ['COP', 'CLP', 'ARS', 'PYG', 'VES', 'CRC', 'DOP', 'CUP'];
  const decimales = sinDecimals.includes(moneda.codigo) ? 0 : 2;

  try {
    return new Intl.NumberFormat(moneda.locale, {
      style: 'currency',
      currency: moneda.codigo,
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    }).format(valor);
  } catch {
    // Fallback si el browser no conoce la moneda
    return `${moneda.simbolo}${valor.toLocaleString(moneda.locale, { maximumFractionDigits: decimales })}`;
  }
}
