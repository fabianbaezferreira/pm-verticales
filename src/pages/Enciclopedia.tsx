import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, ok } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { cargarVertical, useLoad } from '../lib/hooks'
import { fecha } from '../lib/format'
import { cargarAreas, consultaTexto, ESTADOS, MERCADOS, TIPOS_FICHA, VALIDACIONES, type Area, type Fuente } from '../lib/enciclopedia'
import { Aviso, Cabecera, Cargando, Etiqueta } from '../components/ui'
import { EtqEstado, EtqValidacion } from '../components/enc'
import { FuentesTab, IncidenciasTab } from './EnciclopediaFuentes'

type FilaFicha = { id: string; codigo: string; nombre: string; tipo: string; area_id: string; bloque: string | null; estado: string; validacion: string; categoria: string | null; actualizado_en: string }
type FilaCob = { area_id: string; estado: string | null; validacion: string | null; fichas: number }

const PESTANAS = [['fichas', 'Fichas'], ['fuentes', 'Fuentes y documentos'], ['incidencias', 'Incidencias'], ['cobertura', 'Cobertura']] as const

export default function Enciclopedia() {
  const [sp, setSp] = useSearchParams()
  const tab = sp.get('tab') ?? 'fichas'
  const areaCod = sp.get('area') ?? ''
  const bloque = sp.get('bloque') ?? ''
  const poner = (c: Record<string, string>) => {
    const n = new URLSearchParams(sp)
    Object.entries(c).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k)))
    setSp(n, { replace: true })
  }

  const ar = useLoad(cargarAreas, [])
  const cob = useLoad(async () => ok(await supabase.from('enc_v_cobertura').select('*')) as FilaCob[], [])
  const fu = useLoad(async () => ok(await supabase.from('enc_fuentes').select('*').order('codigo')) as Fuente[], [])
  const nProductos = useLoad(async () => (await supabase.from('productos_pm').select('id', { count: 'exact', head: true }).eq('activo', true)).count ?? 0, [])

  if (ar.loading) return <Cargando />
  if (ar.error) return <Aviso tipo="error">{ar.error}</Aviso>
  const areas = ar.data!.areas
  const area = areas.find((a) => a.codigo === areaCod) ?? null
  const totalArea = (a: Area) =>
    a.modo === 'fuentes' ? (fu.data?.length ?? 0) : a.modo === 'catalogo_pm' ? (nProductos.data ?? 0) : (cob.data ?? []).filter((c) => c.area_id === a.id).reduce((s, c) => s + c.fichas, 0)
  const totalFichas = (cob.data ?? []).reduce((s, c) => s + c.fichas, 0)

  return (
    <>
      <Cabecera titulo="Enciclopedia" sub="Burger Intelligence: base de conocimiento gastronómico en 13 áreas, con fichas relacionadas y trazables a sus fuentes.">
        <Etiqueta tono="neutro">{totalFichas} fichas · {fu.data?.length ?? 0} fuentes</Etiqueta>
      </Cabecera>
      <div className="pestanas">
        {PESTANAS.map(([k, t]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => poner({ tab: k === 'fichas' ? '' : k })}>{t}</button>)}
      </div>

      {tab === 'fichas' && (
        <div className="enc-rejilla">
          <div className="tarjeta enc-areas">
            <button className={`enc-area ${!area ? 'on' : ''}`} onClick={() => poner({ area: '', bloque: '' })}><span>Todas las áreas</span><span>{totalFichas}</span></button>
            {areas.map((a) => (
              <button key={a.id} className={`enc-area ${area?.id === a.id ? 'on' : ''}`} onClick={() => poner({ area: a.codigo, bloque: '' })}>
                <span><b>{a.codigo}</b> {a.nombre.replace(' (PRIVADO)', '')}{a.privada && ' 🔒'}</span>
                <span>{a.modo === 'fichas' ? totalArea(a) : '↗'}</span>
              </button>
            ))}
          </div>
          <div>
            <AreaPanel area={area} fuentes={fu.data ?? []} nProductos={nProductos.data ?? 0} campos={ar.data!.campos.filter((c) => c.area_id === area?.id).length} verFuentes={() => poner({ tab: 'fuentes' })} />
            {(!area || area.modo === 'fichas') && <ListaFichas areas={areas} area={area} bloque={bloque} setBloque={(b) => poner({ bloque: b })} />}
          </div>
        </div>
      )}
      {tab === 'fuentes' && <FuentesTab fuentes={fu.data ?? []} cargando={fu.loading} error={fu.error} areas={areas} areaCodigo={areaCod} reload={fu.reload} />}
      {tab === 'incidencias' && <IncidenciasTab fuentes={fu.data ?? []} />}
      {tab === 'cobertura' && <Cobertura areas={areas} cob={cob.data ?? []} fuentes={fu.data ?? []} nProductos={nProductos.data ?? 0} cargando={cob.loading} />}
    </>
  )
}

