import { Fragment, useState } from 'react'
import { supabase, ok } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useLoad } from '../lib/hooks'
import { ALERGENOS_UE, eur4, fecha } from '../lib/format'
import { Aviso, Cabecera, Campo, Cargando, Fichas, NumInput } from '../components/ui'

type Extra = { id: string; nombre: string; unidad_base: string; precio_unidad: number; fecha_precio: string; fuente: string | null; alergenos: string[] }

export default function Extras() {
  const { edita, veCostes } = useAuth()
  const d = useLoad(async () => ok(await supabase.from('ingredientes_extra').select('*').order('nombre')) as Extra[], [])
  const [nuevo, setNuevo] = useState({ nombre: '', unidad_base: 'kg', precio_unidad: null as number | null, fuente: '', alergenos: [] as string[] })
  const [error, setError] = useState<string | null>(null)
  const [abierto, setAbierto] = useState<string | null>(null)

  async function crear() {
    setError(null)
    const { error } = await supabase.from('ingredientes_extra').insert({ ...nuevo, fuente: nuevo.fuente || null })
    if (error) return setError(error.message)
    setNuevo({ nombre: '', unidad_base: 'kg', precio_unidad: null, fuente: '', alergenos: [] }); d.reload()
  }
  async function upd(id: string, c: Partial<Extra>) {
    const { error } = await supabase.from('ingredientes_extra').update(c).eq('id', id)
    if (error) setError(error.message); else d.reload()
  }

  return (
    <>
      <Cabecera titulo="Ingredientes extra" sub="Productos que no están en el catálogo PM. El precio es por unidad base (€/kg, €/l o €/ud), sin IVA, con su fecha y fuente." />
      {error && <Aviso tipo="error">{error}</Aviso>}
      {edita && (
        <div className="tarjeta">
          <h2>Nuevo ingrediente</h2>
          <div className="rejilla">
            <Campo etiqueta="Nombre"><input value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} /></Campo>
            <Campo etiqueta="Unidad base">
              <select value={nuevo.unidad_base} onChange={(e) => setNuevo({ ...nuevo, unidad_base: e.target.value })}><option>kg</option><option>l</option><option>ud</option></select>
            </Campo>
            <Campo etiqueta={`Precio €/${nuevo.unidad_base} (sin IVA)`}><NumInput ancho={140} valor={nuevo.precio_unidad} onGuardar={(v) => setNuevo({ ...nuevo, precio_unidad: v })} /></Campo>
            <Campo etiqueta="Fuente del precio"><input value={nuevo.fuente} placeholder="Proveedor, ticket, web…" onChange={(e) => setNuevo({ ...nuevo, fuente: e.target.value })} /></Campo>
            <Campo etiqueta="Alérgenos" ancho="completo"><Fichas opciones={ALERGENOS_UE} valor={nuevo.alergenos} onChange={(v) => setNuevo({ ...nuevo, alergenos: v })} /></Campo>
          </div>
          <button className="btn-primario" style={{ marginTop: 10 }} disabled={!nuevo.nombre || nuevo.precio_unidad == null} onClick={crear}>Añadir</button>
        </div>
      )}
      {d.loading ? <Cargando /> : (
        <table className="tabla">
          <thead><tr><th>Nombre</th><th>Unidad</th>{veCostes && <th className="der">Precio</th>}<th>Fecha precio</th><th>Fuente</th><th>Alérgenos</th></tr></thead>
          <tbody>
            {(d.data ?? []).map((x) => (
              <Fragment key={x.id}>
                <tr className="clic" onClick={() => setAbierto(abierto === x.id ? null : x.id)}>
                  <td>{x.nombre}</td><td>{x.unidad_base}</td>{veCostes && <td className="der">{eur4(x.precio_unidad)}</td>}
                  <td>{fecha(x.fecha_precio)}</td><td>{x.fuente}</td><td className="peq">{x.alergenos.join(', ')}</td>
                </tr>
                {abierto === x.id && edita && (
                  <tr><td colSpan={6}>
                    <div className="rejilla">
                      <Campo etiqueta={`Nuevo precio €/${x.unidad_base}`} ayuda="Al cambiarlo se actualiza la fecha del precio">
                        <NumInput ancho={140} valor={x.precio_unidad} onGuardar={(v) => v != null && upd(x.id, { precio_unidad: v, fecha_precio: new Date().toISOString().slice(0, 10) })} />
                      </Campo>
                      <Campo etiqueta="Fuente"><input defaultValue={x.fuente ?? ''} onBlur={(e) => upd(x.id, { fuente: e.target.value || null })} /></Campo>
                      <Campo etiqueta="Alérgenos" ancho="completo"><Fichas opciones={ALERGENOS_UE} valor={x.alergenos} onChange={(v) => upd(x.id, { alergenos: v })} /></Campo>
                    </div>
                  </td></tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
