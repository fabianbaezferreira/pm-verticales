import { Fragment, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase, ok } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useLoad, useVertical } from '../lib/hooks'
import { cargarCatalogos } from '../lib/catalogo'
import { calcularIndicadores } from '../lib/indicadores'
import { eur, MODOS_REDONDEO, num, pct } from '../lib/format'
import { filtrarComparables, type ComparableGeo, type ModoComparables } from '../lib/comparables'
import { Aviso, Buscador, Cabecera, Cargando, EstadoReceta, Etiqueta, NumInput } from '../components/ui'
import { cargarPlatos, type PlatoFila } from './Platos'

type Carta = { id: string; nombre: string; version: number; estado: string; cliente_id: string; redondeo: string; clientes: Cliente }
type Cliente = { id: string; nombre: string; zona: string | null; codigo_postal: string | null; lat: number | null; lng: number | null; modo_comparables: ModoComparables; radio_km: number; equipos: string[]; canales: string[]; restricciones: string[]; ticket_medio: number | null }
type Linea = { id: string; plato_id: string; categoria_carta_id: string | null; pvp_sin_iva: number | null; metodo_pvp: string | null; justificacion: string | null; orden: number; multiplicador: number | null; food_cost_objetivo: number | null }
type VLinea = { carta_plato_id: string; coste_total: number | null; componentes_sin_precio: number; multiplicador: number | null; multiplicador_origen: string; pvp_multiplicador: number | null; food_cost_objetivo: number | null; food_cost_origen: string | null; pvp_food_cost: number | null; multiplicador_efectivo: number | null; metodo_pvp: string; pvp_final_sin_iva: number | null; pvp_carta_con_iva: number | null; food_cost_real: number | null; margen_euros: number | null }
type Comparable = ComparableGeo & { plato: string; establecimiento: string | null; pvp_con_iva: number; fecha: string }

const METODOS = [['multiplicador', 'Multiplicador'], ['food_cost', 'Food cost objetivo'], ['comparables', 'Comparables de zona'], ['manual', 'Manual']] as const

/** Compatibilidad del plato con el brief del cliente (equipos y restricciones verificables). */
export function incompatibilidades(p: PlatoFila, c: Cliente): string[] {
  const r: string[] = []
  if (c.equipos.length) {
    const faltan = p.equipos.filter((e) => !c.equipos.includes(e))
    if (faltan.length) r.push(`necesita ${faltan.join(', ')}`)
  }
  if (c.restricciones.includes('sin gluten') && (p.alergenos ?? []).includes('gluten')) r.push('contiene gluten')
  return r
}

