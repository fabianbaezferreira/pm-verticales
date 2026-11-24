import { useCallback, useEffect, useState } from 'react'
import { supabase, ok } from './supabase'

/** Carga asíncrona con recarga manual. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [n, setN] = useState(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps)
  useEffect(() => {
    let vivo = true
    setLoading(true)
    run()
      .then((d) => { if (vivo) { setData(d); setError(null) } })
      .catch((e: Error) => { if (vivo) setError(e.message) })
      .finally(() => { if (vivo) setLoading(false) })
    return () => { vivo = false }
  }, [run, n])
  return { data, error, loading, reload: () => setN((x) => x + 1), setData }
}

export type Vertical = { id: string; slug: string; nombre: string; reglas: Record<string, unknown>; multiplicador: number | null }
export type Categoria = { id: string; nombre: string; orden: number; food_cost_objetivo: number | null; multiplicador: number | null; vertical_id: string }
export type RolPlantilla = { id: string; tipo_plato: string; rol: string; minimo: number; maximo: number; orden: number; ejemplos: string | null; vertical_id: string }
export type Estilo = { id: string; nombre: string; descripcion: string | null; origen: string | null; tecnica: string | null; vertical_id: string }

export type ConfigVertical = { vertical: Vertical; categorias: Categoria[]; roles: RolPlantilla[]; estilos: Estilo[] }

let cache: Promise<ConfigVertical> | null = null

/** Configuración del vertical activo. Hoy solo hay uno (hamburguesería); el slug se pasa para cuando haya más. */
export function cargarVertical(slug = 'hamburgueseria', forzar = false): Promise<ConfigVertical> {
  if (cache && !forzar) return cache
  cache = (async () => {
    const vertical = ok(await supabase.from('verticales').select('id, slug, nombre, reglas, multiplicador').eq('slug', slug).single()) as Vertical
    const [categorias, roles, estilos] = await Promise.all([
      supabase.from('categorias_carta').select('*').eq('vertical_id', vertical.id).order('orden'),
      supabase.from('plantilla_roles').select('*').eq('vertical_id', vertical.id).order('tipo_plato').order('orden'),
      supabase.from('estilos').select('*').eq('vertical_id', vertical.id).order('nombre'),
    ])
    return { vertical, categorias: ok(categorias) as Categoria[], roles: ok(roles) as RolPlantilla[], estilos: ok(estilos) as Estilo[] }
  })()
  cache.catch(() => { cache = null })
  return cache
}

export function useVertical() {
  return useLoad(() => cargarVertical(), [])
}
