import { useMemo, useState } from 'react'
import readXlsxFile from 'read-excel-file/browser'
import { supabase, ok } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useLoad } from '../lib/hooks'
import { eur, fecha, num, parseNum, pct } from '../lib/format'
import { Aviso, Cabecera, Campo, Cargando, Etiqueta, normalizar } from '../components/ui'

type Celda = string | number | boolean | Date | null
type Hoja = { sheet: string; data: Celda[][] }

const CAMPOS = [
  { k: 'codigo', l: 'Código', obl: true, alias: ['codigo', 'cod', 'ref', 'referencia', 'cod articulo', 'codigo articulo'] },
  { k: 'descripcion', l: 'Descripción', obl: true, alias: ['descripcion', 'nombre', 'producto', 'articulo', 'denominacion'] },
  { k: 'fabricante', l: 'Fabricante', alias: ['fabricante', 'marca', 'proveedor'] },
  { k: 'formato', l: 'Formato', alias: ['formato', 'presentacion', 'envase'] },
  { k: 'unidad_base', l: 'Unidad (kg / l / ud)', alias: ['unidad', 'unidad base', 'unidad medida', 'um', 'ud medida'] },
  { k: 'cantidad_formato', l: 'Cantidad del formato', alias: ['cantidad', 'contenido', 'cantidad formato', 'contenido neto'] },
  { k: 'unidades', l: 'Unidades', alias: ['unidades', 'uds', 'unidades caja', 'unid'] },
  { k: 'peso', l: 'Peso', alias: ['peso', 'peso neto', 'kg', 'peso kg'] },
  { k: 'precio_formato', l: 'Precio de coste (sin IVA)', obl: true, alias: ['precio', 'precio coste', 'precio de coste', 'coste', 'tarifa', 'precio tarifa', 'pvp'] },
  { k: 'alergenos', l: 'Alérgenos', alias: ['alergenos', 'alergeno'] },
  { k: 'conservacion', l: 'Conservación', alias: ['conservacion', 'temperatura', 'familia conservacion'] },
  { k: 'fecha_tarifa', l: 'Fecha de tarifa', alias: ['fecha', 'fecha tarifa', 'fecha de tarifa'] },
] as const
type CampoK = (typeof CAMPOS)[number]['k']
type Mapa = Partial<Record<CampoK, number>>

type Fila = {
  codigo: string | null; descripcion: string | null; fabricante: string | null; formato: string | null
  unidad_base: string | null; cantidad_formato: number | null; precio_formato: number | null
  alergenos: string | null; conservacion: string | null; _error?: string
}

/** Normaliza la unidad y convierte g→kg y ml→l. */
function normalizarUnidad(u: unknown, cant: number | null): { unidad: string | null; cantidad: number | null } {
  const t = normalizar(String(u ?? '')).replace(/\./g, '')
  if (['kg', 'kgs', 'kilo', 'kilos', 'k'].includes(t)) return { unidad: 'kg', cantidad: cant }
  if (['g', 'gr', 'grs', 'gramos'].includes(t)) return { unidad: 'kg', cantidad: cant == null ? null : cant / 1000 }
  if (['l', 'lt', 'lts', 'litro', 'litros'].includes(t)) return { unidad: 'l', cantidad: cant }
  if (['ml', 'mililitros', 'cl'].includes(t)) return { unidad: 'l', cantidad: cant == null ? null : t === 'cl' ? cant / 100 : cant / 1000 }
  if (['ud', 'u', 'un', 'und', 'uds', 'unidad', 'unidades', 'pieza', 'piezas'].includes(t)) return { unidad: 'ud', cantidad: cant }
  return { unidad: t || null, cantidad: cant }
}

const texto = (v: Celda | undefined) => (v == null || v === '' ? null : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).trim())