function AreaPanel({ area, fuentes, nProductos, campos, verFuentes }: { area: Area | null; fuentes: Fuente[]; nProductos: number; campos: number; verFuentes: () => void }) {
  if (!area) return null
  return (
    <div className="tarjeta">
      <h2>Área {area.codigo} · {area.nombre.replace(' (PRIVADO)', '')} {area.privada && <Etiqueta tono="alerta">Privada</Etiqueta>}</h2>
      {area.notas && <p className="tenue peq" style={{ whiteSpace: 'pre-wrap' }}>{area.notas}</p>}
      <p className="peq tenue">{campos} campos específicos. {area.modo === 'fichas' ? `Tipos de ficha: ${area.tipos_ficha.map((t) => TIPOS_FICHA[t]).join(', ')}.` : ''}</p>
      {area.modo === 'fuentes' && (
        <Aviso tipo="info">Esta área no tiene fichas propias: sus campos son los de cada fuente y documento. Hay {fuentes.length} fuentes registradas. <button className="btn-mini" onClick={verFuentes}>Ver fuentes y documentos</button></Aviso>
      )}
      {area.modo === 'catalogo_pm' && (
        <Aviso tipo="info">
          Esta área no se duplica: los datos viven en el catálogo de Picking Market ({nProductos} referencias activas) y en los escandallos. Las fichas de otras áreas se enlazan a ellos desde su apartado «Catálogo y escandallos».{' '}
          <Link to="/catalogo">Catálogo PM</Link> · <Link to="/platos">Platos y escandallos</Link> · <Link to="/elaboraciones">Elaboraciones</Link>
        </Aviso>
      )}
    </div>
  )
}

