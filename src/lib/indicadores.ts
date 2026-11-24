import { supabase, ok } from './supabase'
import type { Catalogos } from './catalogo'

type CompPlato = { plato_id: string; rol: string; producto_id: string | null; extra_id: string | null; elaboracion_id: string | null }
type CompElab = { elaboracion_id: string; producto_id: string | null; extra_id: string | null; sub_elaboracion_id: string | null }

export type Indicadores = {
  refsPM: number
  ingredientesUnicos: number
  pctCompartidos: number | null
  basesPorRol: Record<string, string[]>
  componentesPorPlato: Map<string, Set<string>>
}

/** Indicadores de carta del framework: referencias PM, ingredientes únicos, % compartidos y bases por rol. */
export async function calcularIndicadores(platoIds: string[], cat: Catalogos): Promise<Indicadores> {
  if (platoIds.length === 0) return { refsPM: 0, ingredientesUnicos: 0, pctCompartidos: null, basesPorRol: {}, componentesPorPlato: new Map() }
  const [pc, ec] = await Promise.all([
    supabase.from('plato_componentes').select('plato_id, rol, producto_id, extra_id, elaboracion_id').in('plato_id', platoIds),
    supabase.from('elaboracion_componentes').select('elaboracion_id, producto_id, extra_id, sub_elaboracion_id'),
  ])
  const compsP = ok(pc) as CompPlato[]
  const compsE = ok(ec) as CompElab[]
  const porElab = new Map<string, CompElab[]>()
  compsE.forEach((c) => porElab.set(c.elaboracion_id, [...(porElab.get(c.elaboracion_id) ?? []), c]))

  // Hojas (productos PM y extras) alcanzadas desde una elaboración, con protección frente a ciclos
  const hojas = (elab: string, visto = new Set<string>()): string[] => {
    if (visto.has(elab)) return []
    visto.add(elab)
    return (porElab.get(elab) ?? []).flatMap((c) =>
      c.producto_id ? [`p:${c.producto_id}`] : c.extra_id ? [`x:${c.extra_id}`] : c.sub_elaboracion_id ? hojas(c.sub_elaboracion_id, visto) : [])
  }

  const todasHojas = new Set<string>()
  const directos = new Map<string, Set<string>>()
  const basesPorRol: Record<string, Set<string>> = {}
  for (const c of compsP) {
    const clave = c.producto_id ? `p:${c.producto_id}` : c.extra_id ? `x:${c.extra_id}` : `e:${c.elaboracion_id}`
    if (!directos.has(c.plato_id)) directos.set(c.plato_id, new Set())
    directos.get(c.plato_id)!.add(clave)
    const leaf = c.elaboracion_id ? hojas(c.elaboracion_id) : [clave]
    leaf.forEach((h) => todasHojas.add(h))
    if (['pan', 'proteina', 'salsa', 'queso'].includes(c.rol)) {
      const it = c.producto_id ? cat.productos.get(c.producto_id) : c.extra_id ? cat.extras.get(c.extra_id) : cat.elaboraciones.get(c.elaboracion_id!)
      ;(basesPorRol[c.rol] ??= new Set()).add(it?.nombre ?? '¿?')
    }
  }
  // % de componentes directos que aparecen en 2 o más platos (mismo criterio que fn_revisar_carta)
  const usos = new Map<string, number>()
  directos.forEach((s) => s.forEach((k) => usos.set(k, (usos.get(k) ?? 0) + 1)))
  const compartidos = [...usos.values()].filter((n) => n >= 2).length

  return {
    refsPM: [...todasHojas].filter((h) => h.startsWith('p:')).length,
    ingredientesUnicos: todasHojas.size,
    pctCompartidos: usos.size ? compartidos / usos.size : null,
    basesPorRol: Object.fromEntries(Object.entries(basesPorRol).map(([k, v]) => [k, [...v]])),
    componentesPorPlato: directos,
  }
}
