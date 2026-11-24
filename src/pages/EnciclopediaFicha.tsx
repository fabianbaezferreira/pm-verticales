import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase, ok } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useLoad } from '../lib/hooks'
import { fecha } from '../lib/format'
import {
  CAMPOS_COMUNES, cargarAreas, ESTADOS, EVIDENCIAS, MERCADOS, RELACIONES, relacionTexto, TIPOS_FICHA, VALIDACIONES, type Ficha,
} from '../lib/enciclopedia'
import { Aviso, Buscador, Cabecera, Campo, Cargando, Etiqueta, type OpcionBusqueda } from '../components/ui'
import { EtqEstado, SelectEstado } from '../components/enc'

type Rel = { id: string; tipo: string; nota: string | null; origen_id: string; destino_id: string; origen: { id: string; codigo: string; nombre: string }; destino: { id: string; codigo: string; nombre: string } }
type EnlaceFuente = {
  id: string; documento_id: string | null; fuente_id: string | null; ubicacion: string | null; campo: string | null; tipo_evidencia: string
  fecha_consulta: string | null; estado_revision: string; nota: string | null
  documento: { codigo: string; titulo: string | null } | null; fuente: { codigo: string; nombre: string } | null
}
type Vinculo = {
  id: string; nota: string | null
  producto: { codigo: string; descripcion: string } | null; extra: { nombre: string } | null
  elaboracion: { id: string; nombre: string } | null; plato: { id: string; codigo: string; nombre: string } | null
}

const hoy = () => new Date().toISOString().slice(0, 10)

