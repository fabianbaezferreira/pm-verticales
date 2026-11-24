import { useState } from 'react'
import { supabase, ok } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { cargarVertical, useLoad } from '../lib/hooks'
import { pct } from '../lib/format'
import { Aviso, Cabecera, Cargando, NumInput } from '../components/ui'

type Ajuste = { clave: string; valor: number; descripcion: string | null }

const REGLAS: [string, string][] = [
  ['max_panes', 'Máximo de panes distintos'], ['min_salsas_base', 'Mínimo de salsas base'], ['max_salsas_base', 'Máximo de salsas base'],
  ['max_mezclas_vacuno', 'Máximo de mezclas de vacuno'], ['min_tendencia', 'Mínimo de platos de tendencia'], ['max_tendencia', 'Máximo de platos de tendencia'],
  ['min_usos_ingrediente', 'Usos mínimos de cada ingrediente no básico'],
]

export default function Ajustes() {
  const { edita, esAdmin, veCostes } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const v = useLoad(() => cargarVertical('hamburgueseria', true), [])
  const aj = useLoad(async () => ok(await supabase.from('ajustes').select('*').order('clave')) as Ajuste[], [])

  async function run(p: PromiseLike<{ error: { message: string } | null }>) {
    setError(null)
    const r = await p
    if (r.error) setError(r.error.message)
    v.reload(); aj.reload()
  }

  if (v.loading || aj.loading) return <Cargando />
  if (v.error) return <Aviso tipo="error">{v.error}</Aviso>
  const x = v.data!
  const reglas = x.vertical.reglas as Record<string, number | string>

  return (
    <>
      <Cabecera titulo="Configuración" sub={`Vertical ${x.vertical.nombre}. Todo lo que cambia entre verticales se configura aquí, no en código.`} />
      {error && <Aviso tipo="error">{error}</Aviso>}
      {!esAdmin && <Aviso>Los ajustes generales y las reglas del vertical solo los cambia un administrador.</Aviso>}

      {veCostes && (
        <div className="tarjeta">
          <h2>Ajustes generales</h2>
          <table className="tabla"><tbody>
            {(aj.data ?? []).map((a) => (
              <tr key={a.clave}><td>{a.descripcion ?? a.clave}</td>
                <td className="der"><NumInput valor={a.valor} deshabilitado={!esAdmin} onGuardar={(n) => n != null && run(supabase.from('ajustes').update({ valor: n }).eq('clave', a.clave))} /></td></tr>
            ))}
            <tr><td>Multiplicador del vertical (vacío = sin multiplicador por defecto)</td>
              <td className="der"><NumInput valor={x.vertical.multiplicador} deshabilitado={!esAdmin} onGuardar={(n) => run(supabase.from('verticales').update({ multiplicador: n }).eq('id', x.vertical.id))} /></td></tr>
          </tbody></table>
          <p className="tenue peq">Prioridad del multiplicador: plato en la carta → cliente → plato → categoría → vertical. Si ninguno está definido, el plato no tiene PVP por multiplicador.</p>
        </div>
      )}

      <div className="tarjeta">
        <h2>Categorías de carta</h2>
        <table className="tabla">
          <thead><tr><th>Orden</th><th>Categoría</th>{veCostes && <><th className="der">Food cost objetivo (%)</th><th className="der">Multiplicador</th></>}</tr></thead>
          <tbody>
            {x.categorias.map((c) => (
              <tr key={c.id}>
                <td style={{ width: 70 }}><NumInput ancho={50} valor={c.orden} deshabilitado={!edita} onGuardar={(n) => n != null && run(supabase.from('categorias_carta').update({ orden: n }).eq('id', c.id))} /></td>
                <td><input defaultValue={c.nombre} disabled={!edita} onBlur={(e) => e.target.value && e.target.value !== c.nombre && run(supabase.from('categorias_carta').update({ nombre: e.target.value }).eq('id', c.id))} /></td>
                {veCostes && <>
                  <td className="der"><NumInput valor={c.food_cost_objetivo == null ? null : Math.round(c.food_cost_objetivo * 1000) / 10} deshabilitado={!edita}
                    onGuardar={(n) => run(supabase.from('categorias_carta').update({ food_cost_objetivo: n == null ? null : n / 100 }).eq('id', c.id))} />
                    <div className="tenue peq">{c.food_cost_objetivo ? `× ${(1 / c.food_cost_objetivo).toFixed(2)}` : 'a fijar en el piloto'}</div></td>
                  <td className="der"><NumInput valor={c.multiplicador} deshabilitado={!edita} onGuardar={(n) => run(supabase.from('categorias_carta').update({ multiplicador: n }).eq('id', c.id))} /></td>
                </>}
              </tr>
            ))}
          </tbody>
        </table>
        {edita && <button style={{ marginTop: 8 }} onClick={() => { const n = prompt('Nombre de la categoría'); if (n) run(supabase.from('categorias_carta').insert({ nombre: n, vertical_id: x.vertical.id, orden: x.categorias.length + 1 })) }}>Añadir categoría</button>}
      </div>

      <div className="tarjeta">
        <h2>Reglas de carta</h2>
        {typeof reglas.estado_reglas === 'string' && <p className="tenue peq">Estado: {reglas.estado_reglas}</p>}
        <table className="tabla"><tbody>
          {REGLAS.map(([k, l]) => (
            <tr key={k}><td>{l}</td><td className="der">
              <NumInput valor={typeof reglas[k] === 'number' ? (reglas[k] as number) : null} deshabilitado={!esAdmin}
                onGuardar={(n) => run(supabase.from('verticales').update({ reglas: { ...reglas, [k]: n } }).eq('id', x.vertical.id))} />
            </td></tr>
          ))}
        </tbody></table>
      </div>

      <div className="tarjeta">
        <h2>Plantillas de plato</h2>
        <table className="tabla">
          <thead><tr><th>Tipo de plato</th><th>Rol</th><th className="der">Mín.</th><th className="der">Máx.</th><th>Ejemplos</th>{edita && <th></th>}</tr></thead>
          <tbody>
            {x.roles.map((r) => (
              <tr key={r.id}>
                <td>{r.tipo_plato}</td><td>{r.rol}</td>
                <td className="der"><NumInput ancho={50} valor={r.minimo} deshabilitado={!edita} onGuardar={(n) => n != null && run(supabase.from('plantilla_roles').update({ minimo: n }).eq('id', r.id))} /></td>
                <td className="der"><NumInput ancho={50} valor={r.maximo} deshabilitado={!edita} onGuardar={(n) => n != null && run(supabase.from('plantilla_roles').update({ maximo: n }).eq('id', r.id))} /></td>
                <td><input defaultValue={r.ejemplos ?? ''} disabled={!edita} onBlur={(e) => run(supabase.from('plantilla_roles').update({ ejemplos: e.target.value || null }).eq('id', r.id))} /></td>
                {edita && <td><button className="btn-mini" onClick={() => confirm(`¿Quitar el rol «${r.rol}»?`) && run(supabase.from('plantilla_roles').delete().eq('id', r.id))}>Quitar</button></td>}
              </tr>
            ))}
          </tbody>
        </table>
        {edita && <button style={{ marginTop: 8 }} onClick={() => {
          const tipo = prompt('Tipo de plato (p. ej. hamburguesa, entrante)', 'hamburguesa'); if (!tipo) return
          const rol = prompt('Nombre del rol (p. ej. salsa)'); if (!rol) return
          run(supabase.from('plantilla_roles').insert({ vertical_id: x.vertical.id, tipo_plato: tipo, rol, minimo: 0, maximo: 1, orden: x.roles.length + 1 }))
        }}>Añadir rol</button>}
      </div>

      <div className="tarjeta">
        <h2>Estilos</h2>
        <table className="tabla"><tbody>
          {x.estilos.map((s) => (
            <tr key={s.id}><td style={{ width: 200 }}>{s.nombre}</td>
              <td><input defaultValue={s.descripcion ?? ''} disabled={!edita} placeholder="Descripción" onBlur={(e) => run(supabase.from('estilos').update({ descripcion: e.target.value || null }).eq('id', s.id))} /></td>
              <td><input defaultValue={s.tecnica ?? ''} disabled={!edita} placeholder="Técnica" onBlur={(e) => run(supabase.from('estilos').update({ tecnica: e.target.value || null }).eq('id', s.id))} /></td></tr>
          ))}
        </tbody></table>
        {edita && <button style={{ marginTop: 8 }} onClick={() => { const n = prompt('Nombre del estilo'); if (n) run(supabase.from('estilos').insert({ nombre: n, vertical_id: x.vertical.id })) }}>Añadir estilo</button>}
      </div>
      <p className="tenue peq">IVA de hostelería aplicado al precio de carta: {pct((aj.data ?? []).find((a) => a.clave === 'iva_hosteleria')?.valor ?? 0.1, 0)}.</p>
    </>
  )
}
