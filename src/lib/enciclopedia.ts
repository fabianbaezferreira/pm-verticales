import { supabase, ok } from './supabase'

export type Modo = 'fichas' | 'fuentes' | 'catalogo_pm'
export type Bloque = { codigo: string; nombre: string; mercado: string }
export type Area = {
  id: string; codigo: string; nombre: string; descripcion: string | null; notas: string | null
  modo: Modo; tipos_ficha: string[]; bloques: Bloque[] | null; privada: boolean; orden: number
}
export type CampoArea = { id: string; area_id: string; orden: number; clave: string; etiqueta: string; tipo: string; ayuda: string | null }

export type Ficha = {
  id: string; codigo: string; tipo: string; area_id: string; bloque: string | null; mercado: string | null
  nombre: string; categoria: string | null; subcategoria: string | null; sinonimos: string[]
  descripcion: string | null; datos_tecnicos: string | null; aplicaciones: string | null; combinaciones: string | null
  operativa: string | null; info_comercial: string | null; comparativas: string | null
  validacion: string; campos: Record<string, string>; estado: string; motivo_descarte: string | null
  creado_en: string; actualizado_en: string
}

export type Fuente = {
  id: string; codigo: string; nombre: string; editor_autor: string | null; mercado: string | null; tipo: string | null
  areas: string[]; url: string | null; acceso: string | null; prioridad: string | null; estado: string
  motivo_descarte: string | null; privada: boolean; notas: string | null
}

export const TIPOS_FICHA: Record<string, string> = {
  ingrediente: 'Ingrediente', estilo: 'Estilo', receta: 'Receta', combinacion: 'Combinación',
  tecnica: 'Técnica', tendencia: 'Tendencia', creador: 'Creador', normativa: 'Normativa',
}

type Tono = 'neutro' | 'ok' | 'alerta' | 'error' | 'acento'
/** Estados de la sección 6 del framework, en orden de avance. */
export const ESTADOS: { v: string; l: string; tono: Tono }[] = [
  { v: 'registrada', l: 'Registrada', tono: 'neutro' },
  { v: 'pendiente_de_captura', l: 'Pendiente de captura', tono: 'alerta' },
  { v: 'capturada', l: 'Capturada', tono: 'acento' },
  { v: 'texto_extraido', l: 'Texto extraído', tono: 'acento' },
  { v: 'pendiente_de_revision', l: 'Pendiente de revisión', tono: 'alerta' },
  { v: 'contrastada', l: 'Contrastada', tono: 'ok' },
  { v: 'validada_en_prueba', l: 'Validada en prueba', tono: 'ok' },
  { v: 'bloqueada', l: 'Bloqueada', tono: 'error' },
  { v: 'descartada_con_motivo', l: 'Descartada con motivo', tono: 'neutro' },
]
export const estadoInfo = (v: string) => ESTADOS.find((e) => e.v === v) ?? { v, l: v, tono: 'neutro' as Tono }

/** Campo común nº 10 (sección 4). */
export const VALIDACIONES: { v: string; l: string; tono: Tono }[] = [
  { v: 'pendiente', l: 'Pendiente', tono: 'alerta' },
  { v: 'contrastada', l: 'Información contrastada', tono: 'ok' },
  { v: 'prueba_real', l: 'Prueba real', tono: 'ok' },
  { v: 'propuesta_propia', l: 'Propuesta propia', tono: 'acento' },
]
export const validacionInfo = (v: string) => VALIDACIONES.find((e) => e.v === v) ?? { v, l: v, tono: 'neutro' as Tono }

/** Regla 5 del framework: la IA no es fuente primaria, por eso no hay tipo «ia». */
export const EVIDENCIAS: { v: string; l: string }[] = [
  { v: 'hecho_documentado', l: 'Hecho documentado' },
  { v: 'opinion_profesional', l: 'Opinión profesional' },
  { v: 'publicidad', l: 'Publicidad' },
  { v: 'hipotesis', l: 'Hipótesis' },
  { v: 'propuesta_propia', l: 'Propuesta propia' },
  { v: 'validacion_prueba', l: 'Validación mediante prueba' },
]

export const RELACIONES: { v: string; l: string }[] = [
  { v: 'usa', l: 'usa' },
  { v: 'variante_de', l: 'es variante de' },
  { v: 'alternativa_a', l: 'es alternativa a' },
  { v: 'sustituye_a', l: 'sustituye a' },
  { v: 'combina_con', l: 'combina con' },
  { v: 'incompatible_con', l: 'es incompatible con' },
  { v: 'estilo_de', l: 'es estilo de' },
  { v: 'deriva_de', l: 'deriva de' },
  { v: 'aplica_tecnica', l: 'aplica la técnica' },
  { v: 'regulada_por', l: 'está regulada por' },
  { v: 'relacionada', l: 'está relacionada con' },
]
export const relacionTexto = (v: string) => RELACIONES.find((r) => r.v === v)?.l ?? v

export const MERCADOS: Record<string, string> = { espana: 'España', eeuu_mundo: 'EEUU y mundo', otro: 'Otro' }

/** Campos comunes de todas las fichas (sección 4). El 1 (identificación) y el 8 (fuentes) tienen su propio bloque. */
export const CAMPOS_COMUNES: { clave: keyof Ficha; n: number; etiqueta: string; ayuda: string }[] = [
  { clave: 'descripcion', n: 2, etiqueta: 'Descripción', ayuda: 'Características y propiedades' },
  { clave: 'datos_tecnicos', n: 3, etiqueta: 'Datos técnicos', ayuda: 'Composición, elaboración y especificaciones' },
  { clave: 'aplicaciones', n: 4, etiqueta: 'Aplicaciones', ayuda: 'Usos gastronómicos y técnicas compatibles' },
  { clave: 'combinaciones', n: 5, etiqueta: 'Combinaciones', ayuda: 'Ingredientes relacionados y afinidades' },
  { clave: 'operativa', n: 6, etiqueta: 'Operativa', ayuda: 'Preparación, conservación y servicio' },
  { clave: 'info_comercial', n: 7, etiqueta: 'Información comercial', ayuda: 'Formatos, proveedores y precios, cuando existan. Solo datos públicos: los costes internos van en el Catálogo PM.' },
  { clave: 'comparativas', n: 9, etiqueta: 'Comparativas', ayuda: 'Alternativas, ventajas e inconvenientes' },
]

let cacheAreas: Promise<{ areas: Area[]; campos: CampoArea[] }> | null = null
/** Configuración de áreas y campos (cambia muy rara vez: se guarda en memoria). */
export function cargarAreas(forzar = false) {
  if (cacheAreas && !forzar) return cacheAreas
  cacheAreas = (async () => {
    const [a, c] = await Promise.all([
      supabase.from('enc_areas').select('*').order('orden'),
      supabase.from('enc_area_campos').select('*').order('area_id').order('orden'),
    ])
    return { areas: ok(a) as Area[], campos: ok(c) as CampoArea[] }
  })()
  cacheAreas.catch(() => { cacheAreas = null })
  return cacheAreas
}

/** Convierte lo que escribe el usuario en una consulta de texto con prefijos («pale vac» → «pale:* & vac:*»). */
export function consultaTexto(q: string): string | null {
  const t = q.split(/\s+/).map((x) => x.replace(/[^\p{L}\p{N}]/gu, '')).filter(Boolean)
  return t.length ? t.map((x) => `${x}:*`).join(' & ') : null
}