export default function EnciclopediaFicha() {
  const { id } = useParams()
  const nav = useNavigate()
  const { edita } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const f = useLoad(async () => ok(await supabase.from('enc_fichas').select('*').eq('id', id!).single()) as Ficha, [id])
  const ar = useLoad(cargarAreas, [])

  async function upd(c: Partial<Ficha>) {
    setError(null)
    const r = await supabase.from('enc_fichas').update(c).eq('id', id!)
    if (r.error) return setError(r.error.message)
    f.setData({ ...f.data!, ...c, actualizado_en: new Date().toISOString() })
  }
  async function eliminar() {
    if (!confirm('¿Eliminar esta ficha? Se borran también sus relaciones, enlaces a fuentes y vínculos. No se puede deshacer.')) return
    const r = await supabase.from('enc_fichas').delete().eq('id', id!)
    if (r.error) return setError(r.error.message)
    nav('/enciclopedia')
  }

  if (f.loading || ar.loading) return <Cargando />
  if (f.error) return <Aviso tipo="error">{f.error}</Aviso>
  if (ar.error) return <Aviso tipo="error">{ar.error}</Aviso>
  const x = f.data!
  const area = ar.data!.areas.find((a) => a.id === x.area_id)
  const campos = ar.data!.campos.filter((c) => c.area_id === x.area_id)
  const bloque = area?.bloques?.find((b) => b.codigo === x.bloque)

  function cambiarEstado(nuevo: string) {
    if (nuevo !== 'descartada_con_motivo') return upd({ estado: nuevo })
    const m = prompt('Motivo del descarte (el original no se borra)')?.trim()
    if (m) upd({ estado: nuevo, motivo_descarte: m })
  }
  function updCampo(clave: string, valor: string) {
    const n = { ...x.campos }
    if (valor.trim()) n[clave] = valor; else delete n[clave]
    upd({ campos: n })
  }

  return (
    <>
      <Cabecera titulo={x.nombre} sub={<><Link to={`/enciclopedia${area ? `?area=${area.codigo}` : ''}`}>← Enciclopedia</Link> · {x.codigo} · {TIPOS_FICHA[x.tipo]} · Área {area?.codigo} {area?.nombre}{bloque && ` · ${bloque.codigo} ${bloque.nombre}`}</>}>
        {x.mercado && <Etiqueta tono="neutro">{MERCADOS[x.mercado]}</Etiqueta>}
        <EtqEstado estado={x.estado} />
        {edita && <button onClick={eliminar}>Eliminar ficha</button>}
      </Cabecera>
      {error && <Aviso tipo="error">{error}</Aviso>}

      <div className="tarjeta">
        <h2>Identificación y estado</h2>
        <div className="rejilla">
          <Campo etiqueta="1 · Nombre"><input defaultValue={x.nombre} disabled={!edita} onBlur={(e) => e.target.value.trim() && e.target.value !== x.nombre && upd({ nombre: e.target.value.trim() })} /></Campo>
          <Campo etiqueta="Categoría"><input defaultValue={x.categoria ?? ''} disabled={!edita} onBlur={(e) => e.target.value !== (x.categoria ?? '') && upd({ categoria: e.target.value.trim() || null })} /></Campo>
          <Campo etiqueta="Subcategoría"><input defaultValue={x.subcategoria ?? ''} disabled={!edita} onBlur={(e) => e.target.value !== (x.subcategoria ?? '') && upd({ subcategoria: e.target.value.trim() || null })} /></Campo>
          <Campo etiqueta="Sinónimos" ayuda="Separados por comas">
            <input defaultValue={x.sinonimos.join(', ')} disabled={!edita} onBlur={(e) => {
              const n = e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
              if (n.join('|') !== x.sinonimos.join('|')) upd({ sinonimos: n })
            }} />
          </Campo>
          <Campo etiqueta="Estado de la ficha" ayuda={x.motivo_descarte ? `Motivo del descarte: ${x.motivo_descarte}` : 'Avance del trabajo documental (no del contenido)'}>
            <SelectEstado valor={x.estado} deshabilitado={!edita} onChange={cambiarEstado} />
          </Campo>
          <Campo etiqueta="10 · Validación" ayuda="Un hecho documentado no es una receta probada">
            <select value={x.validacion} disabled={!edita} onChange={(e) => upd({ validacion: e.target.value })}>
              {VALIDACIONES.map((v) => <option key={v.v} value={v.v}>{v.l}</option>)}
            </select>
          </Campo>
        </div>
        <p className="tenue peq">Creada {fecha(x.creado_en)} · actualizada {fecha(x.actualizado_en)}. Estados posibles: {ESTADOS.map((e) => e.l).join(' → ')}.</p>
      </div>

      <div className="tarjeta">
        <h2>Campos comunes</h2>
        <div className="rejilla">
          {CAMPOS_COMUNES.map((c) => (
            <Campo key={c.clave} etiqueta={`${c.n} · ${c.etiqueta}`} ayuda={c.ayuda} ancho="completo">
              <textarea rows={3} defaultValue={(x[c.clave] as string | null) ?? ''} disabled={!edita} onBlur={(e) => e.target.value !== ((x[c.clave] as string | null) ?? '') && upd({ [c.clave]: e.target.value.trim() || null } as Partial<Ficha>)} />
            </Campo>
          ))}
        </div>
      </div>

      <div className="tarjeta">
        <h2>Campos específicos · {area?.nombre} <span className="tenue peq">({campos.length})</span></h2>
        <p className="tenue peq">Lo que no se sabe se deja vacío o se escribe «Pendiente» / «No disponible»: no se rellena por intuición.</p>
        <div className="rejilla">
          {campos.map((c) => (
            <Campo key={c.id} etiqueta={`${c.orden} · ${c.etiqueta}`} ancho="completo">
              <textarea rows={2} defaultValue={x.campos[c.clave] ?? ''} disabled={!edita} onBlur={(e) => e.target.value !== (x.campos[c.clave] ?? '') && updCampo(c.clave, e.target.value)} />
            </Campo>
          ))}
        </div>
      </div>

      <Relaciones ficha={x} />
      <FuentesFicha ficha={x} campos={campos.map((c) => ({ clave: c.clave, etiqueta: `${c.orden} · ${c.etiqueta}` }))} />
      <Vinculos ficha={x} />
    </>
  )
}

