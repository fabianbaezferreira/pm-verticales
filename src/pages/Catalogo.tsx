import { useMemo, useState } from 'react'
import { supabase, ok } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useLoad } from '../lib/hooks'
import { eur, eur4, fecha, num } from '../lib/format'
import { Aviso, Cabecera, Cargando, normalizar } from '../components/ui'

type Prod = { id: string; codigo: string; descripcion: string; fabricante: string | null; formato: string | null; unidad_base: string; cantidad_formato: number; alergenos: string[]; conservacion: string | null; activo: boolean }
type Precio = { producto_id: string; precio_formato: number; precio_unidad_base: number; fecha_tarifa: string }

export default function Catalogo() {
  const { veCostes } = useAuth()
  const [q, setQ] = useState('')
  const [inactivos, setInactivos] = useState(false)
  const d = useLoad(async () => {
    const prods = ok(await supabase.from('productos_pm').select('*').order('descripcion')) as Prod[]
    const precios = veCostes ? ok(await supabase.from('v_precio_actual_pm').select('producto_id, precio_formato, precio_unidad_base, fecha_tarifa')) as Precio[] : []
    return { prods, precios: new Map(precios.map((p) => [p.producto_id, p])) }
  }, [veCostes])

  const filas = useMemo(() => {
    if (!d.data) return []
    const t = normalizar(q)
    return d.data.prods.filter((p) => (inactivos || p.activo) && (!t || normalizar(`${p.codigo} ${p.descripcion} ${p.fabricante ?? ''}`).includes(t)))
  }, [d.data, q, inactivos])

  return (
    <>
      <Cabecera titulo="Catálogo PM" sub="Referencias de Picking Market. Se crean y actualizan al importar una tarifa. Precios sin IVA.">
        <input placeholder="Buscar código, descripción o fabricante" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 300 }} />
        <label className="peq"><input type="checkbox" checked={inactivos} onChange={(e) => setInactivos(e.target.checked)} /> Ver inactivos</label>
      </Cabecera>
      {d.loading && <Cargando />}
      {d.error && <Aviso tipo="error">{d.error}</Aviso>}
      {d.data && d.data.prods.length === 0 && <Aviso>El catálogo está vacío. Se llena al importar la primera tarifa.</Aviso>}
      {filas.length > 0 && (
        <table className="tabla">
          <thead>
            <tr>
              <th>Código</th><th>Descripción</th><th>Fabricante</th><th>Formato</th><th className="der">Cantidad</th>
              {veCostes && <><th className="der">Precio formato</th><th className="der">€ / unidad base</th><th>Tarifa</th></>}
              <th>Alérgenos</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((p) => {
              const pr = d.data!.precios.get(p.id)
              return (
                <tr key={p.id} style={p.activo ? undefined : { opacity: 0.5 }}>
                  <td>{p.codigo}</td><td>{p.descripcion}</td><td>{p.fabricante}</td><td>{p.formato}</td>
                  <td className="der">{num(p.cantidad_formato)} {p.unidad_base}</td>
                  {veCostes && <>
                    <td className="der">{pr ? eur(pr.precio_formato) : <span className="etq etq-alerta">sin precio</span>}</td>
                    <td className="der">{pr ? `${eur4(pr.precio_unidad_base)}/${p.unidad_base}` : '—'}</td>
                    <td className="peq">{pr ? fecha(pr.fecha_tarifa) : ''}</td>
                  </>}
                  <td className="peq">{p.alergenos.join(', ')}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      {d.data && <p className="tenue peq">{filas.length} de {d.data.prods.length} referencias.</p>}
    </>
  )
}
