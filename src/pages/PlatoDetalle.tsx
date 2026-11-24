import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase, ok } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useLoad, useVertical } from '../lib/hooks'
import { EQUIPOS, ESTADOS_RECETA, ETIQUETA_ESTADO, eur, eur4, fecha, num, pct } from '../lib/format'
import { Aviso, Cabecera, Campo, Cargando, Etiqueta, Fichas, NumInput } from '../components/ui'
import Componentes from '../components/Componentes'

type Plato = {
  id: string; codigo: string; nombre: string; tipo_plato: string; categoria_carta_id: string | null; estilo_id: string | null
  estado: string; equipos: string[]; apto_delivery: boolean | null; es_tendencia: boolean; fuente_tendencia: string | null
  multiplicador: number | null; food_cost_objetivo: number | null; foto_url: string | null; foto_orientativa: boolean
  textos: Record<string, string>; notas_internas: string | null; vertical_id: string
}
type Esc = { coste_materia: number | null; coste_mano_obra: number | null; coste_total: number | null; componentes_sin_precio: number; multiplicador: number; multiplicador_origen: string; pvp_multiplicador: number | null; food_cost_objetivo: number | null; pvp_food_cost: number | null; iva: number; alergenos: string[] }
type MO = { id: string; tarea: string; minutos: number; coste_hora: number | null }

const TEXTOS = [
  ['descripcion', 'Descripción para carta'], ['elaboracion', 'Elaboración'], ['presentacion', 'Presentación'],
  ['argumento', 'Argumento comercial'], ['redes', 'Texto para redes'],
] as const