function Relaciones({ ficha }: { ficha: Ficha }) {
  const { edita } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [dest, setDest] = useState<OpcionBusqueda | null>(null)
  const [tipo, setTipo] = useState('relacionada')
  const d = useLoad(async () => ok(await supabase.from('enc_relaciones')
    .select('id, tipo, nota, origen_id, destino_id, origen:enc_fichas!origen_id(id, codigo, nombre), destino:enc_fichas!destino_id(id, codigo, nombre)')
    .or(`origen_id.eq.${ficha.id},destino_id.eq.${ficha.id}`)) as unknown as Rel[], [ficha.id])
  const otras = useLoad(async () => edita ? (ok(await supabase.from('enc_fichas').select('id, codigo, nombre, tipo').neq('id', ficha.id).order('nombre').limit(2000)) as { id: string; codigo: string; nombre: string; tipo: string }[]).map((o) => ({ id: o.id, texto: o.nombre, detalle: o.codigo, grupo: TIPOS_FICHA[o.tipo] })) : [], [ficha.id, edita])

  async function anadir() {
    if (!dest) return
    setError(null)
    const r = await supabase.from('enc_relaciones').insert({ origen_id: ficha.id, destino_id: dest.id, tipo })
    if (r.error) return setError(r.error.code === '23505' ? 'Esa relación ya existe.' : r.error.message)
    setDest(null); d.reload()
  }
  async function quitar(id: string) {
    const r = await supabase.from('enc_relaciones').delete().eq('id', id)
    if (r.error) setError(r.error.message); else d.reload()
  }

  return (
    <div className="tarjeta">
      <h2>Relaciones con otras fichas</h2>
      {error && <Aviso tipo="error">{error}</Aviso>}
      {d.loading ? <Cargando /> : (d.data ?? []).length === 0 ? <p className="tenue">Sin relaciones todavía.</p> : (
        <table className="tabla"><tbody>
          {(d.data ?? []).map((r) => {
            const sale = r.origen_id === ficha.id
            const otra = sale ? r.destino : r.origen
            return (
              <tr key={r.id}>
                <td>{sale ? <><b>Esta ficha</b> {relacionTexto(r.tipo)} </> : <> </>}<Link to={`/enciclopedia/fichas/${otra.id}`}>{otra.nombre}</Link> <span className="tenue peq">{otra.codigo}</span>{!sale && <> {relacionTexto(r.tipo)} <b>esta ficha</b></>}</td>
                <td className="der">{edita && <button className="btn-mini" onClick={() => quitar(r.id)}>Quitar</button>}</td>
              </tr>
            )
          })}
        </tbody></table>
      )}
      {edita && (
        <div className="fila-anadir">
          <b>Esta ficha</b>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>{RELACIONES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}</select>
          {dest ? <span>{dest.texto} <span className="tenue peq">{dest.detalle}</span> <button className="btn-mini" onClick={() => setDest(null)}>×</button></span>
            : <Buscador opciones={otras.data ?? []} onElegir={setDest} placeholder="Buscar ficha…" />}
          <button onClick={anadir} disabled={!dest}>Añadir relación</button>
        </div>
      )}
    </div>
  )
}

