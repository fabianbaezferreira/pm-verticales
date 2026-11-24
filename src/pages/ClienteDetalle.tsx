import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase, ok } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useLoad } from '../lib/hooks'
import { fecha } from '../lib/format'
import { Aviso, Cabecera, Cargando } from '../components/ui'
import FormCliente, { CLIENTE_VACIO, type DatosFormCliente } from '../components/FormCliente'
import { ImportarBrief } from '../components/ImportarClientes'

type Cli = DatosFormCliente & { id: string }
const aForm = (x: Cli): DatosFormCliente => Object.fromEntries(Object.keys(CLIENTE_VACIO).map((k) => [k, (x as Record<string, unknown>)[k] ?? (CLIENTE_VACIO as Record<string, unknown>)[k]])) as DatosFormCliente
type Carta = { id: string; nombre: string; version: number; estado: string; creado_en: string; carta_platos: { count: number }[] }

export default function ClienteDetalle() {
  const { id } = useParams()
  const nav = useNavigate()
  const { edita, veCostes } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
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

      {edita && <ImportarBrief actual={x} onAplicar={async (d) => { await upd(d as Partial<Cli>); setVersion((n) => n + 1) }} />}

      <h2 style={{ marginTop: 8 }}>Ficha del cliente</h2>
      <FormCliente key={version} inicial={aForm(x)} editable={edita} veCostes={veCostes} textoBoton="Guardar cambios"
        onGuardar={async (d) => {
          const { error } = await supabase.from('clientes').update(d).eq('id', id!)
          if (error) return error.message
          c.reload(); setVersion((n) => n + 1)
          return null
        }} />
    </>
  )
}
