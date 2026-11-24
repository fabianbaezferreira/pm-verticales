import readXlsxFile from 'read-excel-file/browser'
import { CANALES, EQUIPOS, parseNum, RESTRICCIONES } from './format'

type Celda = string | number | boolean | Date | null
type Hoja = { sheet: string; data: Celda[][] }

export type DatosCliente = {
  nombre?: string; zona?: string | null; concepto?: string | null; ticket_medio?: number | null
  fecha_apertura?: string | null; equipos?: string[]; canales?: string[]; restricciones?: string[]; notas?: string | null
  personal?: string | null; horario?: string | null; equipos_otros?: string | null
  contacto_nombre?: string | null; contacto_telefono?: string | null; contacto_email?: string | null
}

const norm = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const texto = (v: Celda | undefined) => (v == null || v === '' ? null : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).trim())
const esSi = (v: Celda | undefined) => ['si', 's', 'yes', 'x', 'true', '1'].includes(norm(v))
const respondido = (v: Celda | undefined) => norm(v) !== ''

export function fechaISO(v: Celda | undefined): string | null {
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  const s = texto(v)
  if (!s) return null
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/)
  if (m) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null
}

/** Convierte "Plancha; freidora" en ['plancha','freidora'] usando el vocabulario de la app cuando coincide. */
export function lista(v: Celda | undefined, vocab: string[]): string[] {
  const s = texto(v)
  if (!s) return []
  return Array.from(new Set(s.split(/[,;/\n]+/).map((x) => x.trim()).filter(Boolean)
    .map((x) => vocab.find((w) => norm(w) === norm(x)) ?? x.toLowerCase())))
}

async function hojas(f: File) {
  return (await readXlsxFile(f)) as unknown as Hoja[]
}

/** Lee la plantilla «Brief_cliente_PM_Hamburgueseria.xlsx» (columna oculta C = clave, B = respuesta). */
export async function leerBrief(f: File): Promise<{ datos: DatosCliente; avisos: string[] }> {
  const hs = await hojas(f)
  const h = hs.find((x) => norm(x.sheet) === 'brief') ?? hs[0]
  const val = new Map<string, Celda>()
  for (const r of h.data) {
    const clave = texto(r[2])
    if (clave && clave !== 'clave') val.set(clave, r[1] ?? null)
  }
  if (val.size === 0) throw new Error('No reconozco el formato: usa la plantilla de brief de PM Verticales.')

  const avisos: string[] = []
  const d: DatosCliente = {}
  const t = (k: string) => texto(val.get(k))
  if (t('nombre')) d.nombre = t('nombre')!
  if (t('zona')) d.zona = t('zona')
  if (t('concepto')) d.concepto = t('concepto')
  if (respondido(val.get('ticket_medio'))) {
    d.ticket_medio = parseNum(val.get('ticket_medio'))
    if (d.ticket_medio == null) avisos.push('Ticket medio no es un número; se ignora.')
  }
  if (respondido(val.get('fecha_apertura'))) {
    d.fecha_apertura = fechaISO(val.get('fecha_apertura'))
    if (!d.fecha_apertura) avisos.push('Fecha de apertura no reconocida (usa dd/mm/aaaa); se ignora.')
  }
  const grupo = (pref: string, vocab: string[]) => {
    const resp = vocab.filter((v) => respondido(val.get(`${pref}:${v}`)))
    return resp.length ? vocab.filter((v) => esSi(val.get(`${pref}:${v}`))) : undefined
  }
  const eq = grupo('equipo', EQUIPOS); if (eq) d.equipos = eq
  const ca = grupo('canal', CANALES); if (ca) d.canales = ca
  const re = grupo('restriccion', RESTRICCIONES); if (re) d.restricciones = re

  for (const k of ['personal', 'horario', 'equipos_otros', 'contacto_nombre', 'contacto_telefono', 'contacto_email', 'notas'] as const) {
    if (t(k)) d[k] = t(k)
  }
  return { datos: d, avisos }
}

const ALIAS: Record<keyof DatosCliente, string[]> = {
  nombre: ['nombre', 'cliente', 'local', 'nombre comercial', 'razon social'],
  zona: ['zona', 'barrio', 'ciudad', 'localidad', 'poblacion'],
  concepto: ['concepto', 'tipo', 'descripcion'],
  ticket_medio: ['ticket medio', 'ticket', 'ticket medio (€ con iva)', 'ticket medio (eur con iva)'],
  fecha_apertura: ['fecha apertura', 'apertura', 'fecha de apertura'],
  equipos: ['equipos', 'equipamiento', 'maquinaria'],
  canales: ['canales', 'canal'],
  restricciones: ['restricciones', 'restriccion'],
  notas: ['notas', 'observaciones', 'comentarios'],
  personal: ['personal', 'personal de cocina'],
  horario: ['horario'],
  equipos_otros: ['otros equipos'],
  contacto_nombre: ['contacto', 'persona de contacto'],
  contacto_telefono: ['telefono', 'movil'],
  contacto_email: ['email', 'correo', 'e-mail'],
}

export type FilaLista = { datos: DatosCliente; error?: string }

/** Lee la plantilla de lista de clientes (o cualquier Excel con cabeceras parecidas). */
export async function leerLista(f: File): Promise<{ filas: FilaLista[]; columnas: string[] }> {
  const hs = await hojas(f)
  const h = hs.find((x) => norm(x.sheet) === 'clientes') ?? hs[0]
  const iCab = Math.max(0, h.data.findIndex((r) => r.some((c) => ALIAS.nombre.some((a) => norm(c).replace(/\*/g, '').trim() === a))))
  const cab = (h.data[iCab] ?? []).map((c) => norm(c).replace(/\*/g, '').trim())
  const col = Object.fromEntries(Object.entries(ALIAS).map(([k, al]) => [k, cab.findIndex((c) => al.includes(c))])) as Record<keyof DatosCliente, number>
  if (col.nombre < 0) throw new Error('No encuentro la columna «Nombre».')
  const g = (r: Celda[], k: keyof DatosCliente) => (col[k] >= 0 ? r[col[k]] : undefined)

  const filas: FilaLista[] = []
  for (const r of h.data.slice(iCab + 1)) {
    if (r.every((c) => c == null || c === '')) continue
    const d: DatosCliente = {
      nombre: texto(g(r, 'nombre')) ?? undefined,
      zona: texto(g(r, 'zona')), concepto: texto(g(r, 'concepto')),
      ticket_medio: parseNum(g(r, 'ticket_medio')), fecha_apertura: fechaISO(g(r, 'fecha_apertura')),
      equipos: lista(g(r, 'equipos'), EQUIPOS), canales: lista(g(r, 'canales'), CANALES),
      restricciones: lista(g(r, 'restricciones'), RESTRICCIONES), notas: texto(g(r, 'notas')),
      personal: texto(g(r, 'personal')), horario: texto(g(r, 'horario')), equipos_otros: texto(g(r, 'equipos_otros')),
      contacto_nombre: texto(g(r, 'contacto_nombre')), contacto_telefono: texto(g(r, 'contacto_telefono')), contacto_email: texto(g(r, 'contacto_email')),
    }
    filas.push({ datos: d, error: d.nombre ? undefined : 'Falta el nombre' })
  }
  return { filas, columnas: Object.entries(col).filter(([, i]) => i >= 0).map(([k]) => k) }
}
