const eurFmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const eur4Fmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 4 })
const numFmt = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 3 })

export const eur = (v: number | null | undefined) => (v == null ? '—' : eurFmt.format(v))
export const eur4 = (v: number | null | undefined) => (v == null ? '—' : eur4Fmt.format(v))
export const num = (v: number | null | undefined) => (v == null ? '—' : numFmt.format(v))
export const pct = (v: number | null | undefined, dec = 1) => (v == null ? '—' : `${(v * 100).toFixed(dec).replace('.', ',')} %`)
export const fecha = (v: string | null | undefined) => (v ? new Date(v).toLocaleDateString('es-ES') : '—')

/** Convierte "1.234,56", "1234.56" o número en número. */
export function parseNum(v: unknown): number | null {
  if (v == null || v === '') return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  let s = String(v).trim().replace(/[€\s]/g, '')
  if (s === '') return null
  if (s.includes(',') && s.includes('.')) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  } else if (s.includes(',')) s = s.replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export const diasDesde = (v: string | null | undefined) =>
  v ? Math.floor((Date.now() - new Date(v).getTime()) / 86400000) : null

export type ModoRedondeo = 'ninguno' | '00' | '50' | '90' | '95'
export const MODOS_REDONDEO: { v: ModoRedondeo; l: string }[] = [
  { v: 'ninguno', l: 'Sin redondeo' },
  { v: '00', l: 'Euro entero (x,00)' },
  { v: '50', l: 'x,00 / x,50' },
  { v: '90', l: 'x,90' },
  { v: '95', l: 'x,95' },
]

/** Redondea al alza un precio de carta CON IVA al siguiente final permitido. */
export function redondearCarta(conIva: number, modo: ModoRedondeo): number {
  if (modo === 'ninguno') return Math.round(conIva * 100) / 100
  const c = Math.round(conIva * 100) / 100
  const ent = Math.floor(c)
  const cands: number[] = []
  for (let e = ent; e <= ent + 1; e++) {
    if (modo === '00') cands.push(e)
    if (modo === '50') cands.push(e, e + 0.5)
    if (modo === '90') cands.push(e + 0.9)
    if (modo === '95') cands.push(e + 0.95)
  }
  return cands.filter((x) => x >= c - 1e-9).sort((a, b) => a - b)[0] ?? c
}

export const ALERGENOS_UE = [
  'gluten', 'crustáceos', 'huevo', 'pescado', 'cacahuete', 'soja', 'leche',
  'frutos de cáscara', 'apio', 'mostaza', 'sésamo', 'sulfitos', 'altramuces', 'moluscos',
]
export const EQUIPOS = ['plancha', 'freidora', 'horno', 'salamandra']
export const CANALES = ['sala', 'takeaway', 'delivery']
export const RESTRICCIONES = ['sin gluten', 'halal', 'vegetariano']
export const ESTADOS_RECETA = ['teorica', 'probada', 'validada', 'archivada']
export const ETIQUETA_ESTADO: Record<string, string> = {
  teorica: 'Propuesta teórica', probada: 'Probada', validada: 'Validada', archivada: 'Archivada',
}
export const UNIDADES_POR_BASE: Record<string, string[]> = { kg: ['g', 'kg'], l: ['ml', 'l'], ud: ['ud'] }