export default function CartaDetalle() {
  const { id } = useParams()
  const nav = useNavigate()
  const { edita, veCostes } = useAuth()
  const vert = useVertical()
  const [error, setError] = useState<string | null>(null)
  const [verIncompatibles, setVerIncompatibles] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const carta = useLoad(async () => ok(await supabase.from('cartas').select('*, clientes(*)').eq('id', id!).single()) as unknown as Carta, [id])
  const lineas = useLoad(async () => {
    const [l, v] = await Promise.all([
      supabase.from('carta_platos').select('*').eq('carta_id', id!).order('orden'),
      veCostes ? supabase.from('v_carta_escandallo').select('*').eq('carta_id', id!) : supabase.rpc('fn_precios_carta', { p_carta: id! }),
    ])
    const vm = new Map((ok(v) as VLinea[]).map((x) => [x.carta_plato_id, x]))
    return (ok(l) as Linea[]).map((x) => ({ ...x, v: vm.get(x.id) }))
  }, [id, veCostes])
  const platos = useLoad(cargarPlatos, [])
  const revision = useLoad(async () => ok(await supabase.rpc('fn_revisar_carta', { p_carta: id! })) as { tipo: string; plato: string | null; aviso: string }[], [id])
  const comparables = useLoad(async () => ok(await supabase.from('comparables').select('plato, establecimiento, pvp_con_iva, fecha, zona, codigo_postal, lat, lng').order('pvp_con_iva')) as Comparable[], [])
  const ids = (lineas.data ?? []).map((l) => l.plato_id).sort().join(',')
  const ind = useLoad(async () => calcularIndicadores(ids ? ids.split(',') : [], await cargarCatalogos(false)), [ids])
  const iva = useLoad(async () => (ok(await supabase.from('ajustes').select('valor').eq('clave', 'iva_hosteleria').single()) as { valor: number }).valor, [])

  const recargar = () => { lineas.reload(); revision.reload() }
  const pmap = useMemo(() => new Map((platos.data ?? []).map((p) => [p.id, p])), [platos.data])

  async function updLinea(lid: string, c: Partial<Linea>) {
    setError(null)
    const r = await supabase.from('carta_platos').update(c).eq('id', lid)
    if (r.error) setError(r.error.message)
    recargar()
  }
  async function updCarta(c: Partial<Carta>) {
    const r = await supabase.from('cartas').update(c).eq('id', id!)
    if (r.error) setError(r.error.message); else carta.reload()
  }

  if (carta.loading || vert.loading || platos.loading || lineas.loading) return <Cargando />
  if (carta.error) return <Aviso tipo="error">{carta.error}</Aviso>
  const k = carta.data!
  const cli = k.clientes
  const v = vert.data!
  const ivaV = iva.data ?? 0.1
  const ls = lineas.data ?? []
  const enCarta = new Set(ls.map((l) => l.plato_id))

  const opciones = (platos.data ?? [])
    .filter((p) => !enCarta.has(p.id) && p.estado !== 'archivada')
    .map((p) => ({ p, inc: incompatibilidades(p, cli) }))
    .filter((x) => verIncompatibles || x.inc.length === 0)
    .map(({ p, inc }) => ({ id: p.id, texto: p.nombre, detalle: [v.categorias.find((c) => c.id === p.categoria_carta_id)?.nombre, inc.length ? `⚠ ${inc.join('; ')}` : ''].filter(Boolean).join(' · ') }))
  const nOcultos = (platos.data ?? []).filter((p) => !enCarta.has(p.id) && incompatibilidades(p, cli).length > 0).length

  async function anadir(platoId: string) {
    const p = pmap.get(platoId)
    const r = await supabase.from('carta_platos').insert({ carta_id: id!, plato_id: platoId, categoria_carta_id: p?.categoria_carta_id ?? null, orden: ls.length + 1, metodo_pvp: 'multiplicador' })
    if (r.error) setError(r.error.message)
    recargar()
  }

  /** Cambia el método. Manual y comparables parten del precio actual; el resto se recalcula en vivo. */
  function elegirMetodo(l: (typeof ls)[number], metodo: string) {
    if (metodo === 'food_cost' && l.v?.food_cost_objetivo == null) {
      setError(`«${pmap.get(l.plato_id)?.nombre}» no tiene food cost objetivo: escríbelo en la columna «FC obj.» de esta fila.`)
    }
    if (metodo === 'manual' || metodo === 'comparables') return updLinea(l.id, { metodo_pvp: metodo, pvp_sin_iva: l.v?.pvp_final_sin_iva ?? null })
    return updLinea(l.id, { metodo_pvp: metodo, pvp_sin_iva: null })
  }

  async function congelar() {
    let n = 0
    for (const l of ls) {
      if (l.v?.coste_total == null) continue
      const r = await supabase.rpc('fn_guardar_escandallo', { p_plato: l.plato_id, p_metodo: l.metodo_pvp ?? 'multiplicador', p_pvp_sin_iva: l.v.pvp_final_sin_iva })
      if (r.error) return setError(r.error.message)
      n++
    }
    setAviso(`${n} escandallos guardados con la tarifa vigente.`)
  }

  async function nuevaVersion() {
    const nueva = ok(await supabase.from('cartas').insert({ cliente_id: k.cliente_id, nombre: k.nombre, version: k.version + 1, redondeo: k.redondeo }).select('id').single()) as { id: string }
    if (ls.length) ok(await supabase.from('carta_platos').insert(ls.map(({ id: _i, v: _v, ...l }) => ({ ...l, carta_id: nueva.id }))))
    await supabase.from('cartas').update({ estado: 'archivada' }).eq('id', id!)
    nav(`/cartas/${nueva.id}`)
  }

  // Agrupar por categoría
  const grupos = [...v.categorias, { id: '', nombre: 'Sin categoría', orden: 99 }]
    .map((c) => ({ c, filas: ls.filter((l) => (l.categoria_carta_id ?? pmap.get(l.plato_id)?.categoria_carta_id ?? '') === c.id) }))
    .filter((g) => g.filas.length)

  // Indicadores agregados
  const conCoste = ls.filter((l) => l.v?.coste_total != null && l.v?.pvp_final_sin_iva)
  const fcMedio = conCoste.length ? conCoste.reduce((s, l) => s + l.v!.coste_total!, 0) / conCoste.reduce((s, l) => s + l.v!.pvp_final_sin_iva!, 0) : null
  const equiposNec = Array.from(new Set(ls.flatMap((l) => pmap.get(l.plato_id)?.equipos ?? [])))
  const aptosDelivery = ls.filter((l) => pmap.get(l.plato_id)?.apto_delivery).length
  const cli0 = carta.data?.clientes
  const compRes = cli0 ? filtrarComparables(cli0, comparables.data ?? []) : null
  const compFilas = compRes?.filas ?? []
  const pvpsComp = compFilas.map((c) => c.pvp_con_iva).sort((a, b) => a - b)
  const mediana = pvpsComp.length ? (pvpsComp.length % 2 ? pvpsComp[(pvpsComp.length - 1) / 2] : (pvpsComp[pvpsComp.length / 2 - 1] + pvpsComp[pvpsComp.length / 2]) / 2) : null
  const criterioComp = !cli0 ? '' : cli0.modo_comparables === 'codigo_postal' ? `código postal ${cli0.codigo_postal ?? '—'}` : cli0.modo_comparables === 'radio' ? `radio ${num(cli0.radio_km)} km` : (cli0.zona ?? '')
  const avisosPorPlato = new Map<string, string[]>()
  ;(revision.data ?? []).forEach((r) => r.plato && avisosPorPlato.set(r.plato, [...(avisosPorPlato.get(r.plato) ?? []), r.aviso]))
  const avisosGenerales = (revision.data ?? []).filter((r) => !r.plato)

  return (
    <>
      <Cabecera titulo={`${k.nombre} · v${k.version}`} sub={<><Link to={`/clientes/${cli.id}`}>← {cli.nombre}</Link> · {cli.zona ?? 'sin zona'} · equipos: {cli.equipos.join(', ') || 'sin definir'} · canales: {cli.canales.join(', ')}</>}>
        <select value={k.estado} disabled={!edita} onChange={(e) => updCarta({ estado: e.target.value })}>
          {['borrador', 'presentada', 'aceptada', 'archivada'].map((s) => <option key={s}>{s}</option>)}
        </select>
        {edita && <button onClick={nuevaVersion}>Nueva versión</button>}
        <button className="btn-primario" onClick={() => nav(`/cartas/${id}/propuesta`)}>Propuesta</button>
      </Cabecera>
      {error && <Aviso tipo="error">{error}</Aviso>}
      {aviso && <Aviso tipo="ok">{aviso}</Aviso>}
      {cli.equipos.length === 0 && <Aviso tipo="alerta">El cliente no tiene equipos de cocina definidos: no se puede filtrar por compatibilidad.</Aviso>}
      {cli.restricciones.some((r) => r !== 'sin gluten') && <Aviso>Restricciones {cli.restricciones.filter((r) => r !== 'sin gluten').join(', ')}: la herramienta no puede verificarlas automáticamente; revísalas plato a plato.</Aviso>}

      <div className="kpis">
        <div className="kpi"><div className="e">Platos</div><div className="v">{ls.length}</div></div>
        {veCostes && <div className="kpi"><div className="e">Food cost medio ponderado</div><div className="v">{pct(fcMedio)}</div></div>}
        <div className="kpi"><div className="e">Referencias PM</div><div className="v">{ind.data?.refsPM ?? '…'}</div></div>
        <div className="kpi"><div className="e">Ingredientes únicos</div><div className="v">{ind.data?.ingredientesUnicos ?? '…'}</div></div>
        <div className="kpi"><div className="e">% componentes compartidos</div><div className="v">{pct(ind.data?.pctCompartidos ?? null, 0)}</div></div>
        <div className="kpi"><div className="e">Equipos necesarios</div><div className="v" style={{ fontSize: 14 }}>{equiposNec.join(', ') || '—'}</div></div>
        <div className="kpi"><div className="e">Aptos delivery</div><div className="v">{aptosDelivery} / {ls.length}</div></div>
      </div>

      <div className="tarjeta">
        <div className="cabecera" style={{ marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>Platos y precio</h2>
          {veCostes && edita && (
            <div className="acciones">
              <label className="peq">Redondeo de carta{' '}
                <select value={k.redondeo} onChange={(e) => updCarta({ redondeo: e.target.value }).then(recargar)}>
                  {MODOS_REDONDEO.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
                </select>
              </label>
              <button onClick={congelar} disabled={!ls.length} title="Guarda coste, PVP y fecha de tarifa de cada plato">Guardar escandallos</button>
            </div>
          )}
        </div>
        <table className="tabla">
          <thead>
            <tr>
              <th>Plato</th>
              {veCostes && <><th className="der">Coste</th><th className="der">Multiplicador</th><th className="der">FC obj. (%)</th><th className="der">PVP × k</th><th className="der">PVP por FC</th></>}
              <th>Método</th><th className="der">Carta con IVA</th><th className="der">PVP sin IVA</th>
              {veCostes && <><th className="der">FC real</th><th className="der">k real</th><th className="der">Margen</th></>}
              <th>Justificación</th>{edita && <th></th>}
            </tr>
          </thead>
          <tbody>
            {ls.length === 0 && <tr><td colSpan={14} className="tenue">Carta vacía. Añade platos desde la biblioteca.</td></tr>}
            {grupos.map((g) => (
              <Fragment key={g.c.id || 'sin'}>
                <tr className="grupo"><td colSpan={14}>{g.c.nombre} <span className="tenue peq">({g.filas.length})</span></td></tr>
                {g.filas.map((l) => {
                  const p = pmap.get(l.plato_id)
                  const x = l.v
                  const fcObj = x?.food_cost_objetivo ?? null
                  const pasa = fcObj != null && x?.food_cost_real != null && x.food_cost_real > fcObj + 0.0005
                  const avisos = avisosPorPlato.get(p?.nombre ?? '') ?? []
                  const metodo = x?.metodo_pvp ?? l.metodo_pvp ?? 'multiplicador'
                  const fijo = metodo === 'manual' || metodo === 'comparables'
                  return (
                    <tr key={l.id}>
                      <td>
                        <Link to={`/platos/${l.plato_id}`}>{p?.nombre}</Link> <EstadoReceta estado={p?.estado ?? null} />
                        {p && incompatibilidades(p, cli).map((t) => <div key={t}><Etiqueta tono="error">{t}</Etiqueta></div>)}
                        {avisos.filter((a) => !a.startsWith('Receta teórica')).map((a) => <div key={a} className="peq" style={{ color: 'var(--alerta)' }}>{a}</div>)}
                      </td>
                      {veCostes && <>
                        <td className="der">{x?.componentes_sin_precio ? <Etiqueta tono="alerta">sin precio</Etiqueta> : eur(x?.coste_total)}</td>
                        <td className={`der ${metodo === 'multiplicador' ? '' : 'tenue'}`}>
                          <NumInput ancho={60} valor={l.multiplicador} placeholder={x?.multiplicador == null ? '—' : num(x?.multiplicador)} deshabilitado={!edita} onGuardar={(n) => updLinea(l.id, { multiplicador: n })} />
                          <div className="tenue peq">{l.multiplicador != null ? 'esta carta' : x?.multiplicador == null ? 'sin definir' : x?.multiplicador_origen}</div>
                        </td>
                        <td className={`der ${metodo === 'food_cost' ? '' : 'tenue'}`}>
                          <NumInput ancho={60} valor={l.food_cost_objetivo == null ? null : Math.round(l.food_cost_objetivo * 1000) / 10}
                            placeholder={fcObj == null ? '—' : String(Math.round(fcObj * 1000) / 10).replace('.', ',')} deshabilitado={!edita}
                            onGuardar={(n) => updLinea(l.id, { food_cost_objetivo: n == null ? null : n / 100 })} />
                          <div className="tenue peq">{l.food_cost_objetivo == null ? (x?.food_cost_origen ?? 'sin definir') : 'esta carta'}</div>
                        </td>
                        <td className="der">{eur(x?.pvp_multiplicador)}</td>
                        <td className="der">{eur(x?.pvp_food_cost)}</td>
                      </>}
                      <td>
                        <select value={metodo} disabled={!edita} onChange={(e) => elegirMetodo(l, e.target.value)}>
                          {METODOS.map(([m, t]) => <option key={m} value={m}>{t}</option>)}
                        </select>
                      </td>
                      <td className="der">
                        {edita && fijo
                          ? <NumInput ancho={80} valor={x?.pvp_carta_con_iva ?? null} onGuardar={(n) => n != null && updLinea(l.id, { pvp_sin_iva: Math.round((n / (1 + ivaV)) * 10000) / 10000 })} />
                          : <b>{eur(x?.pvp_carta_con_iva)}</b>}
                      </td>
                      <td className="der">{eur(x?.pvp_final_sin_iva)}</td>
                      {veCostes && <>
                        <td className="der">{pasa ? <Etiqueta tono="error">{pct(x?.food_cost_real)}</Etiqueta> : pct(x?.food_cost_real)}</td>
                        <td className="der">{num(x?.multiplicador_efectivo)}</td>
                        <td className="der">{eur(x?.margen_euros)}</td>
                      </>}
                      <td><input defaultValue={l.justificacion ?? ''} disabled={!edita} placeholder="Por qué este precio" onBlur={(e) => e.target.value !== (l.justificacion ?? '') && updLinea(l.id, { justificacion: e.target.value || null })} /></td>
                      {edita && <td><button className="btn-mini" onClick={async () => { await supabase.from('carta_platos').delete().eq('id', l.id); recargar() }}>Quitar</button></td>}
                    </tr>
                  )
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
        {veCostes && <p className="tenue peq">El precio de carta se recalcula solo cuando cambia el coste, la tarifa, el multiplicador, el food cost objetivo o el redondeo. Multiplicador y FC objetivo se heredan (carta → plato → categoría → general) salvo que los escribas en la fila. «Manual» y «Comparables» fijan el precio con IVA.</p>}
        {edita && (
          <div className="fila-anadir">
            <Buscador opciones={opciones} onElegir={(o) => anadir(o.id)} placeholder="Añadir plato de la biblioteca…" />
            <label className="peq"><input type="checkbox" checked={verIncompatibles} onChange={(e) => setVerIncompatibles(e.target.checked)} /> Mostrar incompatibles ({nOcultos})</label>
          </div>
        )}
      </div>

      <div className="columnas">
        <div className="tarjeta">
          <h2>Revisión de reglas</h2>
          {revision.loading ? <Cargando /> : (revision.data ?? []).length === 0 ? <Aviso tipo="ok">Sin avisos.</Aviso> : (
            <>
              {avisosGenerales.map((a, i) => <Aviso key={i} tipo="alerta">{a.aviso}</Aviso>)}
              <table className="tabla">
                <tbody>
                  {(revision.data ?? []).filter((r) => r.plato).map((r, i) => (
                    <tr key={i}><td><Etiqueta tono={r.tipo === 'equipo' || r.tipo === 'precio' ? 'error' : r.tipo === 'validacion' ? 'neutro' : 'alerta'}>{r.tipo}</Etiqueta></td><td>{r.plato}</td><td className="peq">{r.aviso}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          <p className="tenue peq">Avisos, no bloqueos. Reglas configurables en Configuración.</p>
        </div>
        <div className="tarjeta">
          <h2>Bases de la carta</h2>
          {ind.data && Object.keys(ind.data.basesPorRol).length === 0 && <p className="tenue">Sin componentes con rol pan, proteína, queso o salsa.</p>}
          {ind.data && Object.entries(ind.data.basesPorRol).map(([rol, n]) => (
            <p key={rol}><b>{rol}</b> ({n.length}): <span className="tenue">{n.join(' · ')}</span></p>
          ))}
          <h2 style={{ marginTop: 16 }}>Comparables de zona {criterioComp && <span className="tenue">· {criterioComp}</span>}</h2>
          {compRes?.falta ? <p className="tenue">{compRes.falta}</p> : compFilas.length === 0 ? <p className="tenue">No hay comparables con este criterio.{compRes && compRes.sinDatos > 0 && ` ${compRes.sinDatos} sin datos suficientes para evaluarse.`} <Link to="/comparables">Añadir</Link></p> : (
            <>
              <p>Rango con IVA: <b>{eur(pvpsComp[0])}</b> – <b>{eur(pvpsComp[pvpsComp.length - 1])}</b> · mediana {eur(mediana)} · {pvpsComp.length} referencias</p>
              {compRes && compRes.sinDatos > 0 && <p className="tenue peq">{compRes.sinDatos} comparables no se pueden evaluar con este criterio (les falta {cli0?.modo_comparables === 'radio' ? 'localizar la dirección' : cli0?.modo_comparables === 'codigo_postal' ? 'el código postal' : 'la zona'}).</p>}
              <table className="tabla"><tbody>{[...compFilas].sort((a, b) => a.pvp_con_iva - b.pvp_con_iva).slice(0, 12).map((c, i) => <tr key={i}><td>{c.plato}</td><td className="peq">{c.establecimiento}</td>{c.distancia != null && <td className="der peq">{c.distancia < 1 ? `${Math.round(c.distancia * 1000)} m` : `${c.distancia.toFixed(1).replace('.', ',')} km`}</td>}<td className="der">{eur(c.pvp_con_iva)}</td></tr>)}</tbody></table>
            </>
          )}
        </div>
      </div>
    </>
  )
}