function ListaFichas({ areas, area, bloque, setBloque }: { areas: Area[]; area: Area | null; bloque: string; setBloque: (b: string) => void }) {
  const { edita } = useAuth()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [tipo, setTipo] = useState('')
  const [estado, setEstado] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [nuevo, setNuevo] = useState({ nombre: '', tipo: '', bloque: '' })

  const d = useLoad(async () => {
    let r = supabase.from('enc_fichas').select('id, codigo, nombre, tipo, area_id, bloque, estado, validacion, categoria, actualizado_en').order('nombre').limit(500)
    if (area) r = r.eq('area_id', area.id)
    if (bloque) r = r.eq('bloque', bloque)
    if (tipo) r = r.eq('tipo', tipo)
    if (estado) r = r.eq('estado', estado)
    const t = q.trim()
    if (t) {
      if (/^[a-z]{1,2}\d+$/i.test(t)) r = r.ilike('codigo', `${t}%`)
      else { const c = consultaTexto(t); if (c) r = r.textSearch('busqueda', c, { config: 'spanish' }) }
    }
    return ok(await r) as FilaFicha[]
  }, [area?.id, bloque, tipo, estado, q])

  const tiposDisponibles = area ? area.tipos_ficha : Object.keys(TIPOS_FICHA)
  const tipoNuevo = nuevo.tipo || (area?.tipos_ficha.length === 1 ? area.tipos_ficha[0] : '')

  async function crear() {
    if (!area) return
    setError(null)
    const v = await cargarVertical()
    const { data, error } = await supabase.from('enc_fichas').insert({
      vertical_id: v.vertical.id, area_id: area.id, tipo: tipoNuevo, nombre: nuevo.nombre.trim(),
      bloque: area.codigo === '11' ? nuevo.bloque : null,
    }).select('id').single()
    if (error) return setError(error.message)
    nav(`/enciclopedia/fichas/${data.id}`)
  }

  const areaDe = (id: string) => areas.find((a) => a.id === id)
  return (
    <>
      {area?.codigo === '11' && (
        <div className="pestanas">
          <button className={!bloque ? 'on' : ''} onClick={() => setBloque('')}>Todos</button>
          {area.bloques?.map((b) => <button key={b.codigo} className={bloque === b.codigo ? 'on' : ''} onClick={() => setBloque(b.codigo)} title={b.nombre}>{b.codigo} · {b.nombre}</button>)}
        </div>
      )}
      <div className="acciones" style={{ marginBottom: 12 }}>
        <input placeholder="Buscar en fichas (texto o código, p. ej. I0003)" value={q} onChange={(e) => setQ(e.target.value)} style={{ minWidth: 280 }} />
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          {tiposDisponibles.map((t) => <option key={t} value={t}>{TIPOS_FICHA[t]}</option>)}
        </select>
        <select value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => <option key={e.v} value={e.v}>{e.l}</option>)}
        </select>
      </div>
      {edita && area && area.modo === 'fichas' && (
        <div className="tarjeta">
          <div className="fila-anadir" style={{ marginTop: 0 }}>
            <input placeholder={`Nombre de la nueva ficha en «${area.nombre}»`} value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} style={{ flex: 1, minWidth: 220 }} />
            <select value={tipoNuevo} onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value })}>
              <option value="">Tipo…</option>
              {area.tipos_ficha.map((t) => <option key={t} value={t}>{TIPOS_FICHA[t]}</option>)}
            </select>
            {area.codigo === '11' && (
              <select value={nuevo.bloque} onChange={(e) => setNuevo({ ...nuevo, bloque: e.target.value })}>
                <option value="">Bloque…</option>
                {area.bloques?.map((b) => <option key={b.codigo} value={b.codigo}>{b.codigo} · {b.nombre}</option>)}
              </select>
            )}
            <button className="btn-primario" disabled={!nuevo.nombre.trim() || !tipoNuevo || (area.codigo === '11' && !nuevo.bloque)} onClick={crear}>Crear ficha</button>
          </div>
          {error && <Aviso tipo="error">{error}</Aviso>}
        </div>
      )}
      {edita && !area && <p className="tenue peq">Para crear una ficha, elige primero un área en la lista de la izquierda.</p>}
      {d.loading ? <Cargando /> : d.error ? <Aviso tipo="error">{d.error}</Aviso> : (
        <table className="tabla">
          <thead><tr><th>Código</th><th>Ficha</th><th>Tipo</th>{!area && <th>Área</th>}<th>Estado</th><th>Validación</th><th>Actualizada</th></tr></thead>
          <tbody>
            {(d.data ?? []).length === 0 && <tr><td colSpan={7} className="tenue">{q || tipo || estado || bloque ? 'Ninguna ficha coincide con el filtro.' : 'Todavía no hay fichas en esta selección. Las fichas se crearán en la fase de extracción.'}</td></tr>}
            {(d.data ?? []).map((f) => (
              <tr key={f.id} className="clic" onClick={() => nav(`/enciclopedia/fichas/${f.id}`)}>
                <td className="peq">{f.codigo}</td>
                <td>{f.nombre}{f.categoria && <span className="tenue peq"> · {f.categoria}</span>}</td>
                <td className="peq">{TIPOS_FICHA[f.tipo]}{f.bloque && ` · ${f.bloque}`}</td>
                {!area && <td className="peq">{areaDe(f.area_id)?.codigo}</td>}
                <td><EtqEstado estado={f.estado} /></td><td><EtqValidacion validacion={f.validacion} /></td><td className="peq">{fecha(f.actualizado_en)}</td>
              </tr>
            ))}
          </tbody>
          {(d.data ?? []).length >= 500 && <tfoot><tr><td colSpan={7} className="tenue peq">Se muestran las 500 primeras. Afina la búsqueda.</td></tr></tfoot>}
        </table>
      )}
    </>
  )
}

