import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase, ok } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useLoad } from '../lib/hooks'
import { eur4, ESTADOS_RECETA, ETIQUETA_ESTADO } from '../lib/format'
import { Aviso, Cabecera, Campo, Cargando, NumInput } from '../components/ui'
import Componentes from '../components/Componentes'
import { TIPOS_ELABORACION } from './Elaboraciones'

type Elab = { id: string; nombre: string; tipo: string | null; rendimiento_cantidad: number; rendimiento_unidad: string; procedimiento: string | null; conservacion: string | null; estado: string; notas: string | null }

export default function ElaboracionDetalle() {
  const { id } = useParams()
  const nav = useNavigate()
  const { edita, veCostes } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const e = useLoad(async () => ok(await supabase.from('elaboraciones').select('*').eq('id', id!).single()) as Elab, [id])
  const coste = useLoad(async () => {
    const v = ok(await supabase.from('v_elaboraciones_coste').select('coste_unidad, alergenos').eq('id', id!).single()) as { coste_unidad: number | null; alergenos: string[] | null }
    const usos = ok(await supabase.from('plato_componentes').select('platos(id, nombre)').eq('elaboracion_id', id!)) as unknown as { platos: { id: string; nombre: string } }[]
    const enElab = ok(await supabase.from('elaboracion_componentes').select('elaboraciones!elaboracion_componentes_elaboracion_id_fkey(id, nombre)').eq('sub_elaboracion_id', id!)) as unknown as { elaboraciones: { id: string; nombre: string } }[]
    return { ...v, platos: usos.map((u) => u.platos), elabs: enElab.map((u) => u.elaboraciones) }
  }, [id])

  async function upd(c: Partial<Elab>) {
    setError(null)
    const { error } = await supabase.from('elaboraciones').update({ ...c, actualizado_en: new Date().toISOString() }).eq('id', id!)
    if (error) setError(error.message)
    e.reload(); coste.reload()
  }

  async function borrar() {
    const usos = (coste.data?.platos.length ?? 1) + (coste.data?.elabs.length ?? 1)
    if (usos > 0) return setError('No se puede borrar: está en uso. Cambia su estado a «Archivada».')
    if (!confirm('¿Borrar esta elaboración y sus componentes? No se puede deshacer.')) return
    const r = await supabase.from('elaboracion_componentes').delete().eq('elaboracion_id', id!)
    if (r.error) return setError(r.error.message)
    const { error } = await supabase.from('elaboraciones').delete().eq('id', id!)
    if (error) setError('No se puede borrar: está en uso. Archívala en su lugar.'); else nav('/elaboraciones')
  }

  if (e.loading) return <Cargando />
  if (e.error) return <Aviso tipo="error">{e.error}</Aviso>
  const x = e.data!
  const c = coste.data
  return (
    <>
      <Cabecera titulo={x.nombre} sub={<Link to="/elaboraciones">← Elaboraciones</Link>}>
        {veCostes && c && <span className="kpi"><span className="e">Coste por {x.rendimiento_unidad}</span><div className="v">{c.coste_unidad == null ? '—' : eur4(c.coste_unidad)}</div></span>}
        {edita && <button onClick={borrar}>Borrar</button>}
      </Cabecera>
      {error && <Aviso tipo="error">{error}</Aviso>}
      {veCostes && c && c.coste_unidad == null && <Aviso tipo="alerta">Coste incompleto: algún componente no tiene precio o su unidad no es compatible.</Aviso>}

      <div className="tarjeta">
        <div className="rejilla">
          <Campo etiqueta="Nombre"><input defaultValue={x.nombre} disabled={!edita} onBlur={(ev) => ev.target.value && ev.target.value !== x.nombre && upd({ nombre: ev.target.value })} /></Campo>
          <Campo etiqueta="Tipo">
            <select value={x.tipo ?? ''} disabled={!edita} onChange={(ev) => upd({ tipo: ev.target.value })}>
              {Array.from(new Set([...TIPOS_ELABORACION, x.tipo ?? 'otra'])).map((t) => <option key={t}>{t}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Rendimiento (lo que sale de la receta)">
            <div style={{ display: 'flex', gap: 6 }}>
              <NumInput valor={x.rendimiento_cantidad} deshabilitado={!edita} onGuardar={(v) => v && v > 0 && upd({ rendimiento_cantidad: v })} />
              <select value={x.rendimiento_unidad} disabled={!edita} onChange={(ev) => upd({ rendimiento_unidad: ev.target.value })}><option>kg</option><option>l</option><option>ud</option></select>
            </div>
          </Campo>
          <Campo etiqueta="Estado">
            <select value={x.estado} disabled={!edita} onChange={(ev) => upd({ estado: ev.target.value })}>
              {ESTADOS_RECETA.map((s) => <option key={s} value={s}>{ETIQUETA_ESTADO[s]}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Procedimiento" ancho="completo"><textarea defaultValue={x.procedimiento ?? ''} disabled={!edita} onBlur={(ev) => upd({ procedimiento: ev.target.value || null })} /></Campo>
          <Campo etiqueta="Conservación"><input defaultValue={x.conservacion ?? ''} disabled={!edita} onBlur={(ev) => upd({ conservacion: ev.target.value || null })} /></Campo>
          <Campo etiqueta="Notas internas"><input defaultValue={x.notas ?? ''} disabled={!edita} onBlur={(ev) => upd({ notas: ev.target.value || null })} /></Campo>
        </div>
      </div>

      <div className="tarjeta">
        <h2>Componentes</h2>
        <p className="tenue peq">Cantidades para producir el rendimiento indicado arriba. Puede incluir otras elaboraciones (p. ej. una mayonesa base dentro de una salsa burger).</p>
        <Componentes modo="elaboracion" padreId={id!} onCambio={() => coste.reload()} />
      </div>

      <div className="columnas">
        <div className="tarjeta">
          <h2>Alérgenos heredados</h2>
          <p>{(c?.alergenos ?? []).length ? c!.alergenos!.join(', ') : <span className="tenue">Ninguno declarado en sus componentes.</span>}</p>
        </div>
        <div className="tarjeta">
          <h2>Dónde se usa</h2>
          {c && c.platos.length + c.elabs.length === 0 && <p className="tenue">Todavía no se usa.</p>}
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {c?.platos.map((p) => <li key={p.id}><Link to={`/platos/${p.id}`}>{p.nombre}</Link></li>)}
            {c?.elabs.map((p) => <li key={p.id}><Link to={`/elaboraciones/${p.id}`}>{p.nombre}</Link> <span className="tenue">(elaboración)</span></li>)}
          </ul>
        </div>
      </div>
    </>
  )
}
