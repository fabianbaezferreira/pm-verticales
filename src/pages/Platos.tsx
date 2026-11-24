import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, ok } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { cargarVertical, useLoad, useVertical } from '../lib/hooks'
import { eur, pct } from '../lib/format'
import { Aviso, Cabecera, Cargando, EstadoReceta, Etiqueta, normalizar } from '../components/ui'

export type PlatoFila = {
  id: string; codigo: string; nombre: string; tipo_plato: string; estado: string; categoria_carta_id: string | null
  equipos: string[]; apto_delivery: boolean | null; es_tendencia: boolean; fuente_tendencia: string | null
  coste_total: number | null; componentes_sin_precio: number; pvp_multiplicador: number | null; multiplicador: number
  food_cost_objetivo: number | null; pvp_food_cost: number | null; alergenos: string[]; textos: Record<string, string>; foto_url: string | null; foto_orientativa: boolean
}

export async function cargarPlatos(): Promise<PlatoFila[]> {
  const [p, e] = await Promise.all([
    supabase.from('platos').select('id, codigo, nombre, tipo_plato, estado, categoria_carta_id, equipos, apto_delivery, es_tendencia, fuente_tendencia, textos, foto_url, foto_orientativa').order('nombre'),
    supabase.from('v_platos_escandallo').select('id, coste_total, componentes_sin_precio, pvp_multiplicador, multiplicador, food_cost_objetivo, pvp_food_cost, alergenos'),
  ])
  const esc = new Map((ok(e) as { id: string }[]).map((x) => [x.id, x]))
  return (ok(p) as PlatoFila[]).map((x) => ({ ...x, ...(esc.get(x.id) ?? {}) }) as PlatoFila)
}

export default function Platos() {
  const { edita, veCostes } = useAuth()
  const nav = useNavigate()
  const vert = useVertical()
  const d = useLoad(cargarPlatos, [])
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const cats = vert.data?.categorias ?? []
  const filas = useMemo(() => (d.data ?? []).filter((p) =>
    (!q || normalizar(`${p.codigo} ${p.nombre}`).includes(normalizar(q))) && (!cat || p.categoria_carta_id === cat)), [d.data, q, cat])

  async function crear() {
    const nombre = prompt('Nombre del plato')
    if (!nombre) return
    const v = await cargarVertical()
    const n = (d.data?.length ?? 0) + 1
    const { data, error } = await supabase.from('platos').insert({
      nombre, codigo: `HAM-${String(n).padStart(3, '0')}-${Date.now().toString(36).slice(-3).toUpperCase()}`,
      vertical_id: v.vertical.id, tipo_plato: 'hamburguesa', categoria_carta_id: v.categorias.find((c) => c.orden === 2)?.id ?? null,
    }).select('id').single()
    if (error) return alert(error.message)
    nav(`/platos/${data.id}`)
  }

  return (
    <>
      <Cabecera titulo="Platos" sub="Biblioteca de recetas del vertical. Coste por ración sin IVA, calculado en cadena con la tarifa vigente.">
        <input placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">Todas las categorías</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        {edita && <button className="btn-primario" onClick={crear}>Nuevo plato</button>}
      </Cabecera>
      {d.loading ? <Cargando /> : d.error ? <Aviso tipo="error">{d.error}</Aviso> : (
        <table className="tabla">
          <thead>
            <tr><th>Código</th><th>Plato</th><th>Categoría</th><th>Estado</th><th>Equipos</th><th>Delivery</th>
              {veCostes && <><th className="der">Coste ración</th><th className="der">PVP × k</th><th className="der">FC obj.</th></>}
              <th>Alérgenos</th></tr>
          </thead>
          <tbody>
            {filas.length === 0 && <tr><td colSpan={10} className="tenue">Sin platos.</td></tr>}
            {filas.map((p) => (
              <tr key={p.id} className="clic" onClick={() => nav(`/platos/${p.id}`)}>
                <td className="peq">{p.codigo}</td>
                <td>{p.nombre} {p.es_tendencia && <Etiqueta tono="acento">tendencia</Etiqueta>}</td>
                <td className="peq">{cats.find((c) => c.id === p.categoria_carta_id)?.nombre}</td>
                <td><EstadoReceta estado={p.estado} /></td>
                <td className="peq">{p.equipos.join(', ')}</td>
                <td>{p.apto_delivery == null ? <span className="tenue">—</span> : p.apto_delivery ? 'Sí' : 'No'}</td>
                {veCostes && <>
                  <td className="der">{p.componentes_sin_precio > 0 ? <Etiqueta tono="alerta">{p.componentes_sin_precio} sin precio</Etiqueta> : eur(p.coste_total)}</td>
                  <td className="der">{eur(p.pvp_multiplicador)}</td>
                  <td className="der">{pct(p.food_cost_objetivo, 0)}</td>
                </>}
                <td className="peq">{(p.alergenos ?? []).join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
