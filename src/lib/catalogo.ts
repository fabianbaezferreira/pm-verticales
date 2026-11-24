import { supabase, ok } from './supabase'

export type ItemCoste = {
  id: string
  tipo: 'producto' | 'extra' | 'elaboracion'
  nombre: string
  detalle?: string
  unidad_base: string
  /** €/unidad base; null si no hay precio o el usuario no puede ver costes. */
  precio: number | null
  alergenos: string[]
  fecha_precio?: string | null
}

export type Catalogos = { productos: Map<string, ItemCoste>; extras: Map<string, ItemCoste>; elaboraciones: Map<string, ItemCoste> }

/** Carga lo necesario para componer recetas: catálogo PM, extras y elaboraciones con su coste unitario. */
export async function cargarCatalogos(veCostes: boolean): Promise<Catalogos> {
  const [prods, precios, extras, elabs] = await Promise.all([
    supabase.from('productos_pm').select('id, codigo, descripcion, fabricante, formato, unidad_base, alergenos').eq('activo', true).order('descripcion'),
    veCostes ? supabase.from('v_precio_actual_pm').select('producto_id, precio_unidad_base, fecha_tarifa') : Promise.resolve({ data: [], error: null }),
    supabase.from('ingredientes_extra').select('*').order('nombre'),
    supabase.from('v_elaboraciones_coste').select('id, nombre, tipo, rendimiento_unidad, coste_unidad, alergenos').order('nombre'),
  ])
  const pr = new Map<string, { p: number; f: string }>()
  for (const r of ok(precios) as { producto_id: string; precio_unidad_base: number; fecha_tarifa: string }[]) pr.set(r.producto_id, { p: r.precio_unidad_base, f: r.fecha_tarifa })

  const productos = new Map<string, ItemCoste>()
  for (const p of ok(prods) as { id: string; codigo: string; descripcion: string; fabricante: string | null; formato: string | null; unidad_base: string; alergenos: string[] }[]) {
    productos.set(p.id, {
      id: p.id, tipo: 'producto', nombre: p.descripcion,
      detalle: [p.codigo, p.fabricante, p.formato].filter(Boolean).join(' · '),
      unidad_base: p.unidad_base, precio: pr.get(p.id)?.p ?? null, fecha_precio: pr.get(p.id)?.f ?? null, alergenos: p.alergenos ?? [],
    })
  }
  const ex = new Map<string, ItemCoste>()
  for (const e of ok(extras) as { id: string; nombre: string; unidad_base: string; precio_unidad: number; fecha_precio: string; fuente: string | null; alergenos: string[] }[]) {
    ex.set(e.id, {
      id: e.id, tipo: 'extra', nombre: e.nombre, detalle: e.fuente ?? 'Fuera de catálogo',
      unidad_base: e.unidad_base, precio: veCostes ? e.precio_unidad : null, fecha_precio: e.fecha_precio, alergenos: e.alergenos ?? [],
    })
  }
  const el = new Map<string, ItemCoste>()
  for (const e of ok(elabs) as { id: string; nombre: string; tipo: string | null; rendimiento_unidad: string; coste_unidad: number | null; alergenos: string[] | null }[]) {
    el.set(e.id, {
      id: e.id, tipo: 'elaboracion', nombre: e.nombre, detalle: e.tipo ?? 'Elaboración',
      unidad_base: e.rendimiento_unidad, precio: veCostes ? e.coste_unidad : null, alergenos: e.alergenos ?? [],
    })
  }
  return { productos, extras: ex, elaboraciones: el }
}

const FACTOR: Record<string, number> = { g: 0.001, kg: 1, ml: 0.001, l: 1, ud: 1 }
const BASE: Record<string, string> = { g: 'kg', kg: 'kg', ml: 'l', l: 'l', ud: 'ud' }

/** Mismo cálculo que fn_coste_componente: cantidad bruta = neta / (1 − merma). */
export function costeLinea(item: ItemCoste | undefined, cantidad: number, unidad: string, merma: number): number | null {
  if (!item || item.precio == null) return null
  if (BASE[unidad] !== item.unidad_base) return null
  return (cantidad * FACTOR[unidad]) / (1 - merma) * item.precio
}

export function itemDeLinea(c: Catalogos, l: { producto_id: string | null; extra_id: string | null; elaboracion_id?: string | null; sub_elaboracion_id?: string | null }) {
  if (l.producto_id) return c.productos.get(l.producto_id)
  if (l.extra_id) return c.extras.get(l.extra_id)
  const e = l.elaboracion_id ?? l.sub_elaboracion_id
  return e ? c.elaboraciones.get(e) : undefined
}
