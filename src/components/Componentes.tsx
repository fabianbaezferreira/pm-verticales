import { useMemo, useState } from 'react'
import { supabase, ok } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useLoad } from '../lib/hooks'
import { cargarCatalogos, costeLinea, itemDeLinea, type Catalogos } from '../lib/catalogo'
import { eur4, UNIDADES_POR_BASE } from '../lib/format'
import { Aviso, Buscador, Cargando, NumInput, type OpcionBusqueda } from './ui'

type Linea = {
  id: string; producto_id: string | null; extra_id: string | null
  elaboracion_id?: string | null; sub_elaboracion_id?: string | null
  cantidad: number; unidad: string; merma: number; orden: number; rol?: string
}

type Props = {
  /** 'plato' escribe en plato_componentes; 'elaboracion' en elaboracion_componentes. */
  modo: 'plato' | 'elaboracion'
  padreId: string
  /** Roles disponibles (solo platos). */
  roles?: { rol: string; minimo: number; maximo: number }[]
  /** Se llama tras cada cambio, para que el padre recalcule su escandallo. */
  onCambio?: () => void
}

export default function Componentes({ modo, padreId, roles, onCambio }: Props) {
  const { veCostes, edita } = useAuth()
  const tabla = modo === 'plato' ? 'plato_componentes' : 'elaboracion_componentes'
  const fk = modo === 'plato' ? 'plato_id' : 'elaboracion_id'
  const colElab = modo === 'plato' ? 'elaboracion_id' : 'sub_elaboracion_id'

  const cat = useLoad(() => cargarCatalogos(veCostes), [veCostes])
  const lin = useLoad(async () => ok(await supabase.from(tabla).select('*').eq(fk, padreId).order('orden')) as Linea[], [padreId, tabla])
  const [rolNuevo, setRolNuevo] = useState(roles?.[0]?.rol ?? 'otro')
  const [error, setError] = useState<string | null>(null)

  const opciones = useMemo<OpcionBusqueda[]>(() => {
    if (!cat.data) return []
    const c = cat.data
    const o: OpcionBusqueda[] = []
    c.elaboraciones.forEach((e) => { if (e.id !== padreId) o.push({ id: `elaboracion:${e.id}`, texto: e.nombre, detalle: e.detalle, grupo: 'Elaboración' }) })
    c.productos.forEach((p) => o.push({ id: `producto:${p.id}`, texto: p.nombre, detalle: p.detalle, grupo: 'PM' }))
    c.extras.forEach((x) => o.push({ id: `extra:${x.id}`, texto: x.nombre, detalle: x.detalle, grupo: 'Extra' }))
    return o
  }, [cat.data, padreId])

  async function guardar(fn: () => PromiseLike<{ error: { message: string } | null }>) {
    setError(null)
    const { error } = await fn()
    if (error) setError(error.message)
    lin.reload(); onCambio?.()
  }

  function anadir(o: OpcionBusqueda) {
    const [tipo, id] = o.id.split(':')
    const item = tipo === 'producto' ? cat.data!.productos.get(id) : tipo === 'extra' ? cat.data!.extras.get(id) : cat.data!.elaboraciones.get(id)
    const base = item?.unidad_base ?? 'ud'
    const fila: Record<string, unknown> = {
      [fk]: padreId, cantidad: base === 'ud' ? 1 : 100, unidad: base === 'kg' ? 'g' : base === 'l' ? 'ml' : 'ud',
      merma: 0, orden: (lin.data?.length ?? 0) + 1,
      producto_id: tipo === 'producto' ? id : null, extra_id: tipo === 'extra' ? id : null, [colElab]: tipo === 'elaboracion' ? id : null,
    }
    if (modo === 'plato') fila.rol = rolNuevo
    guardar(() => supabase.from(tabla).insert(fila))
  }

  if (cat.loading || lin.loading) return <Cargando />
  if (cat.error || lin.error) return <Aviso tipo="error">{cat.error ?? lin.error}</Aviso>
  const c = cat.data as Catalogos
  const lineas = lin.data ?? []
  const total = lineas.reduce<number | null>((s, l) => {
    const v = costeLinea(itemDeLinea(c, l), l.cantidad, l.unidad, l.merma)
    return s == null || v == null ? null : s + v
  }, 0)

  const conteoRoles = new Map<string, number>()
  lineas.forEach((l) => l.rol && conteoRoles.set(l.rol, (conteoRoles.get(l.rol) ?? 0) + 1))

  return (
    <div>
      {error && <Aviso tipo="error">{error}</Aviso>}
      {roles && roles.length > 0 && (
        <div className="fichas" style={{ marginBottom: 8 }}>
          {roles.map((r) => {
            const n = conteoRoles.get(r.rol) ?? 0
            const malo = n < r.minimo || n > r.maximo
            return <span key={r.rol} className={`etq ${malo ? 'etq-alerta' : 'etq-ok'}`} title={`Mín ${r.minimo} · máx ${r.maximo}`}>{r.rol} {n}/{r.minimo}–{r.maximo}</span>
          })}
        </div>
      )}
      <table className="tabla">
        <thead>
          <tr>
            {modo === 'plato' && <th>Rol</th>}
            <th>Componente</th><th className="der">Cantidad neta</th><th>Unidad</th><th className="der">Merma %</th>
            {veCostes && <th className="der">Coste</th>}
            <th>Alérgenos</th>{edita && <th></th>}
          </tr>
        </thead>
        <tbody>
          {lineas.length === 0 && <tr><td colSpan={8} className="tenue">Sin componentes.</td></tr>}
          {lineas.map((l) => {
            const it = itemDeLinea(c, l)
            const coste = costeLinea(it, l.cantidad, l.unidad, l.merma)
            const unidades = UNIDADES_POR_BASE[it?.unidad_base ?? 'ud'] ?? ['g', 'kg', 'ml', 'l', 'ud']
            const upd = (cambio: Record<string, unknown>) => guardar(() => supabase.from(tabla).update(cambio).eq('id', l.id))
            return (
              <tr key={l.id}>
                {modo === 'plato' && (
                  <td>
                    <select value={l.rol} disabled={!edita} onChange={(e) => upd({ rol: e.target.value })}>
                      {Array.from(new Set([...(roles ?? []).map((r) => r.rol), 'otro', l.rol ?? 'otro'])).map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </td>
                )}
                <td>
                  <span className="etq etq-neutro">{it?.tipo === 'producto' ? 'PM' : it?.tipo === 'extra' ? 'Extra' : 'Elab.'}</span> {it?.nombre ?? '¿?'}
                  {it?.detalle && <div className="tenue peq">{it.detalle}</div>}
                </td>
                <td className="der"><NumInput valor={l.cantidad} deshabilitado={!edita} onGuardar={(v) => v && v > 0 && upd({ cantidad: v })} /></td>
                <td>
                  <select value={l.unidad} disabled={!edita} onChange={(e) => upd({ unidad: e.target.value })}>
                    {Array.from(new Set([...unidades, l.unidad])).map((u) => <option key={u}>{u}</option>)}
                  </select>
                </td>
                <td className="der"><NumInput ancho={60} valor={Math.round(l.merma * 1000) / 10} deshabilitado={!edita}
                  onGuardar={(v) => upd({ merma: Math.min(Math.max((v ?? 0) / 100, 0), 0.99) })} /></td>
                {veCostes && <td className="der">{coste == null ? <span className="etq etq-alerta">sin precio</span> : eur4(coste)}</td>}
                <td className="peq">{it?.alergenos.join(', ')}</td>
                {edita && <td><button className="btn-mini" onClick={() => guardar(() => supabase.from(tabla).delete().eq('id', l.id))}>Quitar</button></td>}
              </tr>
            )
          })}
        </tbody>
        {veCostes && (
          <tfoot>
            <tr><td colSpan={modo === 'plato' ? 5 : 4} className="der"><b>Materia prima</b></td><td className="der"><b>{eur4(total)}</b></td><td colSpan={2}></td></tr>
          </tfoot>
        )}
      </table>
      {edita && (
        <div className="fila-anadir">
          {modo === 'plato' && (
            <select value={rolNuevo} onChange={(e) => setRolNuevo(e.target.value)}>
              {Array.from(new Set([...(roles ?? []).map((r) => r.rol), 'otro'])).map((r) => <option key={r}>{r}</option>)}
            </select>
          )}
          <Buscador opciones={opciones} onElegir={anadir} placeholder="Añadir producto PM, extra o elaboración…" />
        </div>
      )}
      <p className="tenue peq">La merma se aplica sobre la cantidad neta: cantidad bruta = neta ÷ (1 − merma). La unidad debe ser compatible con la del producto (kg↔g, l↔ml, ud).</p>
    </div>
  )
}