function FuentesFicha({ ficha, campos }: { ficha: Ficha; campos: { clave: string; etiqueta: string }[] }) {
  const { edita } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [org, setOrg] = useState<OpcionBusqueda | null>(null)
  const [n, setN] = useState({ evidencia: 'hecho_documentado', ubicacion: '', campo: '', fecha: hoy() })
  const d = useLoad(async () => ok(await supabase.from('enc_ficha_fuentes')
    .select('*, documento:enc_documentos(codigo, titulo), fuente:enc_fuentes(codigo, nombre)').eq('ficha_id', ficha.id).order('creado_en')) as unknown as EnlaceFuente[], [ficha.id])
  const opciones = useLoad(async () => {
    if (!edita) return []
    const [fu, dc] = await Promise.all([
      supabase.from('enc_fuentes').select('id, codigo, nombre').order('codigo'),
      supabase.from('enc_documentos').select('id, codigo, titulo').order('codigo'),
    ])
    return [
      ...(ok(dc) as { id: string; codigo: string; titulo: string | null }[]).map((o) => ({ id: `d:${o.id}`, texto: o.titulo ?? o.codigo, detalle: o.codigo, grupo: 'Documento' })),
      ...(ok(fu) as { id: string; codigo: string; nombre: string }[]).map((o) => ({ id: `f:${o.id}`, texto: o.nombre, detalle: o.codigo, grupo: 'Fuente' })),
    ] as OpcionBusqueda[]
  }, [edita])

  const etiquetaCampo = (c: string | null) => !c ? 'Ficha en general' : CAMPOS_COMUNES.find((x) => x.clave === c) ? `${CAMPOS_COMUNES.find((x) => x.clave === c)!.n} · ${CAMPOS_COMUNES.find((x) => x.clave === c)!.etiqueta}` : campos.find((x) => x.clave === c)?.etiqueta ?? c

  async function anadir() {
    if (!org) return
    setError(null)
    const esDoc = org.id.startsWith('d:')
    const r = await supabase.from('enc_ficha_fuentes').insert({
      ficha_id: ficha.id, documento_id: esDoc ? org.id.slice(2) : null, fuente_id: esDoc ? null : org.id.slice(2),
      tipo_evidencia: n.evidencia, ubicacion: n.ubicacion.trim() || null, campo: n.campo || null, fecha_consulta: n.fecha || null,
    })
    if (r.error) return setError(r.error.message)
    setOrg(null); setN({ ...n, ubicacion: '', campo: '' }); d.reload()
  }
  async function upd(id: string, c: Record<string, unknown>) {
    const r = await supabase.from('enc_ficha_fuentes').update(c).eq('id', id)
    if (r.error) setError(r.error.message); else d.reload()
  }
  async function quitar(id: string) {
    const r = await supabase.from('enc_ficha_fuentes').delete().eq('id', id)
    if (r.error) setError(r.error.message); else d.reload()
  }

  return (
    <div className="tarjeta">
      <h2>8 · Fuentes y evidencia</h2>
      <p className="tenue peq">Cada dato debe poder rastrearse: documento o fuente + ubicación (título, sección, párrafo) + fecha + tipo de evidencia + estado de revisión. La IA no es fuente primaria.</p>
      {error && <Aviso tipo="error">{error}</Aviso>}
      {d.loading ? <Cargando /> : (d.data ?? []).length === 0 ? <p className="tenue">Sin fuentes enlazadas todavía.</p> : (
        <table className="tabla">
          <thead><tr><th>Origen</th><th>Respalda</th><th>Ubicación</th><th>Evidencia</th><th>Consulta</th><th>Revisión</th><th></th></tr></thead>
          <tbody>{(d.data ?? []).map((e) => (
            <tr key={e.id}>
              <td>{e.documento ? <>{e.documento.titulo ?? 'Documento'} <span className="tenue peq">{e.documento.codigo}</span></> : <>{e.fuente?.nombre} <span className="tenue peq">{e.fuente?.codigo}</span></>}</td>
              <td className="peq">{etiquetaCampo(e.campo)}</td>
              <td className="peq">{e.ubicacion ?? <span className="tenue">Pendiente</span>}</td>
              <td className="peq">{EVIDENCIAS.find((v) => v.v === e.tipo_evidencia)?.l}</td>
              <td className="peq">{fecha(e.fecha_consulta)}</td>
              <td><SelectEstado valor={e.estado_revision} deshabilitado={!edita} onChange={(v) => {
                if (v === 'descartada_con_motivo' && !confirm('Se marcará como descartado (el enlace no se borra). ¿Continuar?')) return
                upd(e.id, { estado_revision: v })
              }} /></td>
              <td className="der">{edita && <button className="btn-mini" onClick={() => quitar(e.id)}>Quitar</button>}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
      {edita && (
        <div className="fila-anadir" style={{ flexWrap: 'wrap' }}>
          {org ? <span>{org.grupo}: {org.texto} <span className="tenue peq">{org.detalle}</span> <button className="btn-mini" onClick={() => setOrg(null)}>×</button></span>
            : <Buscador opciones={opciones.data ?? []} onElegir={setOrg} placeholder="Buscar fuente o documento…" />}
          <select value={n.evidencia} onChange={(e) => setN({ ...n, evidencia: e.target.value })}>{EVIDENCIAS.map((v) => <option key={v.v} value={v.v}>{v.l}</option>)}</select>
          <select value={n.campo} onChange={(e) => setN({ ...n, campo: e.target.value })}>
            <option value="">Ficha en general</option>
            {CAMPOS_COMUNES.map((c) => <option key={c.clave} value={c.clave}>{c.n} · {c.etiqueta}</option>)}
            {campos.map((c) => <option key={c.clave} value={c.clave}>{c.etiqueta}</option>)}
          </select>
          <input placeholder="Ubicación (sección, párrafo…)" value={n.ubicacion} onChange={(e) => setN({ ...n, ubicacion: e.target.value })} style={{ minWidth: 200 }} />
          <input type="date" value={n.fecha} onChange={(e) => setN({ ...n, fecha: e.target.value })} />
          <button onClick={anadir} disabled={!org}>Enlazar</button>
        </div>
      )}
    </div>
  )
}

function Vinculos({ ficha }: { ficha: Ficha }) {
  const { edita, veCostes } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const d = useLoad(async () => ok(await supabase.from('enc_ficha_vinculos')
    .select('id, nota, producto:productos_pm(codigo, descripcion), extra:ingredientes_extra(nombre), elaboracion:elaboraciones(id, nombre), plato:platos(id, codigo, nombre)')
    .eq('ficha_id', ficha.id)) as unknown as Vinculo[], [ficha.id])
  const opciones = useLoad(async () => {
    if (!edita) return []
    const [p, e, el, pl] = await Promise.all([
      supabase.from('productos_pm').select('id, codigo, descripcion').eq('activo', true).order('descripcion'),
      supabase.from('ingredientes_extra').select('id, nombre').order('nombre'),
      supabase.from('elaboraciones').select('id, nombre').order('nombre'),
      supabase.from('platos').select('id, codigo, nombre').order('nombre'),
    ])
    return [
      ...(ok(p) as { id: string; codigo: string; descripcion: string }[]).map((o) => ({ id: `p:${o.id}`, texto: o.descripcion, detalle: o.codigo, grupo: 'Catálogo PM' })),
      ...(ok(e) as { id: string; nombre: string }[]).map((o) => ({ id: `e:${o.id}`, texto: o.nombre, grupo: 'Extra' })),
      ...(ok(el) as { id: string; nombre: string }[]).map((o) => ({ id: `l:${o.id}`, texto: o.nombre, grupo: 'Elaboración' })),
      ...(ok(pl) as { id: string; codigo: string; nombre: string }[]).map((o) => ({ id: `t:${o.id}`, texto: o.nombre, detalle: o.codigo, grupo: 'Plato' })),
    ] as OpcionBusqueda[]
  }, [edita])

  async function anadir(o: OpcionBusqueda) {
    setError(null)
    const col = { p: 'producto_id', e: 'extra_id', l: 'elaboracion_id', t: 'plato_id' }[o.id[0] as 'p' | 'e' | 'l' | 't']
    const r = await supabase.from('enc_ficha_vinculos').insert({ ficha_id: ficha.id, [col]: o.id.slice(2) })
    if (r.error) return setError(r.error.code === '23505' ? 'Ya está vinculado.' : r.error.message)
    d.reload()
  }
  async function quitar(id: string) {
    const r = await supabase.from('enc_ficha_vinculos').delete().eq('id', id)
    if (r.error) setError(r.error.message); else d.reload()
  }

  return (
    <div className="tarjeta">
      <h2>Catálogo y escandallos enlazados</h2>
      <p className="tenue peq">No se copia nada: la ficha apunta a las tablas actuales de Picking Market (catálogo, ingredientes extra, elaboraciones y platos con su escandallo). Los costes y precios internos se consultan allí{veCostes ? '' : ' (tu rol no los ve)'}.</p>
      {error && <Aviso tipo="error">{error}</Aviso>}
      {d.loading ? <Cargando /> : (d.data ?? []).length === 0 ? <p className="tenue">Sin enlaces todavía.</p> : (
        <table className="tabla"><tbody>
          {(d.data ?? []).map((v) => (
            <tr key={v.id}>
              <td>
                {v.producto && <><Etiqueta>Catálogo PM</Etiqueta> {v.producto.descripcion} <span className="tenue peq">{v.producto.codigo}</span></>}
                {v.extra && <><Etiqueta>Extra</Etiqueta> {v.extra.nombre}</>}
                {v.elaboracion && <><Etiqueta>Elaboración</Etiqueta> <Link to={`/elaboraciones/${v.elaboracion.id}`}>{v.elaboracion.nombre}</Link></>}
                {v.plato && <><Etiqueta>Plato · escandallo</Etiqueta> <Link to={`/platos/${v.plato.id}`}>{v.plato.nombre}</Link> <span className="tenue peq">{v.plato.codigo}</span></>}
              </td>
              <td className="der">{edita && <button className="btn-mini" onClick={() => quitar(v.id)}>Quitar</button>}</td>
            </tr>
          ))}
        </tbody></table>
      )}
      {edita && <div className="fila-anadir"><Buscador opciones={opciones.data ?? []} onElegir={anadir} placeholder="Enlazar referencia, extra, elaboración o plato…" /></div>}
    </div>
  )
}
