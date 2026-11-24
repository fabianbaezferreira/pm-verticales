import { useState } from 'react'
import { supabase, ok } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { cargarVertical, useLoad } from '../lib/hooks'
import { eur, fecha } from '../lib/format'
import { localizarDireccion } from '../lib/comparables'
import { Aviso, Cabecera, Campo, Cargando, NumInput } from '../components/ui'

type Comp = { id: string; zona: string | null; codigo_postal: string | null; direccion: string | null; lat: number | null; lng: number | null; establecimiento: string | null; plato: string; pvp_con_iva: number; fecha: string; fuente: string | null }

export default function Comparables() {
  const { edita } = useAuth()
  const [zona, setZona] = useState('')
  const d = useLoad(async () => ok(await supabase.from('comparables').select('*').order('zona').order('pvp_con_iva')) as Comp[], [])
  const vacio = { zona: '', codigo_postal: '', direccion: '', lat: null as number | null, lng: null as number | null, establecimiento: '', plato: '', pvp_con_iva: null as number | null, fecha: new Date().toISOString().slice(0, 10), fuente: '' }
  const [n, setN] = useState(vacio)
  const [error, setError] = useState<string | null>(null)

  async function crear() {
    const v = await cargarVertical()
    setError(null)
    const r = await supabase.from('comparables').insert({ ...n, zona: n.zona.trim() || null, codigo_postal: n.codigo_postal.trim() || null, direccion: n.direccion.trim() || null, establecimiento: n.establecimiento || null, fuente: n.fuente || null, vertical_id: v.vertical.id })
    if (r.error) return setError(r.error.message)
    setN({ ...vacio, zona: n.zona, codigo_postal: n.codigo_postal, fecha: n.fecha }); setInfoLoc(null); d.reload()
  }

  const [localizando, setLocalizando] = useState(false)
  const [infoLoc, setInfoLoc] = useState<string | null>(null)
  async function localizar() {
    if (!n.direccion.trim()) return setError('Escribe primero la dirección del local.')
    setError(null); setInfoLoc(null); setLocalizando(true)
    try {
      const l = await localizarDireccion(n.direccion.trim())
      setN({ ...n, lat: l.lat, lng: l.lng, codigo_postal: n.codigo_postal || l.codigo_postal || '' })
      setInfoLoc(`Localizado: ${l.nombre}`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLocalizando(false)
    }
  }

  const filas = (d.data ?? []).filter((c) => !zona || [c.zona, c.codigo_postal, c.direccion].some((t) => (t ?? '').toLowerCase().includes(zona.toLowerCase())))
  return (
    <>
      <Cabecera titulo="Comparables de zona" sub="Precios de carta (con IVA) de platos equivalentes en la zona del cliente. Sirven para comprobar que el PVP es vendible.">
        <input placeholder="Filtrar por zona, código postal o dirección" value={zona} onChange={(e) => setZona(e.target.value)} />
      </Cabecera>
      {error && <Aviso tipo="error">{error}</Aviso>}
      {edita && (
        <div className="tarjeta">
          <div className="rejilla">
            <Campo etiqueta="Zona (texto)" ayuda="Igual que en la ficha del cliente. Para clientes que buscan por texto"><input value={n.zona} onChange={(e) => setN({ ...n, zona: e.target.value })} /></Campo>
            <Campo etiqueta="Código postal" ayuda="Para clientes que buscan por código postal"><input value={n.codigo_postal} inputMode="numeric" maxLength={5} onChange={(e) => setN({ ...n, codigo_postal: e.target.value })} /></Campo>
            <Campo etiqueta="Dirección del local" ancho="completo" ayuda="Para clientes que buscan por radio. Pulsa «Localizar» para sacar las coordenadas (se envía a OpenStreetMap).">
              <input value={n.direccion} onChange={(e) => setN({ ...n, direccion: e.target.value, lat: null, lng: null })} />
            </Campo>
            <div>
              <button onClick={localizar} disabled={localizando}>{localizando ? 'Localizando…' : 'Localizar'}</button>
              <p className="tenue peq">{n.lat != null && n.lng != null ? `Coordenadas: ${n.lat.toFixed(5)}, ${n.lng.toFixed(5)}` : 'Sin localizar'}</p>
              {infoLoc && <p className="tenue peq">{infoLoc}</p>}
            </div>
            <Campo etiqueta="Establecimiento"><input value={n.establecimiento} onChange={(e) => setN({ ...n, establecimiento: e.target.value })} /></Campo>
            <Campo etiqueta="Plato"><input value={n.plato} onChange={(e) => setN({ ...n, plato: e.target.value })} /></Campo>
            <Campo etiqueta="PVP con IVA"><NumInput ancho={120} valor={n.pvp_con_iva} onGuardar={(v) => setN({ ...n, pvp_con_iva: v })} /></Campo>
            <Campo etiqueta="Fecha"><input type="date" value={n.fecha} onChange={(e) => setN({ ...n, fecha: e.target.value })} /></Campo>
            <Campo etiqueta="Fuente"><input value={n.fuente} placeholder="Carta web, visita, Glovo…" onChange={(e) => setN({ ...n, fuente: e.target.value })} /></Campo>
          </div>
          <button className="btn-primario" style={{ marginTop: 10 }} disabled={!(n.zona.trim() || n.codigo_postal.trim() || n.lat != null) || !n.plato || n.pvp_con_iva == null} onClick={crear}>Añadir comparable</button>
        </div>
      )}
      {d.loading ? <Cargando /> : (
        <table className="tabla">
          <thead><tr><th>Zona</th><th>C. postal</th><th>Dirección</th><th>Establecimiento</th><th>Plato</th><th className="der">PVP con IVA</th><th>Fecha</th><th>Fuente</th>{edita && <th></th>}</tr></thead>
          <tbody>
            {filas.map((c) => (
              <tr key={c.id}><td>{c.zona}</td><td>{c.codigo_postal}</td><td className="peq">{c.direccion}{c.direccion && c.lat == null ? ' (sin localizar)' : ''}</td><td>{c.establecimiento}</td><td>{c.plato}</td><td className="der">{eur(c.pvp_con_iva)}</td><td>{fecha(c.fecha)}</td><td className="peq">{c.fuente}</td>
                {edita && <td><button className="btn-mini" onClick={async () => { await supabase.from('comparables').delete().eq('id', c.id); d.reload() }}>Quitar</button></td>}</tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
