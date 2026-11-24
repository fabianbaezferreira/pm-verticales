import { Fragment, useState } from 'react'
import { supabase, ok } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { cargarVertical, useLoad } from '../lib/hooks'
import { fecha } from '../lib/format'
import { ESTADOS, type Area, type Fuente } from '../lib/enciclopedia'
import { Aviso, Campo, Cargando, Etiqueta, Fichas, normalizar } from '../components/ui'
import { EtqEstado, SelectEstado } from '../components/enc'

type Doc = { id: string; codigo: string; fuente_id: string; titulo: string | null; url_original: string | null; formato: string | null; estado: string; fecha_publicacion: string | null; fecha_consulta: string | null; original_conservado: boolean }

const FORMATOS = ['HTML', 'PDF', 'Vídeo / transcripción', 'Hoja de cálculo', 'Otro']

/** Pide el motivo si el nuevo estado es «descartada»: el original nunca se borra (regla 3 del framework). */
function estadoConMotivo(nuevo: string): { estado: string; motivo_descarte?: string } | null {
  if (nuevo !== 'descartada_con_motivo') return { estado: nuevo }
  const m = prompt('Motivo del descarte (el original no se borra)')?.trim()
  return m ? { estado: nuevo, motivo_descarte: m } : null
}

export function FuentesTab({ fuentes, cargando, error, areas, areaCodigo, reload }: {
  fuentes: Fuente[]; cargando: boolean; error: string | null; areas: Area[]; areaCodigo: string; reload: () => void
}) {
  const { edita } = useAuth()
  const [q, setQ] = useState('')
  const [mercado, setMercado] = useState('')
  const [estado, setEstado] = useState('')
  const [area, setArea] = useState(areaCodigo)
  const [abierta, setAbierta] = useState<string | null>(null)
  const [nueva, setNueva] = useState({ nombre: '', url: '' })
  const [err, setErr] = useState<string | null>(null)
  const docs = useLoad(async () => ok(await supabase.from('enc_documentos').select('id, codigo, fuente_id, titulo, url_original, formato, estado, fecha_publicacion, fecha_consulta, original_conservado').order('codigo')) as Doc[], [])

  const mercados = Array.from(new Set(fuentes.map((f) => f.mercado).filter(Boolean) as string[])).sort()
  const filas = fuentes.filter((f) =>
    (!q || normalizar(`${f.codigo} ${f.nombre} ${f.editor_autor ?? ''}`).includes(normalizar(q))) &&
    (!mercado || f.mercado === mercado) && (!estado || f.estado === estado) &&
    (!area || f.areas.some((a) => a.startsWith(area))))
  const nDocs = (id: string) => (docs.data ?? []).filter((d) => d.fuente_id === id).length

  async function crear() {
    setErr(null)
    const v = await cargarVertical()
    const { error } = await supabase.from('enc_fuentes').insert({ vertical_id: v.vertical.id, nombre: nueva.nombre.trim(), url: nueva.url.trim() || null, acceso: 'publico' })
    if (error) return setErr(error.message)
    setNueva({ nombre: '', url: '' }); reload()
  }

  return (
    <>
      <p className="tenue peq">Estar registrada no significa tenerla descargada, íntegra o verificada. El contenido en bruto de los documentos es privado (solo administradores y asesores).</p>
      <div className="acciones" style={{ marginBottom: 12 }}>
        <input placeholder="Buscar fuente" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={area} onChange={(e) => setArea(e.target.value)}>
          <option value="">Todas las áreas</option>
          {areas.map((a) => <option key={a.id} value={a.codigo}>{a.codigo} · {a.nombre.replace(' (PRIVADO)', '')}</option>)}
        </select>
        <select value={mercado} onChange={(e) => setMercado(e.target.value)}>
          <option value="">Todos los mercados</option>
          {mercados.map((m) => <option key={m}>{m}</option>)}
        </select>
        <select value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => <option key={e.v} value={e.v}>{e.l}</option>)}
        </select>
      </div>
      {edita && (
        <div className="tarjeta">
          <div className="fila-anadir" style={{ marginTop: 0 }}>
            <input placeholder="Nombre de la nueva fuente" value={nueva.nombre} onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })} style={{ flex: 1, minWidth: 220 }} />
            <input placeholder="URL (opcional)" value={nueva.url} onChange={(e) => setNueva({ ...nueva, url: e.target.value })} style={{ flex: 1, minWidth: 220 }} />
            <button className="btn-primario" disabled={!nueva.nombre.trim()} onClick={crear}>Registrar fuente</button>
          </div>
          {err && <Aviso tipo="error">{err}</Aviso>}
        </div>
      )}
      {cargando && fuentes.length === 0 ? <Cargando /> : error ? <Aviso tipo="error">{error}</Aviso> : (
        <table className="tabla">
          <thead><tr><th>Código</th><th>Fuente</th><th>Mercado</th><th>Tipo</th><th>Áreas</th><th>Estado</th><th className="der">Docs</th><th></th></tr></thead>
          <tbody>
            {filas.length === 0 && <tr><td colSpan={8} className="tenue">Ninguna fuente coincide con el filtro.</td></tr>}
            {filas.map((f) => (
              <Fragment key={f.id}>
                <tr className="clic" onClick={() => setAbierta(abierta === f.id ? null : f.id)}>
                  <td className="peq">{f.codigo}</td>
                  <td>{f.nombre}{f.privada && <> <Etiqueta tono="alerta">Privada</Etiqueta></>}</td>
                  <td className="peq">{f.mercado}</td><td className="peq">{f.tipo}</td>
                  <td className="peq">{f.areas.join(' · ')}</td>
                  <td><EtqEstado estado={f.estado} /></td>
                  <td className="der">{nDocs(f.id)}</td>
                  <td onClick={(e) => e.stopPropagation()}>{f.url && <a href={f.url} target="_blank" rel="noopener noreferrer">Abrir ↗</a>}</td>
                </tr>
                {abierta === f.id && (
                  <tr><td colSpan={8} style={{ background: '#faf9f7' }}>
                    <FuenteDetalle fuente={f} docs={(docs.data ?? []).filter((d) => d.fuente_id === f.id)} areas={areas} onCambio={() => { reload(); docs.reload() }} />
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

function FuenteDetalle({ fuente: f, docs, areas, onCambio }: { fuente: Fuente; docs: Doc[]; areas: Area[]; onCambio: () => void }) {
  const { edita } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [nd, setNd] = useState({ titulo: '', url: '', formato: 'HTML' })

  async function upd(c: Partial<Fuente>) {
    setError(null)
    const r = await supabase.from('enc_fuentes').update(c).eq('id', f.id)
    if (r.error) setError(r.error.message); else onCambio()
  }
  async function crearDoc() {
    setError(null)
    const r = await supabase.from('enc_documentos').insert({ fuente_id: f.id, titulo: nd.titulo.trim() || null, url_original: nd.url.trim() || null, formato: nd.formato })
    if (r.error) return setError(r.error.message)
    setNd({ titulo: '', url: '', formato: 'HTML' }); onCambio()
  }
  async function updDoc(id: string, c: Record<string, unknown>) {
    setError(null)
    const r = await supabase.from('enc_documentos').update(c).eq('id', id)
    if (r.error) setError(r.error.message); else onCambio()
  }
  const codigosAreas = areas.flatMap((a) => (a.codigo === '11' ? ['11A', '11B', '11C', '11D'] : [a.codigo]))

  return (
    <div style={{ padding: '8px 4px' }}>
      {error && <Aviso tipo="error">{error}</Aviso>}
      <div className="rejilla">
        <Campo etiqueta="Nombre"><input defaultValue={f.nombre} disabled={!edita} onBlur={(e) => e.target.value.trim() && e.target.value !== f.nombre && upd({ nombre: e.target.value.trim() })} /></Campo>
        <Campo etiqueta="Editor / autor"><input defaultValue={f.editor_autor ?? ''} disabled={!edita} onBlur={(e) => e.target.value !== (f.editor_autor ?? '') && upd({ editor_autor: e.target.value.trim() || null })} /></Campo>
        <Campo etiqueta="Mercado"><input defaultValue={f.mercado ?? ''} disabled={!edita} onBlur={(e) => e.target.value !== (f.mercado ?? '') && upd({ mercado: e.target.value.trim() || null })} /></Campo>
        <Campo etiqueta="Tipo"><input defaultValue={f.tipo ?? ''} disabled={!edita} onBlur={(e) => e.target.value !== (f.tipo ?? '') && upd({ tipo: e.target.value.trim() || null })} /></Campo>
        <Campo etiqueta="URL" ancho="completo"><input defaultValue={f.url ?? ''} disabled={!edita} onBlur={(e) => e.target.value !== (f.url ?? '') && upd({ url: e.target.value.trim() || null })} /></Campo>
        <Campo etiqueta="Acceso">
          <select value={f.acceso ?? ''} disabled={!edita} onChange={(e) => upd({ acceso: e.target.value || null })}>
            <option value="">Pendiente</option><option value="publico">Público</option><option value="restringido">Restringido</option><option value="privado">Privado</option>
          </select>
        </Campo>
        <Campo etiqueta="Prioridad">
          <select value={f.prioridad ?? ''} disabled={!edita} onChange={(e) => upd({ prioridad: e.target.value || null })}>
            <option value="">Pendiente</option><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option>
          </select>
        </Campo>
        <Campo etiqueta="Estado" ayuda={f.motivo_descarte ? `Motivo del descarte: ${f.motivo_descarte}` : undefined}>
          <SelectEstado valor={f.estado} deshabilitado={!edita} onChange={(v) => { const c = estadoConMotivo(v); if (c) upd(c) }} />
        </Campo>
        <Campo etiqueta="Áreas relacionadas" ancho="completo">
          <Fichas opciones={codigosAreas} valor={f.areas} deshabilitado={!edita} onChange={(v) => upd({ areas: [...v].sort() })} />
        </Campo>
        <Campo etiqueta="Notas" ancho="completo"><textarea defaultValue={f.notas ?? ''} disabled={!edita} onBlur={(e) => e.target.value !== (f.notas ?? '') && upd({ notas: e.target.value.trim() || null })} /></Campo>
      </div>
      <h3 style={{ marginTop: 14 }}>Documentos de esta fuente</h3>
      {docs.length === 0 ? <p className="tenue peq">Todavía no hay documentos registrados. Se añadirán en la fase de captura.</p> : (
        <table className="tabla">
          <thead><tr><th>Código</th><th>Documento</th><th>Formato</th><th>Original</th><th>Consulta</th><th>Estado</th></tr></thead>
          <tbody>{docs.map((d) => (
            <tr key={d.id}>
              <td className="peq">{d.codigo}</td>
              <td>{d.titulo ?? <span className="tenue">Sin título</span>} {d.url_original && <a href={d.url_original} target="_blank" rel="noopener noreferrer">↗</a>}</td>
              <td className="peq">{d.formato}</td>
              <td className="peq">{d.original_conservado ? 'Conservado' : 'No conservado'}</td>
              <td className="peq">{fecha(d.fecha_consulta)}</td>
              <td><SelectEstado valor={d.estado} deshabilitado={!edita} onChange={(v) => { const c = estadoConMotivo(v); if (c) updDoc(d.id, c) }} /></td>
            </tr>
          ))}</tbody>
        </table>
      )}
      {edita && (
        <div className="fila-anadir">
          <input placeholder="Título del documento" value={nd.titulo} onChange={(e) => setNd({ ...nd, titulo: e.target.value })} style={{ flex: 1, minWidth: 200 }} />
          <input placeholder="URL original" value={nd.url} onChange={(e) => setNd({ ...nd, url: e.target.value })} style={{ flex: 1, minWidth: 200 }} />
          <select value={nd.formato} onChange={(e) => setNd({ ...nd, formato: e.target.value })}>{FORMATOS.map((x) => <option key={x}>{x}</option>)}</select>
          <button onClick={crearDoc} disabled={!nd.titulo.trim() && !nd.url.trim()}>Registrar documento</button>
        </div>
      )}
    </div>
  )
}

type Inc = { id: string; codigo: string; fuente_id: string | null; url: string | null; causa: string; fecha: string; estado: string; solucion: string | null; fuente: { codigo: string; nombre: string } | null }
const ESTADOS_INC: [string, string][] = [['abierta', 'Abierta'], ['en_curso', 'En curso'], ['resuelta', 'Resuelta'], ['descartada', 'Descartada']]

export function IncidenciasTab({ fuentes }: { fuentes: Fuente[] }) {
  const { edita } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [n, setN] = useState({ fuente_id: '', url: '', causa: '' })
  const d = useLoad(async () => ok(await supabase.from('enc_incidencias').select('*, fuente:enc_fuentes(codigo, nombre)').order('creado_en', { ascending: false })) as unknown as Inc[], [])

  async function crear() {
    setError(null)
    const r = await supabase.from('enc_incidencias').insert({ fuente_id: n.fuente_id || null, url: n.url.trim() || null, causa: n.causa.trim() })
    if (r.error) return setError(r.error.message)
    setN({ fuente_id: '', url: '', causa: '' }); d.reload()
  }
  async function upd(id: string, c: Record<string, unknown>) {
    setError(null)
    const r = await supabase.from('enc_incidencias').update(c).eq('id', id)
    if (r.error) setError(r.error.message); else d.reload()
  }

  return (
    <>
      <p className="tenue peq">Bloqueos, páginas de verificación, contenidos incompletos y cualquier problema de captura. Una incidencia no borra el original.</p>
      {error && <Aviso tipo="error">{error}</Aviso>}
      {edita && (
        <div className="tarjeta">
          <div className="fila-anadir" style={{ marginTop: 0 }}>
            <select value={n.fuente_id} onChange={(e) => setN({ ...n, fuente_id: e.target.value })}>
              <option value="">Fuente (opcional)</option>
              {fuentes.map((f) => <option key={f.id} value={f.id}>{f.codigo} · {f.nombre}</option>)}
            </select>
            <input placeholder="URL (opcional)" value={n.url} onChange={(e) => setN({ ...n, url: e.target.value })} style={{ flex: 1, minWidth: 180 }} />
            <input placeholder="Causa" value={n.causa} onChange={(e) => setN({ ...n, causa: e.target.value })} style={{ flex: 2, minWidth: 220 }} />
            <button className="btn-primario" disabled={!n.causa.trim()} onClick={crear}>Registrar incidencia</button>
          </div>
        </div>
      )}
      {d.loading ? <Cargando /> : d.error ? <Aviso tipo="error">{d.error}</Aviso> : (
        <table className="tabla">
          <thead><tr><th>Código</th><th>Fecha</th><th>Fuente</th><th>Causa</th><th>Estado</th><th>Solución</th></tr></thead>
          <tbody>
            {(d.data ?? []).length === 0 && <tr><td colSpan={6} className="tenue">Sin incidencias registradas.</td></tr>}
            {(d.data ?? []).map((i) => (
              <tr key={i.id}>
                <td className="peq">{i.codigo}</td><td className="peq">{fecha(i.fecha)}</td>
                <td className="peq">{i.fuente ? `${i.fuente.codigo} · ${i.fuente.nombre}` : '—'}{i.url && <> <a href={i.url} target="_blank" rel="noopener noreferrer">↗</a></>}</td>
                <td>{i.causa}</td>
                <td><select value={i.estado} disabled={!edita} onChange={(e) => upd(i.id, { estado: e.target.value })}>{ESTADOS_INC.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></td>
                <td><input defaultValue={i.solucion ?? ''} disabled={!edita} placeholder="Solución" onBlur={(e) => e.target.value !== (i.solucion ?? '') && upd(i.id, { solucion: e.target.value.trim() || null })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
