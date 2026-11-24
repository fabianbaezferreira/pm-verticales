import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, ok } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useLoad } from '../lib/hooks'
import { eur, fecha } from '../lib/format'
import { Aviso, Cabecera, Cargando } from '../components/ui'
import { ImportarLista } from '../components/ImportarClientes'

type Cli = { id: string; nombre: string; zona: string | null; concepto: string | null; ticket_medio: number | null; equipos: string[]; canales: string[]; fecha_apertura: string | null; cartas: { count: number }[] }

export default function Clientes() {
  const { edita } = useAuth()
  const nav = useNavigate()
  const [importar, setImportar] = useState(false)
  const d = useLoad(async () => ok(await supabase.from('clientes').select('*, cartas(count)').order('creado_en', { ascending: false })) as unknown as Cli[], [])

  return (
    <>
      <Cabecera titulo="Clientes y cartas" sub="Cada cliente lleva su brief: concepto, zona, ticket, equipos de cocina, canales y restricciones.">
        {edita && <button onClick={() => setImportar(!importar)}>Importar Excel</button>}
        {edita && <button className="btn-primario" onClick={() => nav('/clientes/nuevo')}>Alta de nuevo cliente</button>}
      </Cabecera>
      {importar && edita && <ImportarLista existentes={d.data ?? []} onHecho={d.reload} />}
      {d.loading ? <Cargando /> : d.error ? <Aviso tipo="error">{d.error}</Aviso> : (
        <table className="tabla">
          <thead><tr><th>Cliente</th><th>Zona</th><th>Concepto</th><th className="der">Ticket medio</th><th>Equipos</th><th>Canales</th><th>Apertura</th><th className="der">Cartas</th></tr></thead>
          <tbody>
            {(d.data ?? []).length === 0 && <tr><td colSpan={8} className="tenue">Sin clientes.</td></tr>}
            {(d.data ?? []).map((c) => (
              <tr key={c.id} className="clic" onClick={() => nav(`/clientes/${c.id}`)}>
                <td>{c.nombre}</td><td>{c.zona}</td><td className="peq">{c.concepto}</td><td className="der">{eur(c.ticket_medio)}</td>
                <td className="peq">{c.equipos.join(', ')}</td><td className="peq">{c.canales.join(', ')}</td><td>{fecha(c.fecha_apertura)}</td>
                <td className="der">{c.cartas?.[0]?.count ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