export default function Tarifas() {
  const { session, edita } = useAuth()
  const lista = useLoad(async () => {
    const t = ok(await supabase.from('tarifas').select('*').order('fecha_tarifa', { ascending: false }).order('importada_en', { ascending: false })) as
      { id: string; fecha_tarifa: string; archivo_nombre: string | null; estado: string; notas: string | null; importada_en: string }[]
    const errores = ok(await supabase.from('import_tarifa_filas').select('tarifa_id').eq('estado', 'error')) as { tarifa_id: string }[]
    const nErr = new Map<string, number>()
    errores.forEach((e) => nErr.set(e.tarifa_id, (nErr.get(e.tarifa_id) ?? 0) + 1))
    return t.map((x) => ({ ...x, errores: nErr.get(x.id) ?? 0 }))
  }, [])

  const [archivo, setArchivo] = useState<File | null>(null)
  const [hojas, setHojas] = useState<Hoja[]>([])
  const [hojaIdx, setHojaIdx] = useState(0)
  const [filaCab, setFilaCab] = useState(0)
  const [mapa, setMapa] = useState<Mapa>({})
  const [modoCant, setModoCant] = useState<'columna' | 'producto'>('columna')
  const [unidadFija, setUnidadFija] = useState<string>('')
  const [fechaTarifa, setFechaTarifa] = useState(new Date().toISOString().slice(0, 10))
  const [notas, setNotas] = useState('')
  const [estado, setEstado] = useState<{ tipo: 'info' | 'error' | 'ok'; txt: string } | null>(null)
  const [trabajando, setTrabajando] = useState(false)
  const [cambios, setCambios] = useState<{ codigo: string; descripcion: string; antes: number; ahora: number }[] | null>(null)
  const [verErrores, setVerErrores] = useState<string | null>(null)

  const hoja = hojas[hojaIdx]
  const cabecera = useMemo(() => (hoja?.data[filaCab] ?? []).map((c) => texto(c) ?? ''), [hoja, filaCab])

  async function leer(f: File) {
    setArchivo(f); setEstado(null); setCambios(null)
    try {
      const hs = (await readXlsxFile(f)) as unknown as Hoja[]
      setHojas(hs); setHojaIdx(0)
      prepararHoja(hs[0])
    } catch (e) {
      setEstado({ tipo: 'error', txt: `No se pudo leer el Excel: ${(e as Error).message}` })
    }
  }

  function prepararHoja(h: Hoja) {
    const idx = Math.max(0, h.data.findIndex((r) => r.filter((c) => c != null && c !== '').length >= 3))
    setFilaCab(idx)
    const cab = (h.data[idx] ?? []).map((c) => normalizar(texto(c) ?? ''))
    const firma = cab.join('|')
    let guardado: Mapa | null = null
    try { guardado = JSON.parse(localStorage.getItem(`pmv-mapa:${firma}`) ?? 'null') } catch { guardado = null }
    if (guardado) { setMapa(guardado); setModoCant(guardado.cantidad_formato == null && guardado.peso != null ? 'producto' : 'columna'); return }
    const m: Mapa = {}
    for (const c of CAMPOS) {
      const i = cab.findIndex((h) => (c.alias as readonly string[]).includes(h))
      const j = i >= 0 ? i : cab.findIndex((h) => (c.alias as readonly string[]).some((a) => a.length > 3 && h.startsWith(a)))
      if (j >= 0 && !Object.values(m).includes(j)) m[c.k] = j
    }
    setMapa(m)
    setModoCant(m.cantidad_formato == null && m.peso != null ? 'producto' : 'columna')
  }

  const filas: Fila[] = useMemo(() => {
    if (!hoja) return []
    const g = (r: Celda[], k: CampoK) => (mapa[k] == null ? undefined : r[mapa[k]!])
    const out: Fila[] = []
    for (const r of hoja.data.slice(filaCab + 1)) {
      if (r.every((c) => c == null || c === '')) continue
      let cant: number | null
      if (modoCant === 'producto') {
        const u = mapa.unidades != null ? parseNum(g(r, 'unidades')) ?? 1 : 1
        const p = parseNum(g(r, 'peso'))
        cant = p == null ? null : u * p
      } else cant = parseNum(g(r, 'cantidad_formato'))
      const { unidad, cantidad } = normalizarUnidad(unidadFija || g(r, 'unidad_base'), cant)
      const f: Fila = {
        codigo: texto(g(r, 'codigo')), descripcion: texto(g(r, 'descripcion')), fabricante: texto(g(r, 'fabricante')),
        formato: texto(g(r, 'formato')), unidad_base: unidad, cantidad_formato: cantidad,
        precio_formato: parseNum(g(r, 'precio_formato')), alergenos: texto(g(r, 'alergenos'))?.toLowerCase() ?? null, conservacion: texto(g(r, 'conservacion')),
      }
      f._error = !f.codigo ? 'Falta código' : !f.descripcion ? 'Falta descripción'
        : !f.unidad_base || !['kg', 'l', 'ud'].includes(f.unidad_base) ? `Unidad «${f.unidad_base ?? ''}» no reconocida`
        : !f.cantidad_formato || f.cantidad_formato <= 0 ? 'Cantidad del formato no válida'
        : f.precio_formato == null || f.precio_formato < 0 ? 'Precio no válido' : undefined
      out.push(f)
    }
    // Igual que fn_aplicar_tarifa: un código repetido invalida todas sus filas
    const n = new Map<string, number>()
    out.forEach((f) => f.codigo && n.set(f.codigo, (n.get(f.codigo) ?? 0) + 1))
    out.forEach((f) => { if (!f._error && f.codigo && n.get(f.codigo)! > 1) f._error = 'Código repetido en el archivo' })
    return out
  }, [hoja, filaCab, mapa, modoCant, unidadFija])

  // Fecha de la tarifa tomada del propio Excel si hay columna
  const fechaExcel = useMemo(() => {
    if (!hoja || mapa.fecha_tarifa == null) return null
    const v = hoja.data[filaCab + 1]?.[mapa.fecha_tarifa]
    if (v instanceof Date) return v.toISOString().slice(0, 10)
    const s = texto(v)
    const m = s?.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/)
    if (m) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
    return s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null
  }, [hoja, filaCab, mapa])

  const nErr = filas.filter((f) => f._error).length

  async function importar() {
    if (!archivo) return
    setTrabajando(true); setEstado({ tipo: 'info', txt: 'Creando versión de tarifa…' }); setCambios(null)
    try {
      try { localStorage.setItem(`pmv-mapa:${cabecera.map(normalizar).join('|')}`, JSON.stringify(mapa)) } catch { /* sin almacenamiento */ }
      const fechaUsada = fechaExcel ?? fechaTarifa
      const previa = ok(await supabase.from('tarifas').select('id').eq('estado', 'aplicada').order('fecha_tarifa', { ascending: false }).order('importada_en', { ascending: false }).limit(1)) as { id: string }[]
      const t = ok(await supabase.from('tarifas').insert({
        fecha_tarifa: fechaUsada, archivo_nombre: archivo.name, notas: notas || null, importada_por: session?.user.id,
      }).select('id').single()) as { id: string }
      const datos = filas.map(({ _error: _e, ...f }) => ({ ...f, tarifa_id: t.id }))
      for (let i = 0; i < datos.length; i += 500) {
        setEstado({ tipo: 'info', txt: `Subiendo filas ${i + 1}–${Math.min(i + 500, datos.length)} de ${datos.length}…` })
        ok(await supabase.from('import_tarifa_filas').insert(datos.slice(i, i + 500)))
      }
      setEstado({ tipo: 'info', txt: 'Aplicando tarifa y actualizando catálogo…' })
      const r = ok(await supabase.rpc('fn_aplicar_tarifa', { p_tarifa: t.id })) as { filas_ok: number; filas_error: number }
      setEstado({ tipo: r.filas_error ? 'info' : 'ok', txt: `Tarifa del ${fecha(fechaUsada)} aplicada: ${r.filas_ok} productos actualizados${r.filas_error ? `, ${r.filas_error} filas con error (no importadas)` : ''}. Los escandallos ya usan los precios nuevos.` })
      if (previa[0]) await calcularCambios(previa[0].id, t.id)
      setArchivo(null); setHojas([])
      lista.reload()
    } catch (e) {
      setEstado({ tipo: 'error', txt: (e as Error).message })
    } finally { setTrabajando(false) }
  }

  async function calcularCambios(antes: string, ahora: string) {
    const [a, b] = await Promise.all([
      supabase.from('precios_pm').select('producto_id, precio_formato').eq('tarifa_id', antes),
      supabase.from('precios_pm').select('producto_id, precio_formato, productos_pm(codigo, descripcion)').eq('tarifa_id', ahora),
    ])
    const prev = new Map((ok(a) as { producto_id: string; precio_formato: number }[]).map((x) => [x.producto_id, x.precio_formato]))
    const res = (ok(b) as unknown as { producto_id: string; precio_formato: number; productos_pm: { codigo: string; descripcion: string } }[])
      .filter((x) => prev.has(x.producto_id) && prev.get(x.producto_id) !== x.precio_formato)
      .map((x) => ({ codigo: x.productos_pm.codigo, descripcion: x.productos_pm.descripcion, antes: prev.get(x.producto_id)!, ahora: x.precio_formato }))
      .sort((x, y) => Math.abs(y.ahora / y.antes - 1) - Math.abs(x.ahora / x.antes - 1))
    setCambios(res)
  }

  return (
    <>
      <Cabecera titulo="Tarifas PM" sub="Cada importación crea una versión de tarifa. Todo sin IVA. Los escandallos usan siempre la tarifa aplicada más reciente y guardan su fecha." />

      {edita && (
        <div className="tarjeta">
          <h2>Importar tarifa (Excel)</h2>
          <input type="file" accept=".xlsx" onChange={(e) => e.target.files?.[0] && leer(e.target.files[0])} disabled={trabajando} />
          {estado && <Aviso tipo={estado.tipo}>{estado.txt}</Aviso>}

          {hoja && (
            <>
              <div className="rejilla" style={{ marginTop: 14 }}>
                {hojas.length > 1 && (
                  <Campo etiqueta="Hoja">
                    <select value={hojaIdx} onChange={(e) => { const i = Number(e.target.value); setHojaIdx(i); prepararHoja(hojas[i]) }}>
                      {hojas.map((h, i) => <option key={h.sheet} value={i}>{h.sheet}</option>)}
                    </select>
                  </Campo>
                )}
                <Campo etiqueta="Fila de cabecera" ayuda={cabecera.filter(Boolean).slice(0, 4).join(' · ')}>
                  <input type="number" min={1} value={filaCab + 1} onChange={(e) => setFilaCab(Math.max(0, Number(e.target.value) - 1))} />
                </Campo>
                <Campo etiqueta="Fecha de la tarifa" ayuda={fechaExcel ? `Tomada del Excel: ${fecha(fechaExcel)}` : 'No hay columna de fecha: indícala.'}>
                  <input type="date" value={fechaExcel ?? fechaTarifa} disabled={!!fechaExcel} onChange={(e) => setFechaTarifa(e.target.value)} />
                </Campo>
                <Campo etiqueta="Notas"><input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Opcional" /></Campo>
              </div>

              <h3 style={{ marginTop: 16 }}>Columnas</h3>
              <div className="rejilla">
                {CAMPOS.map((c) => (
                  <Campo key={c.k} etiqueta={`${c.l}${'obl' in c && c.obl ? ' *' : ''}`}>
                    <select value={mapa[c.k] ?? ''} onChange={(e) => setMapa({ ...mapa, [c.k]: e.target.value === '' ? undefined : Number(e.target.value) })}>
                      <option value="">— no está —</option>
                      {cabecera.map((h, i) => <option key={i} value={i}>{h || `Columna ${i + 1}`}</option>)}
                    </select>
                  </Campo>
                ))}
                <Campo etiqueta="Cómo se calcula la cantidad del formato">
                  <select value={modoCant} onChange={(e) => setModoCant(e.target.value as 'columna' | 'producto')}>
                    <option value="columna">Columna «Cantidad del formato»</option>
                    <option value="producto">Unidades × Peso</option>
                  </select>
                </Campo>
                <Campo etiqueta="Unidad fija (si el Excel no la trae)">
                  <select value={unidadFija} onChange={(e) => setUnidadFija(e.target.value)}>
                    <option value="">Usar columna «Unidad»</option>
                    <option value="kg">kg para todo</option><option value="l">l para todo</option><option value="ud">ud para todo</option>
                  </select>
                </Campo>
              </div>

              <h3 style={{ marginTop: 16 }}>Vista previa · {filas.length} filas · {nErr ? <Etiqueta tono="alerta">{nErr} con error</Etiqueta> : <Etiqueta tono="ok">sin errores</Etiqueta>}</h3>
              <div style={{ maxHeight: 360, overflow: 'auto' }}>
                <table className="tabla">
                  <thead><tr><th>Código</th><th>Descripción</th><th>Formato</th><th className="der">Cantidad</th><th className="der">Precio</th><th>Alérgenos</th><th>Estado</th></tr></thead>
                  <tbody>
                    {[...filas.filter((f) => f._error), ...filas.filter((f) => !f._error)].slice(0, 150).map((f, i) => (
                      <tr key={i}>
                        <td>{f.codigo}</td><td>{f.descripcion}</td><td>{f.formato}</td>
                        <td className="der">{num(f.cantidad_formato)} {f.unidad_base}</td><td className="der">{eur(f.precio_formato)}</td>
                        <td className="peq">{f.alergenos}</td>
                        <td>{f._error ? <Etiqueta tono="error">{f._error}</Etiqueta> : <Etiqueta tono="ok">ok</Etiqueta>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="acciones" style={{ marginTop: 12 }}>
                <button className="btn-primario" disabled={trabajando || filas.length === nErr || mapa.codigo == null || mapa.descripcion == null || mapa.precio_formato == null} onClick={importar}>
                  {trabajando ? 'Importando…' : `Importar ${filas.length - nErr} productos`}
                </button>
                {nErr > 0 && <span className="tenue peq">Las filas con error se guardan para revisarlas, pero no actualizan el catálogo.</span>}
              </div>
            </>
          )}

          {cambios && (
            <div style={{ marginTop: 16 }}>
              <h3>Cambios de precio respecto a la tarifa anterior ({cambios.length})</h3>
              {cambios.length === 0 ? <p className="tenue">Ningún precio ha cambiado.</p> : (
                <table className="tabla">
                  <thead><tr><th>Código</th><th>Producto</th><th className="der">Antes</th><th className="der">Ahora</th><th className="der">Variación</th></tr></thead>
                  <tbody>{cambios.slice(0, 100).map((c) => (
                    <tr key={c.codigo}><td>{c.codigo}</td><td>{c.descripcion}</td><td className="der">{eur(c.antes)}</td><td className="der">{eur(c.ahora)}</td>
                      <td className="der"><Etiqueta tono={c.ahora > c.antes ? 'alerta' : 'ok'}>{c.ahora > c.antes ? '+' : ''}{pct(c.ahora / c.antes - 1)}</Etiqueta></td></tr>
                  ))}</tbody>
                </table>
              )}
              <p className="tenue peq">Revisa en cada carta los platos que ahora superan su food cost objetivo.</p>
            </div>
          )}
        </div>
      )}

      <div className="tarjeta">
        <h2>Versiones de tarifa</h2>
        {lista.loading ? <Cargando /> : lista.error ? <Aviso tipo="error">{lista.error}</Aviso> : (lista.data ?? []).length === 0 ? <p className="tenue">Todavía no se ha importado ninguna tarifa.</p> : (
          <table className="tabla">
            <thead><tr><th>Fecha tarifa</th><th>Archivo</th><th>Estado</th><th>Importada</th><th>Errores</th><th>Notas</th></tr></thead>
            <tbody>
              {lista.data!.map((t, i) => (
                <tr key={t.id}>
                  <td>{fecha(t.fecha_tarifa)} {i === 0 && t.estado === 'aplicada' && <Etiqueta tono="ok">vigente</Etiqueta>}</td>
                  <td>{t.archivo_nombre}</td><td>{t.estado}</td><td className="peq">{new Date(t.importada_en).toLocaleString('es-ES')}</td>
                  <td>{t.errores > 0 ? <button className="btn-mini" onClick={() => setVerErrores(verErrores === t.id ? null : t.id)}>{t.errores} filas</button> : '—'}</td>
                  <td className="peq">{t.notas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {verErrores && <ErroresTarifa tarifaId={verErrores} />}
      </div>
    </>
  )
}

function ErroresTarifa({ tarifaId }: { tarifaId: string }) {
  const d = useLoad(async () => ok(await supabase.from('import_tarifa_filas').select('codigo, descripcion, error').eq('tarifa_id', tarifaId).eq('estado', 'error').limit(500)) as
    { codigo: string | null; descripcion: string | null; error: string }[], [tarifaId])
  if (d.loading) return <Cargando />
  return (
    <table className="tabla" style={{ marginTop: 10 }}>
      <thead><tr><th>Código</th><th>Descripción</th><th>Error</th></tr></thead>
      <tbody>{(d.data ?? []).map((f, i) => <tr key={i}><td>{f.codigo}</td><td>{f.descripcion}</td><td>{f.error}</td></tr>)}</tbody>
    </table>
  )
}
