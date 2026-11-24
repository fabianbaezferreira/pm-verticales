import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase, ok } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useLoad, useVertical } from '../lib/hooks'
import { eur, fecha, pct } from '../lib/format'
import { Aviso, Cargando } from '../components/ui'
import { cargarPlatos } from './Platos'

type Opciones = { titulo: string; subtitulo: string; introduccion: string; destinatario: 'cliente' | 'interno'; mostrar_costes: boolean; mostrar_alergenos: boolean }
type VLinea = { carta_plato_id: string; plato_id: string; categoria_carta_id: string | null; coste_total: number | null; pvp_final_sin_iva: number | null; pvp_carta_con_iva: number | null; food_cost_real: number | null; margen_euros: number | null; metodo_pvp: string | null }

export default function Propuesta() {
  const { id } = useParams()
  const { veCostes } = useAuth()
  const vert = useVertical()
  const [guardado, setGuardado] = useState<string | null>(null)
  const d = useLoad(async () => {
    const carta = ok(await supabase.from('cartas').select('id, nombre, version, clientes(nombre, zona, concepto)').eq('id', id!).single()) as unknown as
      { id: string; nombre: string; version: number; clientes: { nombre: string; zona: string | null; concepto: string | null } }
    const [lin, orden, platos, previas, tarifa] = await Promise.all([
      veCostes ? supabase.from('v_carta_escandallo').select('*').eq('carta_id', id!) : supabase.rpc('fn_precios_carta', { p_carta: id! }),
      supabase.from('carta_platos').select('id, orden, justificacion, plato_id, categoria_carta_id').eq('carta_id', id!),
      cargarPlatos(),
      supabase.from('propuestas').select('*').eq('carta_id', id!).order('creado_en', { ascending: false }).limit(1),
      veCostes ? supabase.from('tarifas').select('fecha_tarifa').eq('estado', 'aplicada').order('fecha_tarifa', { ascending: false }).limit(1) : Promise.resolve({ data: [], error: null }),
    ])
    const filasCarta = ok(orden) as { id: string; orden: number; justificacion: string | null; plato_id: string; categoria_carta_id: string | null }[]
    const ord = new Map(filasCarta.map((o) => [o.id, o]))
    const precios = new Map((ok(lin) as VLinea[]).map((x) => [x.carta_plato_id, x]))
    // Para roles sin costes, fn_precios_carta solo trae precios: se completa con la fila de la carta
    const unidas = filasCarta.map((f) => ({
      coste_total: null, food_cost_real: null, margen_euros: null, metodo_pvp: null, pvp_final_sin_iva: null, pvp_carta_con_iva: null,
      ...precios.get(f.id), carta_plato_id: f.id, plato_id: f.plato_id,
      categoria_carta_id: precios.get(f.id)?.categoria_carta_id ?? f.categoria_carta_id,
    })) as VLinea[]
    const lineas = unidas.sort((a, b) => (ord.get(a.carta_plato_id)?.orden ?? 0) - (ord.get(b.carta_plato_id)?.orden ?? 0))
      .map((l) => ({ ...l, justificacion: ord.get(l.carta_plato_id)?.justificacion ?? null }))
    return {
      carta, lineas, platos: new Map(platos.map((p) => [p.id, p])),
      previa: (ok(previas) as (Opciones & { id: string })[])[0] ?? null,
      fechaTarifa: (ok(tarifa) as { fecha_tarifa: string }[])[0]?.fecha_tarifa ?? null,
    }
  }, [id, veCostes])

  const [op, setOp] = useState<Opciones | null>(null)
  useEffect(() => {
    if (!d.data || op) return
    const p = d.data.previa
    setOp(p ? { titulo: p.titulo, subtitulo: p.subtitulo ?? '', introduccion: p.introduccion ?? '', destinatario: p.destinatario, mostrar_costes: p.mostrar_costes && veCostes, mostrar_alergenos: p.mostrar_alergenos }
      : { titulo: `Propuesta de carta · ${d.data.carta.clientes.nombre}`, subtitulo: `Picking Market · ${new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`, introduccion: '', destinatario: 'cliente', mostrar_costes: false, mostrar_alergenos: true })
  }, [d.data, op, veCostes])

  if (d.loading || vert.loading || !op) return <Cargando />
  if (d.error) return <Aviso tipo="error">{d.error}</Aviso>
  const { carta, lineas, platos, fechaTarifa } = d.data!
  const cats = vert.data!.categorias
  const costes = op.mostrar_costes && veCostes
  const grupos = [...cats, { id: '', nombre: 'Otros', orden: 99 }]
    .map((c) => ({ c, filas: lineas.filter((l) => (l.categoria_carta_id ?? platos.get(l.plato_id)?.categoria_carta_id ?? '') === c.id) }))
    .filter((g) => g.filas.length)
  const hayTeoricos = lineas.some((l) => platos.get(l.plato_id)?.estado === 'teorica')
  const sinPrecio = lineas.filter((l) => l.pvp_carta_con_iva == null).length

  async function guardar() {
    const r = await supabase.from('propuestas').insert({ carta_id: id!, ...op!, subtitulo: op!.subtitulo || null, introduccion: op!.introduccion || null })
    setGuardado(r.error ? `Error: ${r.error.message}` : 'Propuesta guardada en el historial.')
  }

  return (
    <>
      <div className="propuesta-barra no-imprimir">
        <Link to={`/cartas/${id}`} style={{ color: '#fff' }}>← Carta</Link>
        <input type="text" value={op.titulo} onChange={(e) => setOp({ ...op, titulo: e.target.value })} />
        <input type="text" value={op.subtitulo} onChange={(e) => setOp({ ...op, subtitulo: e.target.value })} placeholder="Subtítulo" />
        <select value={op.destinatario} onChange={(e) => setOp({ ...op, destinatario: e.target.value as 'cliente' | 'interno', mostrar_costes: e.target.value === 'interno' && veCostes })}>
          <option value="cliente">Para el cliente</option><option value="interno">Interna (PM)</option>
        </select>
        {veCostes && <label><input type="checkbox" checked={op.mostrar_costes} onChange={(e) => setOp({ ...op, mostrar_costes: e.target.checked })} /> Escandallos</label>}
        <label><input type="checkbox" checked={op.mostrar_alergenos} onChange={(e) => setOp({ ...op, mostrar_alergenos: e.target.checked })} /> Alérgenos</label>
        <button onClick={guardar}>Guardar</button>
        <button className="btn-primario" style={{ background: '#fff', color: '#000' }} onClick={() => window.print()}>Imprimir / PDF</button>
        {guardado && <span className="peq">{guardado}</span>}
      </div>
      <div className="no-imprimir" style={{ maxWidth: 820, margin: '12px auto 0' }}>
        {sinPrecio > 0 && <Aviso tipo="alerta">{sinPrecio} plato(s) sin precio de carta: revisa la carta antes de entregar.</Aviso>}
        <label className="campo"><span className="campo-et">Introducción (opcional)</span>
          <textarea value={op.introduccion} onChange={(e) => setOp({ ...op, introduccion: e.target.value })} placeholder="Concepto de la carta, criterios, próximos pasos…" /></label>
      </div>

      <div className="documento">
        <section className="portada">
          <div>
            <div className="marca"><span className="marca-pm">PM</span> Picking Market</div>
            <h1>{op.titulo}</h1>
            {op.subtitulo && <div className="sub">{op.subtitulo}</div>}
          </div>
          <div className="tenue">
            {carta.clientes.nombre}{carta.clientes.zona ? ` · ${carta.clientes.zona}` : ''}<br />
            {carta.nombre} · versión {carta.version} · {fecha(new Date().toISOString())}
            {op.destinatario === 'interno' && <><br /><b>Documento interno · contiene costes</b></>}
          </div>
        </section>

        {(op.introduccion || carta.clientes.concepto) && (
          <section className="doc-seccion">
            <h2>Concepto</h2>
            {carta.clientes.concepto && <p>{carta.clientes.concepto}</p>}
            {op.introduccion && <p style={{ whiteSpace: 'pre-wrap' }}>{op.introduccion}</p>}
          </section>
        )}

        {grupos.map((g) => (
          <section className="doc-seccion" key={g.c.id || 'otros'}>
            <h2>{g.c.nombre}</h2>
            {g.filas.map((l) => {
              const p = platos.get(l.plato_id)
              if (!p) return null
              return (
                <div className="doc-plato" key={l.carta_plato_id}>
                  <div>
                    <b>{p.nombre}</b>
                    {p.estado === 'teorica' && <span className="etq etq-alerta" style={{ marginLeft: 6 }}>Propuesta teórica</span>}
                  </div>
                  <div className="precio">{eur(l.pvp_carta_con_iva)}</div>
                  {p.textos?.descripcion && <div className="desc">{p.textos.descripcion}</div>}
                  {p.foto_url && <div className="desc"><img src={p.foto_url} alt={p.nombre} />{p.foto_orientativa && <div className="doc-nota">Imagen orientativa</div>}</div>}
                  {op.mostrar_alergenos && <div className="desc doc-nota">Alérgenos: {(p.alergenos ?? []).length ? p.alergenos.join(', ') : 'ninguno declarado'}</div>}
                  {costes && (
                    <div className="desc doc-nota">
                      Coste ración {eur(l.coste_total)} · PVP sin IVA {eur(l.pvp_final_sin_iva)} · food cost {pct(l.food_cost_real)} · margen {eur(l.margen_euros)} · método {l.metodo_pvp ?? 'multiplicador'}
                      {l.justificacion && <> · {l.justificacion}</>}
                    </div>
                  )}
                </div>
              )
            })}
          </section>
        ))}

        <section className="doc-seccion doc-nota">
          <p>Precios de carta con IVA ({pct(0.1, 0)}) incluido.{costes && fechaTarifa && <> Costes sin IVA calculados con la tarifa Picking Market del {fecha(fechaTarifa)}.</>}</p>
          {hayTeoricos && <p>Los platos marcados como «Propuesta teórica» están pendientes de cata y pueden ajustarse tras la prueba en cocina.</p>}
          {op.mostrar_alergenos && <p>Información de alérgenos según las fichas de producto (Reglamento (UE) 1169/2011). Debe verificarse con las fichas técnicas definitivas antes de la apertura.</p>}
        </section>
      </div>
    </>
  )
}
