import type { Vehiculo } from '../types/tripcalc';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = import.meta.env.VITE_GROQ_API_URL;

export const VEHICULOS_LOCAL_DB: Vehiculo[] = [
  // --- Motos ---
  {
    id: 'nkd-125',
    tipo: 'moto',
    marca: 'AKT',
    modelo: 'NKD 125',
    cilindraje: 124,
    tipoCombustible: 'Corriente',
    consumoKmPorLitro: 38,
    capacidadTanque: 9.8,
    autonomia: 370,
    fuente: 'local_db',
    ultimaActualizacion: '2026-01-10'
  },
  {
    id: 'pulsar-ns200',
    tipo: 'moto',
    marca: 'Bajaj',
    modelo: 'Pulsar NS200',
    cilindraje: 199.5,
    tipoCombustible: 'Extra / Corriente',
    consumoKmPorLitro: 32,
    capacidadTanque: 12,
    autonomia: 384,
    fuente: 'local_db',
    ultimaActualizacion: '2026-01-15'
  },
  {
    id: 'xtz-150',
    tipo: 'moto',
    marca: 'Yamaha',
    modelo: 'XTZ 150',
    cilindraje: 149,
    tipoCombustible: 'Corriente',
    consumoKmPorLitro: 40,
    capacidadTanque: 12,
    autonomia: 480,
    fuente: 'local_db',
    ultimaActualizacion: '2026-02-01'
  },
  {
    id: 'boxer-ct100',
    tipo: 'moto',
    marca: 'Bajaj',
    modelo: 'Boxer CT100',
    cilindraje: 102,
    tipoCombustible: 'Corriente',
    consumoKmPorLitro: 52,
    capacidadTanque: 10.5,
    autonomia: 546,
    fuente: 'local_db',
    ultimaActualizacion: '2026-01-05'
  },
  {
    id: 'agility-125',
    tipo: 'moto',
    marca: 'Kymco',
    modelo: 'Agility Go 125',
    cilindraje: 125,
    tipoCombustible: 'Corriente',
    consumoKmPorLitro: 34,
    capacidadTanque: 5,
    autonomia: 170,
    fuente: 'local_db',
    ultimaActualizacion: '2026-02-10'
  },
  {
    id: 'gn-125',
    tipo: 'moto',
    marca: 'Suzuki',
    modelo: 'GN 125',
    cilindraje: 124,
    tipoCombustible: 'Corriente',
    consumoKmPorLitro: 42,
    capacidadTanque: 10.3,
    autonomia: 430,
    fuente: 'local_db',
    ultimaActualizacion: '2026-02-12'
  },
  {
    id: 'nmax-155',
    tipo: 'moto',
    marca: 'Yamaha',
    modelo: 'NMAX 155',
    cilindraje: 155,
    tipoCombustible: 'Corriente / Extra',
    consumoKmPorLitro: 36,
    capacidadTanque: 7.1,
    autonomia: 255,
    fuente: 'local_db',
    ultimaActualizacion: '2026-02-20'
  },
  // --- Carros ---
  {
    id: 'chevrolet-spark',
    tipo: 'carro',
    marca: 'Chevrolet',
    modelo: 'Spark GT',
    cilindraje: 1206,
    tipoCombustible: 'Corriente',
    consumoKmPorLitro: 16,
    capacidadTanque: 35,
    autonomia: 560,
    fuente: 'local_db',
    ultimaActualizacion: '2026-03-01'
  },
  {
    id: 'renault-logan',
    tipo: 'carro',
    marca: 'Renault',
    modelo: 'Logan',
    cilindraje: 1598,
    tipoCombustible: 'Corriente',
    consumoKmPorLitro: 14,
    capacidadTanque: 50,
    autonomia: 700,
    fuente: 'local_db',
    ultimaActualizacion: '2026-03-05'
  },
  {
    id: 'mazda-3',
    tipo: 'carro',
    marca: 'Mazda',
    modelo: 'Mazda 3',
    cilindraje: 1998,
    tipoCombustible: 'Extra / Corriente',
    consumoKmPorLitro: 12,
    capacidadTanque: 51,
    autonomia: 612,
    fuente: 'local_db',
    ultimaActualizacion: '2026-03-10'
  },
  {
    id: 'kia-picanto',
    tipo: 'carro',
    marca: 'Kia',
    modelo: 'Picanto',
    cilindraje: 998,
    tipoCombustible: 'Corriente',
    consumoKmPorLitro: 18,
    capacidadTanque: 35,
    autonomia: 630,
    fuente: 'local_db',
    ultimaActualizacion: '2026-03-12'
  }
];

/**
 * Consulta especificaciones reales de vehículos (motos y carros) usando Groq (Llama 3).
 * Si la API falla, usa el fallback heurístico.
 */
