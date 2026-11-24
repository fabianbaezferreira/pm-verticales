import { Link } from 'react-router-dom'
import { supabase, ok } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useLoad } from '../lib/hooks'
import { diasDesde, fecha } from '../lib/format'
import { Aviso, Cabecera, Cargando } from '../components/ui'

const MAX_DIAS_TARIFA = 60

export default function Inicio() {
  const { veCostes, nombre } = useAuth()
  const d = useLoad(async () => {
    const cuenta = async (t: string) => (await supabase.from(t).select('*', { count: 'exact', head: true })).count ?? 0
    const [productos, elaboraciones, platos, clientes, cartas] = await Promise.all(
      ['productos_pm', 'elaboraciones', 'platos', 'clientes', 'cartas'].map(cuenta))
    const tarifa = veCostes
      ? ok(await supabase.from('tarifas').select('fecha_tarifa, archivo_nombre, importada_en').eq('estado', 'aplicada').order('fecha_tarifa', { ascending: false }).limit(1)) as { fecha_tarifa: string; archivo_nombre: string | null }[]
      : []
    const ultimas = ok(await supabase.from('cartas').select('id, nombre, version, estado, creado_en, clientes(nombre)').order('creado_en', { ascending: false }).limit(5)) as unknown as
      { id: string; nombre: string; version: number; estado: string; clientes: { nombre: string } | null }[]
    return { productos, elaboraciones, platos, clientes, cartas, tarifa: tarifa[0] ?? null, ultimas }
  }, [veCostes])

  if (d.loading) return <Cargando />
  if (d.error) return <Aviso tipo="error">{d.error}</Aviso>
  const x = d.data!
  const dias = diasDesde(x.tarifa?.fecha_tarifa)

  return (
    <>
      <Cabecera titulo={`Hola${nombre ? `, ${nombre.split(' ')[0]}` : ''}`} sub="Asesoramiento de cartas · vertical Hamburguesería" />
      {veCostes && !x.tarifa && <Aviso tipo="alerta">No hay ninguna tarifa PM aplicada: los escandallos con productos PM saldrán «sin precio». <Link to="/tarifas">Importar tarifa</Link></Aviso>}
      {veCostes && x.tarifa && dias != null && dias > MAX_DIAS_TARIFA && (
        <Aviso tipo="alerta">La tarifa vigente es del {fecha(x.tarifa.fecha_tarifa)} ({dias} días). Comprueba si hay una más reciente.</Aviso>
      )}
      <div className="kpis">
        {veCostes && <div className="kpi"><div className="e">Tarifa vigente</div><div className="v">{x.tarifa ? fecha(x.tarifa.fecha_tarifa) : '—'}</div></div>}
        <Link to="/catalogo" className="kpi" style={{ textDecoration: 'none', color: 'inherit' }}><div className="e">Productos PM</div><div className="v">{x.productos}</div></Link>
        <Link to="/elaboraciones" className="kpi" style={{ textDecoration: 'none', color: 'inherit' }}><div className="e">Elaboraciones</div><div className="v">{x.elaboraciones}</div></Link>
        <Link to="/platos" className="kpi" style={{ textDecoration: 'none', color: 'inherit' }}><div className="e">Platos</div><div className="v">{x.platos}</div></Link>
        <Link to="/clientes" className="kpi" style={{ textDecoration: 'none', color: 'inherit' }}><div className="e">Clientes</div><div className="v">{x.clientes}</div></Link>
        <div className="kpi"><div className="e">Cartas</div><div className="v">{x.cartas}</div></div>
      </div>
      <div className="tarjeta">
        <h2>Flujo de trabajo</h2>
        <ol className="tenue" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
          <li><Link to="/tarifas">Importar la tarifa PM</Link> (Excel, sin IVA).</li>
          <li>Crear <Link to="/elaboraciones">elaboraciones base</Link>: salsas, mezclas de carne, panes regenerados.</li>
          <li>Componer <Link to="/platos">platos</Link> con la plantilla del vertical.</li>
          <li>Dar de alta el <Link to="/clientes">cliente</Link> con su brief (equipos, canales, restricciones).</li>
          <li>Montar la carta, revisar avisos, fijar PVP y generar la propuesta.</li>
        </ol>
      </div>
      {x.ultimas.length > 0 && (
        <div className="tarjeta">
          <h2>Últimas cartas</h2>
          <table className="tabla">
            <tbody>
              {x.ultimas.map((c) => (
                <tr key={c.id}><td><Link to={`/cartas/${c.id}`}>{c.nombre}</Link> <span className="tenue">v{c.version}</span></td><td>{c.clientes?.nombre}</td><td>{c.estado}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