function Cobertura({ areas, cob, fuentes, nProductos, cargando }: { areas: Area[]; cob: FilaCob[]; fuentes: Fuente[]; nProductos: number; cargando: boolean }) {
  if (cargando) return <Cargando />
  const n = (a: Area, estado: string) =>
    a.modo === 'fuentes' ? fuentes.filter((f) => f.estado === estado).length : cob.filter((c) => c.area_id === a.id && c.estado === estado).reduce((s, c) => s + c.fichas, 0)
  const nv = (a: Area, v: string) => cob.filter((c) => c.area_id === a.id && c.validacion === v).reduce((s, c) => s + c.fichas, 0)
  const total = (a: Area) => (a.modo === 'fuentes' ? fuentes.length : cob.filter((c) => c.area_id === a.id).reduce((s, c) => s + c.fichas, 0))
  const fichasTotal = areas.filter((a) => a.modo === 'fichas').reduce((s, a) => s + total(a), 0)
  const sinFichas = areas.filter((a) => a.modo === 'fichas' && total(a) === 0).length
  return (
    <>
      <div className="kpis">
        <div className="kpi"><div className="e">Fichas</div><div className="v">{fichasTotal}</div></div>
        <div className="kpi"><div className="e">Fuentes registradas</div><div className="v">{fuentes.length}</div></div>
        <div className="kpi"><div className="e">Fuentes capturadas o más</div><div className="v">{fuentes.filter((f) => !['registrada', 'pendiente_de_captura', 'bloqueada', 'descartada_con_motivo'].includes(f.estado)).length}</div></div>
        <div className="kpi"><div className="e">Áreas con fichas sin cubrir</div><div className="v">{sinFichas} de {areas.filter((a) => a.modo === 'fichas').length}</div></div>
      </div>
      <h2>Fichas por área y estado</h2>
      <p className="tenue peq">El área 12 cuenta fuentes; el área 13 vive en el Catálogo PM ({nProductos} referencias activas) y no tiene fichas propias.</p>
      <div style={{ overflowX: 'auto' }}>
        <table className="tabla">
          <thead><tr><th>Área</th><th className="der">Total</th>{ESTADOS.map((e) => <th key={e.v} className="der" title={e.l}>{e.l}</th>)}</tr></thead>
          <tbody>
            {areas.map((a) => (
              <tr key={a.id}>
                <td><b>{a.codigo}</b> {a.nombre.replace(' (PRIVADO)', '')}</td>
                {a.modo === 'catalogo_pm' ? <td colSpan={ESTADOS.length + 1} className="tenue peq">Enlazada con el Catálogo PM y los escandallos (no se duplica)</td> : (
                  <>
                    <td className="der"><b>{total(a)}</b></td>
                    {ESTADOS.map((e) => <td key={e.v} className="der">{n(a, e.v) || <span className="tenue">·</span>}</td>)}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 style={{ marginTop: 20 }}>Fichas por área y validación</h2>
      <table className="tabla">
        <thead><tr><th>Área</th>{VALIDACIONES.map((v) => <th key={v.v} className="der">{v.l}</th>)}</tr></thead>
        <tbody>
          {areas.filter((a) => a.modo === 'fichas').map((a) => (
            <tr key={a.id}><td><b>{a.codigo}</b> {a.nombre}</td>{VALIDACIONES.map((v) => <td key={v.v} className="der">{nv(a, v.v) || <span className="tenue">·</span>}</td>)}</tr>
          ))}
        </tbody>
      </table>
      <h2 style={{ marginTop: 20 }}>Fuentes por mercado y estado</h2>
      <table className="tabla">
        <thead><tr><th>Mercado</th><th className="der">Total</th>{ESTADOS.map((e) => <th key={e.v} className="der">{e.l}</th>)}</tr></thead>
        <tbody>
          {Array.from(new Set(fuentes.map((f) => f.mercado ?? 'Sin mercado'))).sort().map((m) => {
            const fs = fuentes.filter((f) => (f.mercado ?? 'Sin mercado') === m)
            return <tr key={m}><td>{m}</td><td className="der"><b>{fs.length}</b></td>{ESTADOS.map((e) => <td key={e.v} className="der">{fs.filter((f) => f.estado === e.v).length || <span className="tenue">·</span>}</td>)}</tr>
          })}
        </tbody>
      </table>
      <p className="tenue peq" style={{ marginTop: 10 }}>Mercados de las fichas: {Object.values(MERCADOS).join(' · ')}. Las del bloque 11A/11B son de España y las 11C/11D de EEUU y mundo.</p>
    </>
  )
}
