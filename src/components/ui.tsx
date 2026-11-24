import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { parseNum } from '../lib/format'

export function Cabecera({ titulo, sub, children }: { titulo: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="cabecera">
      <div>
        <h1>{titulo}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
      <div className="acciones">{children}</div>
    </div>
  )
}

export function Aviso({ tipo = 'info', children }: { tipo?: 'info' | 'error' | 'ok' | 'alerta'; children: ReactNode }) {
  if (!children) return null
  return <div className={`aviso aviso-${tipo}`}>{children}</div>
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return <p className="tenue">{texto}</p>
}

export function Etiqueta({ children, tono = 'neutro' }: { children: ReactNode; tono?: 'neutro' | 'ok' | 'alerta' | 'error' | 'acento' }) {
  return <span className={`etq etq-${tono}`}>{children}</span>
}

export function EstadoReceta({ estado }: { estado: string | null }) {
  const tono = estado === 'validada' ? 'ok' : estado === 'probada' ? 'acento' : estado === 'archivada' ? 'neutro' : 'alerta'
  const txt: Record<string, string> = { teorica: 'Teórica', probada: 'Probada', validada: 'Validada', archivada: 'Archivada' }
  return <Etiqueta tono={tono}>{txt[estado ?? ''] ?? estado}</Etiqueta>
}

export function Campo({ etiqueta, children, ayuda, ancho }: { etiqueta: string; children: ReactNode; ayuda?: ReactNode; ancho?: 'completo' }) {
  return (
    <label className={`campo ${ancho === 'completo' ? 'completo' : ''}`}>
      <span className="campo-et">{etiqueta}</span>
      {children}
      {ayuda && <span className="campo-ayuda">{ayuda}</span>}
    </label>
  )
}

/** Selección múltiple con fichas (equipos, canales, alérgenos…). */
export function Fichas({ opciones, valor, onChange, deshabilitado }: {
  opciones: string[]; valor: string[]; onChange: (v: string[]) => void; deshabilitado?: boolean
}) {
  const todas = Array.from(new Set([...opciones, ...valor]))
  return (
    <div className="fichas">
      {todas.map((o) => {
        const on = valor.includes(o)
        return (
          <button type="button" key={o} disabled={deshabilitado} className={`ficha ${on ? 'on' : ''}`}
            onClick={() => onChange(on ? valor.filter((x) => x !== o) : [...valor, o])}>
            {o}
          </button>
        )
      })}
    </div>
  )
}

export type OpcionBusqueda = { id: string; texto: string; detalle?: string; grupo?: string }

/** Selector con búsqueda para listas largas (catálogo PM). */
export function Buscador({ opciones, onElegir, placeholder = 'Buscar…' }: {
  opciones: OpcionBusqueda[]; onElegir: (o: OpcionBusqueda) => void; placeholder?: string
}) {
  const [q, setQ] = useState('')
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const cerrar = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false) }
    document.addEventListener('mousedown', cerrar)
    return () => document.removeEventListener('mousedown', cerrar)
  }, [])
  const filtradas = useMemo(() => {
    const t = normalizar(q)
    const r = t ? opciones.filter((o) => normalizar(`${o.texto} ${o.detalle ?? ''}`).includes(t)) : opciones
    return r.slice(0, 60)
  }, [q, opciones])
  return (
    <div className="buscador" ref={ref}>
      <input value={q} placeholder={placeholder} onFocus={() => setAbierto(true)}
        onChange={(e) => { setQ(e.target.value); setAbierto(true) }} />
      {abierto && (
        <ul className="buscador-lista">
          {filtradas.length === 0 && <li className="tenue">Sin resultados</li>}
          {filtradas.map((o) => (
            <li key={o.id} onMouseDown={() => { onElegir(o); setQ(''); setAbierto(false) }}>
              {o.grupo && <span className="etq etq-neutro">{o.grupo}</span>} {o.texto}
              {o.detalle && <span className="tenue"> · {o.detalle}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Input numérico que acepta coma decimal y guarda al salir. */
export function NumInput({ valor, onGuardar, paso = 'any', deshabilitado, ancho = 90, placeholder }: {
  valor: number | null; onGuardar: (v: number | null) => void; paso?: string; deshabilitado?: boolean; ancho?: number; placeholder?: string
}) {
  const [t, setT] = useState(valor == null ? '' : String(valor).replace('.', ','))
  useEffect(() => { setT(valor == null ? '' : String(valor).replace('.', ',')) }, [valor])
  return (
    <input className="num" style={{ width: ancho }} inputMode="decimal" step={paso} disabled={deshabilitado} value={t} placeholder={placeholder}
      onChange={(e) => setT(e.target.value)}
      onBlur={() => {
        const n = parseNum(t)
        if (t.trim() !== '' && n === null) { setT(valor == null ? '' : String(valor).replace('.', ',')); return }
        if (n !== valor) onGuardar(n)
      }} />
  )
}
