import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase, ok } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useLoad } from '../lib/hooks'
import { CANALES, EQUIPOS, fecha, RESTRICCIONES } from '../lib/format'
import { Aviso, Cabecera, Campo, Cargando, Fichas, NumInput } from '../components/ui'

type Cli = { id: string; nombre: string; zona: string | null; concepto: string | null; ticket_medio: number | null; equipos: string[]; canales: string[]; restricciones: string[]; fecha_apertura: string | null; notas: string | null; multiplicador: number | null }
type Carta = { id: string; nombre: string; version: number; estado: string; creado_en: string; carta_platos: { count: number }[] }

export default function ClienteDetalle() {
  const { id } = useParams()
  const nav = useNavigate()
  const { edita, veCostes } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const c = useLoad(async () => ok(await supabase.from('clientes').select('*').eq('id', id!).single()) as Cli, [id])
  const cartas = useLoad(async () => ok(await supabase.from('cartas').select('*, carta_platos(count)').eq('cliente_id', id!).order('creado_en', { ascending: false })) as unknown as Carta[], [id])

  async function upd(x: Partial<Cli>) {
    setError(null)
    const { error } = await supabase.from('clientes').update(x).eq('id', id!)
    if (error) setError(error.message)
    c.reload()
  }
  async function nuevaCarta() {
    const { data, error } = await supabase.from('cartas').insert({ cliente_id: id!, nombre: `Carta ${c.data!.nombre}` }).select('id').single()
    if (error) return setError(error.message)
    nav(`/cartas/${data.id}`)
  }

  if (c.loading) return <Cargando />
  if (c.error) return <Aviso tipo="error">{c.error}</Aviso>
  const x = c.data!
  return (
    <>
      <Cabecera titulo={x.nombre} sub={<Link to="/clientes">← Clientes</Link>}>
        {edita && <button className="btn-primario" onClick={nuevaCarta}>Nueva carta</button>}
      </Cabecera>
      {error && <Aviso tipo="error">{error}</Aviso>}

      <div className="tarjeta">
        <h2>Cartas</h2>
        {(cartas.data ?? []).length === 0 ? <p className="tenue">Todavía no hay cartas para este cliente.</p> : (
          <table className="tabla">
            <thead><tr><th>Carta</th><th>Versión</th><th>Estado</th><th className="der">Platos</th><th>Creada</th></tr></thead>
            <tbody>{cartas.data!.map((k) => (
              <tr key={k.id} className="clic" onClick={() => nav(`/cartas/${k.id}`)}>
                <td>{k.nombre}</td><td>v{k.version}</td><td>{k.estado}</td><td className="der">{k.carta_platos?.[0]?.count ?? 0}</td><td>{fecha(k.creado_en)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      <div className="tarjeta">
        <h2>Brief</h2>
        <div className="rejilla">
          <Campo etiqueta="Nombre"><input defaultValue={x.nombre} disabled={!edita} onBlur={(e) => e.target.value && upd({ nombre: e.target.value })} /></Campo>
          <Campo etiqueta="Zona" ayuda="Se usa para los comparables de precio"><input defaultValue={x.zona ?? ''} disabled={!edita} onBlur={(e) => upd({ zona: e.target.value || null })} /></Campo>
          <Campo etiqueta="Ticket medio objetivo (€ con IVA)"><NumInput ancho={140} valor={x.ticket_medio} deshabilitado={!edita} onGuardar={(v) => upd({ ticket_medio: v })} /></Campo>
          <Campo etiqueta="Fecha de apertura"><input type="date" defaultValue={x.fecha_apertura ?? ''} disabled={!edita} onBlur={(e) => upd({ fecha_apertura: e.target.value || null })} /></Campo>
          <Campo etiqueta="Concepto" ancho="completo"><textarea defaultValue={x.concepto ?? ''} disabled={!edita} onBlur={(e) => upd({ concepto: e.target.value || null })} /></Campo>
          <Campo etiqueta="Equipos de cocina disponibles" ancho="completo" ayuda="Solo se proponen platos compatibles con estos equipos">
            <Fichas opciones={EQUIPOS} valor={x.equipos} deshabilitado={!edita} onChange={(v) => upd({ equipos: v })} />
          </Campo>
          <Campo etiqueta="Canales" ancho="completo"><Fichas opciones={CANALES} valor={x.canales} deshabilitado={!edita} onChange={(v) => upd({ canales: v })} /></Campo>
          <Campo etiqueta="Restricciones" ancho="completo"><Fichas opciones={RESTRICCIONES} valor={x.restricciones} deshabilitado={!edita} onChange={(v) => upd({ restricciones: v })} /></Campo>
          {veCostes && <Campo etiqueta="Multiplicador del cliente" ayuda="Vacío = el del plato, categoría o general"><NumInput ancho={120} valor={x.multiplicador} deshabilitado={!edita} onGuardar={(v) => upd({ multiplicador: v })} /></Campo>}
          <Campo etiqueta="Notas (personal, horarios, etc.)" ancho="completo"><textarea defaultValue={x.notas ?? ''} disabled={!edita} onBlur={(e) => upd({ notas: e.target.value || null })} /></Campo>
        </div>
      </div>
    </>
  )
}
