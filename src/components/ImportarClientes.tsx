import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { cargarVertical } from '../lib/hooks'
import { leerBrief, leerLista, type DatosCliente, type FilaLista } from '../lib/clientesExcel'
import { eur, fecha } from '../lib/format'
import { Aviso, Etiqueta } from './ui'

const ETIQ: Record<string, string> = {
  nombre: 'Nombre', zona: 'Zona', concepto: 'Concepto', ticket_medio: 'Ticket medio', fecha_apertura: 'Apertura',
  equipos: 'Equipos', canales: 'Canales', restricciones: 'Restricciones', notas: 'Notas',
  personal: 'Personal de cocina', horario: 'Horario', equipos_otros: 'Otros equipos',
  contacto_nombre: 'Contacto', contacto_telefono: 'Teléfono', contacto_email: 'Correo',
}
const mostrar = (k: string, v: unknown) =>
  v == null || (Array.isArray(v) && v.length === 0) ? '—' : Array.isArray(v) ? v.join(', ') : k === 'ticket_medio' ? eur(v as number) : k === 'fecha_apertura' ? fecha(v as string) : String(v)

/** Carga masiva de clientes desde Excel. Si el nombre ya existe, actualiza; si no, crea. */
export function ImportarLista({ existentes, onHecho }: { existentes: { id: string; nombre: string }[]; onHecho: () => void }) {
  const [filas, setFilas] = useState<FilaLista[] | null>(null)
  const [msg, setMsg] = useState<{ t: 'error' | 'ok' | 'info'; x: string } | null>(null)
  const [trabajando, setTrabajando] = useState(false)
  const porNombre = new Map(existentes.map((c) => [c.nombre.trim().toLowerCase(), c.id]))

  async function importar() {
    setTrabajando(true); setMsg(null)
    const v = await cargarVertical()
    let nuevos = 0, act = 0
    for (const f of filas!.filter((x) => !x.error)) {
      const d = Object.fromEntries(Object.entries(f.datos).filter(([, val]) => val != null && !(Array.isArray(val) && val.length === 0)))
      const id = porNombre.get(f.datos.nombre!.trim().toLowerCase())
      const r = id ? await supabase.from('clientes').update(d).eq('id', id) : await supabase.from('clientes').insert({ ...d, vertical_id: v.vertical.id })
      if (r.error) { setMsg({ t: 'error', x: `«${f.datos.nombre}»: ${r.error.message}` }); setTrabajando(false); return }
      if (id) act++; else nuevos++
    }
    setMsg({ t: 'ok', x: `${nuevos} clientes creados y ${act} actualizados.` })
    setFilas(null); setTrabajando(false); onHecho()
  }

  return (
    <div className="tarjeta">
      <h2>Carga masiva de clientes (Excel)</h2>
      <div className="acciones">
        <input type="file" accept=".xlsx" disabled={trabajando} onChange={async (e) => {
          const f = e.target.files?.[0]; if (!f) return
          try { setFilas((await leerLista(f)).filas); setMsg(null) } catch (err) { setMsg({ t: 'error', x: (err as Error).message }) }
        }} />
        <a href="/plantillas/Plantilla_lista_clientes_PM.xlsx" download>Descargar plantilla</a>
      </div>
      {msg && <Aviso tipo={msg.t}>{msg.x}</Aviso>}
      {filas && (
        <>
          <table className="tabla" style={{ marginTop: 10 }}>
            <thead><tr><th></th><th>Nombre</th><th>Zona</th><th className="der">Ticket</th><th>Equipos</th><th>Canales</th><th>Restricciones</th><th>Apertura</th></tr></thead>
            <tbody>
              {filas.map((f, i) => (
                <tr key={i}>
                  <td>{f.error ? <Etiqueta tono="error">{f.error}</Etiqueta> : porNombre.has(f.datos.nombre!.trim().toLowerCase()) ? <Etiqueta tono="alerta">actualiza</Etiqueta> : <Etiqueta tono="ok">nuevo</Etiqueta>}</td>
                  <td>{f.datos.nombre}</td><td>{f.datos.zona}</td><td className="der">{eur(f.datos.ticket_medio)}</td>
                  <td className="peq">{f.datos.equipos?.join(', ')}</td><td className="peq">{f.datos.canales?.join(', ')}</td>
                  <td className="peq">{f.datos.restricciones?.join(', ')}</td><td>{fecha(f.datos.fecha_apertura)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="acciones" style={{ marginTop: 10 }}>
            <button className="btn-primario" disabled={trabajando || filas.every((f) => f.error)} onClick={importar}>
              {trabajando ? 'Importando…' : `Importar ${filas.filter((f) => !f.error).length} clientes`}
            </button>
            <button onClick={() => setFilas(null)}>Cancelar</button>
          </div>
        </>
      )}
      <p className="tenue peq">Equipos, canales y restricciones separados por comas. Si un cliente ya existe con el mismo nombre, se actualizan solo los campos que traiga el Excel.</p>
    </div>
  )
}

/** Importa el brief que rellena el cliente y muestra los cambios antes de aplicarlos. */
export function ImportarBrief({ actual, onAplicar }: { actual: DatosCliente & { notas: string | null }; onAplicar: (d: DatosCliente) => Promise<void> }) {
  const [datos, setDatos] = useState<DatosCliente | null>(null)
  const [avisos, setAvisos] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const cambios = datos ? (Object.keys(datos) as (keyof DatosCliente)[]).filter((k) => JSON.stringify(datos[k]) !== JSON.stringify(actual[k])) : []

  return (
    <div className="tarjeta">
      <h2>Brief del cliente (Excel)</h2>
      <div className="acciones">
        <a href="/plantillas/Brief_cliente_PM_Hamburgueseria.xlsx" download>Descargar plantilla para el cliente</a>
        <label className="peq">Importar brief rellenado: <input type="file" accept=".xlsx" onChange={async (e) => {
          const f = e.target.files?.[0]; if (!f) return
          try {
            const r = await leerBrief(f)
            // Las notas del brief se añaden a las existentes, no las sustituyen
            if (r.datos.notas && actual.notas && !actual.notas.includes(r.datos.notas)) r.datos.notas = `${actual.notas}\n\n— Brief Excel —\n${r.datos.notas}`
            setDatos(r.datos); setAvisos(r.avisos); setError(null)
          } catch (err) { setError((err as Error).message) }
        }} /></label>
      </div>
      {error && <Aviso tipo="error">{error}</Aviso>}
      {avisos.map((a) => <Aviso key={a} tipo="alerta">{a}</Aviso>)}
      {datos && (cambios.length === 0 ? <Aviso tipo="ok">El brief no cambia nada respecto a la ficha.</Aviso> : (
        <>
          <table className="tabla" style={{ marginTop: 10 }}>
            <thead><tr><th>Campo</th><th>Ahora</th><th>Con el brief</th></tr></thead>
            <tbody>
              {cambios.map((k) => (
                <tr key={k}><td>{ETIQ[k]}</td><td className="tenue" style={{ whiteSpace: 'pre-wrap' }}>{mostrar(k, actual[k])}</td><td style={{ whiteSpace: 'pre-wrap' }}><b>{mostrar(k, datos[k])}</b></td></tr>
              ))}
            </tbody>
          </table>
          <div className="acciones" style={{ marginTop: 10 }}>
            <button className="btn-primario" onClick={async () => {
              await onAplicar(Object.fromEntries(cambios.map((k) => [k, datos[k]])) as DatosCliente); setDatos(null)
            }}>Aplicar {cambios.length} cambios</button>
            <button onClick={() => setDatos(null)}>Cancelar</button>
          </div>
        </>
      ))}
    </div>
  )
}