export default function PlatoDetalle() {
  const { id } = useParams()
  const nav = useNavigate()
  const { edita, veCostes } = useAuth()
  const vert = useVertical()
  const [error, setError] = useState<string | null>(null)
  const p = useLoad(async () => ok(await supabase.from('platos').select('*').eq('id', id!).single()) as Plato, [id])
  const esc = useLoad(async () => ok(await supabase.from('v_platos_escandallo').select('*').eq('id', id!).single()) as Esc, [id])
  const mo = useLoad(async () => ok(await supabase.from('plato_mano_obra').select('*').eq('plato_id', id!)) as MO[], [id])
  const hist = useLoad(async () => veCostes
    ? ok(await supabase.from('escandallos').select('id, creado_en, coste_total, pvp_sin_iva, metodo_pvp, tarifas(fecha_tarifa)').eq('plato_id', id!).order('creado_en', { ascending: false }).limit(10)) as unknown as
      { id: string; creado_en: string; coste_total: number | null; pvp_sin_iva: number | null; metodo_pvp: string | null; tarifas: { fecha_tarifa: string } | null }[]
    : [], [id, veCostes])
  const costeHora = useLoad(async () => (ok(await supabase.from('ajustes').select('valor').eq('clave', 'coste_hora_mano_obra').single()) as { valor: number }).valor, [])

  async function upd(c: Partial<Plato>) {
    setError(null)
    const { error } = await supabase.from('platos').update({ ...c, actualizado_en: new Date().toISOString() }).eq('id', id!)
    if (error) setError(error.message)
    p.reload(); esc.reload()
  }

  async function duplicar() {
    const x = p.data!
    const { id: _i, ...resto } = x
    const nuevo = ok(await supabase.from('platos').insert({ ...resto, nombre: `${x.nombre} (copia)`, codigo: `${x.codigo}-C${Date.now().toString(36).slice(-3).toUpperCase()}`, estado: 'teorica' }).select('id').single()) as { id: string }
    const comps = ok(await supabase.from('plato_componentes').select('rol, producto_id, extra_id, elaboracion_id, cantidad, unidad, merma, orden').eq('plato_id', id!)) as object[]
    if (comps.length) ok(await supabase.from('plato_componentes').insert(comps.map((c) => ({ ...c, plato_id: nuevo.id }))))
    const mos = (mo.data ?? []).map(({ id: _m, ...m }) => ({ ...m, plato_id: nuevo.id }))
    if (mos.length) ok(await supabase.from('plato_mano_obra').insert(mos))
    nav(`/platos/${nuevo.id}`)
  }

  async function borrar() {
    const usos = (await supabase.from('carta_platos').select('id', { count: 'exact', head: true }).eq('plato_id', id!)).count ?? 0
    if (usos) return setError(`Está en ${usos} carta(s). Archívalo en lugar de borrarlo.`)
    if (!confirm('¿Borrar el plato, sus componentes y su historial de escandallos? No se puede deshacer.')) return
    for (const t of ['plato_componentes', 'plato_mano_obra', 'escandallos']) {
      const r = await supabase.from(t).delete().eq('plato_id', id!)
      if (r.error) return setError(r.error.message)
    }
    const r = await supabase.from('platos').delete().eq('id', id!)
    if (r.error) setError(r.error.message); else nav('/platos')
  }

  async function guardarEscandallo() {
    const e = esc.data!
    const r = await supabase.rpc('fn_guardar_escandallo', { p_plato: id!, p_metodo: 'multiplicador', p_pvp_sin_iva: e.pvp_multiplicador })
    if (r.error) setError(r.error.message); else hist.reload()
  }

  if (p.loading || vert.loading) return <Cargando />
  if (p.error) return <Aviso tipo="error">{p.error}</Aviso>
  const x = p.data!
  const v = vert.data!
  const tipos = Array.from(new Set([...v.roles.map((r) => r.tipo_plato), 'libre', x.tipo_plato]))
  const roles = v.roles.filter((r) => r.tipo_plato === x.tipo_plato)
  const e = esc.data

  const recargarCostes = () => { esc.reload() }

  return (
    <>
      <Cabecera titulo={x.nombre} sub={<><Link to="/platos">← Platos</Link> · {x.codigo}</>}>
        {x.es_tendencia && <Etiqueta tono="acento">tendencia</Etiqueta>}
        <Etiqueta tono={x.estado === 'validada' ? 'ok' : 'alerta'}>{ETIQUETA_ESTADO[x.estado]}</Etiqueta>
        {edita && <><button onClick={duplicar}>Duplicar</button><button onClick={borrar}>Borrar</button></>}
      </Cabecera>
      {error && <Aviso tipo="error">{error}</Aviso>}
      {x.es_tendencia && !x.fuente_tendencia && <Aviso tipo="alerta">Plato marcado como tendencia sin fuente fechada. No debe presentarse como «tendencia poco extendida en España» hasta tener la fuente.</Aviso>}

      {veCostes && e && (
        <div className="kpis">
          <div className="kpi"><div className="e">Materia prima</div><div className="v">{eur(e.coste_materia)}</div></div>
          <div className="kpi"><div className="e">Mano de obra</div><div className="v">{eur(e.coste_mano_obra)}</div></div>
          <div className="kpi"><div className="e">Coste ración (sin IVA)</div><div className="v">{e.componentes_sin_precio ? <Etiqueta tono="alerta">{e.componentes_sin_precio} sin precio</Etiqueta> : eur(e.coste_total)}</div></div>
          <div className="kpi"><div className="e">PVP × {num(e.multiplicador)} <span title="Origen del multiplicador">({e.multiplicador_origen})</span></div><div className="v">{eur(e.pvp_multiplicador)}</div><div className="e">carta: {eur(e.pvp_multiplicador == null ? null : e.pvp_multiplicador * (1 + e.iva))} con IVA</div></div>
          <div className="kpi"><div className="e">PVP por food cost {pct(e.food_cost_objetivo, 0)}</div><div className="v">{e.food_cost_objetivo ? eur(e.pvp_food_cost) : '—'}</div><div className="e">{e.food_cost_objetivo ? `carta: ${eur(e.pvp_food_cost == null ? null : e.pvp_food_cost * (1 + e.iva))} con IVA` : 'sin objetivo definido'}</div></div>
        </div>
      )}

      <div className="tarjeta">
        <div className="rejilla">
          <Campo etiqueta="Nombre"><input defaultValue={x.nombre} disabled={!edita} onBlur={(ev) => ev.target.value && ev.target.value !== x.nombre && upd({ nombre: ev.target.value })} /></Campo>
          <Campo etiqueta="Código"><input defaultValue={x.codigo} disabled={!edita} onBlur={(ev) => ev.target.value && ev.target.value !== x.codigo && upd({ codigo: ev.target.value })} /></Campo>
          <Campo etiqueta="Tipo de plato (plantilla)">
            <select value={x.tipo_plato} disabled={!edita} onChange={(ev) => upd({ tipo_plato: ev.target.value })}>{tipos.map((t) => <option key={t}>{t}</option>)}</select>
          </Campo>
          <Campo etiqueta="Categoría de carta">
            <select value={x.categoria_carta_id ?? ''} disabled={!edita} onChange={(ev) => upd({ categoria_carta_id: ev.target.value || null })}>
              <option value="">—</option>{v.categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Estilo">
            <select value={x.estilo_id ?? ''} disabled={!edita} onChange={(ev) => upd({ estilo_id: ev.target.value || null })}>
              <option value="">—</option>{v.estilos.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Estado" ayuda="«Teórica» hasta la cata real">
            <select value={x.estado} disabled={!edita} onChange={(ev) => upd({ estado: ev.target.value })}>
              {ESTADOS_RECETA.map((s) => <option key={s} value={s}>{ETIQUETA_ESTADO[s]}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Apto para delivery">
            <select value={x.apto_delivery == null ? '' : String(x.apto_delivery)} disabled={!edita} onChange={(ev) => upd({ apto_delivery: ev.target.value === '' ? null : ev.target.value === 'true' })}>
              <option value="">Sin evaluar</option><option value="true">Sí, aguanta el transporte</option><option value="false">No</option>
            </select>
          </Campo>
          {veCostes && <>
            <Campo etiqueta="Food cost objetivo (%)" ayuda="Vacío = el de la categoría">
              <NumInput ancho={120} valor={x.food_cost_objetivo == null ? null : Math.round(x.food_cost_objetivo * 1000) / 10} deshabilitado={!edita}
                onGuardar={(n) => upd({ food_cost_objetivo: n == null ? null : n / 100 })} />
            </Campo>
            <Campo etiqueta="Multiplicador propio" ayuda="Vacío = categoría → vertical → general">
              <NumInput ancho={120} valor={x.multiplicador} deshabilitado={!edita} onGuardar={(n) => upd({ multiplicador: n })} />
            </Campo>
          </>}
          <Campo etiqueta="Equipos que necesita" ancho="completo">
            <Fichas opciones={EQUIPOS} valor={x.equipos} deshabilitado={!edita} onChange={(eq) => upd({ equipos: eq })} />
          </Campo>
          <Campo etiqueta="Tendencia">
            <label><input type="checkbox" checked={x.es_tendencia} disabled={!edita} onChange={(ev) => {
              if (!ev.target.checked) return upd({ es_tendencia: false })
              const f = prompt('Fuente fechada que respalda la tendencia (URL o referencia + fecha). Es obligatoria.', x.fuente_tendencia ?? '')
              if (f?.trim()) upd({ es_tendencia: true, fuente_tendencia: f.trim() })
            }} /> Plato de tendencia</label>
          </Campo>
          {x.es_tendencia && (
            <Campo etiqueta="Fuente fechada de la tendencia" ancho="completo">
              <input defaultValue={x.fuente_tendencia ?? ''} disabled={!edita} placeholder="URL o referencia + fecha" onBlur={(ev) => ev.target.value.trim() ? upd({ fuente_tendencia: ev.target.value.trim() }) : setError('La fuente es obligatoria mientras el plato esté marcado como tendencia.')} />
            </Campo>
          )}
          <Campo etiqueta="Foto (URL)" ayuda={<label><input type="checkbox" checked={x.foto_orientativa} disabled={!edita} onChange={(ev) => upd({ foto_orientativa: ev.target.checked })} /> Orientativa</label>}>
            <input defaultValue={x.foto_url ?? ''} disabled={!edita} onBlur={(ev) => upd({ foto_url: ev.target.value || null })} />
          </Campo>
        </div>
      </div>

      <div className="tarjeta">
        <h2>Composición por ración</h2>
        <Componentes modo="plato" padreId={id!} roles={roles} onCambio={recargarCostes} />
      </div>

      <div className="columnas">
        <div className="tarjeta">
          <h2>Mano de obra</h2>
          <table className="tabla">
            <thead><tr><th>Tarea</th><th className="der">Minutos</th><th className="der">€/hora</th>{veCostes && <th className="der">Coste</th>}{edita && <th></th>}</tr></thead>
            <tbody>
              {(mo.data ?? []).map((m) => {
                const ch = m.coste_hora ?? costeHora.data ?? 0
                const updMo = async (c: Partial<MO>) => { await supabase.from('plato_mano_obra').update(c).eq('id', m.id); mo.reload(); esc.reload() }
                return (
                  <tr key={m.id}>
                    <td><input defaultValue={m.tarea} disabled={!edita} onBlur={(ev) => updMo({ tarea: ev.target.value })} /></td>
                    <td className="der"><NumInput ancho={70} valor={m.minutos} deshabilitado={!edita} onGuardar={(n) => updMo({ minutos: n ?? 0 })} /></td>
                    <td className="der"><NumInput ancho={70} valor={m.coste_hora} placeholder={String(costeHora.data ?? '')} deshabilitado={!edita} onGuardar={(n) => updMo({ coste_hora: n })} /></td>
                    {veCostes && <td className="der">{eur4((m.minutos / 60) * ch)}</td>}
                    {edita && <td><button className="btn-mini" onClick={async () => { await supabase.from('plato_mano_obra').delete().eq('id', m.id); mo.reload(); esc.reload() }}>Quitar</button></td>}
                  </tr>
                )
              })}
            </tbody>
          </table>
          {edita && <button style={{ marginTop: 8 }} onClick={async () => { await supabase.from('plato_mano_obra').insert({ plato_id: id!, tarea: 'Montaje y pase', minutos: 3 }); mo.reload(); esc.reload() }}>Añadir tarea</button>}
          <p className="tenue peq">€/hora vacío = valor general ({eur(costeHora.data)}/h).</p>
        </div>
        <div className="tarjeta">
          <h2>Alérgenos (heredados)</h2>
          <p>{(e?.alergenos ?? []).length ? e!.alergenos.join(', ') : <span className="tenue">Ninguno declarado en sus componentes.</span>}</p>
          {veCostes && <>
            <h2 style={{ marginTop: 16 }}>Escandallos guardados</h2>
            {edita && <button onClick={guardarEscandallo} disabled={!e || e.coste_total == null}>Guardar foto fija con la tarifa actual</button>}
            <table className="tabla" style={{ marginTop: 8 }}>
              <tbody>
                {(hist.data ?? []).map((h) => (
                  <tr key={h.id}><td className="peq">{fecha(h.creado_en)}</td><td className="peq">tarifa {fecha(h.tarifas?.fecha_tarifa)}</td><td className="der">{eur(h.coste_total)}</td><td className="der">{eur(h.pvp_sin_iva)}</td><td className="peq">{h.metodo_pvp}</td></tr>
                ))}
              </tbody>
            </table>
          </>}
        </div>
      </div>

      <div className="tarjeta">
        <h2>Textos</h2>
        <div className="rejilla">
          {TEXTOS.map(([k, l]) => (
            <Campo key={k} etiqueta={l} ancho="completo">
              <textarea defaultValue={x.textos?.[k] ?? ''} disabled={!edita} onBlur={(ev) => ev.target.value !== (x.textos?.[k] ?? '') && upd({ textos: { ...x.textos, [k]: ev.target.value } })} />
            </Campo>
          ))}
          <Campo etiqueta="Notas internas (no salen en la propuesta)" ancho="completo">
            <textarea defaultValue={x.notas_internas ?? ''} disabled={!edita} onBlur={(ev) => upd({ notas_internas: ev.target.value || null })} />
          </Campo>
        </div>
      </div>
    </>
  )
}
