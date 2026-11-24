import { useState } from 'react'
import { supabase, ok } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { cargarVertical, useLoad } from '../lib/hooks'
import { eur, fecha } from '../lib/format'
import { Aviso, Cabecera, Campo, Cargando, NumInput } from '../components/ui'

type Comp = { id: string; zona: string; establecimiento: string | null; plato: string; pvp_con_iva: number; fecha: string; fuente: string | null }

export default function Comparables() {
  const { edita } = useAuth()
  const [zona, setZona] = useState('')
  const d = useLoad(async () => ok(await supabase.from('comparables').select('*').order('zona').order('pvp_con_iva')) as Comp[], [])
  const vacio = { zona: '', establecimiento: '', plato: '', pvp_con_iva: null as number | null, fecha: new Date().toISOString().slice(0, 10), fuente: '' }
  const [n, setN] = useState(vacio)
  const [error, setError] = useState<string | null>(null)

  async function crear() {
    const v = await cargarVertical()
    const r = await supabase.from('comparables').insert({ ...n, establecimiento: n.establecimiento || null, fuente: n.fuente || null, vertical_id: v.vertical.id })
    if (r.error) return setError(r.error.message)
    setN({ ...vacio, zona: n.zona, fecha: n.fecha }); d.reload()
  }

  const filas = (d.data ?? []).filter((c) => !zona || c.zona.toLowerCase().includes(zona.toLowerCase()))
  return (
    <>
      <Cabecera titulo="Comparables de zona" sub="Precios de carta (con IVA) de platos equivalentes en la zona del cliente. Sirven para comprobar que el PVP es vendible.">
        <input placeholder="Filtrar por zona" value={zona} onChange={(e) => setZona(e.target.value)} />
      </Cabecera>
      {error && <Aviso tipo="error">{error}</Aviso>}
      {edita && (
        <div className="tarjeta">
          <div className="rejilla">
            <Campo etiqueta="Zona" ayuda="Igual que en la ficha del cliente"><input value={n.zona} onChange={(e) => setN({ ...n, zona: e.target.value })} /></Campo>
            <Campo etiqueta="Establecimiento"><input value={n.establecimiento} onChange={(e) => setN({ ...n, establecimiento: e.target.value })} /></Campo>
            <Campo etiqueta="Plato"><input value={n.plato} onChange={(e) => setN({ ...n, plato: e.target.value })} /></Campo>
            <Campo etiqueta="PVP con IVA"><NumInput ancho={120} valor={n.pvp_con_iva} onGuardar={(v) => setN({ ...n, pvp_con_iva: v })} /></Campo>
            <Campo etiqueta="Fecha"><input type="date" value={n.fecha} onChange={(e) => setN({ ...n, fecha: e.target.value })} /></Campo>
            <Campo etiqueta="Fuente"><input value={n.fuente} placeholder="Carta web, visita, Glovo…" onChange={(e) => setN({ ...n, fuente: e.target.value })} /></Campo>
          </div>
          <button className="btn-primario" style={{ marginTop: 10 }} disabled={!n.zona || !n.plato || n.pvp_con_iva == null} onClick={crear}>Añadir comparable</button>
        </div>
      )}
      {d.loading ? <Cargando /> : (
        <table className="tabla">
          <thead><tr><th>Zona</th><th>Establecimiento</th><th>Plato</th><th className="der">PVP con IVA</th><th>Fecha</th><th>Fuente</th>{edita && <th></th>}</tr></thead>
          <tbody>
            {filas.map((c) => (
              <tr key={c.id}><td>{c.zona}</td><td>{c.establecimiento}</td><td>{c.plato}</td><td className="der">{eur(c.pvp_con_iva)}</td><td>{fecha(c.fecha)}</td><td className="peq">{c.fuente}</td>
                {edita && <td><button className="btn-mini" onClick={async () => { await supabase.from('comparables').delete().eq('id', c.id); d.reload() }}>Quitar</button></td>}</tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
