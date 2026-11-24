import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, ok } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { cargarVertical, useLoad } from '../lib/hooks'
import { eur4, num } from '../lib/format'
import { Aviso, Cabecera, Cargando, EstadoReceta, Etiqueta, normalizar } from '../components/ui'

type Fila = { id: string; nombre: string; tipo: string | null; estado: string; rendimiento_cantidad: number; rendimiento_unidad: string; coste_unidad: number | null; alergenos: string[] | null; n_componentes: number; usada_en_platos: number }

export const TIPOS_ELABORACION = ['salsa', 'mezcla de carne', 'pan', 'guarnición', 'encurtido', 'topping', 'postre', 'otra']

export default function Elaboraciones() {
  const { edita, veCostes } = useAuth()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const d = useLoad(async () => ok(await supabase.from('v_elaboraciones_coste').select('*').order('nombre')) as Fila[], [])
  const filas = useMemo(() => (d.data ?? []).filter((f) => !q || normalizar(`${f.nombre} ${f.tipo ?? ''}`).includes(normalizar(q))), [d.data, q])

  async function crear() {
    const nombre = prompt('Nombre de la elaboración (p. ej. «Salsa burger base»)')
    if (!nombre) return
    const v = await cargarVertical()
    const { data, error } = await supabase.from('elaboraciones').insert({ nombre, rendimiento_cantidad: 1, rendimiento_unidad: 'kg', vertical_id: v.vertical.id, tipo: 'salsa' }).select('id').single()
    if (error) return alert(error.message)
    nav(`/elaboraciones/${data.id}`)
  }

  return (
    <>
      <Cabecera titulo="Elaboraciones" sub="Sub-recetas reutilizables (salsas, mezclas de carne, panes regenerados). Si cambias una, cambia el coste de todos los platos que la usan.">
        <input placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
        {edita && <button className="btn-primario" onClick={crear}>Nueva elaboración</button>}
      </Cabecera>
      {d.loading ? <Cargando /> : d.error ? <Aviso tipo="error">{d.error}</Aviso> : (
        <table className="tabla">
          <thead><tr><th>Nombre</th><th>Tipo</th><th>Estado</th><th className="der">Rendimiento</th>{veCostes && <th className="der">Coste / unidad</th>}<th className="der">Platos</th><th>Alérgenos</th></tr></thead>
          <tbody>
            {filas.length === 0 && <tr><td colSpan={7} className="tenue">Sin elaboraciones.</td></tr>}
            {filas.map((f) => (
              <tr key={f.id} className="clic" onClick={() => nav(`/elaboraciones/${f.id}`)}>
                <td>{f.nombre}</td><td>{f.tipo}</td><td><EstadoReceta estado={f.estado} /></td>
                <td className="der">{num(f.rendimiento_cantidad)} {f.rendimiento_unidad}</td>
                {veCostes && <td className="der">{f.coste_unidad == null ? (f.n_componentes ? <Etiqueta tono="alerta">incompleto</Etiqueta> : '—') : `${eur4(f.coste_unidad)}/${f.rendimiento_unidad}`}</td>}
                <td className="der">{f.usada_en_platos}</td>
                <td className="peq">{(f.alergenos ?? []).join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
