/** Utilidades de comparables: distancia, filtrado por modo y localización de direcciones. */

export type ModoComparables = 'zona' | 'codigo_postal' | 'radio'

export const MODOS_COMPARABLES: { v: ModoComparables; l: string }[] = [
  { v: 'zona', l: 'Por texto de zona' },
  { v: 'codigo_postal', l: 'Por código postal' },
  { v: 'radio', l: 'Por radio (km)' },
]

export type ClienteGeo = {
  zona: string | null
  codigo_postal: string | null
  lat: number | null
  lng: number | null
  modo_comparables: ModoComparables
  radio_km: number
}

export type ComparableGeo = {
  zona: string | null
  codigo_postal: string | null
  lat: number | null
  lng: number | null
}

/** Distancia en km entre dos puntos (fórmula de Haversine). */
export function distanciaKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const r = (g: number) => (g * Math.PI) / 180
  const dLat = r(bLat - aLat)
  const dLng = r(bLng - aLng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase()
const cp = (s: string | null | undefined) => (s ?? '').replace(/\s/g, '')

export type Resultado<T> = {
  /** Comparables que cumplen el criterio, con su distancia en km cuando el modo es radio. */
  filas: (T & { distancia: number | null })[]
  /** Comparables que no se pueden evaluar (sin coordenadas o sin código postal). */
  sinDatos: number
  /** Motivo por el que no hay nada que buscar (el cliente no tiene los datos que pide el modo). */
  falta: string | null
}

export function filtrarComparables<T extends ComparableGeo>(c: ClienteGeo, todos: T[]): Resultado<T> {
  if (c.modo_comparables === 'codigo_postal') {
    if (!cp(c.codigo_postal)) return { filas: [], sinDatos: 0, falta: 'Define el código postal del cliente.' }
    const con = todos.filter((x) => cp(x.codigo_postal))
    return { filas: con.filter((x) => cp(x.codigo_postal) === cp(c.codigo_postal)).map((x) => ({ ...x, distancia: null })), sinDatos: todos.length - con.length, falta: null }
  }
  if (c.modo_comparables === 'radio') {
    if (c.lat == null || c.lng == null) return { filas: [], sinDatos: 0, falta: 'Localiza la dirección del cliente (ficha del cliente → «Localizar»).' }
    const con = todos.filter((x) => x.lat != null && x.lng != null)
    const filas = con
      .map((x) => ({ ...x, distancia: distanciaKm(c.lat!, c.lng!, x.lat!, x.lng!) }))
      .filter((x) => x.distancia <= c.radio_km)
      .sort((a, b) => a.distancia - b.distancia)
    return { filas, sinDatos: todos.length - con.length, falta: null }
  }
  if (!norm(c.zona)) return { filas: [], sinDatos: 0, falta: 'Define la zona del cliente.' }
  const con = todos.filter((x) => norm(x.zona))
  return { filas: con.filter((x) => norm(x.zona) === norm(c.zona)).map((x) => ({ ...x, distancia: null })), sinDatos: todos.length - con.length, falta: null }
}

export type Localizacion = { lat: number; lng: number; codigo_postal: string | null; nombre: string }

/**
 * Convierte una dirección en coordenadas con Nominatim (OpenStreetMap, gratuito).
 * La dirección escrita se envía a ese servicio. Límite de uso razonable: 1 consulta por segundo.
 */
export async function localizarDireccion(direccion: string): Promise<Localizacion> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&countrycodes=es&accept-language=es&q=${encodeURIComponent(direccion)}`
  const r = await fetch(url)
  if (!r.ok) throw new Error(`El servicio de mapas no respondió (${r.status}). Inténtalo de nuevo en un momento.`)
  const j = (await r.json()) as { lat: string; lon: string; display_name: string; address?: { postcode?: string } }[]
  if (!j.length) throw new Error('No se encontró esa dirección. Añade la calle, el número y la ciudad.')
  return { lat: Number(j[0].lat), lng: Number(j[0].lon), codigo_postal: j[0].address?.postcode ?? null, nombre: j[0].display_name }
}