export async function consultarEspecificacionesConIA(busqueda: string): Promise<Vehiculo> {
  const slug = busqueda.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');

  const prompt = `Eres un experto en vehículos (motocicletas y automóviles/carros). El usuario busca especificaciones de: "${busqueda}".

Si lo que escribe el usuario NO es un vehículo (motocicleta o automóvil/carro) o no tiene sentido como tal, responde ÚNICAMENTE con:
{"error": "no_encontrado"}

De lo contrario, responde ÚNICAMENTE con un JSON válido con este formato exacto:
{
  "tipo": "moto" o "carro",
  "marca": "string",
  "modelo": "string",
  "cilindraje": number,
  "tipoCombustible": "string",
  "consumoKmPorLitro": number,
  "capacidadTanque": number,
  "autonomia": number
}

Reglas:
- tipo: "moto" para motocicletas/scooters, "carro" para automóviles, suvs o camionetas
- cilindraje: en cc (ej. 150 para moto, 1600 para carro, 1200 para Spark, etc.)
- consumoKmPorLitro: rendimiento real promedio en km/litro (las motos suelen hacer entre 25-55 km/L; los carros suelen hacer entre 9-20 km/L)
- autonomia = capacidadTanque * consumoKmPorLitro
- tipoCombustible: "Corriente", "Extra", "Diesel" o "Gas"`;

  try {
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    if (!res.ok) throw new Error(`Groq error: ${res.status}`);
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? '';

    // Extraer JSON de la respuesta
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const vehiculoData = JSON.parse(jsonMatch[0]);

    if (vehiculoData.error === 'no_encontrado') {
      throw new Error('VEHICULO_NO_ENCONTRADO');
    }

    const esCarro = vehiculoData.tipo === 'carro';

    return {
      id: `ia-${slug}-${Date.now()}`,
      tipo: vehiculoData.tipo ?? 'moto',
      marca: vehiculoData.marca ?? 'Desconocida',
      modelo: vehiculoData.modelo ?? busqueda.toUpperCase(),
      cilindraje: Number(vehiculoData.cilindraje) || (esCarro ? 1600 : 150),
      tipoCombustible: vehiculoData.tipoCombustible ?? 'Corriente',
      consumoKmPorLitro: Number(vehiculoData.consumoKmPorLitro) || (esCarro ? 13 : 35),
      capacidadTanque: Number(vehiculoData.capacidadTanque) || (esCarro ? 45 : 10),
      autonomia: Number(vehiculoData.autonomia) || (esCarro ? 585 : 350),
      fuente: 'ia_gemini',
      ultimaActualizacion: new Date().toISOString().split('T')[0],
    };
  } catch (err) {
    if (err instanceof Error && err.message === 'VEHICULO_NO_ENCONTRADO') {
      throw err;
    }
    console.warn('Groq IA falló, usando heurística:', err);
    // Verificación básica
    const esRarooInvalido = !/honda|yamaha|suzuki|kawasaki|bajaj|akt|hero|pulsar|boxer|nmax|kymco|gn|xtz|nkd|chevrolet|renault|mazda|kia|hyundai|toyota|nissan|ford|spark|logan|picanto|corolla|sandero|carro|moto/i.test(busqueda) && !/\d+/.test(busqueda);
    if (esRarooInvalido) {
      throw new Error('VEHICULO_NO_ENCONTRADO');
    }
    return fallbackHeuristico(busqueda, slug);
  }
}

function fallbackHeuristico(busqueda: string, slug: string): Vehiculo {
  const t = busqueda.toLowerCase();
  const esCarro = /carro|auto|chevrolet|renault|mazda|kia|hyundai|toyota|nissan|ford|spark|logan|picanto|corolla|sandero/i.test(busqueda);

  if (esCarro) {
    let cilindraje = 1600;
    let consumo = 14;
    let tanque = 45;
    let marca = 'Genérica';

    if (/spark|picanto|i10|twingo|1\.0|1\.2/i.test(t)) { cilindraje = 1200; consumo = 17; tanque = 35; }
    else if (/logan|sandero|stepway|aveo|rio|accent|1\.6/i.test(t)) { cilindraje = 1600; consumo = 13.5; tanque = 50; }
    else if (/mazda|corolla|civic|jetta|2\.0/i.test(t)) { cilindraje = 2000; consumo = 11.5; tanque = 52; }

    if (/chevrolet/i.test(t)) marca = 'Chevrolet';
    else if (/renault/i.test(t)) marca = 'Renault';
    else if (/mazda/i.test(t)) marca = 'Mazda';
    else if (/kia/i.test(t)) marca = 'Kia';
    else if (/hyundai/i.test(t)) marca = 'Hyundai';
    else if (/toyota/i.test(t)) marca = 'Toyota';

    return {
      id: `ia-${slug}-${Date.now()}`,
      tipo: 'carro',
      marca,
      modelo: busqueda.toUpperCase(),
      cilindraje,
      tipoCombustible: 'Corriente',
      consumoKmPorLitro: consumo,
      capacidadTanque: tanque,
      autonomia: Math.round(consumo * tanque),
      fuente: 'ia_gemini',
      ultimaActualizacion: new Date().toISOString().split('T')[0],
    };
  } else {
    // Es moto
    let cilindraje = 150;
    let consumo = 36;
    let tanque = 10;
    let marca = 'Genérica';

    if (/100|110/i.test(t)) { cilindraje = 110; consumo = 48; tanque = 9; }
    else if (/200|250/i.test(t)) { cilindraje = 200; consumo = 30; tanque = 12; }
    else if (/300|400|500/i.test(t)) { cilindraje = 400; consumo = 22; tanque = 14; }

    if (/honda/i.test(t)) marca = 'Honda';
    else if (/yamaha/i.test(t)) marca = 'Yamaha';
    else if (/suzuki/i.test(t)) marca = 'Suzuki';
    else if (/kawasaki/i.test(t)) marca = 'Kawasaki';
    else if (/bajaj/i.test(t)) marca = 'Bajaj';
    else if (/akt/i.test(t)) marca = 'AKT';
    else if (/hero/i.test(t)) marca = 'Hero';

    return {
      id: `ia-${slug}-${Date.now()}`,
      tipo: 'moto',
      marca,
      modelo: busqueda.toUpperCase(),
      cilindraje,
      tipoCombustible: 'Corriente',
      consumoKmPorLitro: consumo,
      capacidadTanque: tanque,
      autonomia: Math.round(consumo * tanque),
      fuente: 'ia_gemini',
      ultimaActualizacion: new Date().toISOString().split('T')[0],
    };
  }
}
